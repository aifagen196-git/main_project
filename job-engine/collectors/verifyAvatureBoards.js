import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import companies from "./config/avatureCompanies.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function verify({ company, portalBase, template }) {
  try {
    const { data: html } = await axios.get(`${portalBase}/SearchJobs`, {
      timeout: 15000,
      headers: { "User-Agent": UA },
    });

    const $ = cheerio.load(html);
    const links = new Set();
    $('a[href*="/JobDetail/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.includes("shareUrl=")) links.add(href);
    });

    if (!links.size) {
      console.log(`❌ ${company} — no /JobDetail/ links on SearchJobs`);
      return false;
    }

    // Also confirm the configured template actually extracts something on
    // the first job -- a valid board with the WRONG template silently
    // produces empty descriptions, which is worse than a fetch failure.
    const firstUrl = new URL([...links][0], portalBase).toString();
    const { data: detailHtml } = await axios.get(firstUrl, {
      timeout: 15000,
      headers: { "User-Agent": UA },
    });
    const $$ = cheerio.load(detailHtml);

    let descLen = 0;
    if (template === "bem") {
      $$(".article__content__view__field").each((_, el) => {
        if (!$$(el).find(".article__content__view__field__label").length) {
          descLen = ($$(el).text() || "").trim().length;
        }
      });
    } else if (template === "jobdetail-table") {
      descLen = ($$(".jobDetailDescription").text() || "").trim().length;
    }

    if (!descLen) {
      console.log(
        `⚠ ${company} — ${links.size} jobs found, but template "${template}" extracted an empty description (wrong template?)`,
      );
      return false;
    }

    console.log(`✅ ${company} — ${links.size} jobs, template "${template}" OK`);
    return true;
  } catch (err) {
    console.log(`❌ ${company} — ${err.response?.status || err.message}`);
    return false;
  }
}

async function run() {
  console.log(`Checking ${companies.length} Avature boards...\n`);

  let ok = 0;
  for (const entry of companies) {
    if (await verify(entry)) ok++;
  }

  console.log("\n===============================");
  console.log(`Valid   : ${ok}`);
  console.log(`Invalid : ${companies.length - ok}`);
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the
// same pattern used everywhere else in this repo. Without it, import()-ing
// this file for any reason runs it as a side effect.
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
