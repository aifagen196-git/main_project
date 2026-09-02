# Supported companies

The authoritative list is generated from the per-ATS config files, not written
by hand:

```bash
npm run companies
```

`npm run companies -- --list` prints every company grouped by collector, and
`npm run companies -- dell` answers "which collector covers this company?".

## How a company gets added

Companies are never added to a collector's config without a live check first.
Every ATS in this repo is single-tenant with no discovery API, so a wrong slug
or site ID usually returns **an empty list rather than an error** — it looks
like a quiet week instead of a bug. The rule is: an entry goes in only after
the listing endpoint returns a non-zero count *and* a detail fetch on the
first result returns a populated posting. `npm run verify:<ats>` does this for
the ATSes that have a verifier.

## 2026-08-11 additions

| Company | Collector | Tenant | Reqs at verification |
| --- | --- | --- | --- |
| Target | `workday` | `target.wd5` / `targetcareers` | ~2,000 |
| Capital One | `workday` | `capitalone.wd12` / `Capital_One` | ~1,800 |
| CVS Health | `workday` | `cvshealth.wd1` / `CVS_Health_Careers` | ~19,000 |
| Pfizer | `workday` | `pfizer.wd1` / `PfizerCareers` | ~540 |
| Boeing | `workday` | `boeing.wd1` / `EXTERNAL_CAREERS` | ~720 |
| Dell | `oracle` | `enterpriseplatform.dell.com` / `CX_1001` | ~370 US |

Adding these surfaced a latent bug in `workday.js` — see *Pagination clamp*
below. Other notes on the additions:

- **CVS is an outlier in cost, and has not been collected yet.** The Workday
  collector issues one detail request per posting, so a full CVS pass is
  roughly 19,000 extra HTTP requests — more than the rest of the Workday list
  combined, and hours of runtime. Its config entry is verified and live, but
  the first collection was deliberately deferred. Note this means `npm run
  all` (and any cron built on it) *will* pick CVS up: give it its own
  schedule, or lower `DETAIL_CONCURRENCY`, before that happens unattended.

  ```bash
  ONLY_COMPANIES=cvshealth SAVE_CHUNK=5 npm run workday
  ```
- **These tenants need a smaller `SAVE_CHUNK`.** Their postings are long
  enough that the default 100-row upsert trips Postgres's `statement_timeout`
  and loses the entire batch. `SAVE_CHUNK=5` got Pfizer + Boeing to 767/797
  saved; the residual failures are individual oversized rows, which is a
  database-side timeout to raise, not a collector bug.
- **Dell needed a code change, not just config.** Dell's board is Oracle
  Recruiting Cloud served from Dell's own domain: `jobs.dell.com` redirects
  API calls to `enterpriseplatform.dell.com`, and the underlying
  `{pod}.fa.{region}.oraclecloud.com` host isn't routable from outside. Config
  entries now accept an optional `host` that replaces the derived pod host;
  `oracle.js` and `verifyOracleBoards.js` both honour it.

## Pagination clamp (workday.js)

Adding Target exposed two bugs in `fetchAllListings`, one behind the other.

**First bug — the loop could hang forever.** Termination relied only on a
short page (`postings.length < PAGE_SIZE`). Target's tenant clamps its offset
at 2000 and then re-serves that same full page indefinitely — offsets 2000,
2020, 3000, and 5000 all returned the identical 20 postings — so the short
page never arrived and the collector spun without ever reaching the
detail-fetch stage. None of the tenants already in config were large enough to
hit this; CVS at ~19k reqs would have too, which is one more reason it was
right to hold that one back until this was fixed.

**Second bug — the naive fix undercounted by 84%.** The first patch broke the
loop when a page added nothing new to the dedupe map, logged `⚠ pagination
clamped`, and moved on — collector no longer hung, but Target's `total: 2000`
turned out to be **wrong**: its own facet counts (state, job family, etc.) sum
to ~12,063 real postings. A plain "stop and report what we have" fix would
have collected 2,000 of 12,000 and looked like a clean, successful run.

