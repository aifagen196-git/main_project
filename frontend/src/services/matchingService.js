import { api } from "./api";

/**
 * Returns the user's matched jobs. All matching logic (gate → weighted score →
 * LLM judge) runs on the backend; the frontend just renders the result.
 */
export async function getMatchedJobs() {
  const { jobs } = await api.get("/api/jobs/matches");
  return jobs || [];
}

/**
 * Keyword search over the active jobs DB (title/company), scored against the
 * user's profile. Backend does the search + scoring; UI just renders.
 */
export async function searchJobs(query) {
  const { jobs } = await api.get(`/api/jobs/search?q=${encodeURIComponent(query)}`);
  return jobs || [];
}
