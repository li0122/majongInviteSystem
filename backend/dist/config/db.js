"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectMongo() {
    const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGO_URI (or MONGODB_URI) is required");
    }
    try {
        await mongoose_1.default.connect(uri, {
            serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 10000),
        });
        console.log(`MongoDB connected (${redactMongoUri(uri)})`);
    }
    catch (error) {
        if (isLoopbackMongoUri(uri)) {
            console.error("MongoDB URI points to localhost/loopback. In cloud VM deployments, localhost only refers to the VM itself.");
        }
        throw error;
    }
}
function redactMongoUri(uri) {
    return uri.replace(/\/\/([^@/]+)@/, "//***@");
}
function isLoopbackMongoUri(uri) {
    return /localhost|127\.0\.0\.1|\[::1\]|::1/.test(uri);
}
