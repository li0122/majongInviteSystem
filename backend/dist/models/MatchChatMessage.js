"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchChatMessageModel = void 0;
const mongoose_1 = require("mongoose");
const matchChatMessageSchema = new mongoose_1.Schema({
    groupId: { type: mongoose_1.Schema.Types.ObjectId, ref: "MatchGroup", required: true, index: true },
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });
matchChatMessageSchema.index({ groupId: 1, createdAt: 1 });
exports.MatchChatMessageModel = (0, mongoose_1.model)("MatchChatMessage", matchChatMessageSchema);
