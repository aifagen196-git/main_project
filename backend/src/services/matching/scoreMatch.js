// backend/src/services/matching/scoreMatch.js
//
// The canonical cheap scorer (Stages 1+2 of the funnel): hard GATES first, then
// a WEIGHTED score across skills / domain / experience / location / education.
// Inputs are the structured profiles (from the extraction prompt), not raw text.
// Ported from the old frontend engine so there is now ONE scorer in the system.

import { normalizeSkills } from "../../knowledge/skills.js";

// Domain (does this job match the candidate's actual professional experience /
// role family?) is deliberately the DOMINANT weight, with skills demoted to a
// tiebreaker. Rationale: raw skill overlap surfaces unrelated jobs — a Business
// Analyst who lists Python/SQL/AWS ties with Backend Engineer roles on skills
// alone. Domain-first means on-domain jobs always rank above off-domain ones,
// and skills order jobs WITHIN a domain tier. Verified on real resumes
// (business-analysis, supply-chain, devops): relevant jobs outrank irrelevant.
export const DEFAULT_WEIGHTS = {
  skills: 0.15,
  domain: 0.45,
  experience: 0.2,
  location: 0.1,
  education: 0.1,
};

const EDU_RANK = { "": 0, highschool: 1, associate: 2, bachelors: 3, masters: 4, phd: 5 };

// Seniority ladder. Used for level alignment — a documented technique at every
// major matcher (LinkedIn/Indeed/JobRight all score or filter on seniority):
// a Senior engineer should not be shown Internships or Technician roles, and a
// new grad should not be shown Director/VP roles, even within the right domain.
const SENIORITY_RANK = {
  intern: 0,
  entry: 1,
  junior: 1,
  associate: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 4,
  principal: 4,
  manager: 4,
  director: 5,
  vp: 6,
  executive: 6,
};

// Read the level straight off the job TITLE — far more reliable than the
// extracted `seniority` field, which defaults to "mid" on most collector rows.
// Returns "" (unknown) when the title states no level, so we never penalize on
// a guess. Order matters: most senior wins.
export function inferSeniorityFromTitle(title = "") {
  const t = ` ${String(title).toLowerCase()} `;
  if (/\b(intern|internship|co-?op|apprentice|trainee)\b/.test(t)) return "intern";
  if (/\b(chief|c[te]o|cio|vp|vice president|head of)\b/.test(t)) return "vp";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\b(principal|staff|distinguished|architect|fellow)\b/.test(t)) return "staff";
  if (/\b(sr\.?|senior|lead)\b/.test(t)) return "senior";
  if (/\b(manager|mgr)\b/.test(t)) return "manager";
  if (/\b(jr\.?|junior|associate|entry[- ]?level|new ?grad|graduate|early career|technician)\b/.test(t))
    return "junior";
  return "";
}

// Candidate seniority backstop. The backup extraction models return "mid" for
// almost everyone, which blunts the seniority gate/ranking. Recover the level
// from years of experience (a reliable floor) and let an explicit title on the
// resume's first line promote it (a "Senior DevOps Engineer" with 4y is senior,
// not mid). Only the first ~160 chars are scanned so a stray "senior
// stakeholders" deep in the summary can't inflate the level.
function yearsToSeniority(years = 0) {
  const y = Number(years) || 0;
  if (y >= 10) return "staff";
  if (y >= 6) return "senior";
  if (y >= 2) return "mid";
  return "junior";
}

export function inferCandidateSeniority(text = "", years = 0) {
  const head = ` ${String(text).slice(0, 160).toLowerCase()} `;
  let fromText = "";
  if (/\b(chief|vp|vice president|head of)\b/.test(head)) fromText = "vp";
  else if (/\bdirector\b/.test(head)) fromText = "director";
  else if (/\b(principal|staff|distinguished|fellow)\b/.test(head)) fromText = "staff";
  else if (/\b(sr\.?|senior|lead)\b/.test(head)) fromText = "senior";
  else if (/\b(jr\.?|junior|intern|entry[- ]?level|new ?grad|graduate)\b/.test(head)) fromText = "junior";
  const fromYears = yearsToSeniority(years);
  const tRank = SENIORITY_RANK[fromText] ?? -1;
  const yRank = SENIORITY_RANK[fromYears] ?? 2;
  // Text can promote above the years floor, never demote below it.
  return tRank > yRank ? fromText : fromYears;
}

