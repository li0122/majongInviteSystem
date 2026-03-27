import { Request, Response } from "express";
import { STAKE_LEVELS } from "../models/MatchRequest";
import { startMatchmaking } from "../services/matchmaking.service";

export async function startMatch(req: Request, res: Response) {
  try {
    const { userId, stakeLevel, startTime, lat, lon } = req.body as {
      userId?: string;
      stakeLevel?: string;
      startTime?: string;
      lat?: number;
      lon?: number;
    };

    if (!userId || !stakeLevel || !startTime || typeof lat !== "number" || typeof lon !== "number") {
      return res.status(400).json({ message: "userId, stakeLevel, startTime, lat, lon are required" });
    }

    if (!STAKE_LEVELS.includes(stakeLevel as (typeof STAKE_LEVELS)[number])) {
      return res.status(400).json({ message: "invalid stakeLevel" });
    }

    const result = await startMatchmaking({
      userId,
      stakeLevel: stakeLevel as (typeof STAKE_LEVELS)[number],
      startTime,
      lat,
      lon,
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to start matchmaking" });
  }
}
