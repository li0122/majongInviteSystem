"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    password: { type: String },
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
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const hashed = await bcryptjs_1.default.hash(this.password, 10);
        this.password = hashed;
        next();
    }
    catch (error) {
        next(error);
    }
});
// Compare password method
userSchema.methods.comparePassword = async function (plainPassword) {
    if (!this.password) {
        return false;
    }
    // Backward compatibility: old accounts may still store plaintext passwords.
    if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$") && !this.password.startsWith("$2y$")) {
        return this.password === plainPassword;
    }
    return bcryptjs_1.default.compare(plainPassword, this.password);
};
userSchema.index({ location: "2dsphere" });
exports.UserModel = (0, mongoose_1.model)("User", userSchema);
