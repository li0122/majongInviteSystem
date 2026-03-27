"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
exports.updateLocation = updateLocation;
const User_1 = require("../models/User");
const otp_service_1 = require("../services/otp.service");
const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
async function requestOtp(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }
        const normalized = email.toLowerCase().trim();
        const otp = (0, otp_service_1.generateOtp)();
        const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
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
        return res.status(500).json({ message: "Failed to request OTP" });
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
        return res.json({
            message: "verified",
            user: {
                id: user._id,
                email: user.email,
                verified: user.verified,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to verify OTP" });
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
