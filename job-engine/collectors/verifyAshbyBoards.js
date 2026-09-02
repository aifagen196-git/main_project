// collectors/verifyAshbyBoards.js
import path from "node:path";
import { pathToFileURL } from "node:url";
//
// Re-verify the Ashby company list against the endpoint the COLLECTOR actually
// uses (api.ashbyhq.com/posting-api/...), not the public HTML board page.
// verify/ashby.json was built by checking jobs.ashbyhq.com/{slug}, which
// returns 200 for companies that have no posting API — ~80% of that list 404s
// during a real run, wasting most of the collector's time.
//
//   node verifyAshbyBoards.js
//
// Writes config/ashbyCompanies.js containing only boards that really respond,
// and prints the job yield so dead weight is obvious.

import axios from "axios";
import fs from "fs";
import companies from "./config/ashbyCompanies.js";

const CONCURRENCY = Number(process.env.VERIFY_CONCURRENCY || 4);
const OUT = "./config/ashbyCompanies.js";

const alive = [];
let checked = 0;
let totalJobs = 0;

async function check(slug) {
  try {
    const res = await axios.get(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      { timeout: 12000, validateStatus: null },
    );
    if (res.status === 200) {
      const n = res.data?.jobs?.length ?? 0;
      // Keep boards that respond, even with 0 jobs right now — they may post
      // later. Dead slugs (404) are what we prune.
      alive.push({ slug, jobs: n });
      totalJobs += n;
    }
  } catch {
    /* timeout / network — treat as dead */
  }
  checked++;
  if (checked % 100 === 0) {
    console.log(`  checked ${checked}/${companies.length} — alive ${alive.length}, jobs ${totalJobs}`);
  }
}

async function run() {
  console.log(`Verifying ${companies.length} Ashby boards against the posting API…`);
  const t0 = Date.now();
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < companies.length) await check(companies[i++]);
    }),
  );

  alive.sort((a, b) => a.slug.localeCompare(b.slug));
  const withJobs = alive.filter((a) => a.jobs > 0).length;
  const body =
    `// collectors/config/ashbyCompanies.js\n` +
    `//\n` +
    `// Ashby board slugs VERIFIED against api.ashbyhq.com/posting-api (the\n` +
    `// endpoint ashby.js actually calls) — not the HTML board page, which\n` +
    `// returns 200 for boards that have no API and made ~80% of runs 404.\n` +
    `//\n` +
    `// ${alive.length} live boards (${withJobs} currently posting).\n\n` +
    `const companies = [\n` +
    alive.map((a) => `  "${a.slug}",`).join("\n") +
    `\n];\n\nexport default companies;\n`;
  fs.writeFileSync(OUT, body);

  console.log(
    `\nDone in ${((Date.now() - t0) / 60000).toFixed(1)} min: ` +
      `${alive.length}/${companies.length} boards alive, ` +
      `${withJobs} posting now, ${totalJobs} jobs visible.`,
  );
  console.log(`Wrote ${OUT}`);
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the
// same pattern used everywhere else in this repo. Without it, import()-ing
// this file for any reason runs it as a side effect.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
