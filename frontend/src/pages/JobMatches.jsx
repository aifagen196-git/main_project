import Card from "../components/common/Card";
import Pill from "../components/ui/Pill";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getMatchedJobs, searchJobs } from "../services/matchingService";
import { getAppliedJobIds, markJobApplied } from "../services/applications";
import { matchHex } from "../utils/matchHex";

import {
  BadgeCheck,
  MapPin,
  CircleDollarSign,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Loader2,
  Send,
  X,
} from "lucide-react";

// Title → job-function inference, mirroring the backend matcher's
// TITLE_FAMILIES (scoreMatch.js). Most stored role_family values are the
// collector-era default "other", so the title is the reliable signal.
const TITLE_FAMILIES = [
  ["supply-chain", "Supply Chain", /\b(supply chain|logistics|procurement|sourcing|demand plan(ner|ning)?|inventory|fulfillment|warehouse|s&op|supply planning|materials manage)\b/i],
  ["ai-ml", "AI / Machine Learning", /\b(machine learning|ml engineer|ai engineer|deep learning|data scientist|nlp|computer vision|llm|genai|generative ai|ai\/ml|mlops|applied scientist)\b/i],
  ["data-engineering", "Data Engineering", /\b(data engineer|etl|data platform|analytics engineer)\b/i],
  ["data-analytics", "Data Analytics", /\b(data analyst|business intelligence|bi analyst)\b/i],
  ["security", "Security", /\b(penetration tester|red team|offensive security|security engineer|application security|infosec|cyber ?security|security analyst|detection)\b/i],
  ["network-engineering", "Network Engineering", /\b(network engineer|network administrator)\b/i],
  ["devops", "DevOps / SRE / Platform", /\b(devops|site reliability|sre\b|platform engineer|infrastructure engineer|build engineer|release engineer)\b/i],
  ["cloud-engineering", "Cloud Engineering", /\b(cloud engineer|cloud architect|aws engineer|azure engineer)\b/i],
  ["frontend-engineering", "Frontend Engineering", /\b(front.?end|react developer|ui engineer|web developer)\b/i],
  ["backend-engineering", "Backend Engineering", /\b(back.?end|api engineer)\b/i],
  ["qa-testing", "QA / Testing", /\b(qa engineer|quality assurance|test engineer|sdet)\b/i],
  ["software-engineering", "Software Engineering", /\b(software engineer|software developer|full.?stack|swe\b|sde\b|solutions? engineer|forward deployed)\b/i],
  ["product-management", "Product / Program Mgmt", /\b(product manager|product owner|program manager|project manager|chief of staff)\b/i],
  ["design", "Design / UX", /\b(designer|ux\b|ui designer|product design)\b/i],
  ["business-analysis", "Business / Operations", /\b(business analyst|revenue operations|revops|salesops|sales operations|gtm planning|deal desk|deal pricing|pricing analyst|strategy analyst|operations analyst)\b/i],
];

const FUNCTION_LABELS = Object.fromEntries(TITLE_FAMILIES.map(([k, label]) => [k, label]));

function jobFunctionOf(j) {
  // TITLE FIRST, matching the backend matcher's precedence exactly
  // (scoreMatch.js jobFamily()) — measured there: of stored role_family
  // values, over half contradict the job's own title. A live example: a
  // Product Manager posting that merely mentions "partner with our DevOps
  // team" gets role_family stored as "devops" by the collector's
  // description-keyword heuristic. The backend correctly scores/gates that
  // job as product-management from the title; trusting the stored value
  // here would have shown the user a "DevOps / SRE / Platform" badge on a
  // PM role — visibly wrong, and inconsistent with what actually matched it.
  for (const [family, , re] of TITLE_FAMILIES) {
    if (re.test(j.title || "")) return family;
  }
  const stored = (j.role_family || "").toLowerCase();
  if (stored && stored !== "other" && FUNCTION_LABELS[stored]) return stored;
  return "other";
}

