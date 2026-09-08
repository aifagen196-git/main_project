import axios from "axios";

const SEARCH_ENDPOINT =
  process.env.KFORCE_SEARCH_ENDPOINT ||
  "https://kforcewebeast.search.windows.net/indexes/kforcewebjobentity/docs/search?api-version=2016-09-01";
const SEARCH_API_KEY =
  process.env.KFORCE_SEARCH_API_KEY || "1603E4DC4C87A8E41D6BBDE4EEA4EFB7";

/**
 * Kforce has only one board (it's a single company, not a multi-tenant ATS),
 * so this just confirms the Azure Search endpoint + query key still work
 * rather than checking a list of slugs -- run with `npm run verify:kforce`.
 */
async function run() {
  try {
    const { data } = await axios.post(
      SEARCH_ENDPOINT,
      {
        count: true,
        select: "Id, Title, City, State",
        search: "",
        skip: 0,
        top: 5,
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": SEARCH_API_KEY,
        },
      },
    );

    if (!Array.isArray(data?.value)) {
      console.log("❌ kforce — unexpected response shape");
      return;
    }

    console.log(
      `✅ kforce — ${data["@odata.count"]} jobs total, sample: ${data.value
        .map((j) => j.Title)
        .join(" | ")}`,
    );
  } catch (err) {
    console.log(`❌ kforce — ${err.response?.status || err.message}`);
  }
}

run();
