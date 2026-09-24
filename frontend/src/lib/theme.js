// Theme preference: "light" | "dark" | "system".
//
// Stored per-browser in localStorage rather than on the profile — it's a
// device preference (a user may want dark on their laptop at night and light
// on a shared desktop), and it must apply before any network call resolves,
// including on the signed-out marketing pages.

const KEY = "aifagen-theme";
export const THEMES = ["light", "dark", "system"];

export function getPreference() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : "system";
  } catch {
    // Private mode / blocked storage — fall back to following the OS.
    return "system";
  }
}

export function prefersDark() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** The theme actually rendered, with "system" resolved. */
export function resolveTheme(pref = getPreference()) {
  return pref === "system" ? (prefersDark() ? "dark" : "light") : pref;
}

/** Applies the resolved theme to <html>. Safe to call repeatedly. */
export function applyTheme(pref = getPreference()) {
  const resolved = resolveTheme(pref);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function setPreference(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* ignore */ }
  return applyTheme(pref);
}

/**
 * Keeps "system" in sync while the app is open. Returns an unsubscribe fn.
 * Only reacts while the preference is "system" — an explicit light/dark
 * choice must not be overridden when the OS flips at sunset.
 */
export function watchSystem(onChange) {
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!mq) return () => {};
  const handler = () => {
    if (getPreference() === "system") onChange(applyTheme("system"));
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
