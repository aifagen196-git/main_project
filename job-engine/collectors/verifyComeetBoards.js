import axios from "axios";
import companies from "./config/comeetCompanies.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const valid = [];
const invalid = [];

async function verify({ name, uid }) {
  try {
    const { data: html } = await axios.get(
      `https://www.comeet.com/jobs/${name}/${uid}`,
      { timeout: 10000, headers: HEADERS },
    );
    const match = html.match(/token["']?\s*[:=]\s*["']([a-zA-Z0-9_-]{20,})["']/i);
    if (!match) {
      console.log(`❌ ${name} (no token found on careers page)`);
      invalid.push(name);
      return;
    }

    const res = await axios.get(
      `https://www.comeet.co/careers-api/2.0/company/${uid}/positions`,
      { timeout: 10000, params: { token: match[1], details: false } },
    );

    if (res.status === 200 && Array.isArray(res.data)) {
      console.log(`✅ ${name} (${res.data.length} jobs)`);
      valid.push(name);
    } else {
      console.log(`❌ ${name} (unexpected response shape)`);
      invalid.push(name);
    }
  } catch {
    console.log(`❌ ${name}`);
    invalid.push(name);
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
