import express from "express";

// The WhatsApp job-seeker community is free to join. The landing page asks
// for the invite link here so it can be changed in the server env
// (COMMUNITY_WHATSAPP_URL) without rebuilding the site. Public, no login.
const router = express.Router();

function inviteLink() {
  const url = process.env.COMMUNITY_WHATSAPP_URL;
  return url && url.startsWith("https://chat.whatsapp.com/") ? url : null;
}

router.get("/", (req, res) => {
  const link = inviteLink();
  if (!link) {
    console.error("COMMUNITY_WHATSAPP_URL not set — community link unavailable");
    return res.status(503).json({ success: false, message: "The community link isn't available right now." });
  }
  return res.json({ success: true, link });
});

export default router;
