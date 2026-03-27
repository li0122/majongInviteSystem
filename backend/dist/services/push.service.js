"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToTokens = sendPushToTokens;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let initialized = false;
function initFirebaseIfNeeded() {
    if (initialized) {
        return;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!projectId || !encoded) {
        return;
    }
    const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        projectId,
    });
    initialized = true;
}
async function sendPushToTokens(tokens, title, body, data) {
    if (!tokens.length) {
        return;
    }
    initFirebaseIfNeeded();
    if (!initialized) {
        console.log("[PUSH MOCK]", { tokens, title, body, data });
        return;
    }
    await firebase_admin_1.default.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
    });
}
