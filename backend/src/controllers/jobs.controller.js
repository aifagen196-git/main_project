import { getMatchedJobs, searchJobs } from "../services/jobs/matching.service.js";

export async function getJobMatches(req, res) {
  try {
    const jobs = await getMatchedJobs(req.user.id);
    return res.json({ success: true, total: jobs.length, jobs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function searchJobMatches(req, res) {
  try {
    const jobs = await searchJobs(req.user.id, req.query.q);
    return res.json({ success: true, total: jobs.length, jobs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
