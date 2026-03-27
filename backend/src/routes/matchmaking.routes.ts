import { Router } from "express";
import { startMatch } from "../controllers/matchmaking.controller";

const router = Router();

router.post("/start", startMatch);

export default router;
