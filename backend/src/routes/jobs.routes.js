import express from "express";
import { getJobMatches, searchJobMatches } from "../controllers/jobs.controller.js";
import { matchRateLimiter } from "../middleware/rateLimiter.js";

// requireAuth is applied at the mount point in app.js.
const router = express.Router();

router.get("/matches", matchRateLimiter, getJobMatches);
router.get("/search", searchJobMatches);

export default router;
