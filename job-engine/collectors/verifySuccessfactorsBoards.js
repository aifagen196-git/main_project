import axios from "axios";
import * as cheerio from "cheerio";
import companies from "./config/successfactorsCompanies.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function verify(entry) {
  const baseUrl = typeof entry === "string" ? entry : entry.baseUrl;
  const company = typeof entry === "string" ? entry : entry.company;

  try {
    const { data: html } = await axios.get(`${baseUrl}/search/`, {
      timeout: 15000,
      params: { q: "", startrow: 0 },
      headers: { "User-Agent": UA },
    });

    const $ = cheerio.load(html);
    const links = new Set();
    $('a[href^="/job/"]').each((_, el) => links.add($(el).attr("href")));

    if (!links.size) {
      console.log(`❌ ${company} — no /job/ links found on /search/`);
      return false;
    }

    console.log(`✅ ${company} — ${links.size} jobs on page 1`);
    return true;
  } catch (err) {
    console.log(`❌ ${company} — ${err.response?.status || err.message}`);
    return false;
  }
}

async function run() {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : companies;

  console.log(`Checking ${list.length} SuccessFactors CSB sites...\n`);

  let ok = 0;
  for (const entry of list) {
    if (await verify(entry)) ok++;
  }

  console.log("\n===============================");
  console.log(`Valid   : ${ok}`);
  console.log(`Invalid : ${list.length - ok}`);
}

run();
