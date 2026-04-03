import { Schema, model, Document, Types } from "mongoose";

export interface IMatchChatMessage extends Document {
  groupId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const matchChatMessageSchema = new Schema<IMatchChatMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "MatchGroup", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

matchChatMessageSchema.index({ groupId: 1, createdAt: 1 });

export const MatchChatMessageModel = model<IMatchChatMessage>("MatchChatMessage", matchChatMessageSchema);