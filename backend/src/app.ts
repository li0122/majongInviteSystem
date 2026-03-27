import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import matchmakingRoutes from "./routes/matchmaking.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "mahjong-match-backend" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/matchmaking", matchmakingRoutes);

  return app;
}
