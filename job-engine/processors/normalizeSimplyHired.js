// processors/normalizeSimplyHired.js
//
// Maps one dataset item from an Apify SimplyHired Actor into this app's row
// shape.
//
// NOT verified against a live response — this repo has no Apify account/
// token yet (see job-engine/.env.example). Field names below are a
// reasonable guess; Apify Actor output schemas vary per author, so once you
// have APIFY_SIMPLYHIRED_ACTOR_ID set, open the Actor's page in the Apify
// Store first — it documents its exact output fields — and adjust this
// mapping to match before trusting it at scale.

export default function normalizeSimplyHired(job) {
  const id = job.id || job.jobKey || (job.url ? job.url.split("/").pop() : "") || "";

  return {
    source: "simplyhired",
    source_job_id: String(id),
    title: job.title || job.jobTitle || "",
    company: job.company || job.companyName || "",
    location: job.location || "",
    apply_url: job.url || job.applyUrl || job.link || "",
    salary: job.salary || job.estimatedSalary || "",
    posted_date: job.postedDate || job.datePosted
      ? new Date(job.postedDate || job.datePosted).toISOString()
      : null,
    description: job.description || job.snippet || "",
    employment_type: job.jobType || job.employmentType || "",
    is_remote_us: /remote/i.test(job.location || ""),
  };
}
