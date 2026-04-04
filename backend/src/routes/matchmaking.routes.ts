import { Router } from "express";
import {
	getActiveGroup,
	getGroupMessages,
	getGroupOverview,
	getMatchProgress,
	postLeaveGroup,
	postGroupMessage,
	startMatch,
} from "../controllers/matchmaking.controller";

const router = Router();

router.post("/start", startMatch);
router.get("/progress/:requestId", getMatchProgress);
router.get("/group/active", getActiveGroup);
router.get("/group/:groupId/overview", getGroupOverview);
router.get("/group/:groupId/messages", getGroupMessages);
router.post("/group/:groupId/messages", postGroupMessage);
router.post("/group/:groupId/leave", postLeaveGroup);

export default router;
