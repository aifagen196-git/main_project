// DEAD CODE — nothing imports this.
//
// Job Preferences were removed from the Settings page: jobs are matched from
// the RESUME ONLY. The preferences UI, the Dashboard "Set your job
// preferences" strength item, and the matcher's preference merge were all
// removed. The backend route (/api/preferences) and the
// user_job_preferences table still exist but are unused.
//
// Do not re-wire this without a test proving relevant jobs still outrank
// irrelevant ones — merging preferences previously overrode the resume's
// role_family and degraded match quality.
import { api } from "./api";

export async function getPreferences() {
  const { preferences } = await api.get("/api/preferences");
  return preferences;
}

export async function savePreferences(_userId, prefs) {
  // _userId kept for call-site compatibility; the backend derives the user
  // from the JWT.
  const { preferences } = await api.put("/api/preferences", prefs);
  return preferences;
}
