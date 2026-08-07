// processors/searchPlanner.js
//
// Any bot-defensive job board (LinkedIn's guest endpoint, Indeed's search
// pages) blocks an IP after a small number of requests, regardless of
// keyword. A naive keywords x locations x pages loop is thousands of
// requests per run — it gets rate-limited on the first handful and silently
// "completes" having covered almost nothing.
//
// This planner instead:
//   - rotates which (keyword, location) pairs run each invocation, persisting
//     an offset to disk so successive runs sweep the full matrix over many
//     runs instead of always hammering the same first few combos
//   - hands the caller a RateLimitTracker that hard-stops the whole search
//     phase after too many consecutive 429s, instead of grinding through
//     every remaining pair only to fail each one individually
//
// Shared by multiple collectors — each MUST pass its own stateFile, or two
// collectors rotating the same on-disk offset would each see the other's
// progress as their own and skip huge parts of their own matrix.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function loadOffset(stateFile) {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return Number(raw.offset) || 0;
  } catch {
    return 0;
  }
}

function saveOffset(stateFile, offset) {
  try {
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ offset, updatedAt: new Date().toISOString() }),
    );
  } catch (e) {
    console.error(`⚠ could not persist search-planner offset: ${e.message}`);
  }
}

/**
 * Build a bounded, rotating slice of the full (keyword x location) matrix.
 * @param {string[]} keywords
 * @param {string[]} locations
 * @param {number} pairBudget - max pairs to return this run
 * @param {string} stateFile - filename (relative to job-engine root) unique
 *   to this collector, e.g. ".linkedin-search-state.json"
 */
export function planSearches(keywords, locations, pairBudget, stateFile) {
  if (!stateFile) {
    throw new Error(
      "planSearches requires a stateFile unique to the calling collector",
    );
  }
  const resolvedStateFile = path.resolve(dir, "..", stateFile);

  const matrix = [];
  for (const location of locations) {
    for (const keyword of keywords) {
      matrix.push({ keyword, location });
    }
  }
  const total = matrix.length;
  if (!total) return { pairs: [], total: 0, offset: 0 };

  const offset = loadOffset(resolvedStateFile) % total;
  const count = Math.min(pairBudget, total);
  const pairs = Array.from(
    { length: count },
    (_, i) => matrix[(offset + i) % total],
  );

  saveOffset(resolvedStateFile, (offset + count) % total);
  return { pairs, total, offset };
}

/** Tracks consecutive 429s across an entire search run and signals a hard stop. */
export class RateLimitTracker {
  constructor(maxConsecutive = 3) {
    this.maxConsecutive = maxConsecutive;
    this.consecutive429s = 0;
    this.stopped = false;
  }

  recordSuccess() {
    this.consecutive429s = 0;
  }

  recordFailure(status) {
    if (status !== 429) return;
    this.consecutive429s++;
    if (this.consecutive429s >= this.maxConsecutive) this.stopped = true;
  }

  get shouldStop() {
    return this.stopped;
  }
}

export default planSearches;
