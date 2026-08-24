// processors/normalizeSimplyHired.js
//
// Maps one dataset item from an Apify SimplyHired Actor into this app's row
// shape. Targets thirdwatch/simplyhired-jobs-scraper (recommended default —
// see collectors/simplyhired.js's header for why), whose documented output
// fields are: title, company, location, salary_text, salary_min, salary_max,
// salary_currency, salary_period, description, posted_date, source, url.
// (Checked live via https://apify.com/thirdwatch/simplyhired-jobs-scraper/api
// — still not verified against an ACTUAL scrape response, since this repo has
// no Apify token yet, but at least matched against the provider's own docs
// now instead of being a pure guess.)
//
// Apify Actor schemas vary a lot between authors — a second candidate actor
// checked the same way (easyapi/simplyhired-job-scraper) uses completely
// different field names that look copied from an Indeed scraper (jobKey,
// dateOnIndeed, indeedApply), a sign it may not be a reliable, purpose-built
// SimplyHired scraper. If you pick a different actor than thirdwatch's,
// open its own /api page and adjust this mapping to match — don't assume
// these field names carry over.
//
// No `id` field is documented on thirdwatch's actor, so source_job_id is
// derived from the URL's last path segment instead.

function salaryText(job) {
  if (job.salary_text) return job.salary_text;
  if (job.salary_min && job.salary_max) {
    const currency = job.salary_currency || "$";
    const period = job.salary_period ? ` / ${job.salary_period}` : "";
    return `${currency}${job.salary_min} - ${currency}${job.salary_max}${period}`;
  }
  // Fallbacks in case a different actor is used instead — see header.
  return job.salary || job.estimatedSalary || "";
}

export default function normalizeSimplyHired(job) {
  const id =
    job.id ||
    job.jobKey ||
    (job.url ? job.url.split("/").filter(Boolean).pop() : "") ||
    "";

  return {
    source: "simplyhired",
    source_job_id: String(id),
    title: job.title || job.jobTitle || "",
    company: job.company || job.companyName || "",
    location: job.location || "",
    apply_url: job.url || job.applyUrl || job.link || "",
    salary: salaryText(job),
    posted_date: job.posted_date || job.postedDate || job.datePosted
      ? new Date(job.posted_date || job.postedDate || job.datePosted).toISOString()
      : null,
    description: job.description || job.snippet || "",
    employment_type: job.jobType || job.employmentType || "",
    is_remote_us: /remote/i.test(job.location || ""),
  };
}
