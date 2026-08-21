// collectors/brightDataClient.js
//
// Thin wrapper around Bright Data's dataset-scrape API. No collector in this
// codebase used a third-party scraping service before this — LinkedIn and
// Indeed both hit the target site directly (see their own file headers).
// This is genuinely new infrastructure, added because Monster and Glassdoor
// (Glassdoor not implemented — see collectors/README additions) have no
// direct-fetch path: both sit behind anti-bot protection that made LinkedIn's
// "careful HTTP requests" approach a non-starter (Indeed's own header
// documents hitting exactly this wall and needing Playwright instead — these
// two are harder still, per Bright Data's own product listing for them).
//
// Requires a Bright Data account and a dataset_id per target site — see
// job-engine/.env.example.

import axios from "axios";

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;

/**
 * Scrapes a batch of search-result URLs through one Bright Data dataset.
 * Bright Data's sync endpoint caps batch size low (~20 URLs) — see the
 * implementation guide's Scale-Up Checklist; a scheduled bulk pull should
 * move to their async/bulk mode (up to ~5,000 URLs/request) instead of
 * calling this in a loop.
 *
 * @param {string} datasetId
 * @param {string[]} urls
 * @returns {Promise<object[]>} raw job objects, shape defined by Bright Data
 */
export async function brightDataScrape(datasetId, urls) {
  if (!BRIGHTDATA_API_KEY) {
    throw new Error("BRIGHTDATA_API_KEY is not set — see job-engine/.env.example");
  }
  if (!datasetId) {
    throw new Error("brightDataScrape requires a datasetId");
  }
  if (!urls.length) return [];

  const res = await axios.post(
    `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${datasetId}&format=json`,
    urls.map((url) => ({ url })),
    {
      headers: {
        Authorization: `Bearer ${BRIGHTDATA_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 120_000,
    },
  );

  // Bright Data returns either an array of job rows or an error object
  // ({snapshot_id, status}) if the scrape is still running async — a sync
  // call to this endpoint should return rows directly, but guard anyway
  // rather than let a shape surprise crash the whole collector run.
  return Array.isArray(res.data) ? res.data : [];
}

export default { brightDataScrape };
