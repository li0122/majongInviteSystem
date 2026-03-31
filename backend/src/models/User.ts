import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  email: string;
  username: string;
  name: string;
  password: string;
  verified: boolean;
  latestOtp?: string;
  otpExpireAt?: Date;
  fcmToken?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  comparePassword(plainPassword: string): Promise<boolean>;
  updatedAt: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
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
          validator: (value?: number[]) => value === undefined || value.length === 2,
          message: "location.coordinates must contain exactly [lon, lat]",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const hashed = await bcrypt.hash(this.password, 10);
    this.password = hashed;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(plainPassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }

  // Backward compatibility: old accounts may still store plaintext passwords.
  if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$") && !this.password.startsWith("$2y$")) {
    return this.password === plainPassword;
  }

  return bcrypt.compare(plainPassword, this.password);
};

userSchema.index({ location: "2dsphere" });

export const UserModel = model<IUser>("User", userSchema);
