"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectMongo() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("MONGO_URI is required");
    }
    await mongoose_1.default.connect(uri);
    console.log("MongoDB connected");
}