// Candidate level vs job level. gap 0 = perfect, grows with distance.
function seniorityGap(candidate, job) {
  const cLevel = SENIORITY_RANK[(candidate.seniority || "mid").toLowerCase()] ?? 2;
  const fromTitle = inferSeniorityFromTitle(job.title);
  const jLevel = fromTitle
    ? SENIORITY_RANK[fromTitle]
    : SENIORITY_RANK[(job.seniority || "").toLowerCase()];
  if (jLevel == null) return null; // job level unknown → don't judge on a guess
  return Math.abs(cLevel - jLevel);
}

// GRADED relatedness: candidate family -> { job family: closeness }.
// A flat 0.5 for every "related" family made a Sales Ops job tie with a Data
// Scientist job for a data-analytics candidate — the closeness ordering was
// then decided by noise (whether the job stated min_years). Values express how
// transferable the candidate's actual experience is to that job family.
const RELATED = {
  "network-engineering": { devops: 0.6, "cloud-engineering": 0.6, "security-engineering": 0.5 },
  "security-engineering": { "network-engineering": 0.5, devops: 0.5, "offensive-security": 0.6 },
  "offensive-security": { "security-engineering": 0.6 },
  "data-analytics": { "data-engineering": 0.7, "ai-ml": 0.6, "business-analysis": 0.5 },
  "data-engineering": { "data-analytics": 0.6, "ai-ml": 0.6, "software-engineering": 0.5 },
  "ai-ml": { "data-analytics": 0.5, "data-engineering": 0.6, "software-engineering": 0.5 },
  devops: { "network-engineering": 0.5, "cloud-engineering": 0.7, "software-engineering": 0.5 },
  "cloud-engineering": { devops: 0.7, "network-engineering": 0.5, "software-engineering": 0.5 },
  "supply-chain": { "business-analysis": 0.5, "data-analytics": 0.5 },
  "business-analysis": { "data-analytics": 0.5, "product-management": 0.5, "supply-chain": 0.5 },
  "software-engineering": { "backend-engineering": 0.7, "frontend-engineering": 0.7, devops: 0.5 },
  "backend-engineering": { "software-engineering": 0.7, devops: 0.5 },
  "frontend-engineering": { "software-engineering": 0.7, design: 0.4 },
};

// Location text that clearly indicates a non-US role. Needed because a batch
// of jobs was collected with a bad `country: "USA"` default (audit C4) — the
// stored country field can't be trusted on its own, so we cross-check the
// human-readable location string.
const NON_US_LOCATION =
  /\b(qatar|doha|uae|dubai|abu dhabi|saudi|riyadh|india|bangalore|bengaluru|hyderabad|mumbai|delhi|noida|gurgaon|gurugram|pune|chennai|kolkata|canada|toronto|vancouver|montreal|ottawa|london|united kingdom|england|scotland|ireland|dublin|germany|berlin|munich|france|paris|netherlands|amsterdam|poland|warsaw|krakow|spain|madrid|barcelona|portugal|lisbon|israel|tel aviv|singapore|japan|tokyo|australia|sydney|melbourne|brazil|s[aã]o paulo|mexico city|argentina|buenos aires|colombia|bogot[aá]|romania|bucharest|czech|prague|hungary|budapest|sweden|stockholm|switzerland|zurich|belgium|brussels|denmark|copenhagen|norway|oslo|finland|helsinki|austria|vienna|italy|milan|rome|greece|athens|turkey|istanbul|egypt|cairo|nigeria|lagos|kenya|nairobi|south africa|cape town|johannesburg|china|beijing|shanghai|hong kong|taiwan|taipei|korea|seoul|philippines|manila|vietnam|indonesia|jakarta|malaysia|kuala lumpur|thailand|bangkok|new zealand|auckland|estonia|tallinn|lithuania|vilnius|ukraine|kyiv|serbia|belgrade|croatia|zagreb|bulgaria|sofia|slovakia|bratislava|slovenia|ljubljana)\b/i;

