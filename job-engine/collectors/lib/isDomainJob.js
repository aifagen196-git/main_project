import { inferRoleFamily } from "../../vendor/scoreMatch.js";

/**
 * Gate for the broad-aggregator collectors (hiringcafe.js, builtin.js) that
 * pull from a general jobs feed rather than a pre-scoped ATS board. Reuses
 * the SAME title regexes the matcher itself uses (scoreMatch.js's
 * TITLE_FAMILIES) so "in our domain" here means exactly what it means at
 * match time — not a separate, looser definition that could let through
 * titles the matcher would never surface anyway.
 *
 * Deliberately checked BEFORE normalization: normalizeHiringcafeJob /
 * normalizeBuiltinJob both call extractJobProfile, which hits the Anthropic
 * API per job when a key is configured. Filtering on the raw title first
 * means an off-domain job (nurse, warehouse associate, sales rep, ...)
 * never reaches that call, and never reaches saveJobs — the whole point of
 * scoping the bulk aggregator runs down to the platform's supported role
 * families, per the request that these runs were burning storage/time on
 * jobs the matcher would never route to anyone anyway.
 */
export function isDomainJob(title = "") {
  return inferRoleFamily(title) !== "";
}
