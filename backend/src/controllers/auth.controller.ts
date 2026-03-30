import { Request, Response } from "express";
import { UserModel } from "../models/User";
import { generateOtp, sendOtpEmail } from "../services/otp.service";

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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

    return res.json({
      message: "verified",
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to verify OTP" });
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
