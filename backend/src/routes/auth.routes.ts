import { Router } from "express";
import { register, requestOtp, updateLocation, verifyOtp, login } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/location", updateLocation);

export default router;
