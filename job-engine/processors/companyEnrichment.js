// processors/companyEnrichment.js
//
// Turns raw ATS board slugs into human display names.
//
// A live audit found 865 of 1,409 distinct company values (61%) were stored
// as the raw config slug — "scaleai", "planetlabs", "bellababyphotography" —
// because collectors pass the slug straight through as `company`. Those are
// what users actually see on a job card.
//
// Greenhouse exposes the real name on its board metadata endpoint
// (/v1/boards/{slug} -> {name}), verified: scaleai -> "Scale AI". Ashby and
// Lever expose no organization name on their public posting APIs, and
// SmartRecruiters already returns job.company.name, so those fall back to a
// deliberately conservative prettifier.
//
// Results are cached on disk: resolving 432 Greenhouse boards on every run
// would be 432 wasted requests a day.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import httpClient from "../utils/httpClient.js";
import withRetry from "./retry.js";
import normalizeCompany from "./companyNormalizer.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(dir, "../.company-cache.json");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // names change very rarely

let cache = null;

function loadCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error(`⚠ company cache write failed: ${e.message}`);
  }
}

/** Flush pending cache writes — call once at the end of a collector run. */
export function persistCompanyCache() {
  if (cache) saveCache();
}

// Suffixes that are reliably their own word in a slug. Anything not on this
// list is left alone: blindly splitting "bellababyphotography" produces
// garbage, and a wrong display name is worse than an unstyled one.
const KNOWN_SUFFIXES = [
  "ai", "labs", "lab", "io", "hq", "health", "bio", "tech", "soft", "works",
  "cloud", "data", "app", "apps", "systems", "robotics", "energy", "capital",
];

/** Conservative slug -> display name. Never invents word breaks it can't justify. */
export function prettifySlug(slug = "") {
  const s = String(slug).trim();
  if (!s) return "";
  // Already looks like a real name (has spaces or internal capitals).
  if (/\s/.test(s) || /[a-z][A-Z]/.test(s)) return normalizeCompany(s);

  const lower = s.toLowerCase();
  for (const suf of KNOWN_SUFFIXES) {
    if (lower.length > suf.length + 2 && lower.endsWith(suf)) {
      const stem = lower.slice(0, -suf.length);
      const suffix = suf === "ai" || suf === "io" || suf === "hq"
        ? suf.toUpperCase()
        : suf[0].toUpperCase() + suf.slice(1);
      return `${stem[0].toUpperCase()}${stem.slice(1)} ${suffix}`;
    }
  }
  return lower[0].toUpperCase() + lower.slice(1);
}

const RESOLVERS = {
  async greenhouse(slug) {
    const res = await withRetry(
      () =>
        httpClient.get(`https://boards-api.greenhouse.io/v1/boards/${slug}`),
      { maxRetries: 1 },
    );
    return res.data?.name || null;
  },
};

/**
 * Resolve a board slug to a display name, using the ATS when it exposes one.
 * Always returns something usable — never throws, never returns empty.
 *
 * @param {string} slug
 * @param {string} source - "greenhouse" | "ashby" | ...
 * @returns {Promise<string>}
 */
export async function resolveCompanyName(slug, source) {
  const raw = String(slug || "").trim();
  if (!raw) return "";

  const c = loadCache();
  const key = `${source}:${raw.toLowerCase()}`;
  const hit = c[key];
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.name;

  let name = null;
  const resolver = RESOLVERS[source];
  if (resolver) {
    try {
      name = await resolver(raw);
    } catch {
      name = null; // board gone or rate-limited — fall through to the slug
    }
  }

  const display = normalizeCompany(name || "") || prettifySlug(raw);
  c[key] = { name: display, at: Date.now(), resolved: Boolean(name) };
  return display;
}

/** Resolve many slugs, reusing the cache and writing it once at the end. */
export async function resolveCompanyNames(slugs, source, concurrency = 5) {
  const out = new Map();
  const list = [...new Set(slugs)];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, list.length) }, async () => {
      while (i < list.length) {
        const slug = list[i++];
        out.set(slug, await resolveCompanyName(slug, source));
      }
    }),
  );
  persistCompanyCache();
  return out;
}

export default resolveCompanyName;
