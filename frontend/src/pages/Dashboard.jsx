import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getApplications } from "../services/applications";
import { getMatchedJobs } from "../services/matchingService";
import { getLatestResume } from "../services/resume";
import { getSavedJobIds } from "../services/savedJobs";
import { matchHex } from "../utils/matchHex";

/* Presentation is an exact port of the "AIFAGen v3" dashboard. All data below
   is the app's own live account data — only the rendering changed. */

const D = {
  brand: "#6D4AFF",
  ochre: "#F59E0B",
  clay: "#F43F5E",
  track: "#EDF0F8",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

// Dashboard overview shows the active pipeline only (rejections are visible
// on the Applications page, not here).
const OUTCOME_META = [
  { key: "applied", label: "Applied", color: D.brand },
  { key: "interviewing", label: "Interviewing", color: D.ochre },
  { key: "assessment", label: "Assessment", color: "#334155" },
  { key: "offer", label: "Offer", color: D.clay },
];

function matchBand(score) {
  return score >= 80
    ? "Top match"
    : score >= 60
      ? "Strong"
      : score >= 40
        ? "Fair"
        : "Weak";
}

function getWeekCount(items = [], dateKey = "applied_at") {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const rawDate = item?.[dateKey] || item?.updated_at || item?.created_at || "";
    const ts = Date.parse(rawDate);
    return Number.isFinite(ts) && ts >= weekAgo;
  }).length;
}

/**
 * Weighted profile completeness. Each item carries a weight, a user-facing
 * label, and where to go to fix it — so the card can say WHAT to do next
 * instead of just showing a number.
 */
function getProfileStrength(profile, latestResume) {
  const resumeProfile = latestResume?.profile || {};
  const analysis = latestResume?.ai_analysis || {};

  const items = [
    { weight: 10, done: Boolean(profile?.full_name), label: "Add your full name", view: "settings" },
    { weight: 10, done: Boolean(profile?.headline), label: "Add a professional headline", view: "settings" },
    { weight: 10, done: Boolean(profile?.location), label: "Add your location", view: "settings" },
    { weight: 25, done: Boolean(latestResume), label: "Upload your resume", view: "resume" },
    {
      weight: 15,
      done: Boolean(resumeProfile?.skills?.length || latestResume?.extracted_skills?.length),
      label: "Get skills extracted from your resume",
      view: "resume",
    },
    {
      weight: 15,
      done: Boolean(analysis?.resume_score || analysis?.ats_score),
      label: "Run the AI resume analysis",
      view: "resume",
    },
  ];

  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  const nextStep = items.find((i) => !i.done) || null;

  return { score: Math.round((earned / total) * 100), nextStep };
}

function jobInitial(company = "") {
  return String(company || "?").trim().slice(0, 1).toUpperCase() || "?";
}

