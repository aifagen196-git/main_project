import { supabase } from "../lib/supabase";
import { DEV_PREVIEW, previewApi } from "../devPreview";

// Base URL of the Express backend, resolved per environment.
//
// PRODUCTION IS ALWAYS SAME-ORIGIN — VITE_API_URL is deliberately ignored in a
// production build. Requests go to "/api/..." on the page's own origin, which
// the reverse proxy forwards to this backend.
//
// Why it's forced rather than merely defaulted: the deployment builds with
// VITE_API_URL=https://api.aifagenlabs.com, which makes every call
// cross-origin and therefore CORS-preflighted. The Caddy vhost for that
// subdomain answers OPTIONS itself:
//
//     @options { method OPTIONS }
//     handle @options { respond "" 204 }
//
// so the preflight never reaches Express, comes back with no
// Access-Control-Allow-Origin, and the browser blocks every authenticated
// request ("Response to preflight request doesn't pass access control
// check"). Plain GETs still worked, which made it look intermittent — only
// preflighted requests (anything sending Authorization) failed.
//
// Same-origin requests are never preflighted, so this sidesteps the proxy bug
// entirely. If that Caddy block is ever fixed and a separate API host is
// genuinely wanted, restore the old behaviour by honouring VITE_API_URL here.
//
// In dev, VITE_API_URL still wins when set; otherwise fall back to the page's
// own host on port 5000, so localhost stays localhost and opening the app from
// a phone on the LAN hits the backend on that same IP. (A hardcoded LAN IP in
// .env broke the whole app when DHCP reassigned the address — never pin IPs.)
const API_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, "")
    : `${window.location.protocol}//${window.location.hostname}:5000`
  : "";

async function authHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Default per-request timeout so a down/hung backend surfaces an error instead
// of leaving the UI spinning forever.
const DEFAULT_TIMEOUT_MS = 20000;

// Endpoints that legitimately take longer than the default. The matches feed
// does a full job-pool load on a cold backend (30-60s) — capping it at 20s
// meant every user who opened Job Matches in the ~30s after any
// deploy/restart got a timeout even though the backend would have answered
// (B1). The backend now de-dups the in-flight load and warms it at startup,
// but a request that lands mid-warm-up still needs room to wait it out.
const SLOW_ENDPOINTS = [
  { test: (p) => p.startsWith("/api/jobs/matches"), timeoutMs: 70000 },
  { test: (p) => p.startsWith("/api/jobs/search"), timeoutMs: 45000 },
];
function timeoutFor(path) {
  return SLOW_ENDPOINTS.find((e) => e.test(path))?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    // These strings are shown to end users verbatim (e.g. the "Couldn't load
    // your account" screen), so they must read as product copy, not as a
    // developer hint about a local dev server.
    if (e.name === "AbortError") {
      throw new Error(
        "This is taking longer than usual. Please try again in a moment.",
      );
    }
    // Network error (service down / unreachable / offline).
    throw new Error(
      "We couldn't reach AIFAGen. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

/** JSON request helper. `path` starts with "/api/...". */
export async function apiRequest(path, { method = "GET", body, _retried } = {}) {
  // Dev preview: answer from fixtures so the signed-in UI renders with no
  // backend and no Supabase session. Compiled out of production builds.
  if (DEV_PREVIEW) {
    const stub = await previewApi(path, method, body);
    if (stub !== undefined) return stub;
  }

  const headers = { ...(await authHeader()) };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    timeoutFor(path),
  );

  // Expired access token: refresh the Supabase session once and retry.
  if (res.status === 401 && !_retried) {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) {
      return apiRequest(path, { method, body, _retried: true });
    }
  }

  // 402 = the server-side paywall (requireActivePlan). The plan lapsed or was
  // never active — send the user to Pricing. Signal it distinctly so callers
  // (and AIFAGen.jsx) can react rather than showing a generic error.
  if (res.status === 402) {
    const err = new Error("An active plan is required.");
    err.status = 402;
    err.code = "PLAN_REQUIRED";
    throw err;
  }

  return handle(res);
}

/** Multipart upload helper (does not set Content-Type — the browser does).
 *  Uses a long timeout because the backend does text extraction + LLM analysis
 *  server-side during the upload. */
export async function apiUpload(path, formData) {
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: formData,
    },
    90000,
  );
  return handle(res);
}

/** POSTs JSON and downloads the binary response as a file. Long default
 *  timeout — document generation may involve an LLM call server-side. */
export async function apiDownload(path, body, filename, timeoutMs = 120000) {
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: "POST",
      headers: { ...(await authHeader()), "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    timeoutMs,
  );
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      msg = (await res.json())?.message || msg;
    } catch {
      /* binary/empty error body */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: (p) => apiRequest(p),
  post: (p, body) => apiRequest(p, { method: "POST", body }),
  put: (p, body) => apiRequest(p, { method: "PUT", body }),
  patch: (p, body) => apiRequest(p, { method: "PATCH", body }),
  del: (p) => apiRequest(p, { method: "DELETE" }),
};
