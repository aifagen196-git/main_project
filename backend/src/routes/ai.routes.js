import express from "express";
import { completeJson, completeText } from "../services/ai/anthropic.service.js";
import { consumeAiUsage } from "../services/ai/usage.js";

const router = express.Router();

// Generic completion. body: { prompt, system?, max_tokens?, json? }
router.post("/complete", async (req, res) => {
  const { prompt, system, max_tokens = 3000, json = true } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ success: false, message: "Missing prompt" });
  }

  try {
    const allowed = await consumeAiUsage(req.user.id);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "AI plan inactive or daily usage limit reached",
      });
    }

    if (json) {
      const analysis = await completeJson(prompt, system, max_tokens);
      return res.json({ success: true, analysis });
    }
    const text = await completeText(prompt, system, max_tokens);
    return res.json({ success: true, text });
  } catch (e) {
    console.error("AI complete failed", e);
    // JSON parse failures shouldn't 500 the client; surface the raw text.
    if (e instanceof SyntaxError) {
      return res.status(502).json({ success: false, message: "AI returned invalid JSON" });
    }
    return res.status(502).json({ success: false, message: e.message });
  }
});

export default router;
