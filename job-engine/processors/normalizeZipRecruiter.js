// processors/normalizeZipRecruiter.js
//
// Maps one job object from the ZipRecruiter Partner Jobs API
// (https://api.ziprecruiter.com/jobs/v1) into this app's row shape.
//
// NOT verified against a live response — this repo has no ZipRecruiter
// partner key yet (see job-engine/.env.example: ZIPRECRUITER_API_KEY). Field
// names below follow ZipRecruiter's publicly documented job object
// (name/hiring_company/salary_min/salary_max/posted_time/url); confirm them
// against your first real response and adjust here before trusting this at
// scale — this is a starting point, not a tested mapping.

import { normalizeEmploymentType } from "./canonicalFields.js";

function salaryText(job) {
  if (job.salary_min && job.salary_max) {
    const interval = job.salary_interval ? ` / ${job.salary_interval}` : "";
    return `$${job.salary_min} - $${job.salary_max}${interval}`;
  }
  return job.salary || "";
}

export default function normalizeZipRecruiter(job) {
  return {
    source: "ziprecruiter",
    source_job_id: String(job.id || job.listing_key || ""),
    title: job.name || job.title || "",
    company: job.hiring_company?.name || job.company || "",
    location: [job.city, job.state].filter(Boolean).join(", ") || job.location || "",
    country: job.country || "",
    apply_url: job.url || job.apply_url || "",
    salary: salaryText(job),
    posted_date: job.posted_time ? new Date(job.posted_time).toISOString() : null,
    description: job.snippet || job.description || "",
    employment_type: normalizeEmploymentType(job.employment_type || ""),
    is_remote_us: /remote/i.test(job.location || job.city || ""),
  };
}
