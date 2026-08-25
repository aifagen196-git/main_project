// processors/normalizeJobright.js
//
// Maps one entry from Jobright's own embedded __NEXT_DATA__ blob (see
// collectors/jobright.js) into this app's row shape.
//
// VERIFIED against a real live page (2026-08-25, free — a direct page read,
// no browser, no paid API). Of every source added this session, this one
// has by far the richest data: a real full description (jobSummary +
// coreResponsibilities), a real ISO-ish publishTime (not just relative
// text), salary, requirements as an actual skills array, and both a company
// name and a short company description.

function skills(job) {
  return Array.isArray(job.requirements) ? job.requirements : [];
}

export default function normalizeJobright(entry) {
  const job = entry.jobResult || {};
  const company = entry.companyResult || {};

  const responsibilities = Array.isArray(job.coreResponsibilities)
    ? job.coreResponsibilities.join("\n")
    : "";
  const description = [job.jobSummary, responsibilities].filter(Boolean).join("\n\n");

  return {
    source: "jobright",
    source_job_id: job.jobId || "",
    title: job.jobTitle || "",
    company: company.companyName || "",
    location: job.jobLocation || "",
    apply_url: job.applyLink || job.url || "",
    salary: job.salaryDesc || "",
    // publishTime is "YYYY-MM-DD HH:mm:ss" (no explicit timezone in the raw
    // string) — treated as UTC via the "T...Z" reformat below, same
    // assumption this app already makes elsewhere for naive timestamps.
    posted_date: job.publishTime ? new Date(job.publishTime.replace(" ", "T") + "Z").toISOString() : null,
    description,
    employment_type: job.employmentType || "",
    skills: skills(job),
    is_remote_us: job.isRemote === true,
  };
}
