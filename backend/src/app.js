import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import multer from "multer";

import { requireAuth } from "./middleware/auth.js";
import { requireAdmin } from "./middleware/requireAdmin.js";
import { requireActivePlan } from "./middleware/requireActivePlan.js";

import jobsRoutes from "./routes/jobs.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import preferencesRoutes from "./routes/preferences.routes.js";
import savedJobsRoutes from "./routes/savedJobs.routes.js";
import internalJobsRoutes from "./routes/internalJobs.routes.js";
import applicationsRoutes from "./routes/applications.routes.js";
import resumesRoutes from "./routes/resumes.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import { razorpayWebhook } from "./routes/paymentsWebhook.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// =============================
// Middleware
// =============================

// Lock CORS to the frontend origin(s). Set CORS_ORIGIN in prod (comma-separated).
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// In development also accept the Vite dev server on localhost or over the LAN
// (e.g. http://172.16.1.150:5175 from a phone). Private-range IPs only, and
// only when not in production — DHCP reassigns the machine's IP, so it can't
// be whitelisted statically.
//
// The port is a RANGE (5170-5189), not a fixed 5173: when 5173 is already
// taken Vite silently falls back to 5174/5175/..., and pinning the port here
// made the backend reject those origins — the frontend loaded but every API
// call failed CORS, which looks exactly like "the backend is down".
const DEV_LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):51[78]\d$/;

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin/curl (no origin) and whitelisted browsers
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== "production" && DEV_LAN_ORIGIN.test(origin))
        return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

// Razorpay webhook needs the raw body for HMAC verification — register it
// BEFORE the JSON parser so express.json() doesn't consume the stream.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook,
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =============================
// Health Check (public)
// =============================

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "AIFAGen Backend Running", timestamp: new Date() });
});

// =============================
// Routes (all require a valid Supabase JWT)
// =============================

// Profile + payments are reachable WITHOUT an active plan — a new user must
// be able to read their own status and complete checkout. Everything else is
// a paid product feature and requires an active plan server-side (B3), the
// same gate the frontend app shell already enforces (isSubscribed()).
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/payments", requireAuth, paymentsRoutes);
app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);

app.use("/api/jobs", requireAuth, requireActivePlan, jobsRoutes);
app.use("/api/preferences", requireAuth, requireActivePlan, preferencesRoutes);
app.use("/api/saved-jobs", requireAuth, requireActivePlan, savedJobsRoutes);
app.use("/api/internal-jobs", requireAuth, requireActivePlan, internalJobsRoutes);
app.use("/api/applications", requireAuth, requireActivePlan, applicationsRoutes);
app.use("/api/resumes", requireAuth, requireActivePlan, resumesRoutes);
app.use("/api/ai", requireAuth, requireActivePlan, aiRoutes);
app.use("/api/analytics", requireAuth, requireActivePlan, analyticsRoutes);

// =============================
// 404
// =============================

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found." });
});

// =============================
// Error handler (must be last, and must have 4 args to be recognized by
// Express as an error handler). Without this, any thrown/forwarded error —
// a multer "file too large", a route that throws instead of returning a
// response — falls through to Express's default handler, which sends an
// HTML page with a full stack trace (leaking absolute server paths). Every
// error out of this API should be JSON.
// =============================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That file is too large — the limit is 10 MB."
        : `Upload error: ${err.message}`;
    return res.status(status).json({ success: false, message });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large." });
  }

  console.error("Unhandled error:", err);
  const status = Number.isInteger(err?.status) ? err.status : 500;
  // Never echo err.message to the client in production — it can carry file
  // paths, SQL, or stack fragments. A fixed string is safe; the real error
  // is in the server log above.
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong on our end. Please try again."
      : String(err?.message || "Internal error");
  res.status(status).json({ success: false, message });
});

export default app;
