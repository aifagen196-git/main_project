/* Session handling for the browser, backed by the backend's /api/auth routes.
 *
 * The site deliberately doesn't load the Supabase client: no Supabase URL or
 * key ships in the bundle, and the browser only talks to our own API. This
 * file keeps the session (access + refresh token) in localStorage, refreshes
 * it before it expires, and tells listeners when the signed-in user changes.
 *
 * Email links (sign-up confirmation, password reset) still land back here
 * with the tokens in the URL hash; consumeUrlSession() picks those up. */

const STORAGE_KEY = "aifagen.session";
const REFRESH_EARLY_S = 60; // refresh a minute before expiry

// Same base URL rule as services/api.js (same-origin in production).
const API_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, "")
    : `${window.location.protocol}//${window.location.hostname}:5000`
  : "";

let session = load();
const listeners = new Set();
let refreshing = null;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return s?.access_token && s?.refresh_token ? s : migrateLegacySession();
  } catch {
    return null;
  }
}

// Sessions saved by the old supabase-js client (key "sb-<project>-auth-token"),
// so people already logged in stay logged in after this change.
function migrateLegacySession() {
  const key = Object.keys(localStorage).find((k) => /^sb-.+-auth-token$/.test(k));
  if (!key) return null;
  const old = JSON.parse(localStorage.getItem(key) || "null");
  localStorage.removeItem(key);
  if (!old?.access_token || !old?.refresh_token || !old?.user?.id) return null;
  const s = {
    access_token: old.access_token,
    refresh_token: old.refresh_token,
    expires_at: old.expires_at || 0,
    user: { id: old.user.id, email: old.user.email, user_metadata: old.user.user_metadata || {} },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

function save(next, event) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked — session lives in memory for this tab */
  }
  for (const fn of listeners) fn(event, session);
}

async function post(path, body, token) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
  } catch {
    throw new Error("We couldn't reach AIFAGen. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Another tab signed in or out: follow it.
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  const next = load();
  if (next?.user?.id === session?.user?.id) {
    session = next;
    return;
  }
  session = next;
  for (const fn of listeners) fn(next ? "SIGNED_IN" : "SIGNED_OUT", next);
});

export const auth = {
  /** Current session, refreshed first if it's about to expire. */
  async getSession() {
    if (session && session.expires_at - REFRESH_EARLY_S < Date.now() / 1000) {
      await this.refreshSession().catch(() => {});
    }
    return session;
  },

  getUser() {
    return session?.user ?? null;
  },

  /** Exchanges the refresh token for a new session. Concurrent callers share one request. */
  async refreshSession() {
    if (!session?.refresh_token) return null;
    if (!refreshing) {
      const token = session.refresh_token;
      refreshing = post("/refresh", { refresh_token: token })
        .then(({ session: next }) => {
          save(next, "TOKEN_REFRESHED");
          return next;
        })
        .catch((err) => {
          // Only a rejected token ends the session; a network blip shouldn't.
          if (err.status === 401) save(null, "SIGNED_OUT");
          throw err;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  },

  onAuthStateChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async signUp(email, password, data) {
    const { session: next } = await post("/signup", { email, password, data });
    // With email confirmation on there's no session until the link is clicked.
    if (next) save(next, "SIGNED_IN");
    return next;
  },

  async signIn(email, password) {
    const { session: next } = await post("/login", { email, password });
    save(next, "SIGNED_IN");
    return next;
  },

  async sendPasswordReset(email) {
    await post("/forgot", { email });
  },

  async updatePassword(password) {
    const s = await this.getSession();
    if (!s) throw new Error("Your session has expired. Please log in again.");
    await post("/password", { password }, s.access_token);
  },

  async signOut() {
    const token = session?.access_token;
    save(null, "SIGNED_OUT");
    if (token) await post("/logout", {}, token).catch(() => {});
  },

  /**
   * Picks up a session from an email link (#access_token=...&type=...).
   * Returns the link type ("signup", "recovery", ...) or null.
   */
  async consumeUrlSession() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return null;
    const type = hash.get("type");

    // Don't leave tokens sitting in the address bar or history.
    window.history.replaceState({}, "", window.location.pathname + window.location.search);

    let user = null;
    try {
      const res = await fetch(`${API_URL}/api/auth/user`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      user = res.ok ? (await res.json()).user : null;
    } catch {
      /* fall through */
    }
    if (!user) return null;

    const expires_in = Number(hash.get("expires_in")) || 3600;
    const expires_at = Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + expires_in;
    save(
      { access_token, refresh_token, expires_at, user },
      type === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN",
    );
    return type;
  },
};