**The actual fix partitions the query.** `collectListings` now detects the
clamp by comparing consecutive pages (two identical pages back-to-back, not
"nothing new landed in the global dedupe map" — that check has its own false
positive when a facet slice's postings were already seen from an earlier
pass), and when it's clamped, splits the query by the facet with the smallest
maximum bucket (state, for Target — California's 1,634 postings is comfortably
under the cap) and recurses per value. Verified end to end: unfiltered
pagination + naive stop got 2,000; splitting by state alone got 12,040; one
state+category intersection needed a second split level to clear, which is
why `MAX_PARTITION_DEPTH` defaults to 3 rather than 1.

This isn't Target-specific. Every tenant runs through the same
`collectListings` path, so any tenant whose reported `total` is a lie in the
same way gets caught automatically. **NVIDIA already shows the same signature**
(`total: 2000` exactly) and was very likely undercounted on every run before
this fix — there was no clamp detection at all until today, so it would have
silently reported "success" the same way Target did.

A clamp that survives every partition level still logs `⚠ offset cap hit with
no facet left to split on` — that means genuinely unreachable postings remain,
not a bug to chase.

## New portals, 2026-08-12

Requested coverage: business analyst, data analyst, data center technician,
network engineer, full stack, supply chain, devops. Four candidate portals
were checked for a compliant path in; two didn't have one.

**Rejected — Dice.com.** Looked promising (IT/tech-specific board, exactly
the audience for network engineer/devops/data-center roles), but on closer
inspection: their job search endpoint is explicitly disallowed —
`Disallow: /jobs?q*` in robots.txt is a longer, more specific match than the
blanket `Allow: /jobs`, so query-based search is off-limits — and the
`/jobs-sitemap.xml` that looked like a real sitemap turned out to be a
rendered SPA shell with zero `<loc>` entries, not actual XML. No compliant
discovery path, so nothing was built.

**Rejected — Wellfound (formerly AngelList Talent).** `robots.txt` allows
crawling and they publish a real gzipped sitemap, but it only lists 86
static marketing/category pages (`/jobs`, `/browse/tech-jobs`, ...) — no
individual job postings. Live search would mean scripting their JS-rendered
search UI, the same category of workaround declined for Verizon.

**Added — USAJOBS.gov.** [usajobs.js](usajobs.js) /
[config/usajobsSearches.js](config/usajobsSearches.js). Official free
federal government Search API — every US agency's public postings (DoD, VA,
DHS, GSA, national labs, ...) in one place, none of which run a
Greenhouse/Lever-style board. Strong fit for network engineer and data
center technician specifically, since federal agencies post huge volumes of
both, often clearance-adjacent work invisible to startup-oriented ATS boards.

**Added — Adzuna.** [adzuna.js](adzuna.js) /
[config/adzunaSearches.js](config/adzunaSearches.js). General aggregator
with a genuinely free developer tier (unlike the JSearch plan this repo is
currently quota-blocked on). Its `category` filter (`accounting-finance-jobs`,
`it-jobs`, `logistics-warehouse-jobs`, ...) targets business analyst,
data analyst, and supply chain more precisely than a bare keyword search can.

Neither collector shipped with working credentials — **this repo cannot
register accounts on your behalf**, since that means accepting a third
party's terms of service in your name. Both are free, instant signups with
no waiting period:

- USAJOBS: register at https://developer.usajobs.gov/apirequest/, then set
  `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` (the exact email you registered
  with — a mismatched User-Agent 401s even with a valid key) in `.env`.
