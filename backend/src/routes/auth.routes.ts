import { Router } from "express";
import { requestOtp, updateLocation, verifyOtp } from "../controllers/auth.controller";

const router = Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/location", updateLocation);

export default router;
