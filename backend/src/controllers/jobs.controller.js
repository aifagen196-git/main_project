import { getMatchedJobs, searchJobs } from "../services/jobs/matching.service.js";
import { dbError } from "../utils/dbError.js";

export async function getJobMatches(req, res) {
  try {
    const jobs = await getMatchedJobs(req.user.id);
    return res.json({ success: true, total: jobs.length, jobs });
  } catch (err) {
    return dbError(res, err, "Could not load jobs. Please try again.");
  }
}

export async function searchJobMatches(req, res) {
  try {
    const jobs = await searchJobs(req.user.id, req.query.q);
    return res.json({ success: true, total: jobs.length, jobs });
  } catch (err) {
    return dbError(res, err, "Could not load jobs. Please try again.");
  }
}
