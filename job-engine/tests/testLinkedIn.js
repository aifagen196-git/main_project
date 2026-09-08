// tests/testLinkedIn.js
//
// End-to-end LinkedIn pipeline test
// Run:
//    node tests/testLinkedIn.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import httpClient from "../utils/httpClient.js";
import normalizeLinkedIn from "../processors/normalizeLinkedIn.js";
import parseLinkedInJob from "../processors/parseLinkedInJob.js";
import extractJobProfile from "../processors/extractJobProfile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleFile = path.join(
  __dirname,
  "..",
  "samples",
  "linkedin-sample.html",
);

const SEARCH_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

console.log("1) search page…");

const res = await httpClient.get(SEARCH_URL, {
  params: {
    keywords: "Data Analyst",
    location: "United States",
    start: 0,
  },
});

const cards = normalizeLinkedIn(res.data).filter((job) => job.source_job_id);

console.log(
  `   ${cards.length} cards, e.g.`,
  cards[0]?.title,
  "|",
  cards[0]?.company,
);

if (!cards.length) {
  console.error("❌ No jobs found");
  process.exit(1);
}

console.log("2) job detail page…");

const detail = await httpClient.get(cards[0].url);

fs.mkdirSync(path.dirname(sampleFile), { recursive: true });
fs.writeFileSync(sampleFile, detail.data, "utf8");

const parsed = parseLinkedInJob(detail.data);

console.log("   parsed:", {
  title: parsed?.title,
  company: parsed?.company,
  location: parsed?.location,
  employmentType: parsed?.employmentType,
  descChars: parsed?.description?.length,
});

console.log("3) profile extraction…");

const profile = await extractJobProfile(parsed?.description || "");

console.log(
  "   role_family:",
  profile.role_family,
  "| skills:",
  (profile.skills_required || []).length,
  "| min_years:",
  profile.min_years,
);

console.log("\n✅ LinkedIn pipeline OK");
