// processors/normalizeSimplyHiredDirect.js
//
// Maps one job object out of SimplyHired's own embedded __NEXT_DATA__ blob
// (see collectors/simplyhired.js) into this app's row shape.
//
// VERIFIED against a real live page (2026-08-24/25, no cost — this is a
// direct page read, not a paid API) — not a guess. SimplyHired is owned by
// the same parent company as Indeed and is built on Indeed's own job index:
// its embedded fields (jobKey, dateOnIndeed, indeedApply,
// encodedJobClickPingUrl) are literally Indeed's schema, not a coincidence
// and not a lesser-quality scrape — see the correction in this collector's
// git history for where an earlier pass wrongly read that same field
// pattern (on a since-abandoned Apify actor) as a sign of a badly-built
// scraper. It wasn't; that's just what this data really looks like.
//
// No full description: the SERP snippet is what's available without an
// extra page load per job (see collectors/simplyhired.js's header for why
// that wasn't built this pass) — same tradeoff normalizeIndeed.js accepts
// before its own click-through detail step runs.

const BASE_URL = "https://www.simplyhired.com";

function salaryText(job) {
  return job.salaryInfo || "";
}

function employmentType(job) {
  return Array.isArray(job.jobTypes) && job.jobTypes.length ? job.jobTypes.join(", ") : "";
}

function isRemote(job) {
  return Array.isArray(job.remoteAttributes) && job.remoteAttributes.length > 0;
}

export default function normalizeSimplyHiredDirect(job) {
  let applyUrl = "";
  if (job.encodedUrl) {
    try {
      applyUrl = `${BASE_URL}${decodeURIComponent(job.encodedUrl)}`;
    } catch {
      applyUrl = `${BASE_URL}/job/${job.jobKey}`;
    }
  }

  return {
    source: "simplyhired",
    source_job_id: job.jobKey || "",
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    apply_url: applyUrl,
    salary: salaryText(job),
    posted_date: job.dateOnIndeed ? new Date(job.dateOnIndeed).toISOString() : null,
    description: job.snippet || "",
    employment_type: employmentType(job),
    // `requirements` and `uncategorized` are both SimplyHired's own
    // extracted-skill-phrase lists (uncategorized is just the larger,
    // less-curated one) — combined and de-duplicated as this source's
    // skills signal.
    skills: [...new Set([...(job.requirements || []), ...(job.uncategorized || [])])],
    is_remote_us: isRemote(job),
  };
}
