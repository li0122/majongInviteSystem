"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchGroupModel = void 0;
const mongoose_1 = require("mongoose");
const matchGroupSchema = new mongoose_1.Schema({
    requestIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "MatchRequest", required: true }],
    userIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }],
    stakeLevel: { type: String, required: true },
    startTime: { type: Date, required: true },
    meetingPoint: {
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
    },
    venue: {
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
        navigationUrl: { type: String, required: true },
    },
    status: {
        type: String,
        enum: ["confirmed", "cancelled"],
        default: "confirmed",
    },
}, { timestamps: true });
exports.MatchGroupModel = (0, mongoose_1.model)("MatchGroup", matchGroupSchema);
