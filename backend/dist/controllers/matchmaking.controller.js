"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMatch = startMatch;
exports.getMatchProgress = getMatchProgress;
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
