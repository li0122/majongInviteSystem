import { Router } from "express";
import {
	getGroupMessages,
	getGroupOverview,
	getMatchProgress,
	postGroupMessage,
	startMatch,
} from "../controllers/matchmaking.controller";

const router = Router();

router.post("/start", startMatch);
router.get("/progress/:requestId", getMatchProgress);
router.get("/group/:groupId/overview", getGroupOverview);
router.get("/group/:groupId/messages", getGroupMessages);
router.post("/group/:groupId/messages", postGroupMessage);

export default router;
