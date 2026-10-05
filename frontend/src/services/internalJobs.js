import { api } from "./api";

/** Active internal (AIFAGen-posted) job listings, newest first. */
export async function getInternalJobs() {
  const { jobs } = await api.get("/api/internal-jobs");
  return jobs || [];
}
