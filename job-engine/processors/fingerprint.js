// processors/fingerprint.js
//
// Stable content fingerprint for a job posting, used to detect the same role
// appearing twice — either re-posted on one board under a new id, or listed
// on several boards at once.
//
// Location is part of the key on purpose. A live audit found 3,756 groups
// sharing title+company, but the vast majority were NOT duplicates: chains
// legitimately post the same role in many cities (one employer had the same
// title open in 103 different locations). Keying on title+company alone
// would have destroyed ~10,000 real postings. Including location cuts that
// to 1,065 genuine duplicate groups.

import { createHash } from "node:crypto";
import { companyKey } from "./companyNormalizer.js";
import parseLocation from "./locationParser.js";

// Noise that varies between two postings of the same role.
const TITLE_NOISE = [
  /\((?:req|requisition|job)?\s*#?\s*\d[\w-]*\)/gi, // "(Req 12345)", "(#4471)"
  /[-–—,]?\s*(?:req(?:uisition)?|job)\s*(?:id|#|no\.?)?\s*[:#]?\s*\d[\w-]*/gi,
  /\bR\d{5,}\b/gi, // bare requisition codes like R123456 (title is already lowercased)
  /\((?:remote|hybrid|on-?site)\)/gi,
];

/** Normalize a title down to its comparable core. */
export function normalizeTitle(raw = "") {
  let t = String(raw).toLowerCase();
  for (const re of TITLE_NOISE) t = t.replace(re, " ");
  return t
    .replace(/[^a-z0-9+#./ ]+/g, " ") // keep c++, c#, .net, node.js intact
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a location to "city|state|country" (remote collapses to remote). */
export function normalizeLocationKey(raw = "") {
  const loc = parseLocation(raw);
  if (loc.remote && !loc.city && !loc.state) return `remote|${loc.country || ""}`;
  return [loc.city, loc.state, loc.country]
    .map((p) => String(p || "").toLowerCase().replace(/[^a-z0-9]+/g, ""))
    .join("|");
}

/**
 * Content fingerprint: same role, same employer, same place.
 * @param {{title?:string, company?:string, location?:string}} job
 * @returns {string} 16-char hex digest
 */
export function jobFingerprint(job = {}) {
  const parts = [
    normalizeTitle(job.title),
    companyKey(job.company),
    normalizeLocationKey(job.location),
  ];
  return createHash("sha1").update(parts.join("::")).digest("hex").slice(0, 16);
}

/**
 * Collapse an array of job rows to one row per fingerprint.
 * `pick` decides which of two colliding rows survives; the default keeps the
 * richer record (longer description), then the more recently seen one.
 *
 * @param {object[]} jobs
 * @param {(a:object, b:object) => object} [pick]
 * @returns {{unique: object[], removed: number}}
 */
export function dedupeJobs(jobs = [], pick = preferRicher) {
  const byPrint = new Map();
  for (const job of jobs) {
    const fp = jobFingerprint(job);
    const existing = byPrint.get(fp);
    byPrint.set(fp, existing ? pick(existing, job) : job);
  }
  return { unique: [...byPrint.values()], removed: jobs.length - byPrint.size };
}

function preferRicher(a, b) {
  const alen = (a.description || "").length;
  const blen = (b.description || "").length;
  if (alen !== blen) return alen > blen ? a : b;
  const at = Date.parse(a.last_seen || a.posted_date || 0) || 0;
  const bt = Date.parse(b.last_seen || b.posted_date || 0) || 0;
  return bt > at ? b : a;
}

export default jobFingerprint;
