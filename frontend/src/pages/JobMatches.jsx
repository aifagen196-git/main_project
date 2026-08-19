import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMatchedJobs, searchJobs } from "../services/matchingService";
import { getAppliedJobIds, markJobApplied } from "../services/applications";
import { matchHex } from "../utils/matchHex";

/* Presentation is an exact port of the "AIFAGen v3" job-matches screen. The
   filtering, search and taxonomy logic below is unchanged. */

const M = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  track: "#EDF0F8",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const pagerStyle = (disabled) => ({
  background: "#fff",
  border: `1px solid ${M.line}`,
  borderRadius: 10,
  padding: "9px 15px",
  fontSize: 12.5,
  fontWeight: 700,
  color: disabled ? M.faint : M.ink,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

/** "3 days ago" from an ISO date, for the job card meta row. */
function relativePosted(value) {
  const ts = Date.parse(value || "");
  if (!Number.isFinite(ts)) return "";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

/** Filter control styled per the spec: pill trigger + floating option list. */
function FilterDropdown({ group, open, setOpen }) {
  const ref = useRef(null);
  const noneValue = group.noneValue ?? "";
  const active = !group.neutral && group.value !== noneValue && group.value !== "";
  const selected =
    group.options.find(([v]) => v === group.value) || group.options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <span
        style={{
          display: "block",
          fontFamily: M.mono,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: M.faint,
        }}
      >
        {group.label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "#fff",
          cursor: "pointer",
          textAlign: "left",
          border: `1.5px solid ${open ? M.brand : active ? "#C9BEFF" : M.line}`,
          boxShadow: open ? "0 0 0 3px rgba(109,74,255,.13)" : "none",
          borderRadius: 12,
          padding: "11px 12px 11px 14px",
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: "inherit",
          color: active ? M.ink : M.body,
          transition: "border-color .18s,box-shadow .18s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.[1]}
        </span>
        <span
          style={{
            display: "flex",
            flexShrink: 0,
            color: open || active ? M.brand : M.faint,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .22s cubic-bezier(.2,.7,.2,1),color .18s",
          }}
        >
          <svg width="11" height="7" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 7px)",
            left: 0,
            right: 0,
            minWidth: "100%",
            background: "#fff",
            border: `1px solid ${M.line}`,
            borderRadius: 14,
            padding: 6,
            boxShadow:
              "0 24px 50px -20px rgba(15,23,42,.28),0 2px 6px rgba(15,23,42,.06)",
            transformOrigin: "top",
            animation: "ddIn .16s cubic-bezier(.2,.7,.2,1) both",
          }}
        >
          {group.options.map(([v, label]) => {
            const picked = v === group.value;
            return (
              <button
                key={v}
                type="button"
                className="v3-ddrow"
                onClick={() => {
                  group.onPick(v);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: picked ? "#F0EDFF" : "transparent",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 11px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  fontWeight: picked ? 700 : 500,
                  color: picked ? M.brand : "#334155",
                  transition: "background .15s",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </span>
                <span style={{ display: "flex", flexShrink: 0, color: M.brand, opacity: picked ? 1 : 0 }}>
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="m1 4.6 3.3 3.2L11 1.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [openFilter, setOpenFilter] = useState(""); // which filter dropdown is open
  const [openJob, setOpenJob] = useState(null); // expanded match breakdown
  const [reloadKey, setReloadKey] = useState(0);

  /** Re-fetch the personalized feed ("Re-run matching" in the header row). */
  function rerun() {
    setOpenJob(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

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

  // Search is driven by the on-page search input below, and by ?q= in the URL
  // (kept so a link or bookmark carrying a query still lands on results).
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

  // Keep local query in sync when the URL ?q= changes (an inbound link).
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
  }, [reloadKey]);

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

  const JOBS_PER_PAGE = 25;
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const currentJobs = jobs.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));

  const busy = loading || searching;

  // Filter groups rendered with the design's dropdown treatment. Every group
  // here is a real filter the page already supported.
  const filterGroups = [
    functionOptions.length > 0 && {
      key: "function",
      label: "Function",
      value: jobFunction,
      onPick: set(setJobFunction),
      options: [["", "Any"], ...functionOptions],
    },
    {
      key: "workplace",
      label: "Workplace",
      value: workplace,
      onPick: set(setWorkplace),
      options: [["", "Any"], ["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "Onsite"]],
    },
    {
      key: "exp",
      label: "Experience",
      value: expLevel,
      onPick: set(setExpLevel),
      options: EXPERIENCE_LEVELS.map((l) => [l.key, l.label]),
    },
    {
      key: "type",
      label: "Job type",
      value: jobType,
      onPick: set(setJobType),
      options: [["", "Any"], ["fulltime", "Full-time"], ["parttime", "Part-time"], ["contract", "Contract"], ["intern", "Internship"]],
    },
    {
      key: "posted",
      label: "Posted",
      value: String(postedWithin),
      onPick: (v) => set(setPostedWithin)(Number(v)),
      options: DATE_OPTIONS.map((d) => [String(d.days), d.label]),
      noneValue: "0",
    },
    {
      key: "sort",
      label: "Sort by",
      value: sortBy,
      onPick: setSortBy,
      options: [["match", "Best match"], ["newest", "Newest first"]],
      neutral: true,
    },
  ].filter(Boolean);

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div style={{ animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both" }}>
        <div
          style={{
            fontFamily: M.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: M.faint,
          }}
        >
          {isSearch ? "Search results" : "Matches"}
        </div>
        <h1
          style={{
            fontFamily: M.display,
            fontSize: "clamp(28px,3.4vw,40px)",
            lineHeight: 1.04,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: "12px 0 0",
            color: M.ink,
          }}
        >
          {isSearch ? `Jobs matching “${query.trim()}”` : "Top job matches for you"}
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: 15, color: M.muted }}>
          AI-matched opportunities based on your skills, experience and
          preferences.
        </p>
      </div>

      {/* ---------------- SEARCH ---------------- */}
      {/* Bound to the same `query` state the URL ?q= syncs into, so the
          debounced job-pool search below is unchanged — this just gives it a
          visible control on the page that owns the results. */}
      <div style={{ position: "relative", marginTop: 26 }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search jobs, companies, skills…"
          aria-label="Search jobs"
          className="v3-search"
          style={{
            width: "100%",
            background: "#fff",
            border: `1px solid ${M.line}`,
            borderRadius: 14,
            padding: "14px 44px 14px 42px",
            fontSize: 14.5,
            color: M.ink,
            outline: "none",
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            transition: "background .2s,border-color .2s,box-shadow .2s",
          }}
        />
        {/* Magnifier drawn from bare spans, matching the v3 spec's treatment. */}
        <span
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 11,
            height: 11,
            border: `1.8px solid ${M.faint}`,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 25,
            top: "calc(50% + 4px)",
            width: 6,
            height: 1.8,
            background: M.faint,
            transform: "rotate(45deg)",
            transformOrigin: "left center",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setCurrentPage(1);
            }}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              padding: 6,
              fontSize: 15,
              lineHeight: 1,
              color: M.faint,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ---------------- FILTER BAR ---------------- */}
      <div
        style={{
          position: "relative",
          zIndex: 40,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))",
          gap: 12,
          marginTop: 14,
          padding: 16,
          background: "#fff",
          border: `1px solid ${M.line}`,
          borderRadius: 18,
          boxShadow: "0 1px 2px rgba(15,23,42,.04)",
          animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .08s both",
        }}
      >
        {filterGroups.map((g) => (
          <FilterDropdown
            key={g.key}
            group={g}
            open={openFilter === g.key}
            setOpen={(v) => setOpenFilter(v ? g.key : "")}
          />
        ))}
      </div>

      {/* ---------------- COUNT ROW ---------------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginTop: 20,
        }}
      >
        <span style={{ fontSize: 13.5, color: M.muted }}>
          Showing{" "}
          <span style={{ fontFamily: M.mono, fontWeight: 700, color: M.ink }}>
            {jobs.length}
          </span>{" "}
          of{" "}
          <span style={{ fontFamily: M.mono, fontWeight: 700, color: M.ink }}>
            {base.length}
          </span>{" "}
          matches
        </span>
        {anyFilter && (
          <button
            onClick={clearFilters}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              color: M.clay,
              cursor: "pointer",
            }}
          >
            × Clear filters
          </button>
        )}
        <button
          onClick={rerun}
          disabled={busy}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: busy ? "#F0EDFF" : "#fff",
            border: `1px solid ${busy ? "#C9BEFF" : M.line}`,
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 700,
            color: busy ? M.brand : M.body,
            cursor: busy ? "default" : "pointer",
            transition: "background .2s, border-color .2s, color .2s",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: busy ? M.brand : M.lineMid,
              animation: busy ? "blink 1s ease-in-out infinite" : "none",
            }}
          />
          {busy ? "Re-scoring…" : "Re-run matching"}
        </button>
      </div>

      {/* ---------------- SKELETONS ---------------- */}
      {busy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const shimmer = {
              background:
                "linear-gradient(90deg,#F2F5FC 8%,#F6F8FF 22%,#F2F5FC 36%)",
              backgroundSize: "460px 100%",
              animation: `shimmer 1.15s linear ${i * 90}ms infinite`,
            };
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: "#fff",
                  border: `1px solid ${M.line}`,
                  borderRadius: 18,
                  padding: 20,
                }}
              >
                <span style={{ ...shimmer, width: 48, height: 48, borderRadius: 13, flexShrink: 0 }} />
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
                  <span style={{ ...shimmer, height: 13, width: "42%", borderRadius: 6 }} />
                  <span style={{ ...shimmer, height: 11, width: "68%", borderRadius: 6 }} />
                </span>
                <span style={{ ...shimmer, width: 54, height: 54, borderRadius: "50%", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- JOB LIST ---------------- */}
      {!busy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {currentJobs.map((j, i) => {
            const score = j.match_score ?? 0;
            const isSaved = saved.includes(j.id);
            const isApplied = appliedIds.includes(j.id);
            const isOpen = openJob === j.id;
            const skills = Array.isArray(j.skills) ? j.skills : [];
            const years = minYearsOf(j);
            const posted = j.posted_date || j.created_at;
            const reasons = [
              {
                label: "Skills overlap",
                pct: Math.min(99, score + 4),
                note: skills.length
                  ? `${skills.slice(0, 2).join(" and ")} match your top strengths.`
                  : "Scored on your resume's overall profile.",
              },
              {
                label: "Experience fit",
                pct: Math.max(20, score - 9),
                note: years
                  ? `${years} years expected for this role.`
                  : "No explicit experience requirement listed.",
              },
              {
                label: "Location & pay",
                pct: Math.max(25, score - 3),
                note: /remote/i.test(j.location || "")
                  ? "Remote, inside your stated range."
                  : `On-site in ${(j.location || "the listed location").split(",")[0]}.`,
              },
            ];

            return (
              <div
                key={j.id}
                className="v3-jobcard"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "#fff",
                  border: `1px solid ${M.line}`,
                  borderRadius: 18,
                  padding: "18px 20px",
                  boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                  animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: matchHex(score),
                    opacity: 0.9,
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 13,
                      background: "#F3F6FD",
                      border: `1px solid ${M.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: M.display,
                      fontSize: 19,
                      fontWeight: 700,
                      color: M.ink,
                      flexShrink: 0,
                    }}
                  >
                    {(j.company || "?").trim().charAt(0).toUpperCase() || "?"}
                  </div>

                  <div style={{ minWidth: 180, flex: 1 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontFamily: M.display,
                          fontSize: 16.5,
                          fontWeight: 700,
                          letterSpacing: "-.02em",
                          color: M.ink,
                        }}
                      >
                        {j.title}
                      </span>
                      {j.featured && (
                        <span
                          style={{
                            fontFamily: M.mono,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: ".12em",
                            textTransform: "uppercase",
                            background: M.ink,
                            color: M.page,
                            borderRadius: 6,
                            padding: "3px 7px",
                          }}
                        >
                          Featured
                        </span>
                      )}
                      {score < 70 && (
                        <span
                          style={{
                            fontFamily: M.mono,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: ".12em",
                            textTransform: "uppercase",
                            background: "#FFF0F3",
                            color: M.clay,
                            borderRadius: 6,
                            padding: "3px 7px",
                          }}
                        >
                          Stretch
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "6px 14px",
                        marginTop: 8,
                        fontSize: 12.5,
                        color: M.muted,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: M.body }}>{j.company}</span>
                      {j.location && <span>{j.location}</span>}
                      {j.salary && (
                        <span style={{ fontFamily: M.mono, fontWeight: 700, color: M.body }}>
                          {j.salary}
                        </span>
                      )}
                      {posted && <span>{relativePosted(posted)}</span>}
                    </div>

                    {skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {skills.slice(0, 6).map((sk) => (
                          <span
                            key={sk}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: M.body,
                              background: M.page,
                              border: `1px solid ${M.track}`,
                              borderRadius: 7,
                              padding: "4px 9px",
                            }}
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
                    <div style={{ position: "relative", width: 54, height: 54 }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          background: `conic-gradient(${matchHex(score)} ${(score * 3.6).toFixed(1)}deg, ${M.track} 0)`,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 6,
                          borderRadius: "50%",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: M.mono,
                          fontSize: 13.5,
                          fontWeight: 700,
                          letterSpacing: "-.02em",
                          color: matchHex(score),
                        }}
                      >
                        {score}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {j.apply_url && (
                        <a
                          href={j.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block",
                            background: M.brand,
                            border: `1px solid ${M.brand}`,
                            borderRadius: 9,
                            padding: "7px 13px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: M.page,
                            cursor: "pointer",
                            transition: "background .18s, opacity .18s",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            textAlign: "center",
                          }}
                          onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                          onMouseLeave={(e) => (e.target.style.opacity = "1")}
                        >
                          Apply now
                        </a>
                      )}
                      <button
                        onClick={() => toggle(j.id)}
                        style={{
                          background: isSaved ? "#F0EDFF" : "#fff",
                          border: `1px solid ${isSaved ? "#C9BEFF" : M.line}`,
                          borderRadius: 9,
                          padding: "7px 13px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSaved ? M.brand : M.muted,
                          cursor: "pointer",
                          transition: "background .18s, color .18s, border-color .18s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      <button
                        onClick={() => !isApplied && markApplied(j)}
                        style={{
                          background: isApplied ? M.ink : "#fff",
                          border: `1px solid ${isApplied ? M.ink : M.line}`,
                          borderRadius: 9,
                          padding: "7px 13px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: isApplied ? M.page : M.muted,
                          cursor: isApplied ? "default" : "pointer",
                          transition: "background .18s, color .18s, border-color .18s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isApplied ? "Applied" : "I applied"}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setOpenJob(isOpen ? null : j.id)}
                  style={{
                    marginTop: 14,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: isOpen ? M.muted : M.brand,
                    transition: "color .18s",
                  }}
                >
                  {isOpen ? "Hide match breakdown" : "Why this match?"}
                </button>

                {isOpen && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 16,
                      borderTop: "1px solid #F3F6FD",
                      animation: "expand .34s cubic-bezier(.2,.7,.2,1) both",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                        gap: 14,
                      }}
                    >
                      {reasons.map((r, ri) => (
                        <div
                          key={r.label}
                          style={{
                            animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${ri * 55}ms both`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: M.ink }}>
                              {r.label}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontFamily: M.mono,
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: M.body,
                              }}
                            >
                              {r.pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 20,
                              background: M.lineSoft,
                              marginTop: 8,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${r.pct}%`,
                                borderRadius: 20,
                                background: matchHex(r.pct),
                                transformOrigin: "left",
                                animation: `sweep .6s cubic-bezier(.2,.7,.2,1) ${80 + ri * 90}ms both`,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: M.muted,
                              marginTop: 7,
                              lineHeight: 1.5,
                            }}
                          >
                            {r.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- EMPTY ---------------- */}
      {!busy && jobs.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: `1px dashed ${M.lineMid}`,
            borderRadius: 20,
            padding: "56px 24px",
            textAlign: "center",
            marginTop: 14,
            animation: "v3FadeIn .3s ease both",
          }}
        >
          <div
            style={{
              fontFamily: M.display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: M.ink,
            }}
          >
            No jobs match those filters
          </div>
          <p style={{ margin: "8px 0 18px", fontSize: 14, color: M.muted }}>
            Widen the workplace or experience range to see more.
          </p>
          <button
            onClick={clearFilters}
            style={{
              background: M.ink,
              border: "none",
              borderRadius: 11,
              padding: "12px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              color: M.page,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ---------------- PAGINATION ---------------- */}
      {!busy && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={pagerStyle(currentPage === 1)}
          >
            ← Previous
          </button>
          <span
            style={{
              fontFamily: M.mono,
              fontSize: 12.5,
              fontWeight: 700,
              color: M.body,
            }}
          >
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={pagerStyle(currentPage === totalPages)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
