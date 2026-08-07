import { api } from "./api";

/** Saved job ids (UUID strings) for the current user. */
export async function getSavedJobIds() {
  const { ids } = await api.get("/api/saved-jobs/ids");
  return ids || [];
}

/** Full job rows the current user has saved, newest first. */
export async function getSavedJobs() {
  const { jobs } = await api.get("/api/saved-jobs");
  return jobs || [];
}

/** Adds or removes a saved job. Returns the new saved state (boolean). */
export async function toggleSavedJob(jobId, isCurrentlySaved) {
  if (isCurrentlySaved) {
    await api.del(`/api/saved-jobs/${jobId}`);
    return false;
  }
  await api.post("/api/saved-jobs", { job_id: jobId });
  return true;
}