// Strong US-location detector: "United States"/"USA", all 50 state names + 2-
// letter abbreviations, "Remote US", and major US metros. Used to CONFIRM a US
// job from its location text — critical because heuristic-collected rows often
// leave `country` null even when the location plainly reads "Denver, Colorado,
// United States". Without this, ~9% of the pool (real US jobs) was silently
// gated out, starving the feeds.
const US_LOCATION =
  /\b(usa|u\.s\.a?\.?|united states|remote[, ]*\(?u\.?s\.?a?\)?|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|san francisco|new york city|nyc|los angeles|seattle|austin|boston|chicago|denver|atlanta|dallas|houston|miami|san diego|san jose|palo alto|mountain view|sunnyvale|bellevue|washington,? d\.?c\.?|bay area|salt lake city|salt lake|provo|boise|phoenix|scottsdale|tempe|charlotte|raleigh|durham|nashville|philadelphia|pittsburgh|columbus|cleveland|cincinnati|detroit|ann arbor|minneapolis|st\.? paul|kansas city|st\.? louis|indianapolis|milwaukee|madison|tampa|orlando|jacksonville|fort lauderdale|sacramento|fresno|las vegas|reno|portland|salem|richmond|baltimore|arlington|alexandria|charleston|savannah|albuquerque|tucson|omaha|des moines|oklahoma city|tulsa|louisville|memphis|birmingham|new orleans|baton rouge|hartford|providence|buffalo|rochester|albany|syracuse|colorado springs|boulder|fort collins|spokane|tacoma|san antonio|fort worth|el paso|plano|irvine|san bernardino|riverside|oakland|berkeley|santa clara|santa monica|pasadena|redmond|kirkland)\b/i;

// 2-letter US state abbreviations, matched only when clearly a location token
// (preceded by a comma/space, e.g. "Austin, TX"). Kept separate to avoid the
// false positives a bare \bTX\b would cause inside prose.
const US_STATE_ABBR =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;

function locationIsUS(loc = "") {
  return US_LOCATION.test(loc) || US_STATE_ABBR.test(loc);
}

export function gateJob(candidate, job) {
  return gate(candidate, job);
}

function gate(candidate, job) {
  const loc = job.location || "";
  const country = (job.country || "").toUpperCase();
  const countryUS =
    country === "USA" || country === "US" || country === "UNITED STATES";

  // A location that clearly names a non-US place is the STRONGEST signal — it
  // overrides a stale country default or is_remote_us flag.
  if (loc && NON_US_LOCATION.test(loc) && !US_LOCATION.test(loc)) {
    return "Not a USA-based role (location text)";
  }

  // US if the country field says so, OR the remote-US flag is set, OR the
  // location text clearly reads US (states/cities/"United States"). The last
  // clause is the fix: heuristic-collected rows frequently have country=null.
  const isUS = countryUS || job.is_remote_us || locationIsUS(loc);
  if (!isUS) return "Not a USA-based role";

  // job.work_auth_required can be free text (older/LLM-extracted jobs) OR a
  // boolean (job-engine's regex-based workAuthExtractor.js, wired in as of
  // this session — true/false/null, not a phrase). `.toLowerCase()` on a
  // boolean throws, and it throws inside this filter callback, which crashed
  // getMatchedJobs() for EVERY user the instant the gate reached any job
  // with that field set — i.e. almost immediately, since ~45k active rows
  // have it non-null. String() coerces either shape safely; a bare `true`
  // still won't match "citizen"/"clearance"/"secret" below (that's fine —
  // this hard gate is specifically about text mentioning those terms, not a
  // general auth-required flag).
  const need = String(job.work_auth_required || "").toLowerCase();
  const have = String(candidate.work_auth || "").toLowerCase();
  const strict = need.includes("citizen") || need.includes("clearance") || need.includes("secret");
  if (strict && have && !(have.includes("citizen") || have.includes("green") || have.includes("gc"))) {
    return "Work authorization requirement not met";
  }

  // NOTE: years and seniority mismatches are no longer HARD gates — they are
  // soft CAPS (see softCap below, JustHireMe pattern): the job stays in the
  // feed with its score limited and the reason attached, instead of silently
  // vanishing. This keeps thin role families from producing empty feeds while
  // still ranking clear mismatches to the bottom.

  // STRICT role gate: the feed only shows jobs in the candidate's own role
  // family (a Data Analyst sees Data Analyst jobs — not Data Scientist, Data
  // Engineer, or Sales Analyst). Jobs whose family can't be resolved from the
  // stored field or the title are excluded too: "unknown" is not the user's
  // role. Keyword search is unaffected (it scores with ignoreGate and flags
  // these as outside_criteria instead of hiding them).
  const cf = (candidate.role_family || "").toLowerCase();
  if (cf && cf !== "other") {
    if (jobFamily(job) !== cf) return "Outside your role focus";
  }

  return null;
}

