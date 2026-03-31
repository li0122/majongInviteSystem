import { Router } from "express";
import { getMatchProgress, startMatch } from "../controllers/matchmaking.controller";

const router = Router();

router.post("/start", startMatch);
router.get("/progress/:requestId", getMatchProgress);

export default router;
