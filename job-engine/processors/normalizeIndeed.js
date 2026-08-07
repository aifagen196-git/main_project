// processors/normalizeIndeed.js
//
// Parses an Indeed search-results page into job cards.
//
// Rewritten from a CSS-selector scrape to reading the page's embedded JSON
// (see mosaicData.js for why). The old selector-based version had three
// confirmed problems, found by testing against live Indeed pages rather than
// the stale HTML samples checked into samples/:
//   1. `.salary-snippet-container` and `[data-testid="myJobsStateDate"]`
//      don't exist anywhere in current markup — 0% capture rate for salary
//      and posted-date on every query tested.
//   2. Indeed renders a "View similar jobs with this employer" card in the
//      DOM that duplicates the previous card's title/company under a
//      literal placeholder id (`data-jk="456789abcdef0123"`, the same
//      literal value on every page) — the old code scraped it as a real,
//      distinct job.
//   3. Relative-time strings ("30+ days ago") had to be re-parsed into a
//      timestamp with the same fragility as LinkedIn's; the JSON carries an
//      absolute epoch (`createDate`) instead.
//
// If Indeed changes this page shape, extractJobCardResults() returns []
// rather than throwing, so a run degrades to zero jobs instead of crashing.

import * as cheerio from "cheerio";
import { extractJobCardResults } from "./mosaicData.js";

const BASE_URL = "https://www.indeed.com";

function salaryText(job) {
  if (job.salarySnippet?.text) return job.salarySnippet.text;
  const s = job.extractedSalary;
  if (!s) return "";
  const unit = { HOURLY: "hour", YEARLY: "year", MONTHLY: "month", WEEKLY: "week", DAILY: "day" }[s.type] || "";
  if (s.min === s.max) return `$${s.min}${unit ? " / " + unit : ""}`;
  return `$${s.min} - $${s.max}${unit ? " / " + unit : ""}`;
}

function employmentType(job) {
  const types = job.taxonomyAttributes?.find((t) => t.label === "job-types");
  return types?.attributes?.[0]?.label || "";
}

function isRemote(job) {
  if (job.remoteLocation) return true;
  const remote = job.taxonomyAttributes?.find((t) => t.label === "remote");
  return Boolean(remote?.attributes?.length);
}

export default function normalizeIndeed(html) {
  const $ = cheerio.load(html);
  const mosaicScript = $("#mosaic-data").html() || "";
  const results = extractJobCardResults(mosaicScript);

  return results
    .filter((job) => job.jobkey && job.title) // defensive: same guard that
    // would have caught the placeholder card if the JSON ever carried one
    .map((job) => ({
      source: "indeed",
      source_job_id: job.jobkey,
      title: job.title || job.displayTitle || "",
      company: job.company || job.truncatedCompany || "",
      location:
        job.formattedLocation ||
        [job.jobLocationCity, job.jobLocationState].filter(Boolean).join(", "),
      // Indeed's own country field, more reliable than inferring one from
      // the location string.
      country: job.country || "",
      state: job.jobLocationState || "",
      // /viewjob is same-origin and stable; the /rc/clk link is a
      // click-tracking redirect that only ever forwards back to /viewjob
      // (verified live — it never reaches the employer's own site or ATS,
      // so resolveJob.js's ATS-detection step is chasing a redirect that
      // no longer exists for headless GETs).
      url: job.viewJobLink
        ? `${BASE_URL}${job.viewJobLink}`
        : job.link
          ? `${BASE_URL}${job.link}`
          : "",
      salary: salaryText(job),
      postedAt: job.createDate ? new Date(job.createDate).toISOString() : "",
      description: job.snippet || "",
      employmentType: employmentType(job),
      workplaceType: isRemote(job) ? "remote" : "",
      applyUrl: "",
      // Indeed uses 0 as its own "no rating yet" sentinel, not a real
      // zero-star rating — pass that through as null, not a misleadingly
      // bad score.
      companyRating: job.companyRating || null,
      companyReviewCount: job.companyReviewCount || null,
    }));
}
