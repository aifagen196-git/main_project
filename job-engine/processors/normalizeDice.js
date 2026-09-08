// processors/normalizeDice.js
//
// Maps one dataset item from an Apify Dice.com Actor into this app's row
// shape.
//
// NOT verified against a live response — see normalizeSimplyHired.js's
// header, same situation. Check the Actor's documented output fields before
// trusting this mapping at scale.

export default function normalizeDice(job) {
  const id = job.id || job.jobId || (job.url ? job.url.split("/").pop() : "") || "";

  return {
    source: "dice",
    source_job_id: String(id),
    title: job.title || job.jobTitle || "",
    company: job.company || job.companyName || "",
    location: job.location || "",
    apply_url: job.url || job.applyUrl || job.link || "",
    salary: job.salary || "",
    posted_date: job.postedDate || job.datePosted
      ? new Date(job.postedDate || job.datePosted).toISOString()
      : null,
    description: job.description || job.summary || "",
    employment_type: job.employmentType || job.jobType || "",
    is_remote_us: /remote/i.test(job.location || ""),
  };
}
