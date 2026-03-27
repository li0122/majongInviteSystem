"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const db_1 = require("./config/db");
dotenv_1.default.config();
const port = Number(process.env.PORT || 4000);
async function bootstrap() {
    await (0, db_1.connectMongo)();
    const app = (0, app_1.createApp)();
    app.listen(port, () => {
        console.log(`Mahjong Match backend running on port ${port}`);
    });
}
bootstrap().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});
