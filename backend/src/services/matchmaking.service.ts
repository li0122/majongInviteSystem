import { Types } from "mongoose";
import { mockVenues } from "../data/venues";
import { MatchGroupModel } from "../models/MatchGroup";
import { IMatchRequest, MatchRequestModel, StakeLevel } from "../models/MatchRequest";
import { UserModel } from "../models/User";
import { sendPushToTokens } from "./push.service";
import { geometricMedian, googleNavigationUrl, haversineDistanceKm } from "../utils/geo";

const MATCH_RADIUS_KM = 15;
const TIME_WINDOW_MINUTES = 60;

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function timeWindow(startTime: Date) {
  const before = new Date(startTime.getTime() - TIME_WINDOW_MINUTES * 60 * 1000);
  const after = new Date(startTime.getTime() + TIME_WINDOW_MINUTES * 60 * 1000);
  return { before, after };
}

function pickBestVenue(target: { lat: number; lon: number }) {
  const candidates = mockVenues.filter((v) => v.available);
  if (!candidates.length) {
    throw new Error("No available venues");
  }

  let best = candidates[0];
  let bestDistance = haversineDistanceKm(target, { lat: best.lat, lon: best.lon });

  for (const venue of candidates.slice(1)) {
    const d = haversineDistanceKm(target, { lat: venue.lat, lon: venue.lon });
    if (d < bestDistance) {
      best = venue;
      bestDistance = d;
    }
  }

  return {
    ...best,
    navigationUrl: googleNavigationUrl(best.lat, best.lon),
  };
}

async function notifyNearbyUsers(reference: IMatchRequest) {
  const nearbyUsers = await UserModel.find({
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
    .filter((token): token is string => Boolean(token));

  await sendPushToTokens(
    tokens,
    "附近有人發起麻將配對",
    `${reference.stakeLevel} 場，預計 ${reference.startTime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 開打`,
    { type: "match_invite", stakeLevel: reference.stakeLevel }
  );
}

export async function startMatchmaking(params: {
  userId: string;
  stakeLevel: StakeLevel;
  startTime: string;
  lat: number;
  lon: number;
}) {
  const start = toDate(params.startTime);
  const request = await MatchRequestModel.create({
    userId: new Types.ObjectId(params.userId),
    stakeLevel: params.stakeLevel,
    startTime: start,
    status: "searching",
    location: {
      type: "Point",
      coordinates: [params.lon, params.lat],
    },
  });

  await notifyNearbyUsers(request);

  const { before, after } = timeWindow(start);

  const candidates = await MatchRequestModel.find({
    _id: { $ne: request._id },
    stakeLevel: params.stakeLevel,
    status: "searching",
    startTime: { $gte: before, $lte: after },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [params.lon, params.lat],
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

  const meetingPoint = geometricMedian(points);
  const venue = pickBestVenue(meetingPoint);

  await MatchRequestModel.updateMany(
    { _id: { $in: selected.map((r) => r._id) } },
    { $set: { status: "matched" } }
  );

  const group = await MatchGroupModel.create({
    requestIds: selected.map((r) => r._id),
    userIds: selected.map((r) => r.userId),
    stakeLevel: params.stakeLevel,
    startTime: start,
    meetingPoint,
    venue: {
      name: venue.name,
      lat: venue.lat,
      lon: venue.lon,
      navigationUrl: venue.navigationUrl,
    },
    status: "confirmed",
  });

  const groupUsers = await UserModel.find({ _id: { $in: selected.map((r) => r.userId) } });
  const tokens = groupUsers
    .map((u) => u.fcmToken)
    .filter((token): token is string => Boolean(token));

  await sendPushToTokens(
    tokens,
    "4 人麻將桌已成立",
    `集合地點：${venue.name}，請準時到場。`,
    {
      type: "match_confirmed",
      matchGroupId: group._id.toString(),
      venueName: venue.name,
      navUrl: venue.navigationUrl,
    }
  );

  return {
    status: "matched",
    groupId: group._id,
    venue,
    meetingPoint,
    startTime: start,
  };
}

export async function getMatchmakingProgress(params: { userId: string; requestId: string }) {
  const request = await MatchRequestModel.findOne({
    _id: new Types.ObjectId(params.requestId),
    userId: new Types.ObjectId(params.userId),
  });

  if (!request) {
    return {
      status: "not_found",
      message: "Match request not found",
    };
  }

  if (request.status === "matched") {
    const group = await MatchGroupModel.findOne({ requestIds: request._id });
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

  const candidates = await MatchRequestModel.find({
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

  return {
    status: "waiting",
    requestId: request._id,
    currentMatchedCount: Math.min(4, candidates.length),
  };
}
