"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMatch = startMatch;
exports.getMatchProgress = getMatchProgress;
exports.getGroupOverview = getGroupOverview;
exports.getGroupMessages = getGroupMessages;
exports.postGroupMessage = postGroupMessage;
exports.getActiveGroup = getActiveGroup;
exports.postLeaveGroup = postLeaveGroup;
const MatchRequest_1 = require("../models/MatchRequest");
const matchmaking_service_1 = require("../services/matchmaking.service");
async function startMatch(req, res) {
    try {
        const { userId, stakeLevel, startTime, lat, lon } = req.body;
        if (!userId || !stakeLevel || !startTime || typeof lat !== "number" || typeof lon !== "number") {
            return res.status(400).json({ message: "userId, stakeLevel, startTime, lat, lon are required" });
        }
        if (!MatchRequest_1.STAKE_LEVELS.includes(stakeLevel)) {
            return res.status(400).json({ message: "invalid stakeLevel" });
        }
        const result = await (0, matchmaking_service_1.startMatchmaking)({
            userId,
            stakeLevel: stakeLevel,
            startTime,
            lat,
            lon,
        });
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to start matchmaking" });
    }
}
async function getMatchProgress(req, res) {
    try {
        const requestId = req.params.requestId;
        const userId = req.query.userId?.toString();
        if (!requestId || !userId) {
            return res.status(400).json({ message: "requestId and userId are required" });
        }
        const result = await (0, matchmaking_service_1.getMatchmakingProgress)({ requestId, userId });
        if (result.status === "not_found") {
            return res.status(404).json({ message: result.message });
        }
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to get matchmaking progress" });
    }
}
async function getGroupOverview(req, res) {
    try {
        const groupId = req.params.groupId;
        const userId = req.query.userId?.toString();
        if (!groupId || !userId) {
            return res.status(400).json({ message: "groupId and userId are required" });
        }
        const result = await (0, matchmaking_service_1.getMatchGroupOverview)({ groupId, userId });
        if (result.status === "not_found") {
            return res.status(404).json({ message: result.message });
        }
        if (result.status === "dissolved") {
            return res.status(200).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to get group overview" });
    }
}
async function getGroupMessages(req, res) {
    try {
        const groupId = req.params.groupId;
        const userId = req.query.userId?.toString();
        if (!groupId || !userId) {
            return res.status(400).json({ message: "groupId and userId are required" });
        }
        const result = await (0, matchmaking_service_1.getMatchGroupMessages)({ groupId, userId });
        if (result.status === "not_found") {
            return res.status(404).json({ message: result.message });
        }
        if (result.status === "dissolved") {
            return res.status(200).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to get group messages" });
    }
}
async function postGroupMessage(req, res) {
    try {
        const groupId = req.params.groupId;
        const { userId, message } = req.body;
        if (!groupId || !userId || typeof message !== "string") {
            return res.status(400).json({ message: "groupId, userId, message are required" });
        }
        const result = await (0, matchmaking_service_1.sendMatchGroupMessage)({ groupId, userId, message });
        if (result.status === "not_found") {
            return res.status(404).json({ message: result.message });
        }
        if (result.status === "dissolved") {
            return res.status(409).json({ message: result.message });
        }
        if (result.status === "invalid") {
            return res.status(400).json({ message: result.message });
        }
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to post group message" });
    }
}
async function getActiveGroup(req, res) {
    try {
        const userId = req.query.userId?.toString();
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        const result = await (0, matchmaking_service_1.getActiveMatchGroup)({ userId });
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to get active group" });
    }
}
async function postLeaveGroup(req, res) {
    try {
        const groupId = req.params.groupId;
        const { userId } = req.body;
        if (!groupId || !userId) {
            return res.status(400).json({ message: "groupId and userId are required" });
        }
        const result = await (0, matchmaking_service_1.leaveMatchGroup)({ groupId, userId });
        if (result.status === "not_found") {
            return res.status(404).json({ message: result.message });
        }
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to leave group" });
    }
}
