import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import Card from "../components/common/Card";
import Logo from "../components/common/Logo";
import Ring from "../components/common/Ring";
import SectionTitle from "../components/common/SectionTitle";
import Stat from "../components/ui/Stat";
import { STAT_TINT } from "../data/constants";
import { getApplications } from "../services/applications";
import { getMatchedJobs } from "../services/matchingService";
import { getLatestResume } from "../services/resume";
import { getSavedJobIds } from "../services/savedJobs";
import { matchHex } from "../utils/matchHex";

// Dashboard overview shows the active pipeline only (rejections are visible
// on the Applications page, not here).
const OUTCOME_META = [
  { key: "applied", label: "Applied", color: "#6d4aff" },
  { key: "interviewing", label: "Interviewing", color: "#f59e0b" },
  { key: "assessment", label: "Assessment", color: "#0ea5e9" },
  { key: "offer", label: "Offer", color: "#22c55e" },
];

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
      icon: Briefcase,
      tint: "violet",
    },
    {
      t: "Applications",
      v: loading || !applicationsAvailable ? "--" : String(applications.length),
      d: loading ? "Loading" : applicationsAvailable ? `${applicationsThisWeek} this week` : "Unavailable",
      icon: Send,
      tint: "emerald",
    },
    {
      t: "Interviews",
      v: loading || !applicationsAvailable ? "--" : String(interviews),
      d: loading ? "Loading" : applicationsAvailable ? "Interviewing or assessment" : "Unavailable",
      icon: MessageSquare,
      tint: "rose",
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
      icon: Bookmark,
      tint: "sky",
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
  const activity = applicationsAvailable ? applications.slice(0, 4) : [];
  const recommendations = latestResume?.ai_analysis?.recommendations || [];
  const suggestions = [
    latestResume && {
      icon: FileText,
      tint: "emerald",
      title: "Resume Analysis",
      text:
        recommendations[0] ||
        `Latest ATS score: ${
          latestResume.ai_analysis?.ats_score ??
          latestResume.ai_analysis?.resume_score ??
          "not scored"
        }.`,
      action: "Open Resume",
      view: "resume",
    },
    matches.length > 0 && {
      icon: Sparkles,
      tint: "violet",
      title: "Matched Jobs",
      text: `${matches.length} jobs are currently ranked against your profile.`,
      action: "View Matches",
      view: "matches",
    },
    applicationsAvailable && interviews > 0 && {
      icon: Mic,
      tint: "amber",
      title: "Interview Pipeline",
      text: `${interviews} application${interviews === 1 ? " is" : "s are"} in interview or assessment.`,
      action: "View Applications",
      view: "applications",
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            Good morning, {profile?.full_name?.split(" ")[0] || "User"}!
          </h2>
          <p className="text-slate-500 mt-1">
            Your dashboard is based only on live account data.
          </p>
        </div>

        <Card
          hover={Boolean(nextStep)}
          className={"p-4 flex items-center gap-4" + (nextStep ? " cursor-pointer" : "")}
          onClick={() => nextStep && setView(nextStep.view)}
        >
          <Ring value={profileStrength} size={70} stroke={8} label={`${profileStrength}%`} />
          <div>
            <div className="font-bold text-slate-900 text-sm">
              Profile Strength
            </div>
            <div className="text-xs text-slate-500" style={{ maxWidth: "13rem" }}>
              {nextStep ? (
                <span className="inline-flex items-center gap-1">
                  Next: {nextStep.label}
                  <ArrowRight size={11} className="brand shrink-0" />
                </span>
              ) : (
                "Your profile is complete. Nice work!"
              )}
            </div>
          </div>
        </Card>
      </div>

      {loadError && (
        <Card className="p-3 text-sm text-amber-700 bg-amber-50 border-amber-100 flex items-center gap-3">
          <span className="flex-1">{loadError}</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-200 transition"
          >
            Retry
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.t} className="fadeUp" style={{ animationDelay: i * 60 + "ms" }}>
            <Stat s={s} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <SectionTitle
            title="Top Job Matches"
            action={
              <button onClick={() => setView("matches")} className="text-sm font-semibold brand">
                View all
              </button>
            }
          />

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-slate-100 p-6 text-center text-slate-400">
                <Loader2 size={20} className="mx-auto animate-spin" />
              </div>
            ) : topMatches.length === 0 ? (
              <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-500">
                No job matches yet. Upload a resume to generate matches.
              </div>
            ) : (
              topMatches.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 card cursor-pointer"
                  onClick={() => setView("matches")}
                >
                  <Logo lg={jobInitial(job.company)} size="h-10 w-10" text="text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {job.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {job.company} {job.location ? `· ${job.location}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="num text-sm font-bold"
                      style={{ color: matchHex(job.match_score || 0) }}
                    >
                      {job.match_score ?? 0}%
                    </div>
                    <div className="text-xs text-slate-400">Match</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setView("matches")}
            className="w-full mt-3 rounded-xl bg-brand-50 py-2.5 text-sm font-semibold brand"
          >
            Explore More Matches
          </button>
        </Card>

        <Card className="p-6">
          <SectionTitle
            title="Application Overview"
            action={
              <button onClick={() => setView("applications")} className="text-sm font-semibold brand">
                View all
              </button>
            }
          />

          <div className="flex items-center gap-4">
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={outcomeTotal ? outcome : [{ value: 1, color: "#e2e8f0" }]}
                    dataKey="value"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    {(outcomeTotal ? outcome : [{ color: "#e2e8f0" }]).map((item, i) => (
                      <Cell key={i} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-1.5">
              {outcome.map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-slate-600 flex-1">{item.label}</span>
                  <span className="num font-bold text-slate-800">
                    {item.value ?? "--"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-brand-50 p-3 flex items-center gap-2 text-sm">
            <Sparkles size={16} className="brand" />
            <span className="font-semibold brand">
              {applicationsAvailable
                ? `${outcomeTotal} total application${outcomeTotal === 1 ? "" : "s"} tracked.`
                : "Application data is unavailable right now."}
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            title="Recent Applications"
            action={
              <button onClick={() => setView("applications")} className="text-sm font-semibold brand">
                View all
              </button>
            }
          />

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-slate-100 p-6 text-center text-slate-400">
                <Loader2 size={20} className="mx-auto animate-spin" />
              </div>
            ) : activity.length === 0 ? (
              <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-500">
                No applications tracked yet.
              </div>
            ) : (
              activity.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setView("applications")}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                    <Send size={16} className="text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {app.role}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {app.company} · {app.status}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-slate-900 mb-4">
          AI Suggestions For You
        </h3>

        <div className="grid md:grid-cols-3 gap-5">
          {suggestions.length === 0 ? (
            <Card className="p-5 md:col-span-3">
              <div className="font-bold text-slate-900">No suggestions yet</div>
              <p className="text-sm text-slate-500 mt-1">
                Upload a resume, save jobs, or track applications to populate this section.
              </p>
            </Card>
          ) : (
            suggestions.map((item) => {
              const Icon = item.icon;
              const tint = STAT_TINT[item.tint];

              return (
                <Card key={item.title} hover className="p-5">
                  <div
                    className={
                      "inline-flex h-11 w-11 items-center justify-center rounded-xl " +
                      tint.bg
                    }
                  >
                    <Icon size={20} className={tint.fg} />
                  </div>
                  <div className="font-bold text-slate-900 mt-3">{item.title}</div>
                  <p className="text-sm text-slate-500 mt-1">{item.text}</p>
                  <button
                    onClick={() => setView(item.view)}
                    className="mt-3 text-sm font-semibold brand flex items-center gap-1"
                  >
                    {item.action}
                    <ArrowRight size={14} />
                  </button>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
