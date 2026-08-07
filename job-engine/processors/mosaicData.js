// processors/mosaicData.js
//
// Indeed's search results page embeds a full structured dataset per job in
// an inline `<script id="mosaic-data">` tag — `window.mosaic.providerData
// ["mosaic-provider-jobcards"]`, at `metaData.mosaicProviderJobCardsModel
// .results` — alongside the rendered HTML cards.
//
// That JSON is a strictly better source than scraping the cards:
//   - exact salary (extractedSalary.min/max/type), not a fragile CSS lookup
//   - an absolute post timestamp (createDate, epoch ms), not a relative
//     string that has to be re-parsed ("30+ days ago")
//   - taxonomyAttributes (job type, shift, remote, benefits) as clean labels
//   - no UI-only phantom entries: a live audit found the DOM renders a
//     "View similar jobs with this employer" card that reuses the previous
//     card's title/company under a placeholder jobkey (456789abcdef0123)
//     that never appears in this JSON at all — so reading results[] instead
//     of iterating `.job_seen_beacon` DOM nodes eliminates that bug outright.
//
// The assignment is `window.mosaic.providerData["key"]=<object literal>;`,
// which is JSON except for the surrounding JS statement — extracted with a
// string-aware brace counter (a naive one miscounts `{`/`}` that appear
// inside quoted string values, e.g. inside a job's HTML description snippet).

/**
 * Find `window.mosaic.providerData["providerKey"]=...;` in a script blob and
 * return the parsed object, or null if the provider isn't present.
 *
 * @param {string} scriptText - contents of the #mosaic-data script tag
 * @param {string} providerKey - e.g. "mosaic-provider-jobcards"
 */
export function extractMosaicProvider(scriptText, providerKey) {
  const marker = `window.mosaic.providerData["${providerKey}"]=`;
  const markerIdx = scriptText.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = markerIdx + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < scriptText.length; i++) {
    const ch = scriptText[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const jsonStr = scriptText.slice(start, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Convenience: pull the job cards array straight out of the search page's
 * mosaic-data script. Returns [] if the page shape has changed (Indeed
 * changes this fairly often) rather than throwing, so a collector run
 * degrades to zero results instead of crashing.
 *
 * @param {string} mosaicScriptText - contents of #mosaic-data
 * @returns {object[]}
 */
export function extractJobCardResults(mosaicScriptText) {
  const provider = extractMosaicProvider(
    mosaicScriptText,
    "mosaic-provider-jobcards",
  );
  return provider?.metaData?.mosaicProviderJobCardsModel?.results || [];
}

export default extractMosaicProvider;
