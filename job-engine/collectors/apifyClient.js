// collectors/apifyClient.js
//
// Thin wrapper around Apify's "run an Actor and wait for its dataset" flow.
// New infrastructure — see brightDataClient.js's header for why neither
// third-party scraping service existed in this codebase before now.
//
// Requires an Apify account, a personal API token, and the exact Actor ID
// for each target site's scraper (visible on the Actor's page in the Apify
// Store) — see job-engine/.env.example.

import axios from "axios";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

/**
 * Runs an Apify Actor synchronously and returns its dataset items directly —
 * the run-sync-get-dataset-items endpoint blocks server-side until the run
 * finishes (or times out), so no separate polling loop is needed here.
 *
 * @param {string} actorId - e.g. "actor-owner~simplyhired-scraper"
 * @param {object} input - Actor-specific input (search, location, maxItems, …)
 * @returns {Promise<object[]>} raw job objects, shape defined by the Actor
 */
export async function apifyRun(actorId, input) {
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN is not set — see job-engine/.env.example");
  }
  if (!actorId) {
    throw new Error("apifyRun requires an actorId");
  }

  const res = await axios.post(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`,
    input,
    {
      params: { token: APIFY_TOKEN },
      // Apify actor runs can legitimately take minutes for a large maxItems.
      timeout: 300_000,
    },
  );

  return Array.isArray(res.data) ? res.data : [];
}

export default { apifyRun };
