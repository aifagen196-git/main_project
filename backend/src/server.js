import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running`);
  console.log("========================================");
  console.log("🚀 AIFAGen Backend Started");
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server      : http://localhost:${PORT}`);
  console.log("========================================");
});