// Per-candidate compiled skill regexes, cached on the candidate object so the
// (expensive) compile happens once per match run, not once per job.
const SKILL_REGEX_CACHE = new WeakMap();
function candidateSkillRegexes(candidate) {
  let regexes = SKILL_REGEX_CACHE.get(candidate);
  if (regexes) return regexes;
  // Cap is a perf guard (regexes × jobs). 40 covers a rich resume; the old 25
  // silently dropped half the skills of a well-extracted profile.
  regexes = (candidate.skills || [])
    .filter((s) => s && String(s).trim().length >= 3)
    .slice(0, 40)
    .map((s) => {
      const esc = String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${esc}\\b`, "i");
    });
  SKILL_REGEX_CACHE.set(candidate, regexes);
  return regexes;
}

// Scan the FULL job description for the candidate's skills. This is the
// highest-signal matcher we have: collector-era rows store only 1-3 generic
// dictionary skills, but the descriptions (avg ~9k chars) name the real
// requirements — "procurement", "demand planning", "S&OP" — verbatim.
// Fallback path only: the matching service precomputes an IDF-weighted score
// (job.__desc_skill_score) which is far better calibrated — see
// computeDescSkillScores below.
function descriptionSkillScore(candidate, job) {
  if (typeof job.__desc_skill_score === "number") return job.__desc_skill_score;
  const desc = job.description || "";
  if (desc.length < 200) return 0;
  const regexes = candidateSkillRegexes(candidate);
  if (!regexes.length) return 0;
  let hits = 0;
  for (const re of regexes) if (re.test(desc)) hits++;
  return Math.min(1, hits / 6);
}

/**
 * IDF-weighted description matching over a whole pool of jobs.
 *
 * Problem it solves: naive hit-counting lets ubiquitous skills (SQL, Excel,
 * Tableau — present in every analyst JD) saturate the score, so a Revenue Ops
 * job outranks a Procurement job for a supply-chain candidate. Here each skill
 * is weighted by its rarity across THIS candidate's gated job pool: a hit on
 * "Demand Planning" (rare) is worth many hits on "Excel" (everywhere).
 *
 * Sets job.__desc_skill_score (0..1) on every job in `jobs`.
 */
export function computeDescSkillScores(candidate, jobs) {
  const regexes = candidateSkillRegexes(candidate);
  if (!regexes.length || !jobs.length) {
    for (const j of jobs) j.__desc_skill_score = 0;
    return;
  }

  // Pass 1: hit matrix + document frequency per skill.
  const df = new Array(regexes.length).fill(0);
  const hitSets = jobs.map((job) => {
    const desc = job.description || "";
    if (desc.length < 200) return null;
    const hits = [];
    for (let s = 0; s < regexes.length; s++) {
      if (regexes[s].test(desc)) {
        hits.push(s);
        df[s]++;
      }
    }
    return hits;
  });

  // Pass 2: IDF weights. Rare skill ≈ high weight; everywhere ≈ low weight.
  const N = jobs.length;
  const idf = df.map((d) => Math.log(1 + N / (1 + d)));
  const totalMass = idf.reduce((a, b) => a + b, 0) || 1;

  // Matching half of the candidate's idf-mass = full marks.
  //
  // NOTE: this denominator is deliberately strict. It keeps the skills signal
  // CONSERVATIVE so that incidental overlap on generic skills (Excel, SQL)
  // cannot inflate an off-domain job above an on-domain one. A previous
  // attempt to "recalibrate" this to a pool-relative anchor made the displayed
  // percentage look nicer but wrecked ranking: off-domain jobs with generic
  // overlap floated above genuinely relevant roles. Do not loosen this without
  // verifying that RELEVANT jobs still outrank irrelevant ones.
  const denom = 0.5 * totalMass;

  jobs.forEach((job, i) => {
    const hits = hitSets[i];
    if (!hits) {
      job.__desc_skill_score = 0;
      return;
    }
    const mass = hits.reduce((a, s) => a + idf[s], 0);
    job.__desc_skill_score = Math.min(1, mass / denom);
  });
}

function skillScore(candidate, job) {
  const have = new Set(normalizeSkills(candidate.skills || []));
  const req = normalizeSkills(job.skills_required || job.skills || []);
  const pref = normalizeSkills(job.skills_preferred || []);
  const hit = (list, w) => list.reduce((s, sk) => s + (have.has(sk) ? w : 0), 0);
  const got = hit(req, 1.0) + hit(pref, 0.4);
  const max = req.length * 1.0 + pref.length * 0.4;
  const ratio = max ? got / max : 0;
  // Evidence scaling: matching a short generic list (SQL, Excel, Tableau)
  // must not read as a confident perfect match — 6+ listed skills are needed
  // for full confidence. (Collector-era rows average ~3 dictionary skills.)
  const evidence = Math.min(1, (req.length + pref.length) / 6);
  const structured = ratio * evidence;
  // BLEND the two signals (not max, and NOT a probabilistic OR): requirement-
  // coverage says "do I meet what the job lists"; the IDF description score
  // says "does this job engage my actual specialty". Max/OR lets a few generic
  // matched skills drown the IDF signal and float off-domain jobs to the top;
  // the averaged blend keeps the signal conservative so `domain` can still
  // decide the ranking.
  return 0.5 * structured + 0.5 * descriptionSkillScore(candidate, job);
}

// Infer a role family from the job TITLE when the stored role_family is
// missing or "other" (true for most collector-era rows). Order matters —
// first match wins, so more specific families come first.
const TITLE_FAMILIES = [
  // FUNCTION-FIRST families. These are checked before the domain families
  // because their titles routinely name the domain they SUPPORT, and the
  // supported domain must not be mistaken for the actual job:
  //   "Recruiter, AI/ML Research"          -> recruiting, not ai-ml
  //   "Legal Counsel, Supply Chain"        -> legal, not supply-chain
  //   "Counsel, Procurement"               -> legal, not supply-chain
  // A candidate in the named domain is not qualified for these roles.
  ["legal", /\b(counsel|attorney|paralegal|legal|litigation)\b/i],
  ["talent-hr", /\b(recruiter|recruiting|talent acquisition|sourcer|people ops|people operations|hr business partner|human resources)\b/i],
  ["supply-chain", /\b(supply chain|logistics|procurement|sourcing|demand plan(ner|ning)?|inventory|fulfillment|warehouse|s&op|supply planning|materials manage)\b/i],
  ["ai-ml", /\b(machine learning|ml engineer|ai engineer|deep learning|data scientist|nlp|computer vision|llm|genai|generative ai|ai\/ml|mlops|applied scientist)\b/i],
  ["data-engineering", /\b(data engineer|etl|data platform|analytics engineer)\b/i],
  // Covers the analyst-titled DATA roles too (product/intelligence/FinOps/
  // risk/insights analyst) — these are data-analysis jobs, but with the narrow
  // pattern they resolved to "unknown" and the strict role gate hid them from
  // data-analytics candidates. HR/ops analyst titles (Payroll Analyst,
  // Employee Lifecycle Analyst) stay unresolved on purpose.
  // A family must equal ONE REAL JOB FUNCTION — never "titles sharing a word".
  // An earlier version matched "intelligence analyst" / "risks analyst" here to
  // pad thin feeds, which pulled Technical Intelligence Analyst and AI Emerging
  // Risks Analyst (security/risk roles) into a Data Analyst's feed. Only true
  // data-analysis titles belong. Data Scientist / Data Engineer are their OWN
  // families and must NOT be folded in just because they contain "data".
  ["data-analytics", /\b(data analyst|business intelligence|bi analyst|analytics analyst|reporting analyst|insights analyst)\b/i],
  ["offensive-security", /\b(penetration tester|red team|offensive security)\b/i],
  ["security-engineering", /\b(security engineer|application security|infosec|cyber ?security|security analyst|detection|soc analyst|csoc|security operations|security automation)\b/i],
  ["network-engineering", /\b(network engineer|network administrator)\b/i],
  ["devops", /\b(devops|site reliability|sre\b|platform engineer|infrastructure engineer|build engineer|release engineer)\b/i],
  ["cloud-engineering", /\b(cloud engineer|cloud architect|aws engineer|azure engineer)\b/i],
  ["frontend-engineering", /\b(front.?end|react developer|ui engineer|web developer)\b/i],
  ["backend-engineering", /\b(back.?end|api engineer)\b/i],
  ["qa-testing", /\b(qa engineer|quality assurance|test engineer|sdet)\b/i],
  ["software-engineering", /\b(software engineer|software developer|full.?stack|swe\b|sde\b|solutions? engineer|solutions architect|forward deployed|android engineer|ios engineer|mobile engineer|mobile developer|developer experience|developer relations|devrel)\b/i],
  ["product-management", /\b(product manager|product owner|program manager|project manager|chief of staff)\b/i],
  ["design", /\b(designer|ux\b|ui designer|product design)\b/i],
  ["business-analysis", /\b(business analyst|revenue operations|revops|salesops|sales operations|gtm planning|deal desk|deal pricing|pricing analyst|strategy analyst|operations analyst)\b/i],
];

// Exported so the matching service can turn a user's free-text preference
// (e.g. "Backend Engineer" from Settings → Job Preferences) into the same
// role-family slug the scorer compares against.
export function inferRoleFamily(title = "") {
  for (const [family, re] of TITLE_FAMILIES) {
    if (re.test(title)) return family;
  }
  return "";
}

// Role-family inference for RESUME TEXT (headline + summary). Job-title
// inference uses list priority (specific families first), but a resume names
// its role in the first line — "Data Analyst with 3+ years..." — and later
// summary mentions ("ETL pipelines", "supply chain ERP projects") must not
// outrank it. So here the EARLIEST regex match in the text wins.
/**
 * Resolve a job's role family. THE TITLE WINS.
 *
 * The stored role_family comes from the collector's heuristic extractor and is
 * unreliable: of the whole live pool only ~0.4% of rows carry a stored family
 * at all, and more than half of those contradict the title (an "Account
 * Executive" — a sales role — was stored as business-analysis and surfaced in a
 * Business Analyst's feed). Title inference is high-precision by construction:
 * it returns "" unless a title explicitly matches a family pattern, so when it
 * fires it is the better signal. The stored value is only a fallback for titles
 * that carry no signal at all.
 *
 * If the LLM backfill ever populates role_family properly, revisit this
 * precedence — a trustworthy stored value should win over a regex.
 */
export function jobFamily(job = {}) {
  // TITLE ONLY — the stored value is deliberately NOT used as a fallback.
  // Measured on the live pool: only 124 of 28,741 rows carry a stored family,
  // 26 of those contradict the title outright and 74 more have no title signal
  // to check them against. Honouring them let an "Account Executive" (sales)
  // sit at #3 in a Business Analyst's feed. Dropping the fallback costs at most
  // ~124 rows of coverage and removes that whole class of false positive.
  //
  // Revisit if the LLM backfill ever fills role_family properly: a trustworthy
  // stored value SHOULD outrank a regex, and this is the line to change.
  return inferRoleFamily(job.title);
}

export function inferRoleFamilyFromResume(text = "") {
  let best = "";
  let bestIdx = Infinity;
  for (const [family, re] of TITLE_FAMILIES) {
    const m = re.exec(text);
    if (m && m.index < bestIdx) {
      best = family;
      bestIdx = m.index;
    }
  }
  return best;
}

function domainScore(candidate, job) {
  let c = (candidate.role_family || "").toLowerCase();
  let j = jobFamily(job);
  // "other" is UNKNOWN, not a family. Treating other===other as a perfect
  // match made every unclassifiable job (Counsel, Exec Assistant, Director…)
  // score domain:100 for any candidate whose extraction failed — the entire
  // false-positive storm in the Sriram matching report. Unknown on either
  // side = neutral 0.4, never 1.0.
  if (c === "other") c = "";
  if (!c || !j) return 0.4;
  if (c === j) return 1;
  return RELATED[c]?.[j] ?? 0.1;
}

function experienceScore(candidate, job) {
  // Years-of-experience fit vs the job's stated minimum.
  const min = Number(job.min_years || 0);
  const yrs = Number(candidate.years || 0);
  let yearsFit;
  if (!min) yearsFit = 0.7;
  else if (yrs >= min) yearsFit = yrs > min + 6 ? 0.85 : 1;
  else yearsFit = Math.max(0, 1 - (min - yrs) * 0.3);

  // Seniority-level fit. Extreme gaps are already gated; here we rank the
  // survivors so a same-domain role at the candidate's own level outranks one
  // a level or two off (Senior SRE > Junior SRE for a senior candidate).
  const senGap = seniorityGap(candidate, job);
  const seniorityFit =
    senGap == null ? 1 : senGap === 0 ? 1 : senGap === 1 ? 0.8 : 0.55;

  // Blend, leaning on seniority: title-derived level is more trustworthy than
  // the frequently-defaulted min_years, and level mismatch is the failure the
  // research (and the Sriram report) flagged.
  return 0.4 * yearsFit + 0.6 * seniorityFit;
}

function locationScore(candidate, job) {
  if (job.is_remote_us || /remote/i.test(job.location || "")) return 1;
  const targets = (candidate.target_locations || []).map((s) => s.toLowerCase());
  const loc = (job.location || "").toLowerCase();
  if (candidate.open_to_relocate) return 0.9;
  if (targets.some((t) => t && loc.includes(t))) return 1;
  return 0.6;
}

function educationScore(candidate, job) {
  const need = EDU_RANK[(job.education_min || "").toLowerCase()] ?? 0;
  const have = EDU_RANK[(candidate.education_level || "").toLowerCase()] ?? 0;
  if (!need) return 1;
  if (have >= need) return 1;
  return need - have === 1 ? 0.6 : 0.3;
}

// Soft caps (JustHireMe pattern): mismatches that used to hard-drop a job now
// LIMIT its score with a visible reason. The lowest applicable cap wins.
// Returns { cap, reason } or null.
export function softCap(candidate, job) {
  const caps = [];

  const min = Number(job.min_years || 0);
  const yrs = Number(candidate.years || 0);
  if (min && yrs < min) {
    const short = min - yrs;
    if (short > 4) caps.push({ cap: 30, reason: `Needs ~${min}y experience, you have ${yrs}y` });
    else if (short > 2) caps.push({ cap: 45, reason: `Needs ~${min}y experience, you have ${yrs}y` });
  }

  const senGap = seniorityGap(candidate, job);
  if (senGap != null && senGap >= 3) {
    caps.push({ cap: 40, reason: "Seniority level mismatch" });
  }

  if (!caps.length) return null;
  return caps.reduce((a, b) => (a.cap <= b.cap ? a : b));
}

// Data-quality-adaptive weights (ai-resume-matcher pattern). Collector-era
// rows often carry only a title + description — min_years defaults to 0,
// skills_required to a 1-3 word generic list, education_min to "". Scoring
// those fields at full weight rewards ABSENCE of data (the neutral fallbacks
// 0.7/1.0 float sparse rows above rich ones). When a row is sparse, shift
// weight onto the two signals that are ALWAYS available: the title-derived
// domain and the IDF description scan inside skillScore.
const SPARSE_WEIGHTS = {
  skills: 0.25,
  domain: 0.5,
  experience: 0.1,
  location: 0.1,
  education: 0.05,
};

export function adaptiveWeights(job) {
  const signals =
    ((job.skills_required || []).length >= 3 ? 1 : 0) +
    (Number(job.min_years || 0) > 0 ? 1 : 0) +
    (job.education_min ? 1 : 0) +
    (job.role_family && job.role_family !== "other" ? 1 : 0);
  return signals >= 2 ? DEFAULT_WEIGHTS : SPARSE_WEIGHTS;
}

// When a semantic similarity (0..1, pgvector cosine set on job.__semantic) is
// available, blend it in as its own component and shrink skills/location/
// education to make room. Domain keeps its dominance — semantic similarity is
// a recall signal ("rescues good resumes the keyword layer misses"), not a
// ranking dictator.
const SEMANTIC_WEIGHT = 0.15;

function withSemantic(weights) {
  const scale = 1 - SEMANTIC_WEIGHT;
  return {
    skills: weights.skills * scale,
    domain: weights.domain * scale,
    experience: weights.experience * scale,
    location: weights.location * scale,
    education: weights.education * scale,
    semantic: SEMANTIC_WEIGHT,
  };
}

/**
 * @param opts.ignoreGate  Score the job even if it fails the hard gates
 *   (used by keyword search, which browses the WHOLE database — a job the
 *   personalized feed filters out should still be findable and get a real
 *   match %, just flagged via `gateReason`).
 */
export function scoreMatch(candidate = {}, job = {}, weights = null, opts = {}) {
  const gateReason = gate(candidate, job);
  if (gateReason && !opts.ignoreGate) {
    return { score: 0, label: "Filtered out", gated: true, gateReason, breakdown: {} };
  }

  const breakdown = {
    skills: skillScore(candidate, job),
    domain: domainScore(candidate, job),
    experience: experienceScore(candidate, job),
    location: locationScore(candidate, job),
    education: educationScore(candidate, job),
  };

  // Weight selection: explicit weights win (tests), else data-quality adaptive.
  let w = weights || adaptiveWeights(job);
  const semantic = typeof job.__semantic === "number" ? job.__semantic : null;
  if (semantic != null) {
    breakdown.semantic = semantic;
    w = withSemantic(w);
  }

  const total = Object.entries(w).reduce((s, [k, wt]) => s + wt * (breakdown[k] ?? 0), 0);
  let score = Math.round(total * 100);

  // Apply soft caps LAST so the ranking still reflects the underlying fit
  // within the capped tier, and the reason is visible to the UI.
  let capReason = null;
  const capped = softCap(candidate, job);
  if (capped && score > capped.cap) {
    score = capped.cap;
    capReason = capped.reason;
  }

  return {
    score,
    capReason,
    label:
      score >= 80 ? "Excellent Match"
      : score >= 60 ? "Good Match"
      : score >= 40 ? "Potential Match"
      : "Low Match",
    gated: false,
    // Present (non-null) when the job is outside the user's match criteria but
    // was scored anyway because ignoreGate was set.
    gateReason: gateReason || null,
    breakdown,
  };
}