// Workplace type from the strongest available signals. "Hybrid" only ever
// appears in the location text; remote uses the same test as the matcher.
function workplaceOf(j) {
  const loc = j.location || "";
  if (/\bhybrid\b/i.test(loc)) return "hybrid";
  if (j.is_remote_us || /\bremote\b/i.test(loc) || /\bremote\b/i.test(j.employment_type || ""))
    return "remote";
  return "onsite";
}

// Normalize the free-text employment_type ("FullTime", "Full Time", …).
function jobTypeOf(j) {
  const t = j.employment_type || "";
  if (/intern/i.test(t)) return "intern";
  if (/part/i.test(t)) return "parttime";
  if (/contract|temp/i.test(t)) return "contract";
  if (/full/i.test(t)) return "fulltime";
  return "";
}

// Required experience in years — the real value usually lives in profile jsonb
// (the lifted column is often the collector default 0).
function minYearsOf(j) {
  return Number(j.profile?.min_years ?? j.min_years ?? 0);
}

// The match score is a relative heuristic, not a probability — pair the number
// with a plain-language band so it reads as guidance, not false precision.
function matchBand(score) {
  if (score >= 80) return "Top match";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Fair";
  return "Weak";
}

const EXPERIENCE_LEVELS = [
  { key: "", label: "Any" },
  { key: "entry", label: "Entry (0-2y)", test: (y) => y <= 2 },
  { key: "mid", label: "Mid (3-5y)", test: (y) => y >= 3 && y <= 5 },
  { key: "senior", label: "Senior (6-9y)", test: (y) => y >= 6 && y <= 9 },
  { key: "lead", label: "10y+", test: (y) => y >= 10 },
];

const DATE_OPTIONS = [
  { days: 0, label: "Any time" },
  { days: 1, label: "Past 24 hours" },
  { days: 7, label: "Past week" },
  { days: 30, label: "Past month" },
];