- Adzuna: register at https://developer.adzuna.com/, then set
  `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in `.env`.

Both collectors detect a missing key and abort cleanly (exit 0, no partial
writes) rather than crash — confirmed by running each with `.env` unset.
Once keys are in place:

```bash
npm run usajobs
npm run adzuna
```

Both support the same test-slice pattern as workday/oracle — try a small
batch before a full pass:

```bash
ONLY_KEYWORDS="network engineer" USAJOBS_MAX_RESULTS=100 npm run usajobs
ONLY_QUERIES="data analyst" ADZUNA_MAX_RESULTS=100 npm run adzuna
```

Both are also in `npm run all` now, same as jsearch — they no-op harmlessly
until keys are set, so nothing else in that chain is at risk.

## No-credential portals, 2026-08-12

USAJOBS and Adzuna above both need registration, so — per instruction — three
more were added that need **zero credentials**, confirmed live before
building anything:

| Collector | Source | Notes |
| --- | --- | --- |
| [remotive.js](remotive.js) | `remotive.com/api/remote-jobs` | Remote-only. No pagination in their API — one call returns every match. |
| [arbeitnow.js](arbeitnow.js) | `arbeitnow.com/api/job-board-api` | EU-headquartered, most listings are Berlin/Munich/etc — expect low US yield (confirmed: 12 of 375 fetched passed `isUsJob` in testing). Their terms ask only for a link back and no abuse of the free tier. |
| [jobicy.js](jobicy.js) | `jobicy.com/api/v2/remote-jobs` | Remote-only, but supports a server-side `geo=usa` filter the collector uses on every request — best yield of the three (20 of 30 fetched passed in testing, vs. Remotive's 5 of 20 and Arbeitnow's 12 of 375). |

All three tested live with a small slice before being called done:

```bash
ONLY_QUERIES="network engineer" REMOTIVE_MAX_RESULTS=20 npm run remotive   # 5/5 saved
ONLY_QUERIES="devops" ARBEITNOW_MAX_RESULTS=20 npm run arbeitnow           # 12/12 saved
ONLY_QUERIES="devops" JOBICY_MAX_RESULTS=20 npm run jobicy                 # 20/20 saved
```

Rows confirmed landing in Supabase with correct `source`/`company`/`location`
for all three. Each supports the same `ONLY_QUERIES` + `*_MAX_RESULTS` test-
slice pattern as every other keyword-driven collector in this repo, and each
skips (not narrows) its deactivation pass on a partial run for the same
reason jsearch/usajobs/adzuna do — no per-query column to scope it to safely.

Two portals were checked and rejected before landing on these three — see
"New portals, 2026-08-12" above for why Dice and Wellfound didn't make it in.

## Fourth no-credential portal — The Muse

[muse.js](muse.js) / [config/museCategories.js](config/museCategories.js) /
[normalizeMuse.js](normalizeMuse.js) had already been written but were never
wired into `npm run` or the supported-sources list — fixed. `themuse.com/api/public/jobs`
is public with no signup: unauthenticated requests are capped at 500/hr,
which this collector's pacing (one request per page per category, with a
delay between them) stays well under. An optional `MUSE_API_KEY` env var
raises that cap to 3600/hr if it's ever needed, but nothing requires it to
run.

Unlike Remotive/Arbeitnow/Jobicy, The Muse's API has no free-text search —
only `category`, `location`, and `level` filters — so `museCategories.js`
lists the category names confirmed live for `location=United States`:
Software Engineering, Data and Analytics, Data Science, Project Management,
Product Management, Design and UX.

```bash
ONLY_QUERIES="data" MUSE_MAX_RESULTS=20 npm run muse
```

Same `ONLY_QUERIES` + `*_MAX_RESULTS` test-slice pattern and same
skip-deactivation-on-partial-run behavior as the other keyword/tag-driven
collectors. Now included in `npm run all`.

## Fifth no-credential portal — Hacker News "Who is hiring?", 2026-08-14

[hackernews.js](hackernews.js) / [normalizeHackernews.js](normalizeHackernews.js) /
[config/hackernewsSearches.js](config/hackernewsSearches.js). The monthly
"Ask HN: Who is hiring?" thread on news.ycombinator.com, where employers post
directly as top-level comments — genuinely public, no key, no bot-detection.

Fetched via the **Algolia HN Search API** (`hn.algolia.com/api/v1`), not the
raw site or the raw Firebase item API, for two compliance reasons checked
before writing anything:

- `hacker-news.firebaseio.com/robots.txt` — the "official" raw item API most
  tutorials point at — actually says `Disallow: /` and only allows `*.json`
  paths, so it restricts itself. `hn.algolia.com` serves no `robots.txt` at
  all (404, i.e. nothing restricted), and it's Y Combinator's own documented
  public read API built specifically for this kind of use, not a third
  party's endpoint being repurposed.
- `news.ycombinator.com/robots.txt` disallows a handful of action endpoints
  (`/vote?`, `/reply?`, `/login`, ...) but the collector never touches that
  domain directly anyway — Algolia's `/items/{id}` call returns the entire
  comment tree with full text in one request.

**The data is genuinely per-posting**, not an index page: each top-level
comment has its own permanent id and is one employer's own text. The catch is
that it's freeform text, not structured JSON fields — there's a de facto
"Company (url) | Role | Location | Type" convention most posters follow, but
it's not enforced by HN. `normalizeHackernews.js` parses that convention
best-effort from the first line and falls back to `extractJobProfile`'s
heuristics over the full text when a poster didn't follow it — confirmed in
testing below, e.g. a company whose first line put a tech stack where
location goes still got `is_remote_us`/`role_family` right from the
description-level heuristics.

Unlike every other source here, there's no per-query API call — the whole
thread is fetched once, and `config/hackernewsSearches.js`'s keywords
(devops, business analyst, data engineer, platform engineer, ...) are matched
client-side against each comment's text, same as `ONLY_QUERIES` narrows any
other collector's search list. `HACKERNEWS_SCRAPE_LAST_HOURS` defaults to 40
days (960h) rather than the usual 24h — the thread only rotates monthly, so
the standard 24h staleness window would deactivate every row between runs.

```bash
ONLY_QUERIES="devops" HACKERNEWS_MAX_RESULTS=10 npm run hackernews
```

Live test: 234 top-level comments in the August 2026 thread, 11 matched
"devops", 6 filtered out by `isUsJob` (non-US or no location signal at all),
5 saved. Confirmed in Supabase — `source_job_id` is the HN comment id,
`apply_url` is the first link in the posting (falling back to the HN comment
permalink when a posting has none), titles/companies/locations parsed
correctly for postings following the convention and degraded gracefully
(fell back to a longer/messier title) for the one that didn't.

Now in `npm run all`.

### Checked and rejected alongside Hacker News

- **WorkingNomads** (`www.workingnomads.com/api/exposed_jobs/`) — real JSON
  API, `robots.txt` fully open (`Disallow:` empty). Rejected anyway: every
  query parameter tried (`category=`, `tag=`, `limit=`) is silently ignored —
  it always returns the same latest 50 postings platform-wide, so there's no
  way to target roles/keywords the way every other collector in this repo
  does, and a meaningful fraction of that fixed window is gig/microtask
  listings (e.g. repeated "TELUS Digital" AI-rating/data-collection postings)
  rather than jobs in the sense the rest of this repo collects. Not worth a
  second entry in `npm run all` for 50 uncontrollable, partly-off-topic rows.
- **Careerjet**, **WorkingNomads' sibling `workingnomads.com` root**, and
  **Otta** all 301-redirect their bare domain before serving `robots.txt`,
  which on inspection just relocates to the same www host already covered
  above (WorkingNomads) or, for Careerjet/Otta, to a JS-rendered SPA with no
  public JSON endpoint found — same category of rejection as Wellfound.
- **Jobspresso** and **Landing.jobs** both serve real `robots.txt` files with
  no blanket disallow, but neither exposes a JSON API or job-level sitemap —
  only their own JS-rendered search UI, which is the workaround already
  declined for Dice/Verizon.

## Ashby candidate sweep, 2026-08-14

A user-supplied list of ~2,380 slugs they believed were live Ashby tenants
(`ashby_companies_js_format.js`) was checked against `ashbyCompanies.js`.
2,383 unique slugs came in; 225 were already in config and skipped as dupes,
leaving 2,158 genuinely new candidates to verify.

Live-checked every one against `api.ashbyhq.com/posting-api/job-board/<slug>`
(the same endpoint `ashby.js` and `verifyAshbyBoards.js` use), concurrency 8
with a 120ms delay between requests — about 2 minutes total. A slug only
counts as a pass if the endpoint returns 200 **and** the response contains at
least one populated job (a non-zero listing with real posting data, not just
an empty `jobs: []`), matching the doc's standing rule above.

**Result: 1 pass, 2,157 rejected.** The list looked like a generic roster of
well-known tech companies rather than confirmed Ashby slugs — most listed
brands actually run Greenhouse, Lever, or in-house ATSes, not Ashby, so their
slug 404s on Ashby's posting API even though the company is real. Sanity-
checked the verifier itself against four slugs already confirmed live in
config (`1password`, `ollama`, `ramp`, `notion` — none of which were in the
candidate file) and all four returned 200 with populated job counts, so the
near-total rejection rate reflects the candidate list, not a broken check.

- **Added — `workhuman`.** 200, 1 job returned. That single posting is not a
  US location per `isUSJob`'s check, so this board currently contributes zero
  rows to `ashby.js` output until Workhuman posts a US role — added anyway
  per the "live board, filter per-posting" rule, but flagged here since it's
  a live company producing nothing right now.
- **Rejected — 2,152 genuine 404s.** e.g. `abnormal`, `canva`, `asana`,
  `chainguard`, `algolia`, `brex`, `anduril`, `anthropic`, `cloudflare`,
  `circleci` — real companies, wrong ATS guess. No rate-limiting was
  observed (no 429s in the run); these are hard 404s, i.e. Ashby has no
  tenant at that slug.
- **Rejected — 5 empty boards (200 but zero jobs).** `melio`, `turing`,
  `cribl`, `nutanix`, `getyourguide` — real Ashby tenants (the slug
  resolves), but no live postings at check time, so they fail the
  populated-detail-fetch requirement and were left out rather than added
  with an empty board.

`ashbyCompanies.js` now lists 226 slugs (225 + `workhuman`), still a valid
ES module (`import companies from "./config/ashbyCompanies.js"` returns an
array of length 226, confirmed by loading it directly).

## Cross-portal sweep of company wishlist, 2026-08-14

Same candidate file as the Ashby sweep above (`ashby_companies_js_format.js`,
2,383 unique slugs), this time checked against every other per-company ATS
collector that takes a bare guessable slug: `greenhouse.js`, `lever.js`,
`smartrecruiters.js`, `recruitee.js`, `teamtailor.js`, `breezyhr.js`,
`bamboohr.js`, `jobvite.js`, `jazzhr.js`, and `pinpoint.js` — roughly 21,000
live requests, concurrency 10 with a ~120ms delay per platform per candidate.

Skipped three platforms as out of scope for a bare-slug sweep: **comeet.js**
needs a per-tenant numeric `uid` that isn't derivable from a company name at
all; **icims.js** boards live on arbitrary per-customer hosts with no
company-name pattern (see its config file's own note); **workable.js**'s
public API requires browser-context headers/tokens the collector gets via
Playwright, which a plain HTTP sweep can't reproduce reliably. `workday.js`,
`oracle.js`, `ukg.js`, `successfactors.js`, `avature.js` were already out of
scope per this doc's standing guidance (tenant ID/host needed, not just a
slug).

Pass 1 (non-zero listing) produced far more "hits" than pass 2 (identity
check) confirmed real — see the per-platform breakdown below for why.
**iCIMS-style false positives aside, the biggest trap was Pinpoint**: guessing
well-known company names against `*.pinpointhq.com` returns 200 JSON for
almost any word, because unclaimed/demo Pinpoint accounts serve identical
boilerplate postings ("Head of DEI - UK/US/Belfast", "Marketing Manager",
"Customer Service Rep") verbatim across dozens of unrelated slugs —
`checkr`, `elastic`, `singlestore`, `zendesk`, `zuora`, `aiven`, `clerk`,
`nutanix`, `kraken`, and many more all returned this same canned content, not
real company boards. BambooHR had a smaller version of the same issue
(`rippling`, `crowdstrike`, and `juniper` all served byte-identical "IT
Security Engineer | Mayfair" / "Software Engineer | Sydney" listings — a
shared template board, not three real companies). Recruitee and Teamtailor's
customer base skews small EU/NL/SE businesses, several of which happen to
share a name with a well-known tech company (`coursera` → "Job 1" test
posting; `accenture` → a Dutch hotel's "Senior Marketer (Sample)"; `clay` →
Clay Hospitality, a hotel group; `bamboohr` → a Louisiana construction
staffing board). Every "hit" below was individually re-fetched and its
posting titles/locations checked for a plausible match to the named
company's actual business before being added — non-matching and templated
hits were rejected even though they technically passed the non-zero-listing
check.

| Platform | Candidates checked | Raw hits (non-empty) | Already in config | Verified new adds |
|---|---|---|---|---|
| greenhouse | 2,383 | 376 | 372 | **2** |
| lever | 2,383 | 99 | 99 | 0 |
| smartrecruiters | 2,383 | 56 | 56 | 0 |
| recruitee | 2,383 | 22 | 1 | **6** |
| teamtailor | 2,383 | 31 | 2 | **14** |
| breezyhr | 2,383 | 8 | 0 | **2** |
| bamboohr | 2,383 | 63 | 59 | 0 (4 raw hits were the Mayfair/Sydney template board — rejected) |
| jobvite | 2,383 | 9 | 9 | 0 |
| jazzhr | 2,383 | 19 | 0 | **9** |
| pinpoint | 2,383 | 71 | 0 | **12** (59 rejected as demo-template or wrong-company content) |

**Total: 45 new verified companies added across 6 platforms.** Greenhouse,
Lever, SmartRecruiters, and Jobvite mostly just reconfirmed slugs already in
their configs (unsurprising — this is the same well-known-company wishlist
already used to build those lists originally); their few genuine misses
either didn't pass identity review (`greenhouse` rejected `wise` — Cleveland/
Orlando insurance sales roles, not the fintech Wise — and `goose` — literal
"ONE OPENING"/"Create Job" placeholder titles) or don't exist on those ATSes.

- **greenhouse.js** — `fleet` (43 jobs), `reflex` (5 jobs).
- **recruitee.js** — `parallel` (5), `zeotap` (1), `hostaway` (11),
  `stormreply` (1), `knapsack` (2), `crowdsec` (1).
- **teamtailor.js** — `payfit` (13), `spacelift` (12), `akeneo` (13),
  `gitguardian` (38), `hivebrite` (3), `launchmetrics` (9), `techsee` (3),
  `teamviewer` (100), `unleash` (4), `hedvig` (8), `keepit` (37),
  `powerfleet` (38), `exotrail` (40), `ml6` (12).
- **breezyhr.js** — `duolingo` (4), `attentive` (1).
- **jazzhr.js** — `bluevoyant` (8), `fusionauth` (10), `sendoso` (4),
  `arangodb` (30 — one posting explicitly names "Arango AI Product Suite",
  the strongest identity confirmation in the batch), `attackiq` (8),
  `h2oai` (24), `linearb` (6), `parity` (4), `lightbend` (12).
- **pinpoint.js** — `sendbird` (4), `riskified` (4), `exabeam` (6),
  `zoox` (5), `skims` (102), `fender` (4), `magic` (70), `safetywing` (4),
  `getyourguide` (4), `hazelcast` (5), `openx` (4), `pairwise` (4).

Every modified config file (`greenhouseCompanies.js`, `recruiteeCompanies.js`,
`teamtailorCompanies.js`, `breezyhrCompanies.js`, `jazzhrCompanies.js`,
`pinpointCompanies.js`) was re-imported directly after editing to confirm it
is still a valid ES module and reports the expected array length.

## Running a subset

`workday.js` and `oracle.js` accept `ONLY_COMPANIES` (comma-separated config
slugs) so a newly-added tenant can be collected without a full pass:

```bash
ONLY_COMPANIES=dell SAVE_CHUNK=20 npm run oracle
```

The filter also narrows the end-of-run stale-deactivation query to the
selected companies. Without that, a partial run would mark every *other*
tenant's jobs inactive purely because their `last_seen` wasn't refreshed.

`jsearch.collector.js` has the equivalent `ONLY_QUERIES` (case-insensitive
substring match against the configured queries), which matters more there
than elsewhere: the run budget is 20 requests and there are 20 configured
searches, so reaching a query at the end of the list otherwise costs the
entire run's quota.

```bash
ONLY_QUERIES=Walmart,Verizon npm run jsearch
```

A filtered JSearch run **skips** the deactivation pass instead of narrowing
it. Its rows carry no column identifying which query produced them, so there
is no way to scope the query correctly — the next full run handles it.

## Walmart and Verizon: no board collector

Both were requested and neither has a collectable board. They are covered only
through JSearch employer queries in `config/jsearchSearches.js`, which returns
a subset of their real postings tagged `source: "jsearch"`.

**Walmart** retired its public Workday site — `walmart.wd5.myworkdayjobs.com`
answers 200 for *any* site ID with no `jobPostings`, which is the signature of
a catch-all redirect, not a live board. Its only live data now comes from
`careers.walmart.com/api/graphql`, and `careers.walmart.com/robots.txt` says:

```
Disallow: /api
```

The XML sitemap is crawlable and lists ~15,400 job URLs whose
`__NEXT_DATA__` payload parses cleanly — but it is stale: 24 of 24 randomly
sampled postings came back `active: false`, with no location or posting date.
It is not a usable substitute for the disallowed endpoint.

**Verizon**'s sitemap (`/en/jobs/sitemap.xml`) is fetchable and lists ~1,200
current jobs with `lastModified` timestamps, and its robots.txt allows
crawling. The job detail pages themselves, however, sit behind a Cloudflare
managed challenge — they return `403` with `cf-mitigated: challenge` to any
non-browser client. Collecting them would mean defeating a bot-detection
challenge, so no collector was built.

Note that as of 2026-08-12 the JSearch account's API quota is exhausted
(`api.openwebninja.com` rate-limits the first request of any run), so these
two queries are configured but not yet returning rows. Top up the plan and
re-run `ONLY_QUERIES=Walmart,Verizon npm run jsearch`.

If either becomes a priority, the honest options are a licensed feed direct
from the employer or an aggregator that already has one — not a workaround.

## Two bulk-volume Oracle Recruiting Cloud tenants, 2026-09-01

Requested: more free, no-key, high-volume US sources. `oracle.js` already had
the discovery method worked out for Dell — read the company's own careers
vanity domain and pull the `{pod}.fa.{region}.oraclecloud.com` pod out of the
HTML's favicon/asset URLs — so the fastest new coverage was checking which
other big US employers' "careers.company.com"-style domains are secretly
Oracle Recruiting Cloud under the hood. Two were, both confirmed live before
being added to [config/oracleCompanies.js](config/oracleCompanies.js):

| Company | pod | region | siteNumber | Reqs at verification |
| --- | --- | --- | --- | --- |
| Kroger | `eluq` | `us2` | `CX_2001` | ~12,000 (`www.krogerfamilycareers.com`) |
| Honeywell | `ibqbjb` | `ocs` | `CX_1` | ~1,340 (`careers.honeywell.com`) |

Both verified the same way the doc's standing rule requires: the
`recruitingCEJobRequisitions` endpoint returned a non-zero `TotalJobsCount`,
and a populated page of `requisitionList` entries had real titles/locations
(Kroger: "JEWELRY/SALES SPECIALIST", Kirkland WA; Honeywell: "Senior Brand
Manager", Charlotte NC, among others on a 50-row sample).

- **Kroger is overwhelmingly US retail/grocery roles** — the highest-yield
  addition here, ~12k reqs with no `host` override needed (served straight
  off `eluq.fa.us2.oraclecloud.com`, not a custom domain like Dell).
- **Honeywell's board is global**, same caveat as Pfizer in the Workday list
  above: a 50-row sample was only 12/50 US-tagged locations, so expect a
  large fraction dropped by `isUsJob` rather than saved — it's a live board
  worth including, not a mistake if the US yield looks low.

Neither needs an API key, registration, or any change to `oracle.js` itself —
same collector, same `recruitingCEJobRequisitions`/`recruitingCEJobRequisitionDetails`
endpoints already used for the other six tenants. Run just these two with the
existing `ONLY_COMPANIES` flag:

```bash
ONLY_COMPANIES=kroger,honeywell SAVE_CHUNK=20 npm run oracle
```

Candidates checked and rejected before landing on these two: Home Depot,
Lowe's, Comcast, AT&T, Wells Fargo, JPMorgan Chase, Walgreens, UPS, FedEx,
Deloitte, Accenture, IBM, Cisco, Chevron, ExxonMobil, GM, Ford, J&J, Merck,
AbbVie, Amgen, Lockheed Martin, RTX, Northrop Grumman, General Dynamics, 3M,
Caterpillar, US Bank, Citi, PepsiCo, and Coca-Cola — each either masks its
ATS behind a marketing domain with no discoverable API or has no live
board matching a guessable tenant/siteId.

One more from the same sweep landed on Workday instead of Oracle — **Intel**,
confirmed live at `intel.wd1.myworkdayjobs.com` / `External` (~609 reqs), now
added to [config/workdayCompanies.js](config/workdayCompanies.js) alongside
NVIDIA/Salesforce/Adobe/etc. Same collector, same `wday/cxs` endpoint, no code
change needed.

```bash
ONLY_COMPANIES=intel SAVE_CHUNK=20 npm run workday
```
