import { api } from "./api";

/**
 * Jobs added by hand via the (not yet built) admin page, as opposed to the
 * job-engine's scraped pool. Read-only from the frontend for now.
 */
export async function getInternalJobs() {
  const { jobs } = await api.get("/api/internal-jobs");
  return jobs || [];
}
