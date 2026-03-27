import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  verified: boolean;
  latestOtp?: string;
  otpExpireAt?: Date;
  fcmToken?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  updatedAt: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    verified: { type: Boolean, default: false },
    latestOtp: { type: String },
    otpExpireAt: { type: Date },
    fcmToken: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });

export const UserModel = model<IUser>("User", userSchema);
