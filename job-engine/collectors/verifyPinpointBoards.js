import axios from "axios";
import companies from "./config/pinpointCompanies.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const valid = [];
const invalid = [];

// Accepts either a config entry ({ company, slug }) or a bare slug string, so
// this can also be pointed at a list of candidate slugs while building out
// config/pinpointCompanies.js.
async function verify(entry) {
  const slug = typeof entry === "string" ? entry : entry.slug;
  const label = typeof entry === "string" ? entry : entry.company;

  try {
    const { data } = await axios.get(
      `https://${slug}.pinpointhq.com/postings.json`,
      {
        timeout: 10000,
        headers: { Accept: "application/json", "User-Agent": UA },
      },
    );

    if (!Array.isArray(data?.data)) {
      console.log(`❌ ${label} (${slug}) — unexpected response shape`);
      invalid.push(slug);
      return;
    }

    // A live tenant with zero open roles still returns 200 + an empty array,
    // which is a valid board — report it but keep it.
    const usish = data.data.filter((j) => {
      const loc = `${j.location?.city || ""} ${j.location?.province || ""}`;
      return /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/.test(
        loc,
      ) || /United States|USA|New York|California|Texas|Florida/i.test(loc);
    }).length;

    console.log(
      `✅ ${label} (${slug}) — ${data.data.length} jobs, ~${usish} US-looking`,
    );
    valid.push(slug);
  } catch (err) {
    console.log(`❌ ${label} (${slug}) — ${err.response?.status || err.message}`);
    invalid.push(slug);
  }
}

async function run() {
  const list = process.argv.slice(2).length
    ? process.argv.slice(2)
    : companies;

  console.log(`Checking ${list.length} Pinpoint boards...\n`);

  for (const entry of list) {
    await verify(entry);
  }

  console.log("\n===============================");
  console.log(`Valid   : ${valid.length}`);
  console.log(`Invalid : ${invalid.length}`);

  console.log("\nValid slugs:\n");
  console.log(JSON.stringify(valid, null, 2));

  console.log("\nInvalid slugs:\n");
  console.log(JSON.stringify(invalid, null, 2));
}

run();
