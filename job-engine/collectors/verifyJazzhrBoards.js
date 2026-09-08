import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import companies from "./config/jazzhrCompanies.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const valid = [];
const invalid = [];

async function verify(company) {
  try {
    const res = await axios.get(
      `https://${company}.applytojob.com/apply/jobs/`,
      {
        timeout: 10000,
        headers: HEADERS,
        maxRedirects: 0,
        validateStatus: () => true,
      },
    );

    // A subdomain with no real account 302s to jazzhr.com's marketing
    // site rather than 404ing, so status alone can't tell real boards
    // from guesses — only the presence of the actual jobs table can.
    if (res.status === 200 && res.data.includes('id="jobs_table"')) {
      const $ = cheerio.load(res.data);
      const count = $("tr[id^='row_job_']").length;
      console.log(`✅ ${company} (${count} jobs)`);
      valid.push(company);
    } else {
      console.log(`❌ ${company}`);
      invalid.push(company);
    }
  } catch {
    console.log(`❌ ${company}`);
    invalid.push(company);
  }
}

async function run() {
  console.log(`Checking ${companies.length} companies...\n`);

  for (const company of companies) {
    await verify(company);
  }

  console.log("\n===============================");
  console.log(`Valid   : ${valid.length}`);
  console.log(`Invalid : ${invalid.length}`);

  console.log("\nValid Companies:\n");
  console.log(JSON.stringify(valid, null, 2));

  console.log("\nInvalid Companies:\n");
  console.log(JSON.stringify(invalid, null, 2));
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the
// same pattern used everywhere else in this repo. Without it, import()-ing
// this file for any reason runs it as a side effect.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
