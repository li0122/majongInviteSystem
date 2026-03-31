"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.updateLocation = updateLocation;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const otp_service_1 = require("../services/otp.service");
const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
function generateToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}
function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
async function register(req, res) {
    try {
        const { name, username, password, email } = req.body;
        if (!name || !username || !password || !email) {
            return res.status(400).json({ message: "name, username, password, email are required" });
        }
        // Check if username already exists
        const existing = await User_1.UserModel.findOne({ username: username.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ message: "Username already exists" });
        }
        const normalized = email.toLowerCase().trim();
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const otp = (0, otp_service_1.generateOtp)();
        const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
        // Create or update user with OTP pending registration
        await User_1.UserModel.findOneAndUpdate({ email: normalized }, {
            $set: {
                email: normalized,
                username: username.toLowerCase().trim(),
                name,
                password: hashedPassword,
                latestOtp: otp,
                otpExpireAt: expireAt,
                verified: false,
            },
        }, { upsert: true, new: true });
        await (0, otp_service_1.sendOtpEmail)(normalized, otp);
        return res.json({ message: "OTP sent for registration" });
    }
    catch (error) {
        console.error(error);
        const isProduction = process.env.NODE_ENV === "production";
        const reason = toErrorMessage(error);
        return res.status(500).json({
            message: isProduction ? "Failed to register" : `Failed to register: ${reason}`,
        });
    }
}
async function requestOtp(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }
        const normalized = email.toLowerCase().trim();
        const otp = (0, otp_service_1.generateOtp)();
        const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
        // Legacy records may contain invalid GeoJSON like coordinates: [].
        // Remove invalid location first so unrelated OTP updates do not fail on 2dsphere index checks.
        await User_1.UserModel.updateOne({
            email: normalized,
            $or: [
                { "location.type": { $exists: true, $ne: "Point" } },
                { "location.coordinates.1": { $exists: false } },
                { "location.coordinates.2": { $exists: true } },
            ],
        }, {
            $unset: { location: 1 },
        });
        await User_1.UserModel.findOneAndUpdate({ email: normalized }, {
            $set: {
                email: normalized,
                latestOtp: otp,
                otpExpireAt: expireAt,
            },
        }, { upsert: true, new: true });
        await (0, otp_service_1.sendOtpEmail)(normalized, otp);
        return res.json({ message: "OTP sent" });
    }
    catch (error) {
        console.error(error);
        const isProduction = process.env.NODE_ENV === "production";
        const reason = toErrorMessage(error);
        return res.status(500).json({
            message: isProduction ? "Failed to request OTP" : `Failed to request OTP: ${reason}`,
        });
    }
}
async function verifyOtp(req, res) {
    try {
        const { email, otp, fcmToken } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "email and otp are required" });
        }
        const user = await User_1.UserModel.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.latestOtp || !user.otpExpireAt) {
            return res.status(404).json({ message: "OTP not requested" });
        }
        if (user.otpExpireAt.getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP expired" });
        }
        if (user.latestOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        user.verified = true;
        user.latestOtp = undefined;
        user.otpExpireAt = undefined;
        if (fcmToken) {
            user.fcmToken = fcmToken;
        }
        await user.save();
        const token = generateToken(user._id.toString());
        return res.json({
            message: "verified",
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                verified: user.verified,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to verify OTP" });
    }
}
async function login(req, res) {
    try {
        const { username, password, fcmToken } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "username and password are required" });
        }
        const user = await User_1.UserModel.findOne({ username: username.toLowerCase().trim() });
        if (!user || !user.verified) {
            return res.status(401).json({ message: "Invalid credentials or user not verified" });
        }
        const passwordMatches = await user.comparePassword(password);
        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        if (fcmToken) {
            user.fcmToken = fcmToken;
            await user.save();
        }
        const token = generateToken(user._id.toString());
        return res.json({
            message: "logged in",
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                verified: user.verified,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to login" });
    }
}
async function updateLocation(req, res) {
    try {
        const { userId, lat, lon } = req.body;
        if (!userId || typeof lat !== "number" || typeof lon !== "number") {
            return res.status(400).json({ message: "userId, lat, lon are required" });
        }
        const user = await User_1.UserModel.findByIdAndUpdate(userId, {
            $set: {
                location: {
                    type: "Point",
                    coordinates: [lon, lat],
                },
            },
        }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ message: "location updated" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update location" });
    }
}
