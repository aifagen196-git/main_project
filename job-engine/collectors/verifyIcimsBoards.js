import axios from "axios";
import companies from "./config/icimsCompanies.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const valid = [];
const invalid = [];

/**
 * Accepts a config entry ({ company, host }) or a bare host string, so this
 * can be pointed at candidate hosts while building out the config:
 *
 *   node verifyIcimsBoards.js careers.footlocker.com jobs.example.com
 *
 * A non-iCIMS host frequently still answers 200 on /api/jobs (a catch-all
 * SPA route), so a plain status check is not enough — the response has to
 * actually parse as the { jobs: [...], totalCount } shape.
 */
async function verify(entry) {
  const host = typeof entry === "string" ? entry : entry.host;
  const label = typeof entry === "string" ? entry : entry.company;

  try {
    const { data } = await axios.get(`https://${host}/api/jobs`, {
      timeout: 15000,
      params: { page: 1, limit: 100, internal: false },
      headers: { Accept: "application/json", "User-Agent": UA },
    });

    if (!data || !Array.isArray(data.jobs)) {
      console.log(`❌ ${label} (${host}) — not an iCIMS career site`);
      invalid.push(host);
      return;
    }

    const us = data.jobs.filter(
      (j) => (j.data?.country_code || "").toUpperCase() === "US",
    ).length;

    console.log(
      `✅ ${label} (${host}) — ${data.totalCount} jobs total, ${us}/${data.jobs.length} US on page 1`,
    );
    valid.push(host);
  } catch (err) {
    console.log(`❌ ${label} (${host}) — ${err.response?.status || err.message}`);
    invalid.push(host);
  }
}

async function run() {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : companies;

  console.log(`Checking ${list.length} iCIMS career sites...\n`);

  for (const entry of list) {
    await verify(entry);
  }

  console.log("\n===============================");
  console.log(`Valid   : ${valid.length}`);
  console.log(`Invalid : ${invalid.length}`);

  console.log("\nValid hosts:\n");
  console.log(JSON.stringify(valid, null, 2));

  console.log("\nInvalid hosts:\n");
  console.log(JSON.stringify(invalid, null, 2));
}

run();
