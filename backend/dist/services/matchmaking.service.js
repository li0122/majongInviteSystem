"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMatchmaking = startMatchmaking;
exports.getMatchmakingProgress = getMatchmakingProgress;
exports.getMatchGroupOverview = getMatchGroupOverview;
exports.getMatchGroupMessages = getMatchGroupMessages;
exports.sendMatchGroupMessage = sendMatchGroupMessage;
exports.getActiveMatchGroup = getActiveMatchGroup;
exports.leaveMatchGroup = leaveMatchGroup;
const mongoose_1 = require("mongoose");
const venues_1 = require("../data/venues");
const MatchChatMessage_1 = require("../models/MatchChatMessage");
const MatchGroup_1 = require("../models/MatchGroup");
const MatchRequest_1 = require("../models/MatchRequest");
const User_1 = require("../models/User");
const push_service_1 = require("./push.service");
const geo_1 = require("../utils/geo");
const MATCH_RADIUS_KM = 15;
const TIME_WINDOW_MINUTES = 60;
class DuplicateActiveMatchRequestError extends Error {
    constructor() {
        super("Duplicate active matchmaking request");
        this.name = "DuplicateActiveMatchRequestError";
    }
}
function toDate(value) {
    return value instanceof Date ? value : new Date(value);
}
function isValidSearchingRequest(request) {
    const coords = request.location?.coordinates;
    return Boolean(request.stakeLevel &&
        request.startTime instanceof Date &&
        !Number.isNaN(request.startTime.getTime()) &&
        Array.isArray(coords) &&
        coords.length === 2 &&
        Number.isFinite(coords[0]) &&
        Number.isFinite(coords[1]));
}
function timeWindow(startTime) {
    const before = new Date(startTime.getTime() - TIME_WINDOW_MINUTES * 60 * 1000);
    const after = new Date(startTime.getTime() + TIME_WINDOW_MINUTES * 60 * 1000);
    return { before, after };
}
function pickBestVenue(target) {
    const candidates = venues_1.mockVenues.filter((v) => v.available);
    if (!candidates.length) {
        throw new Error("No available venues");
    }
    let best = candidates[0];
    let bestDistance = (0, geo_1.haversineDistanceKm)(target, { lat: best.lat, lon: best.lon });
    for (const venue of candidates.slice(1)) {
        const d = (0, geo_1.haversineDistanceKm)(target, { lat: venue.lat, lon: venue.lon });
        if (d < bestDistance) {
            best = venue;
            bestDistance = d;
        }
    }
    return {
        ...best,
        navigationUrl: (0, geo_1.googleNavigationUrl)(best.lat, best.lon),
    };
}
async function getCurrentMatchedCount(request) {
    const { before, after } = timeWindow(request.startTime);
    const candidates = await MatchRequest_1.MatchRequestModel.find({
        stakeLevel: request.stakeLevel,
        status: "searching",
        startTime: { $gte: before, $lte: after },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: request.location.coordinates,
                },
                $maxDistance: MATCH_RADIUS_KM * 1000,
            },
        },
    }).limit(4);
    return Math.min(4, candidates.length);
}
async function tryFinalizeMatch(request) {
    const { before, after } = timeWindow(request.startTime);
    const candidates = await MatchRequest_1.MatchRequestModel.find({
        _id: { $ne: request._id },
        stakeLevel: request.stakeLevel,
        status: "searching",
        startTime: { $gte: before, $lte: after },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: request.location.coordinates,
                },
                $maxDistance: MATCH_RADIUS_KM * 1000,
            },
        },
    })
        .sort({ createdAt: 1 })
        .limit(3);
    if (candidates.length < 3) {
        return {
            status: "waiting",
            requestId: request._id,
            currentMatchedCount: candidates.length + 1,
        };
    }
    const selected = [request, ...candidates];
    const points = selected.map((r) => ({ lat: r.location.coordinates[1], lon: r.location.coordinates[0] }));
    const meetingPoint = (0, geo_1.geometricMedian)(points);
    const venue = pickBestVenue(meetingPoint);
    await MatchRequest_1.MatchRequestModel.updateMany({ _id: { $in: selected.map((r) => r._id) } }, { $set: { status: "matched" } });
    const group = await MatchGroup_1.MatchGroupModel.create({
        requestIds: selected.map((r) => r._id),
        userIds: selected.map((r) => r.userId),
        stakeLevel: request.stakeLevel,
        startTime: request.startTime,
        meetingPoint,
        venue: {
            name: venue.name,
            lat: venue.lat,
            lon: venue.lon,
            navigationUrl: venue.navigationUrl,
        },
        status: "confirmed",
    });
    const groupUsers = await User_1.UserModel.find({ _id: { $in: selected.map((r) => r.userId) } });
    const tokens = groupUsers
        .map((u) => u.fcmToken)
        .filter((token) => Boolean(token));
    await (0, push_service_1.sendPushToTokens)(tokens, "4 人麻將桌已成立", `集合地點：${venue.name}，請準時到場。`, {
        type: "match_confirmed",
        matchGroupId: group._id.toString(),
        venueName: venue.name,
        navUrl: venue.navigationUrl,
    });
    return {
        status: "matched",
        groupId: group._id,
        venue,
        meetingPoint,
        startTime: request.startTime,
    };
}
async function notifyNearbyUsers(reference) {
    const nearbyUsers = await User_1.UserModel.find({
        _id: { $ne: reference.userId },
        verified: true,
        fcmToken: { $exists: true, $ne: "" },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: reference.location.coordinates,
                },
                $maxDistance: MATCH_RADIUS_KM * 1000,
            },
        },
    });
    const tokens = nearbyUsers
        .map((u) => u.fcmToken)
        .filter((token) => Boolean(token));
    await (0, push_service_1.sendPushToTokens)(tokens, "附近有人發起麻將配對", `${reference.stakeLevel} 場，預計 ${reference.startTime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 開打`, { type: "match_invite", stakeLevel: reference.stakeLevel });
}
async function startMatchmaking(params) {
    const start = toDate(params.startTime);
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const existingRequest = await MatchRequest_1.MatchRequestModel.findOne({
        userId: userObjectId,
        status: "searching",
    }).sort({ createdAt: -1 });
    if (existingRequest) {
        if (!isValidSearchingRequest(existingRequest)) {
            await MatchRequest_1.MatchRequestModel.updateOne({ _id: existingRequest._id }, { $set: { status: "expired" } });
        }
        else {
            return tryFinalizeMatch(existingRequest);
        }
    }
    let request;
    try {
        request = await MatchRequest_1.MatchRequestModel.create({
            userId: userObjectId,
            stakeLevel: params.stakeLevel,
            startTime: start,
            status: "searching",
            location: {
                type: "Point",
                coordinates: [params.lon, params.lat],
            },
        });
    }
    catch (error) {
        const duplicateKeyError = typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000;
        if (!duplicateKeyError) {
            throw error;
        }
        const activeRequest = await MatchRequest_1.MatchRequestModel.findOne({
            userId: userObjectId,
            status: "searching",
        }).sort({ createdAt: -1 });
        if (!activeRequest) {
            throw new DuplicateActiveMatchRequestError();
        }
        return {
            status: "waiting",
            requestId: activeRequest._id,
            currentMatchedCount: await getCurrentMatchedCount(activeRequest),
        };
    }
    await notifyNearbyUsers(request);
    return tryFinalizeMatch(request);
}
async function getMatchmakingProgress(params) {
    const request = await MatchRequest_1.MatchRequestModel.findOne({
        _id: new mongoose_1.Types.ObjectId(params.requestId),
        userId: new mongoose_1.Types.ObjectId(params.userId),
    });
    if (!request) {
        return {
            status: "not_found",
            message: "Match request not found",
        };
    }
    if (request.status === "matched") {
        const group = await MatchGroup_1.MatchGroupModel.findOne({ requestIds: request._id });
        if (!group) {
            return {
                status: "matched",
                requestId: request._id,
                currentMatchedCount: 4,
            };
        }
        return {
            status: "matched",
            requestId: request._id,
            groupId: group._id,
            currentMatchedCount: group.userIds.length,
            venue: group.venue,
            meetingPoint: group.meetingPoint,
            startTime: group.startTime,
        };
    }
    if (request.status === "expired") {
        return {
            status: "expired",
            requestId: request._id,
            currentMatchedCount: 0,
        };
    }
    const { before, after } = timeWindow(request.startTime);
    const candidates = await MatchRequest_1.MatchRequestModel.find({
        stakeLevel: request.stakeLevel,
        status: "searching",
        startTime: { $gte: before, $lte: after },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: request.location.coordinates,
                },
                $maxDistance: MATCH_RADIUS_KM * 1000,
            },
        },
    }).limit(4);
    if (candidates.length >= 4) {
        return tryFinalizeMatch(request);
    }
    return {
        status: "waiting",
        requestId: request._id,
        currentMatchedCount: Math.min(4, candidates.length),
    };
}
async function getMatchGroupOverview(params) {
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const groupObjectId = new mongoose_1.Types.ObjectId(params.groupId);
    const group = await MatchGroup_1.MatchGroupModel.findOne({
        _id: groupObjectId,
        userIds: userObjectId,
    });
    if (!group) {
        return {
            status: "not_found",
            message: "Match group not found",
        };
    }
    if (group.status !== "confirmed") {
        return {
            status: "dissolved",
            message: "Match group has been dissolved",
        };
    }
    const users = await User_1.UserModel.find({ _id: { $in: group.userIds } });
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const members = group.userIds.map((id) => {
        const user = userById.get(id.toString());
        const coordinates = user?.location?.coordinates;
        const hasValidCoordinates = Array.isArray(coordinates) &&
            coordinates.length >= 2 &&
            Number.isFinite(coordinates[0]) &&
            Number.isFinite(coordinates[1]);
        return {
            userId: id,
            name: user?.name ?? "Unknown",
            username: user?.username ?? "unknown",
            location: hasValidCoordinates
                ? {
                    lat: coordinates[1],
                    lon: coordinates[0],
                }
                : null,
        };
    });
    return {
        status: "ok",
        groupId: group._id,
        venue: group.venue,
        meetingPoint: group.meetingPoint,
        members,
    };
}
async function getMatchGroupMessages(params) {
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const groupObjectId = new mongoose_1.Types.ObjectId(params.groupId);
    const group = await MatchGroup_1.MatchGroupModel.findOne({
        _id: groupObjectId,
        userIds: userObjectId,
    });
    if (!group) {
        return {
            status: "not_found",
            message: "Match group not found",
        };
    }
    if (group.status !== "confirmed") {
        return {
            status: "dissolved",
            message: "Match group has been dissolved",
        };
    }
    const messages = await MatchChatMessage_1.MatchChatMessageModel.find({ groupId: groupObjectId }).sort({ createdAt: 1 }).limit(200);
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId.toString()))).map((id) => new mongoose_1.Types.ObjectId(id));
    const users = await User_1.UserModel.find({ _id: { $in: senderIds } });
    const senderById = new Map(users.map((u) => [u._id.toString(), u]));
    return {
        status: "ok",
        groupId: group._id,
        messages: messages.map((m) => {
            const sender = senderById.get(m.senderId.toString());
            return {
                id: m._id,
                senderId: m.senderId,
                senderName: sender?.name ?? "Unknown",
                message: m.message,
                createdAt: m.createdAt,
            };
        }),
    };
}
async function sendMatchGroupMessage(params) {
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const groupObjectId = new mongoose_1.Types.ObjectId(params.groupId);
    const group = await MatchGroup_1.MatchGroupModel.findOne({
        _id: groupObjectId,
        userIds: userObjectId,
    });
    if (!group) {
        return {
            status: "not_found",
            message: "Match group not found",
        };
    }
    if (group.status !== "confirmed") {
        return {
            status: "dissolved",
            message: "Match group has been dissolved",
        };
    }
    const normalizedMessage = params.message.trim();
    if (!normalizedMessage) {
        return {
            status: "invalid",
            message: "message is required",
        };
    }
    const created = await MatchChatMessage_1.MatchChatMessageModel.create({
        groupId: groupObjectId,
        senderId: userObjectId,
        message: normalizedMessage,
    });
    const sender = await User_1.UserModel.findById(userObjectId);
    return {
        status: "ok",
        groupId: group._id,
        message: {
            id: created._id,
            senderId: created.senderId,
            senderName: sender?.name ?? "Unknown",
            message: created.message,
            createdAt: created.createdAt,
        },
    };
}
async function getActiveMatchGroup(params) {
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const group = await MatchGroup_1.MatchGroupModel.findOne({
        userIds: userObjectId,
        status: "confirmed",
    }).sort({ createdAt: -1 });
    if (!group) {
        return {
            status: "none",
        };
    }
    return {
        status: "ok",
        groupId: group._id,
    };
}
async function leaveMatchGroup(params) {
    const userObjectId = new mongoose_1.Types.ObjectId(params.userId);
    const groupObjectId = new mongoose_1.Types.ObjectId(params.groupId);
    const group = await MatchGroup_1.MatchGroupModel.findOne({
        _id: groupObjectId,
        userIds: userObjectId,
    });
    if (!group) {
        return {
            status: "not_found",
            message: "Match group not found",
        };
    }
    if (group.status !== "confirmed") {
        return {
            status: "dissolved",
            message: "Match group has been dissolved",
        };
    }
    await MatchGroup_1.MatchGroupModel.updateOne({ _id: group._id }, {
        $set: { status: "cancelled" },
    });
    await MatchRequest_1.MatchRequestModel.updateMany({ _id: { $in: group.requestIds } }, {
        $set: { status: "expired" },
    });
    const users = await User_1.UserModel.find({ _id: { $in: group.userIds } });
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const matchedRequests = await MatchRequest_1.MatchRequestModel.find({ _id: { $in: group.requestIds } });
    const requestByUserId = new Map(matchedRequests.map((req) => [req.userId.toString(), req]));
    const requeueStartTime = new Date(Date.now() + 15 * 60 * 1000);
    const requeuedUserIds = [];
    for (const memberId of group.userIds) {
        const userId = memberId.toString();
        const existingSearching = await MatchRequest_1.MatchRequestModel.findOne({
            userId: memberId,
            status: "searching",
        });
        if (existingSearching) {
            requeuedUserIds.push(userId);
            continue;
        }
        const user = userById.get(userId);
        const request = requestByUserId.get(userId);
        const userCoords = user?.location?.coordinates;
        const requestCoords = request?.location?.coordinates;
        let lon;
        let lat;
        if (Array.isArray(userCoords) &&
            userCoords.length === 2 &&
            Number.isFinite(userCoords[0]) &&
            Number.isFinite(userCoords[1])) {
            lon = userCoords[0];
            lat = userCoords[1];
        }
        else if (Array.isArray(requestCoords) &&
            requestCoords.length === 2 &&
            Number.isFinite(requestCoords[0]) &&
            Number.isFinite(requestCoords[1])) {
            lon = requestCoords[0];
            lat = requestCoords[1];
        }
        else {
            lon = group.meetingPoint.lon;
            lat = group.meetingPoint.lat;
        }
        try {
            await MatchRequest_1.MatchRequestModel.create({
                userId: memberId,
                stakeLevel: group.stakeLevel,
                startTime: requeueStartTime,
                status: "searching",
                location: {
                    type: "Point",
                    coordinates: [lon, lat],
                },
            });
            requeuedUserIds.push(userId);
        }
        catch {
            const fallbackSearching = await MatchRequest_1.MatchRequestModel.findOne({
                userId: memberId,
                status: "searching",
            });
            if (fallbackSearching) {
                requeuedUserIds.push(userId);
            }
        }
    }
    return {
        status: "ok",
        groupId: group._id,
        requeuedUserIds,
        message: "Group dissolved and all members were re-queued",
    };
}
