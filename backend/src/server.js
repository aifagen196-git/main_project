import "dotenv/config";
import app from "./app.js";
import { warmJobPoolCache } from "./services/jobs/matching.service.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running`);
  console.log("========================================");
  console.log("🚀 AIFAGen Backend Started");
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server      : http://localhost:${PORT}`);
  console.log("========================================");

  // Fire-and-forget: pre-warm the job matching pool so the first real user
  // request doesn't pay the ~40-65s cold-load cost and time out client-side
  // (see warmJobPoolCache doc comment). Never blocks startup either way.
  warmJobPoolCache();
});
