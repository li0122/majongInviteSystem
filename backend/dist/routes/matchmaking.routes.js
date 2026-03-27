"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchmaking_controller_1 = require("../controllers/matchmaking.controller");
const router = (0, express_1.Router)();
router.post("/start", matchmaking_controller_1.startMatch);
exports.default = router;
