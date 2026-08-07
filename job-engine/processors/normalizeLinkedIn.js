import * as cheerio from "cheerio";

export default function normalizeLinkedIn(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  $(".base-card").each((_, element) => {
    const card = $(element);

    const title = card.find(".base-search-card__title").text().trim();

    const company = card.find(".base-search-card__subtitle").text().trim();

    const location = card.find(".job-search-card__location").text().trim();

    const url = card.find("a.base-card__full-link").attr("href")?.trim() || "";

    // Extract LinkedIn Job ID
    let source_job_id = null;

    if (url) {
      const match = url.match(/-(\d+)(\?|$)/);
      if (match) {
        source_job_id = match[1];
      }
    }

    jobs.push({
      source: "linkedin",
      source_job_id,

      title,
      company,
      location,

      url,

      // We'll populate these in the next phase
      description: "",
      employmentType: "",
      workplaceType: "",
      salary: "",
      postedAt: "",
      applyUrl: "",
    });
  });

  return jobs;
}
