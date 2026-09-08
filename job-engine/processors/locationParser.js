// processors/locationParser.js
//
// Normalizes the free-text location strings ATS APIs return ("San Francisco,
// CA, United States", "Remote - US", "New York, New York") into a consistent
// {city, state, country, remote} shape used across sources.

const US_STATE_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};
const VALID_ABBR = new Set(Object.values(US_STATE_ABBR));

const REMOTE_RE = /\bremote\b/i;
const US_RE = /\b(united states|usa|u\.s\.a?\.?)\b/i;

// "City, Country" is as common as "City, State" in global ATS feeds. Without
// this list "Tokyo, Japan" parsed as state="Japan", country=null.
const COUNTRY_NAMES = new Set([
  "japan", "canada", "mexico", "brazil", "argentina", "chile", "colombia",
  "united kingdom", "uk", "england", "scotland", "wales", "ireland", "france",
  "germany", "spain", "italy", "portugal", "netherlands", "belgium", "sweden",
  "norway", "denmark", "finland", "poland", "czechia", "czech republic",
  "austria", "switzerland", "greece", "romania", "hungary", "ukraine",
  "israel", "turkey", "india", "china", "taiwan", "hong kong", "singapore",
  "malaysia", "thailand", "vietnam", "philippines", "indonesia", "australia",
  "new zealand", "south korea", "korea", "south africa", "nigeria", "kenya",
  "egypt", "united arab emirates", "uae", "saudi arabia", "costa rica",
  "panama", "peru", "uruguay", "bulgaria", "serbia", "croatia", "estonia",
  "latvia", "lithuania", "slovakia", "slovenia", "iceland", "luxembourg",
]);

/**
 * @param {string} raw
 * @returns {{city:string, state:string, country:string, remote:boolean, raw:string}}
 */
export function parseLocation(raw = "") {
  const s = String(raw).trim();
  const remote = REMOTE_RE.test(s);
  if (!s) return { city: "", state: "", country: "", remote, raw: s };

  // Strip a leading "Remote -"/"Remote," qualifier before splitting on commas.
  const cleaned = s.replace(/^remote\s*[-,–]?\s*/i, "").trim();
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);

  let city = "";
  let state = "";
  let country = "";

  if (parts.length >= 3) {
    [city, state, country] = parts;
  } else if (parts.length === 2) {
    // Disambiguate "Tokyo, Japan" (city, country) from "Austin, TX"
    // (city, state) — otherwise a country name gets stored as the state.
    if (COUNTRY_NAMES.has(parts[1].toLowerCase())) {
      [city, country] = parts;
    } else {
      [city, state] = parts;
    }
  } else if (parts.length === 1) {
    if (US_RE.test(parts[0]) || /^us$/i.test(parts[0])) country = "United States";
    else city = parts[0];
  }

  const stateLower = state.toLowerCase();
  if (US_STATE_ABBR[stateLower]) state = US_STATE_ABBR[stateLower];
  else if (state && VALID_ABBR.has(state.toUpperCase())) state = state.toUpperCase();

  if (!country && (VALID_ABBR.has(state) || US_RE.test(s))) {
    country = "United States";
  }

  return { city, state, country, remote, raw: s };
}

export default parseLocation;
