import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import companies from "./config/oracleCompanies.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const valid = [];
const invalid = [];

/**
 * Accepts a config entry ({ company, pod, region, siteNumber, host? }) or a
 * raw "pod.region/siteNumber" string, e.g. "eklm.us2/CX", to check candidates
 * while extending config/oracleCompanies.js. Mirrors oracle.js: an entry's
 * optional `host` replaces the derived pod host for vanity-domain tenants.
 */
async function verify(entry) {
  let company, pod, region, siteNumber, host;
  if (typeof entry === "string") {
    const [tenant, site] = entry.split("/");
    [pod, region] = tenant.split(".");
    siteNumber = site;
    company = entry;
  } else {
    ({ company, pod, region, siteNumber, host } = entry);
  }

  const tenantBase = host
    ? `https://${host}`
    : `https://${pod}.fa.${region}.oraclecloud.com`;
  const finder = `findReqs;siteNumber=${siteNumber},limit=5,offset=0,sortBy=POSTING_DATES_DESC`;

  try {
    const { data } = await axios.get(
      `${tenantBase}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,
      {
        timeout: 15000,
        params: {
          onlyData: true,
          expand: "requisitionList.secondaryLocations",
          finder,
        },
        headers: { Accept: "application/json", "User-Agent": UA },
      },
    );

    const item = data?.items?.[0];
    if (!item || !Array.isArray(item.requisitionList)) {
      console.log(`❌ ${company} — unexpected response shape`);
      invalid.push(company);
      return;
    }

    console.log(
      `✅ ${company} — ${item.TotalJobsCount} jobs total (siteNumber=${siteNumber})`,
    );
    valid.push(company);
  } catch (err) {
    console.log(`❌ ${company} — ${err.response?.status || err.message}`);
    invalid.push(company);
  }
}

async function run() {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : companies;

  console.log(`Checking ${list.length} Oracle Recruiting Cloud sites...\n`);

  for (const entry of list) {
    await verify(entry);
  }

  console.log("\n===============================");
  console.log(`Valid   : ${valid.length}`);
  console.log(`Invalid : ${invalid.length}`);
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the
// same pattern used everywhere else in this repo. Without it, import()-ing
// this file for any reason runs it as a side effect.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