export default function JobMatches({ saved, toggle }) {
  const [matches, setMatches] = useState([]); // personalized feed
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedIds, setAppliedIds] = useState([]);

  useEffect(() => {
    getAppliedJobIds()
      .then(setAppliedIds)
      .catch((e) => console.error("Failed to load applied jobs", e));
  }, []);

  // One-click "I applied": optimistic UI, backend dedupes per job.
  async function markApplied(job) {
    setAppliedIds((ids) => [...ids, job.id]);
    try {
      await markJobApplied(job);
    } catch (e) {
      console.error("Failed to track application", e);
      setAppliedIds((ids) => ids.filter((id) => id !== job.id));
    }
  }

  // Search is driven by the URL ?q= (set by the Topbar search box).
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState(null); // null = not searching
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Filters
  const [jobFunction, setJobFunction] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [workplace, setWorkplace] = useState(""); // "" | onsite | hybrid | remote
  const [jobType, setJobType] = useState(""); // "" | fulltime | parttime | intern | contract
  const [postedWithin, setPostedWithin] = useState(0); // days, 0 = any
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("match"); // "match" | "newest"

  // Keep local query in sync when the URL ?q= changes (e.g. Topbar search).
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      try {
        const data = await getMatchedJobs();
        if (!cancelled) setMatches(data || []);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced live search. Empty query → clear results (show matches).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchJobs(q);
        if (seq === searchSeq.current) {
          setResults(data || []);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Search failed", err);
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const isSearch = results !== null;
  const base = isSearch ? results : matches;

  const scoreOf = (j) => j.match_score ?? 0;

  // Dropdown options derived from the loaded jobs, so no dead choices.
  const functionOptions = useMemo(() => {
    const present = new Set(base.map(jobFunctionOf));
    const opts = TITLE_FAMILIES.filter(([k]) => present.has(k)).map(
      ([k, label]) => [k, label],
    );
    if (present.has("other")) opts.push(["other", "Other"]);
    return opts;
  }, [base]);

  // Client-side filters + sorting (instant — the full set is already loaded).
  const expTest = EXPERIENCE_LEVELS.find((l) => l.key === expLevel)?.test;
  const postedCutoff = postedWithin
    ? Date.now() - postedWithin * 24 * 60 * 60 * 1000
    : 0;
  let jobs = base.filter((j) => {
    if (jobFunction && jobFunctionOf(j) !== jobFunction) return false;
    if (expTest && !expTest(minYearsOf(j))) return false;
    if (workplace && workplaceOf(j) !== workplace) return false;
    if (jobType && jobTypeOf(j) !== jobType) return false;
    if (postedCutoff) {
      const posted = Date.parse(j.posted_date || j.created_at || "");
      if (!posted || posted < postedCutoff) return false;
    }
    if (locationFilter && !(j.location || "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
    return true;
  });
  if (sortBy === "newest") {
    jobs = [...jobs].sort(
      (a, b) =>
        (Date.parse(b.posted_date || b.created_at || 0) || 0) -
        (Date.parse(a.posted_date || a.created_at || 0) || 0),
    );
  } else {
    // Best match — by the currently selected score metric.
    jobs = [...jobs].sort((a, b) => scoreOf(b) - scoreOf(a));
  }

  const anyFilter =
    jobFunction || expLevel || workplace || jobType ||
    postedWithin > 0 || locationFilter;
  const clearFilters = () => {
    setJobFunction("");
    setExpLevel("");
    setWorkplace("");
    setJobType("");
    setPostedWithin(0);
    setLocationFilter("");
    setCurrentPage(1);
  };
  // Every filter change should snap back to page 1.
  const set = (setter) => (v) => { setter(v); setCurrentPage(1); };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">Loading jobs...</h2>
      </div>
    );
  }

  const JOBS_PER_PAGE = 25;
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const currentJobs = jobs.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));

  return (
    // Stretches slightly beyond the app container on large screens so the
    // job cards get extra width.
    <div className="space-y-6 lg:-mx-8">
      <div>
        <h2 className="font-display text-3xl font-extrabold text-slate-900">
          {isSearch ? "Search results" : "Top job matches for you"}
        </h2>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          {isSearch ? (
            <>
              <span>Jobs matching "{query.trim()}", ranked for your profile.</span>
              <button
                onClick={() => navigate("/matches")}
                className="inline-flex items-center gap-1 text-brand font-semibold hover:underline"
              >
                <X size={13} /> Clear
              </button>
            </>
          ) : (
            "AI-matched opportunities based on your skills, experience and preferences."
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 items-start">
        {/* LEFT: results */}
        <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500 flex items-center gap-2">
            {searching && <Loader2 size={14} className="animate-spin text-slate-400" />}
            Showing {jobs.length ? startIndex + 1 : 0} - {Math.min(endIndex, jobs.length)} of{" "}
            {jobs.length} {isSearch ? "results" : "matches"}
          </span>
        </div>

        {jobs.length === 0 && (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-bold text-slate-800">No jobs found</h3>
            <p className="mt-2 text-slate-500">
              {anyFilter
                ? "No jobs match the current filters. Try clearing them."
                : isSearch
                  ? `No US jobs match "${query.trim()}". Try a different title or company.`
                  : "Jobs will appear here after the collector imports them."}
            </p>
          </Card>
        )}

        <div className="space-y-2.5">
          {currentJobs.map((j, i) => {
            const sv = saved.includes(j.id);

            return (
              <Card
                key={j.id}
                hover
                onClick={() => window.open(j.apply_url, "_blank")}
                className="px-5 py-4 fadeUp cursor-pointer"
                style={{
                  animationDelay: i * 40 + "ms",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-brand-50 flex items-center justify-center font-bold text-brand shrink-0">
                    {j.company?.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(j.apply_url, "_blank");
                        }}
                        className="font-display font-bold text-slate-900 text-[15px] cursor-pointer truncate"
                      >
                        {j.title}
                      </span>

                      {j.featured && (
                        <Pill className="bg-brand-50 brand">Featured</Pill>
                      )}

                      {j.outside_criteria && (
                        <Pill
                          className="bg-amber-50 text-amber-700"
                          title={j.gate_reason || "Outside your match criteria"}
                        >
                          {j.gate_reason?.startsWith("Not a USA")
                            ? "Outside USA"
                            : "Outside your criteria"}
                        </Pill>
                      )}

                      {/* Soft cap (score limited, job still shown) — hover for why. */}
                      {j.cap_reason && (
                        <Pill
                          className="bg-orange-50 text-orange-700"
                          title={j.cap_reason}
                        >
                          Stretch
                        </Pill>
                      )}

                      {/* Deal-breaker flags from the LLM judge. */}
                      {j.red_flags?.length > 0 && (
                        <Pill
                          className="bg-red-50 text-red-600"
                          title={j.red_flags.join(" · ")}
                        >
                          🚩 {j.red_flags.length}
                        </Pill>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        {j.company}
                        <BadgeCheck size={13} className="brand" />
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {j.location}
                      </span>
                      {j.salary && (
                        <span className="flex items-center gap-1">
                          <CircleDollarSign size={11} />
                          {j.salary}
                        </span>
                      )}
                      {(j.skills || []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="text-center shrink-0"
                    title={
                      "Match: " +
                      matchBand(scoreOf(j)) +
                      " — a relative fit score, not a probability."
                    }
                  >
                    <div
                      className="num text-lg font-extrabold leading-none"
                      style={{
                        color: matchHex(scoreOf(j)),
                      }}
                    >
                      {scoreOf(j)}%
                    </div>
                    <div
                      className="text-[10px] font-semibold mt-0.5"
                      style={{ color: matchHex(scoreOf(j)) }}
                    >
                      {matchBand(scoreOf(j))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(j.id);
                      }}
                      className={
                        "rounded-lg p-1.5 " +
                        (sv
                          ? "brand bg-brand-50"
                          : "text-slate-300 hover:bg-slate-50")
                      }
                      aria-label="Save"
                    >
                      {sv ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                    </button>

                    {appliedIds.includes(j.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 size={12} /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markApplied(j);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Track that you applied to this job"
                      >
                        <Send size={11} /> I applied
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50"
            >
              Next
            </button>
        </div>
        </div>

        {/* RIGHT: filters */}
        <aside className="lg:sticky lg:top-20">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-900">Filters</h3>
              {anyFilter && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
                >
                  <X size={12} /> Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Job function
                </label>
                <select
                  value={jobFunction}
                  onChange={(e) => set(setJobFunction)(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                >
                  <option value="">Any function</option>
                  {functionOptions.map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Experience
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {EXPERIENCE_LEVELS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => set(setExpLevel)(l.key)}
                      className={
                        "rounded-lg border px-2 py-1.5 text-xs font-semibold transition " +
                        (expLevel === l.key
                          ? "bg-brand-50 brand border-brand"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                      }
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Workplace
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {[["", "Any"], ["onsite", "Onsite"], ["hybrid", "Hybrid"], ["remote", "Remote"]].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => set(setWorkplace)(k)}
                      className={
                        "rounded-lg border px-1 py-1.5 text-xs font-semibold transition " +
                        (workplace === k
                          ? "bg-brand-50 brand border-brand"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Job type
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {[["", "Any"], ["fulltime", "Full-time"], ["parttime", "Part-time"], ["intern", "Intern"]].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => set(setJobType)(k)}
                      className={
                        "rounded-lg border px-1 py-1.5 text-[11px] font-semibold transition " +
                        (jobType === k
                          ? "bg-brand-50 brand border-brand"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Date posted
                </label>
                <select
                  value={postedWithin}
                  onChange={(e) => set(setPostedWithin)(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                >
                  {DATE_OPTIONS.map((o) => (
                    <option key={o.days} value={o.days}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Location
                </label>
                <div className="relative mt-1.5">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={locationFilter}
                    onChange={(e) => set(setLocationFilter)(e.target.value)}
                    placeholder="e.g. New York, Remote"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => set(setSortBy)(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                >
                  <option value="match">Best match</option>
                  <option value="newest">Newest first</option>
                </select>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
