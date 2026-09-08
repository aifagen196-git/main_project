// processors/normalizeMonster.js
//
// Maps one job object returned by Bright Data's Monster Jobs dataset into
// this app's row shape.
//
// NOT verified against a live response — this repo has no Bright Data
// account/dataset_id yet (see job-engine/.env.example). Field names below
// are a reasonable guess (title/companyName/location/url/datePosted,
// following the shape Bright Data's own LinkedIn-equivalent products use);
// confirm them against your first real response and adjust here before
// trusting this at scale.

export default function normalizeMonster(job) {
  const id =
    job.job_id || job.id || (job.url ? job.url.split("/").pop() : "") || "";

  return {
    source: "monster",
    source_job_id: String(id),
    title: job.title || job.jobTitle || "",
    company: job.companyName || job.company || "",
    location: job.location || job.jobLocation || "",
    apply_url: job.url || job.jobUrl || job.applyUrl || "",
    salary: job.salary || job.salaryText || "",
    posted_date: job.datePosted ? new Date(job.datePosted).toISOString() : null,
    description: job.description || job.jobDescription || "",
    employment_type: job.employmentType || "",
    is_remote_us: /remote/i.test(job.location || ""),
  };
}
