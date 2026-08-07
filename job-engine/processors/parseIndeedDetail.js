// processors/parseIndeedDetail.js
//
// Parses the response body of Indeed's embedded detail endpoint:
//   GET /viewjob?jk=...&viewtype=embedded&... (fetched as an in-page XHR,
//   NOT a page navigation — see collectors/indeed.js for why that distinction
//   is the whole ballgame here).
//
// The response is pure JSON (not HTML), shaped as:
//   { status: "success", body: { hostQueryExecutionResult:
//     { data: { jobData: { results: [{ job: {...} }] } } }, ... } }
//
// live-verified fields on `job`: title, sourceEmployerName, description.html
// (the FULL posting, not the SERP snippet — confirmed 8.5KB on a real
// listing vs. the ~1-2KB snippet the search results carry), location
// {city, admin1Code, countryCode}, jobTypes[], compensation.

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} rawBody - response.text() from the embedded viewjob request
 * @returns {{description:string, employer:string, city:string, state:string,
 *   country:string, jobType:string}|null}
 */
export function parseIndeedDetail(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null; // not JSON — page shape changed, degrade gracefully
  }

  const job = parsed?.body?.hostQueryExecutionResult?.data?.jobData?.results?.[0]?.job;
  if (!job) return null;

  const html = job.description?.html || "";
  const description = stripHtml(html);
  if (!description) return null;

  return {
    description,
    employer: job.sourceEmployerName || "",
    city: job.location?.city || "",
    state: job.location?.admin1Code || "",
    country: job.location?.countryCode || "",
    jobType: job.jobTypes?.[0]?.label || "",
  };
}

export default parseIndeedDetail;
