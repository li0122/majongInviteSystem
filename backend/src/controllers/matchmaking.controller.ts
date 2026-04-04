import { Request, Response } from "express";
import { STAKE_LEVELS } from "../models/MatchRequest";
import {
  getActiveMatchGroup,
  getMatchGroupMessages,
  getMatchGroupOverview,
  getMatchmakingProgress,
  leaveMatchGroup,
  sendMatchGroupMessage,
  startMatchmaking,
} from "../services/matchmaking.service";

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

export async function getMatchProgress(req: Request, res: Response) {
  try {
    const requestId = req.params.requestId;
    const userId = req.query.userId?.toString();

    if (!requestId || !userId) {
      return res.status(400).json({ message: "requestId and userId are required" });
    }

    const result = await getMatchmakingProgress({ requestId, userId });

    if (result.status === "not_found") {
      return res.status(404).json({ message: result.message });
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get matchmaking progress" });
  }
}

export async function getGroupOverview(req: Request, res: Response) {
  try {
    const groupId = req.params.groupId;
    const userId = req.query.userId?.toString();

    if (!groupId || !userId) {
      return res.status(400).json({ message: "groupId and userId are required" });
    }

    const result = await getMatchGroupOverview({ groupId, userId });
    if (result.status === "not_found") {
      return res.status(404).json({ message: result.message });
    }
    if (result.status === "dissolved") {
      return res.status(200).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get group overview" });
  }
}

export async function getGroupMessages(req: Request, res: Response) {
  try {
    const groupId = req.params.groupId;
    const userId = req.query.userId?.toString();

    if (!groupId || !userId) {
      return res.status(400).json({ message: "groupId and userId are required" });
    }

    const result = await getMatchGroupMessages({ groupId, userId });
    if (result.status === "not_found") {
      return res.status(404).json({ message: result.message });
    }
    if (result.status === "dissolved") {
      return res.status(200).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get group messages" });
  }
}

export async function postGroupMessage(req: Request, res: Response) {
  try {
    const groupId = req.params.groupId;
    const { userId, message } = req.body as { userId?: string; message?: string };

    if (!groupId || !userId || typeof message !== "string") {
      return res.status(400).json({ message: "groupId, userId, message are required" });
    }

    const result = await sendMatchGroupMessage({ groupId, userId, message });
    if (result.status === "not_found") {
      return res.status(404).json({ message: result.message });
    }
    if (result.status === "dissolved") {
      return res.status(409).json({ message: result.message });
    }
    if (result.status === "invalid") {
      return res.status(400).json({ message: result.message });
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to post group message" });
  }
}

export async function getActiveGroup(req: Request, res: Response) {
  try {
    const userId = req.query.userId?.toString();
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const result = await getActiveMatchGroup({ userId });
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get active group" });
  }
}

export async function postLeaveGroup(req: Request, res: Response) {
  try {
    const groupId = req.params.groupId;
    const { userId } = req.body as { userId?: string };

    if (!groupId || !userId) {
      return res.status(400).json({ message: "groupId and userId are required" });
    }

    const result = await leaveMatchGroup({ groupId, userId });
    if (result.status === "not_found") {
      return res.status(404).json({ message: result.message });
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to leave group" });
  }
}
