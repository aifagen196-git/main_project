import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import companies from "./config/ukgCompanies.js";

/**
 * Accepts a config entry ({ company, companyCode, boardGuid }) or a raw
 * "CompanyCode/boardGuid" string to check candidates while extending
 * config/ukgCompanies.js.
 */
async function verify(entry) {
  let company, companyCode, boardGuid;
  if (typeof entry === "string") {
    [companyCode, boardGuid] = entry.split("/");
    company = entry;
  } else {
    ({ company, companyCode, boardGuid } = entry);
  }

  const boardBase = `https://recruiting.ultipro.com/${companyCode}/JobBoard/${boardGuid}`;

  try {
    const { data } = await axios.post(
      `${boardBase}/JobBoardView/LoadSearchResults`,
      {
        opportunitySearch: {
          Top: 5,
          Skip: 0,
          QueryString: "",
          OrderBy: [
            { Value: "postedDateDesc", PropertyName: "PostedDate", Ascending: false },
          ],
          Filters: [],
        },
        matchCriteria: {
          PreferredJobs: [],
          Educations: [],
          LicenseAndCertifications: [],
          Skills: [],
          hasNoLicenses: false,
          SkippedSkills: [],
        },
      },
      { timeout: 15000, headers: { "Content-Type": "application/json" } },
    );

    if (!Array.isArray(data?.opportunities)) {
      console.log(`❌ ${company} — unexpected response shape`);
      return false;
    }

    console.log(`✅ ${company} — ${data.totalCount} jobs total`);
    return true;
  } catch (err) {
    console.log(`❌ ${company} — ${err.response?.status || err.message}`);
    return false;
  }
}

async function run() {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : companies;

  console.log(`Checking ${list.length} UKG boards...\n`);

  let ok = 0;
  for (const entry of list) {
    if (await verify(entry)) ok++;
  }

  console.log("\n===============================");
  console.log(`Valid   : ${ok}`);
  console.log(`Invalid : ${list.length - ok}`);
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the
// same pattern used everywhere else in this repo. Without it, import()-ing
// this file for any reason runs it as a side effect.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
