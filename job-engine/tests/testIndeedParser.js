import fs from "fs";
import path from "path";

import normalizeIndeed from "../processors/normalizeIndeed.js";

const SAMPLE_FILE = path.resolve("samples/indeed-search.html");

if (!fs.existsSync(SAMPLE_FILE)) {
  console.error("❌ Sample file not found:");
  console.error(SAMPLE_FILE);
  process.exit(1);
}

console.log("📄 Loading Indeed sample...");

const html = fs.readFileSync(SAMPLE_FILE, "utf8");

const jobs = normalizeIndeed(html);

console.log(`\n✅ Parsed ${jobs.length} jobs\n`);

if (jobs.length === 0) {
  console.log("❌ No jobs found");
  process.exit(1);
}

console.log("First Job:\n");

console.table({
  source: jobs[0].source,
  id: jobs[0].source_job_id,
  title: jobs[0].title,
  company: jobs[0].company,
  location: jobs[0].location,
  salary: jobs[0].salary,
  postedAt: jobs[0].postedAt,
  url: jobs[0].url,
});

console.log("\nFirst 5 jobs:\n");

jobs.slice(0, 5).forEach((job, index) => {
  console.log(`${index + 1}. ${job.title} | ${job.company} | ${job.location}`);
});
