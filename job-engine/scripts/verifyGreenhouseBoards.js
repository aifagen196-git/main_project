import axios from "axios";
import companies from "../config/greenhouseCompanies.js";

const valid = [];
const invalid = [];

async function verify(company) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    const res = await axios.get(url, { timeout: 10000 });

    if (res.status === 200) {
      console.log(`✅ ${company}`);
      valid.push(company);
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
