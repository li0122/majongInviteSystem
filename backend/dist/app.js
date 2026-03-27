"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const matchmaking_routes_1 = __importDefault(require("./routes/matchmaking.routes"));
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ ok: true, service: "mahjong-match-backend" });
    });
    app.use("/api/auth", auth_routes_1.default);
    app.use("/api/matchmaking", matchmaking_routes_1.default);
    return app;
}
