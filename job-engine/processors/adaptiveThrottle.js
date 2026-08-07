// processors/adaptiveThrottle.js
//
// Bot-defended boards (Indeed, LinkedIn) rate-limit on a ROLLING window, so
// the sustainable request volume is not a fixed number you can hardcode — it
// depends on what the last few runs already spent. A collector with no memory
// of being blocked will get challenged, then charge back in on the next
// schedule tick with identical settings and get challenged again.
//
// This persists a throttle level alongside the search-rotation offset:
//   - a run that hit ANY block raises the level (back off harder)
//   - a fully clean run lowers it (creep back toward full volume)
// so the collector converges on whatever the board currently tolerates
// instead of needing a human to re-tune constants after every incident.
//
// Level semantics (see THROTTLE_FACTORS): level 0 = full configured volume,
// each step above that multiplies pairs/pages/detail-clicks down.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Multipliers applied to the caller's configured budgets. Deliberately steep
// at first (a block means we're already over the line — halving beats
// shaving), then floors out rather than going to zero, so the collector keeps
// making slow progress through the keyword matrix even while throttled.
const THROTTLE_FACTORS = [1, 0.5, 0.25, 0.15];
const MAX_LEVEL = THROTTLE_FACTORS.length - 1;

// After a blocked run, refuse to start again until the window has had time to
// drain. Without this, a manual `npm run indeed` right after a blocked
// scheduled run just burns another challenge and pushes the level higher for
// no benefit.
const COOLDOWN_AFTER_BLOCK_MS = Number(
  process.env.COLLECTOR_BLOCK_COOLDOWN_MS || 30 * 60 * 1000,
);

function resolve(stateFile) {
  return path.resolve(dir, "..", stateFile);
}

function readState(stateFile) {
  try {
    return JSON.parse(fs.readFileSync(resolve(stateFile), "utf8"));
  } catch {
    return {};
  }
}

function writeState(stateFile, patch) {
  const current = readState(stateFile);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(resolve(stateFile), JSON.stringify(next, null, 2));
  } catch (e) {
    console.error(`⚠ could not persist throttle state: ${e.message}`);
  }
  return next;
}

/**
 * Current throttle level and whether we're still inside a post-block cooldown.
 * @returns {{level:number, factor:number, cooling:boolean, cooldownRemainingMs:number}}
 */
export function getThrottle(stateFile) {
  const s = readState(stateFile);
  const level = Math.min(Number(s.throttleLevel) || 0, MAX_LEVEL);
  const lastBlockedAt = Date.parse(s.lastBlockedAt || "") || 0;
  const elapsed = Date.now() - lastBlockedAt;
  const cooling = lastBlockedAt > 0 && elapsed < COOLDOWN_AFTER_BLOCK_MS;

  return {
    level,
    factor: THROTTLE_FACTORS[level],
    cooling,
    cooldownRemainingMs: cooling ? COOLDOWN_AFTER_BLOCK_MS - elapsed : 0,
  };
}

/** Scale a configured budget by the current throttle factor (min 1). */
export function throttled(value, factor) {
  return Math.max(1, Math.round(value * factor));
}

/**
 * Fold a finished run's outcome back into the persisted throttle level.
 * @param {string} stateFile
 * @param {{blocked:number}} stats
 */
export function recordRunOutcome(stateFile, stats) {
  const s = readState(stateFile);
  const level = Math.min(Number(s.throttleLevel) || 0, MAX_LEVEL);

  if (stats.blocked > 0) {
    const next = Math.min(level + 1, MAX_LEVEL);
    writeState(stateFile, {
      throttleLevel: next,
      lastBlockedAt: new Date().toISOString(),
      consecutiveCleanRuns: 0,
    });
    console.log(
      `⚠ ${stats.blocked} block(s) this run — throttle level ${level} -> ${next} (next run runs lighter)`,
    );
    return next;
  }

  // A clean run means the cooldown has served its purpose — clear the block
  // timestamp. Leaving it set would keep getThrottle() reporting cooling=true
  // forever, so every later run would refuse to start even after the throttle
  // had fully recovered.
  const clean = (Number(s.consecutiveCleanRuns) || 0) + 1;
  if (level > 0 && clean >= 2) {
    const next = level - 1;
    writeState(stateFile, {
      throttleLevel: next,
      consecutiveCleanRuns: 0,
      lastBlockedAt: null,
    });
    console.log(`✅ clean runs — throttle level ${level} -> ${next}`);
    return next;
  }

  writeState(stateFile, { consecutiveCleanRuns: clean, lastBlockedAt: null });
  return level;
}

export default getThrottle;
