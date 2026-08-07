import axios from "axios";
import fs from "fs";
import companies from "./companies.js"; // your companies array

// ======================================================
// CHANGE ONLY THESE 3 LINES
// ======================================================

const ATS_NAME = "Jobvite";

const API = "https://jobs.jobvite.com/api/company/{company}";

const OUTPUT = "./jobvite1.json";

// ======================================================

const verified = [];

async function checkCompany(company) {
  const url = API.replace("{company}", company);

  try {
    const res = await axios.get(url, {
      timeout: 5000,
      validateStatus: null,
    });

    if (res.status === 200) {
      console.log("✅", company);
      console.log(company);
      console.log(url);
      console.log(res.status);
      console.log(res.data);
      console.log(typeof res.data);

      verified.push({
        company,
        ats: ATS_NAME,
        url,
      });
    } else {
      console.log("❌", company);
    }
  } catch {
    console.log("❌", company);
    failed.push(company);
  }
}

async function main() {
  console.log("=================================");
  console.log(`Checking ${companies.length} companies`);
  console.log(`ATS : ${ATS_NAME}`);
  console.log("=================================\n");

  for (const company of companies) {
    await checkCompany(company);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(verified, null, 2));

  console.log("\n=================================");
  console.log("Finished");
  console.log("Verified :", verified.length);
  console.log("=================================");
}

main();
