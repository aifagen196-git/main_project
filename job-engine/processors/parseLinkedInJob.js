// processors/parseLinkedInJob.js
//
// Parse LinkedIn's GUEST job-posting fragment, i.e. the response from
//   https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jobId}
// This is a lightweight (~26KB) HTML fragment that uses CSS classes
// (top-card-layout__title, description__text, description__job-criteria-item),
// NOT JSON-LD — the JSON-LD only exists on the full 332KB public job page,
// which is far heavier and more likely to be rate-limited. Returns null when
// the fragment doesn't look like a job posting.
import * as cheerio from "cheerio";

export default function parseLinkedInJob(html) {
  if (!html || typeof html !== "string") return null;
  const $ = cheerio.load(html);

  const title = $(".top-card-layout__title, h2.topcard__title").first().text().trim();
  if (!title) return null; // not a job fragment

  const company = $(
    ".topcard__org-name-link, .top-card-layout__second-subline a, a.topcard__org-name-link",
  )
    .first()
    .text()
    .trim();

  const location = $(".topcard__flavor--bullet").first().text().trim();

  const description = $(".description__text, .show-more-less-html__markup")
    .first()
    .text()
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // "3 weeks ago" style — kept as-is; the row keeps posted_date null when absent.
  const postedAt = $(".posted-time-ago__text").first().text().trim();

  const applyUrl =
    $("a.topcard__link, .top-card-layout__cta a").first().attr("href") || "";

  // Structured criteria: Seniority level / Employment type / Job function /
  // Industries — LinkedIn renders each as a labelled item.
  const criteria = {};
  $(".description__job-criteria-item").each((_, el) => {
    const label = $(el)
      .find("h3, .description__job-criteria-subheader")
      .first()
      .text()
      .trim()
      .toLowerCase();
    const value = $(el)
      .find("span, .description__job-criteria-text")
      .first()
      .text()
      .trim();
    if (label && value) criteria[label] = value;
  });

  return {
    title,
    company,
    location,
    description,
    postedAt,
    applyUrl,
    employmentType: criteria["employment type"] || "",
    seniorityLevel: criteria["seniority level"] || "",
    jobFunction: criteria["job function"] || "",
    industries: criteria["industries"] || "",
    // Kept for callers that expect these keys; not available in the fragment.
    salary: "",
    workplaceType: "",
  };
}
