import axios from "axios";
import fs from "fs";
import companies from "./companies.js";

const ATS_NAME = "Ashby";

const API = "https://jobs.ashbyhq.com/{company}";

const OUTPUT = "./ashby.json";

const verified = [];

async function checkCompany(company) {
  const url = API.replace("{company}", company);

  try {
    const res = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    // Redirect = invalid
    if (res.status >= 300 && res.status < 400) {
      return;
    }

    // Must be HTTP 200
    if (res.status !== 200) {
      return;
    }

    // Must be HTML
    const html =
      typeof res.data === "string"
        ? res.data.toLowerCase()
        : JSON.stringify(res.data).toLowerCase();

    // Reject obvious invalid pages
    if (
      html.includes("page not found") ||
      html.includes("404") ||
      html.includes("not found") ||
      html.includes("oops")
    ) {
      return;
    }

    // Accept only if Jobvite markers exist
    if (
      html.includes("jobvite") ||
      html.includes("careers") ||
      html.includes("jobs")
    ) {
      console.log("✅", company);

      verified.push({
        company,
        ats: ATS_NAME,
        url,
      });
    }
  } catch (err) {
    // Ignore failures
  }
}

async function main() {
  console.log(`Checking ${companies.length} companies...\n`);

  for (const company of companies) {
    await checkCompany(company);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(verified, null, 2));

  console.log("\nFinished");
  console.log(`Verified: ${verified.length}`);
}

main();
