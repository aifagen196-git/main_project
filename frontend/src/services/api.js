import { supabase } from "../lib/supabase";
import { DEV_PREVIEW, previewApi } from "../devPreview";

// Base URL of the Express backend. Configure per environment via VITE_API_URL.
// Default: same host the page was opened from, port 5000 — so localhost stays
// localhost, and opening the app from a phone via the machine's LAN IP hits
// the backend on that same IP. (A hardcoded LAN IP in .env broke the whole
// app when DHCP reassigned the address — avoid pinning IPs here.)
const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

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

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("The server took too long to respond. Is the backend running?");
    }
    // Network error (backend down / unreachable).
    throw new Error("Could not reach the server. Is the backend running?");
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

  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Expired access token: refresh the Supabase session once and retry.
  if (res.status === 401 && !_retried) {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) {
      return apiRequest(path, { method, body, _retried: true });
    }
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
