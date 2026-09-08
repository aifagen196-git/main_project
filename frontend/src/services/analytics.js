import { api } from "./api";

/**
 * Aggregated stats for the Analytics screen, computed server-side from the
 * user's real applications. Returns null if the payload is missing so the
 * page can show its empty state rather than rendering zeros as if they were
 * measured values.
 */
export async function getAnalytics() {
  const { analytics } = await api.get("/api/analytics");
  return analytics || null;
}