export default function Dashboard({ profile }) {
  const navigate = useNavigate();
  const setView = (view) => navigate(`/${view}`);

  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [latestResume, setLatestResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    let retryTimer;

    async function loadDashboard(isRetry = false) {
      if (!isRetry) setLoading(true);

      const results = await Promise.allSettled([
        getMatchedJobs(),
        getApplications(),
        getSavedJobIds(),
        getLatestResume(),
      ]);

      if (!alive) return;

      const [matchResult, appResult, savedResult, resumeResult] = results;
      if (matchResult.status === "fulfilled") setMatches(matchResult.value || []);
      if (appResult.status === "fulfilled") setApplications(appResult.value || []);
      if (savedResult.status === "fulfilled") setSavedIds(savedResult.value || []);
      if (resumeResult.status === "fulfilled") setLatestResume(resumeResult.value || null);

      const failed = results.some((r) => r.status === "rejected");
      setErrors({
        matches:
          matchResult.status === "rejected"
            ? matchResult.reason?.message || "Job matches are unavailable."
            : "",
        applications:
          appResult.status === "rejected"
            ? appResult.reason?.message || "Applications are unavailable."
            : "",
        saved:
          savedResult.status === "rejected"
            ? savedResult.reason?.message || "Saved jobs are unavailable."
            : "",
        resume:
          resumeResult.status === "rejected"
            ? resumeResult.reason?.message || "Resume data is unavailable."
            : "",
      });
      setLoading(false);

      // Transient backend hiccups (e.g. a stale API schema cache) resolve
      // within seconds — retry once automatically instead of leaving a stale
      // error banner on screen.
      if (failed && !isRetry) {
        retryTimer = setTimeout(() => loadDashboard(true), 2500);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
    };
  }, [reloadKey]);

  const { score: profileStrength, nextStep } = getProfileStrength(
    profile,
    latestResume,
  );
  // Surface the first backend error (if any) as a banner.
  const loadError = [errors.matches, errors.applications, errors.saved, errors.resume]
    .filter(Boolean)
    .join(" ");
  const matchesAvailable = !errors.matches;
  const applicationsAvailable = !errors.applications;
  const savedAvailable = !errors.saved;
  const topMatches = matches.slice(0, 3);
  const interviews = applicationsAvailable ? applications.filter((app) =>
    ["interviewing", "assessment"].includes(app.status),
  ).length : null;
  const offers = applicationsAvailable
    ? applications.filter((app) => app.status === "offer").length
    : null;
  const applicationsThisWeek = applicationsAvailable
    ? getWeekCount(applications, "applied_at")
    : null;

  const stats = [
    {
      t: "Job Matches",
      v: loading || !matchesAvailable ? "--" : String(matches.length),
      d: loading ? "Loading" : matchesAvailable ? "From your profile" : "Unavailable",
      color: D.brand,
    },
    {
      t: "Applications",
      v: loading || !applicationsAvailable ? "--" : String(applications.length),
      d: loading ? "Loading" : applicationsAvailable ? `${applicationsThisWeek} this week` : "Unavailable",
      color: D.ochre,
    },
    {
      t: "Interviews",
      v: loading || !applicationsAvailable ? "--" : String(interviews),
      d: loading ? "Loading" : applicationsAvailable ? "Interviewing or assessment" : "Unavailable",
      color: "#334155",
    },
    {
      t: "Saved Jobs",
      v: loading || !savedAvailable ? "--" : String(savedIds.length),
      d: loading
        ? "Loading"
        : savedAvailable
        ? applicationsAvailable
          ? `${offers} offers tracked`
          : "Saved from matches"
        : "Unavailable",
      color: D.clay,
    },
  ];

  const outcome = useMemo(
    () =>
      OUTCOME_META.map((item) => ({
        ...item,
        value: applicationsAvailable
          ? applications.filter((app) => app.status === item.key).length
          : null,
      })),
    [applications, applicationsAvailable],
  );
  const outcomeTotal = applicationsAvailable
    ? outcome.reduce((sum, item) => sum + item.value, 0)
    : null;
  const recommendations = latestResume?.ai_analysis?.recommendations || [];
  const suggestions = [
    latestResume && {
      tag: "Resume",
      color: D.brand,
      title: "Resume Analysis",
      text:
        recommendations[0] ||
        `Latest ATS score: ${
          latestResume.ai_analysis?.ats_score ??
          latestResume.ai_analysis?.resume_score ??
          "not scored"
        }.`,
      action: "Open resume",
      view: "resume",
    },
    matches.length > 0 && {
      tag: "Matches",
      color: D.ochre,
      title: "Matched Jobs",
      text: `${matches.length} jobs are currently ranked against your profile.`,
      action: "View matches",
      view: "matches",
    },
    applicationsAvailable && interviews > 0 && {
      tag: "Pipeline",
      color: D.clay,
      title: "Interview Pipeline",
      text: `${interviews} application${interviews === 1 ? " is" : "s are"} in interview or assessment.`,
      action: "Open tracker",
      view: "applications",
    },
  ].filter(Boolean);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const pipelineTotal = outcomeTotal || 0;
  // Build the conic-gradient stops for the pipeline donut, one arc per stage.
  let acc = 0;
  const segs =
    pipelineTotal > 0
      ? outcome
          .map((p) => {
            const from = (acc / pipelineTotal) * 360;
            acc += p.value || 0;
            const to = (acc / pipelineTotal) * 360;
            return `${p.color} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
          })
          .join(",") + `,${D.track} 0`
      : `${D.track} 0`;

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 22,
          animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              fontFamily: D.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: D.faint,
            }}
          >
            {today}
          </div>
          <h1
            style={{
              fontFamily: D.display,
              fontSize: "clamp(28px,3.4vw,40px)",
              lineHeight: 1.04,
              letterSpacing: "-.035em",
              fontWeight: 700,
              margin: "12px 0 0",
              color: D.ink,
            }}
          >
            {greeting}, {firstName}.
          </h1>
          <p style={{ margin: "9px 0 0", fontSize: 15, color: D.muted }}>
            Here is where everything stands.
          </p>
        </div>

        <button
          onClick={() => setView(nextStep?.view || "resume")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: `conic-gradient(${D.brand} ${(profileStrength * 3.6).toFixed(1)}deg, ${D.track} 0)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 7,
                borderRadius: "50%",
                background: D.page,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: D.mono,
                fontSize: 12,
                fontWeight: 700,
                color: D.ink,
              }}
            >
              {profileStrength}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.ink }}>
              Profile strength
            </div>
            <div
              style={{
                fontSize: 12,
                color: D.brand,
                fontWeight: 700,
                marginTop: 2,
                maxWidth: "15rem",
              }}
            >
              {nextStep ? `${nextStep.label} →` : "Your profile is complete →"}
            </div>
          </div>
        </button>
      </div>

      {loadError && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13.5,
            color: "#92400E",
          }}
        >
          <span style={{ flex: 1 }}>{loadError}</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            style={{
              flexShrink: 0,
              background: "#FDE68A",
              border: "none",
              borderRadius: 9,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#92400E",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ---------------- STATS ---------------- */}
      <div data-dashgrid="stats" style={{ marginTop: 28 }}>
        {stats.map((s, i) => (
          <div
            key={s.t}
            className="v3-card"
            style={{
              background: "#fff",
              border: `1px solid ${D.line}`,
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 1px 2px rgba(15,23,42,.04)",
              animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: D.mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: D.faint,
                }}
              >
                {s.t}
              </span>
            </div>
            <div
              style={{
                fontFamily: D.mono,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-.03em",
                color: D.ink,
                marginTop: 14,
                lineHeight: 1,
              }}
            >
              {s.v}
            </div>
            <div style={{ fontSize: 12.5, color: D.muted, marginTop: 10 }}>
              {s.d}
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- MAIN ---------------- */}
      <div data-dashgrid="main" style={{ marginTop: 14 }}>
        <div
          style={{
            minWidth: 0,
            background: "#fff",
            border: `1px solid ${D.line}`,
            borderRadius: 20,
            padding: 22,
            animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .18s both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontFamily: D.display,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-.02em",
                margin: 0,
                color: D.ink,
              }}
            >
              Top job matches
            </h2>
            <button
              onClick={() => setView("matches")}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                color: D.brand,
                cursor: "pointer",
              }}
            >
              View all →
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 18,
            }}
          >
            {loading ? (
              <div
                style={{
                  border: `1px solid ${D.lineSoft}`,
                  borderRadius: 15,
                  padding: 24,
                  textAlign: "center",
                  color: D.faint,
                }}
              >
                <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} />
              </div>
            ) : topMatches.length === 0 ? (
              <div
                style={{
                  border: `1px solid ${D.lineSoft}`,
                  borderRadius: 15,
                  padding: 16,
                  fontSize: 13.5,
                  color: D.muted,
                }}
              >
                No job matches yet. Upload a resume to generate matches.
              </div>
            ) : (
              topMatches.map((job, i) => {
                const score = job.match_score ?? 0;
                return (
                  <div
                    key={job.id}
                    className="v3-matchrow"
                    onClick={() => setView("matches")}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: 13,
                      border: `1px solid ${D.lineSoft}`,
                      borderRadius: 15,
                      cursor: "pointer",
                      animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${200 + i * 55}ms both`,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: "#F3F6FD",
                        border: `1px solid ${D.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: D.display,
                        fontSize: 16,
                        fontWeight: 700,
                        color: D.ink,
                        flexShrink: 0,
                      }}
                    >
                      {jobInitial(job.company)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: D.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {job.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: D.muted,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {job.company}
                        {job.location ? ` · ${job.location}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: D.mono,
                          fontSize: 13.5,
                          fontWeight: 700,
                          letterSpacing: "-.02em",
                          color: matchHex(score),
                        }}
                      >
                        {score}%
                      </div>
                      <div
                        style={{
                          fontFamily: D.mono,
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          color: D.faint,
                          marginTop: 2,
                        }}
                      >
                        {matchBand(score)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ---------------- PIPELINE ---------------- */}
        <div
          style={{
            minWidth: 0,
            background: "#fff",
            border: `1px solid ${D.line}`,
            borderRadius: 20,
            padding: 22,
            animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .26s both",
          }}
        >
          <h2
            style={{
              fontFamily: D.display,
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: "-.02em",
              margin: 0,
              color: D.ink,
            }}
          >
            Pipeline
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 20,
            }}
          >
            <div style={{ position: "relative", width: 118, height: 118, flexShrink: 0 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: `conic-gradient(${segs})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: D.mono,
                    fontSize: 22,
                    fontWeight: 700,
                    color: D.ink,
                    lineHeight: 1,
                  }}
                >
                  {applicationsAvailable ? pipelineTotal : "--"}
                </span>
                <span
                  style={{
                    fontFamily: D.mono,
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: D.faint,
                    marginTop: 3,
                  }}
                >
                  active
                </span>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {outcome.map((p) => (
                <div
                  key={p.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, color: D.body }}>{p.label}</span>
                  <span
                    style={{
                      fontFamily: D.mono,
                      fontWeight: 700,
                      color: D.ink,
                    }}
                  >
                    {p.value ?? "--"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setView("applications")}
            className="v3-trackerbtn"
            style={{
              width: "100%",
              marginTop: 20,
              background: D.page,
              border: `1px solid ${D.line}`,
              borderRadius: 12,
              padding: 11,
              fontSize: 13.5,
              fontWeight: 700,
              color: D.ink,
              cursor: "pointer",
            }}
          >
            Open tracker
          </button>
        </div>
      </div>

      {/* ---------------- SUGGESTIONS ---------------- */}
      {suggestions.length > 0 && (
        <div data-dashgrid="sugg" style={{ marginTop: 14 }}>
          {suggestions.map((s, i) => (
            <div
              key={s.title}
              className="v3-card"
              style={{
                background: "#fff",
                border: `1px solid ${D.line}`,
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: `${s.color}1F`,
                  color: s.color,
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontFamily: D.mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                {s.tag}
              </div>
              <h3
                style={{
                  fontFamily: D.display,
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  margin: "16px 0 0",
                  color: D.ink,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: D.muted,
                }}
              >
                {s.text}
              </p>
              <button
                onClick={() => setView(s.view)}
                style={{
                  marginTop: 16,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: D.brand,
                  cursor: "pointer",
                }}
              >
                {s.action} →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}