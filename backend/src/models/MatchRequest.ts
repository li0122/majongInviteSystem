import { Schema, model, Document, Types } from "mongoose";

export const STAKE_LEVELS = ["30/10", "50/20", "100/20", "200/50", "300/100"] as const;
export type StakeLevel = (typeof STAKE_LEVELS)[number];

export interface IMatchRequest extends Document {
  userId: Types.ObjectId;
  stakeLevel: StakeLevel;
  startTime: Date;
  status: "searching" | "matched" | "expired";
  location: {
    type: "Point";
    coordinates: [number, number];
  };
}

const matchRequestSchema = new Schema<IMatchRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stakeLevel: { type: String, enum: STAKE_LEVELS, required: true, index: true },
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
  },
  { timestamps: true }
);

matchRequestSchema.index({ location: "2dsphere" });
matchRequestSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "searching" },
    name: "uniq_searching_request_per_user",
  }
);

export const MatchRequestModel = model<IMatchRequest>("MatchRequest", matchRequestSchema);
