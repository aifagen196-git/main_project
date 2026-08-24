// processors/normalizeSimplyHired.js
//
// Maps one dataset item from thirdwatch/simplyhired-jobs-scraper (Apify)
// into this app's row shape.
//
// VERIFIED against a real live response (2026-08-24, 5 real jobs pulled with
// a throwaway ~$0.04 test run) — this is no longer a documentation-matched
// guess. Confirmed real fields: title, company, location, url, description,
// job_types (ARRAY, e.g. ["Part-time","Full-time","Contract"] — not a single
// jobType/employmentType string), is_remote (boolean), job_key (snake_case —
// not jobKey), posted_date, salary_text/salary_min/salary_max/
// salary_currency/salary_period, source, scraped_at. Also present but not
// currently mapped: company_rating, requirements[], benefits[], sponsored,
// indeed_apply — none of those have a column on `jobs` yet.
//
// Two real mistakes this fixed versus the previous docs-only-matched
// version: job_key is snake_case, not the jobKey I'd guessed, and there is
// no single employment-type string field at all — job_types is a list, so
// employment_type below joins it rather than reading one guessed key.
//
// Apify Actor schemas vary a lot between authors — a second candidate actor
// checked separately (easyapi/simplyhired-job-scraper) uses completely
// different field names that look copied from an Indeed scraper, a sign it
// isn't purpose-built for this site. If you switch actors, none of this is
// guaranteed to carry over — re-verify with a small real run first.

function salaryText(job) {
  if (job.salary_text) return job.salary_text;
  if (job.salary_min && job.salary_max) {
    const currency = job.salary_currency || "$";
    const period = job.salary_period ? ` / ${job.salary_period}` : "";
    return `${currency}${job.salary_min} - ${currency}${job.salary_max}${period}`;
  }
  return "";
}

export default function normalizeSimplyHired(job) {
  const id =
    job.job_key ||
    job.id ||
    (job.url ? job.url.split("/").filter(Boolean).pop() : "") ||
    "";

  return {
    source: "simplyhired",
    source_job_id: String(id),
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    apply_url: job.url || "",
    salary: salaryText(job),
    posted_date: job.posted_date ? new Date(job.posted_date).toISOString() : null,
    description: job.description || "",
    employment_type: Array.isArray(job.job_types) ? job.job_types.join(", ") : "",
    is_remote_us: job.is_remote === true,
  };
}
