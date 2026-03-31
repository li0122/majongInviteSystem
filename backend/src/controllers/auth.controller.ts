import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { generateOtp, sendOtpEmail } from "../services/otp.service";

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function register(req: Request, res: Response) {
  try {
    const { name, username, password, email } = req.body as {
      name?: string;
      username?: string;
      password?: string;
      email?: string;
    };

    if (!name || !username || !password || !email) {
      return res.status(400).json({ message: "name, username, password, email are required" });
    }

    // Check if username already exists
    const existing = await UserModel.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const normalized = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    // Create or update user with OTP pending registration
    await UserModel.findOneAndUpdate(
      { email: normalized },
      {
        $set: {
          email: normalized,
          username: username.toLowerCase().trim(),
          name,
          password: hashedPassword,
          latestOtp: otp,
          otpExpireAt: expireAt,
          verified: false,
        },
      },
      { upsert: true, new: true }
    );

    await sendOtpEmail(normalized, otp);

    return res.json({ message: "OTP sent for registration" });
  } catch (error) {
    console.error(error);
    const isProduction = process.env.NODE_ENV === "production";
    const reason = toErrorMessage(error);

    return res.status(500).json({
      message: isProduction ? "Failed to register" : `Failed to register: ${reason}`,
    });
  }
}

export async function requestOtp(req: Request, res: Response) {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const normalized = email.toLowerCase().trim();
    const otp = generateOtp();
    const expireAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

    // Legacy records may contain invalid GeoJSON like coordinates: [].
    // Remove invalid location first so unrelated OTP updates do not fail on 2dsphere index checks.
    await UserModel.updateOne(
      {
        email: normalized,
        $or: [
          { "location.type": { $exists: true, $ne: "Point" } },
          { "location.coordinates.1": { $exists: false } },
          { "location.coordinates.2": { $exists: true } },
        ],
      },
      {
        $unset: { location: 1 },
      }
    );

    await UserModel.findOneAndUpdate(
      { email: normalized },
      {
        $set: {
          email: normalized,
          latestOtp: otp,
          otpExpireAt: expireAt,
        },
      },
      { upsert: true, new: true }
    );

    await sendOtpEmail(normalized, otp);

    return res.json({ message: "OTP sent" });
  } catch (error) {
    console.error(error);
    const isProduction = process.env.NODE_ENV === "production";
    const reason = toErrorMessage(error);

    return res.status(500).json({
      message: isProduction ? "Failed to request OTP" : `Failed to request OTP: ${reason}`,
    });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp, fcmToken } = req.body as { email?: string; otp?: string; fcmToken?: string };

    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password, fcmToken } = req.body as {
      username?: string;
      password?: string;
      fcmToken?: string;
    };

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const user = await UserModel.findOne({ username: username.toLowerCase().trim() });
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to login" });
  }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const { userId, lat, lon } = req.body as { userId?: string; lat?: number; lon?: number };

    if (!userId || typeof lat !== "number" || typeof lon !== "number") {
      return res.status(400).json({ message: "userId, lat, lon are required" });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [lon, lat],
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "location updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update location" });
  }
}
