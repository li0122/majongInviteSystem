"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    verified: { type: Boolean, default: false },
    latestOtp: { type: String },
    otpExpireAt: { type: Date },
    fcmToken: { type: String },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: undefined,
        },
        coordinates: {
            type: [Number],
            default: undefined,
            validate: {
                validator: (value) => value === undefined || value.length === 2,
                message: "location.coordinates must contain exactly [lon, lat]",
            },
        },
    },
}, {
    timestamps: true,
});
userSchema.index({ location: "2dsphere" });
exports.UserModel = (0, mongoose_1.model)("User", userSchema);
