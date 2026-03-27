import { Schema, model, Document, Types } from "mongoose";

export interface IMatchGroup extends Document {
  requestIds: Types.ObjectId[];
  userIds: Types.ObjectId[];
  stakeLevel: string;
  startTime: Date;
  meetingPoint: {
    lat: number;
    lon: number;
  };
  venue: {
    name: string;
    lat: number;
    lon: number;
    navigationUrl: string;
  };
  status: "confirmed" | "cancelled";
}

const matchGroupSchema = new Schema<IMatchGroup>(
  {
    requestIds: [{ type: Schema.Types.ObjectId, ref: "MatchRequest", required: true }],
    userIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    stakeLevel: { type: String, required: true },
    startTime: { type: Date, required: true },
    meetingPoint: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    venue: {
      name: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
      navigationUrl: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

export const MatchGroupModel = model<IMatchGroup>("MatchGroup", matchGroupSchema);
