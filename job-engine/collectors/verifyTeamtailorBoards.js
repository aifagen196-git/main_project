import axios from "axios";
import companies from "./config/teamtailorCompanies.js";

const valid = [];
const invalid = [];

async function verify(company) {
  try {
    const url = `https://${company}.teamtailor.com/jobs.json`;

    const res = await axios.get(url, { timeout: 10000 });

    if (res.status === 200 && Array.isArray(res.data?.items)) {
      console.log(`✅ ${company} (${res.data.items.length} jobs)`);
      valid.push(company);
    } else {
      console.log(`❌ ${company} (unexpected response shape)`);
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

run();
