"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchRequestModel = exports.STAKE_LEVELS = void 0;
const mongoose_1 = require("mongoose");
exports.STAKE_LEVELS = ["30/10", "50/20", "100/20", "200/50", "300/100"];
const matchRequestSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stakeLevel: { type: String, enum: exports.STAKE_LEVELS, required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: ["searching", "matched", "expired"],
        default: "searching",
        index: true,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
}, { timestamps: true });
matchRequestSchema.index({ location: "2dsphere" });
matchRequestSchema.index({ userId: 1 }, {
    unique: true,
    partialFilterExpression: { status: "searching" },
    name: "uniq_searching_request_per_user",
});
exports.MatchRequestModel = (0, mongoose_1.model)("MatchRequest", matchRequestSchema);
