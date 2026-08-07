import { useEffect, useState, useRef } from "react";

import Card from "../components/common/Card";
import Ring from "../components/common/Ring";
import SectionTitle from "../components/common/SectionTitle";
import Bar from "../components/ui/Bar";
import Pill from "../components/ui/Pill";

import {
  uploadResume,
  validateResumeFile,
  getLatestResume,
  improveResume,
  downloadFullResume,
} from "../services/resume";

import { bBrand, bOutline } from "../styles/buttonStyles";

import {
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  Loader2,
  Wand2,
} from "lucide-react";

export default function Resume() {
  const [tab, setTab] = useState("Strengths");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [improveError, setImproveError] = useState("");
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  useEffect(() => {
    loadLatestResume();
  }, []);

  const fileInputRef = useRef(null);

  async function loadLatestResume() {
    try {
      const resume = await getLatestResume();
      if (resume) {
        setSelectedResume(resume);
        setResumes([resume]);
        // A resume is optimized at most once — if it already was, show the
        // stored result immediately (no AI call).
        setOut(resume.ai_analysis?.improvement || "");
      }
    } catch (err) {
      console.error("Failed to load latest resume:", err);
    }
  }

  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!selectedResume?.id) return;
    setDownloading(true);
    setImproveError("");
    try {
      // Full rewrite: complete resume with improved wording (server-side AI
      // call — can take up to a minute).
      await downloadFullResume(selectedResume.id);
    } catch (err) {
      console.error(err);
      setImproveError(err.message || "Could not generate the document.");
    } finally {
      setDownloading(false);
    }
  }

  async function improve() {
    if (!selectedResume?.id) {
      setImproveError("Please upload a resume first.");
      return;
    }

    setBusy(true);
    setOut("");
    setImproveError("");
    try {
      const improvement = await improveResume(selectedResume.id);
      setOut(improvement);
      // Keep the in-memory resume in sync with what the backend just stored,
      // so navigating away and back still shows the optimization.
      setSelectedResume((r) =>
        r ? { ...r, ai_analysis: { ...(r.ai_analysis || {}), improvement } } : r,
      );
    } catch (err) {
      console.error(err);
      setImproveError(err.message || "Resume improvement is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const resumeAnalysis = selectedResume?.ai_analysis || {};

  const tabs = {
    Strengths: resumeAnalysis.strengths || [],

    Improvements: resumeAnalysis.weaknesses || [],

    Keywords: resumeAnalysis.skills_found || [],

    "ATS Optimization": resumeAnalysis.recommendations || [],
  };

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateResumeFile(file);
      setBusy(true);
      setImproveError("");
      setOut("");

      // The backend stores the file, extracts text + skills, builds the
      // structured profile, and runs ATS analysis — returning the finished row.
      const resume = await uploadResume(file);
      e.target.value = "";

      setSelectedResume(resume);
      setResumes((prev) => [resume, ...prev]);

      if (!resume.ai_analysis) {
        setImproveError(
          "Resume uploaded, but AI analysis is temporarily unavailable. Try again shortly.",
        );
      }
    } catch (err) {
      console.error(err);
      setImproveError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const analysis = selectedResume?.ai_analysis || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            Resume Analysis
          </h2>

          <p className="text-slate-500 mt-1">
            AI-powered feedback to help you create a resume that gets you
            interviews.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={bOutline}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            Replace Resume
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleResumeUpload}
          />

          {!out ? (
            <button
              onClick={improve}
              disabled={busy || !selectedResume}
              className={bBrand}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Working...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Improve Resume
                </>
              )}
            </button>
          ) : (
            <button onClick={download} disabled={downloading} className={bBrand}>
              {downloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Improved Resume
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {improveError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {improveError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Resume Score
              </div>

              <Ring
                value={analysis.resume_score || 0}
                size={150}
                stroke={14}
                label={String(analysis.resume_score || "--")}
                sub="/100"
              />
            </div>

            <div className="flex-1 w-full">
              <div className="font-bold text-slate-900">
                {analysis.summary ? "AI Resume Analysis" : "Upload a resume"}
              </div>

              <p className="text-sm text-slate-500 mt-1 mb-4">
                {analysis.summary || "Upload a resume to receive AI insights."}
              </p>

              <div className="space-y-2">
                <div className="text-sm">
                  Experience:
                  <span className="font-semibold ml-2">
                    {analysis.experience_level || "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="ATS Compatibility" />

          <div className="num text-4xl font-extrabold text-emerald-600">
            {analysis.ats_score || "--"}%
          </div>

          <div className="font-bold text-emerald-600">
            {analysis.ats_score >= 80
              ? "Highly Compatible"
              : analysis.ats_score >= 60
                ? "Moderately Compatible"
                : "Needs Improvement"}
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Your resume is optimized for most ATS systems.
          </p>

          <div className="mt-3">
            <Bar value={analysis.ats_score || 0} color="bg-emerald-500" />
          </div>

          <div className="mt-4 rounded-xl bg-emerald-50 p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="text-emerald-600" />

            <span className="font-semibold text-emerald-700">
              Your resume is ATS-friendly.
            </span>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex gap-5 border-b border-slate-100 mb-4">
            {["Strengths", "Improvements", "Keywords", "ATS Optimization"].map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={
                    "pb-3 text-sm font-semibold border-b-2 -mb-px transition " +
                    (tab === t
                      ? "brand border-brand"
                      : "text-slate-400 border-transparent")
                  }
                >
                  {t}
                </button>
              ),
            )}
          </div>

          <div className="space-y-4">
            {(tabs[tab] || []).map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />

                <div className="text-sm ">{item}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            title="Top Skills Found"
            action={
              <button className="text-sm font-semibold brand">Edit</button>
            }
          />

          <div className="flex flex-wrap gap-1.5">
            {analysis.skills_found?.map((s) => (
              <span
                key={s}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium brand"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-5 text-sm font-bold text-slate-700 mb-2">
            Skills to Add
          </div>

          <div className="flex flex-wrap gap-1.5">
            {analysis.skills_missing?.map((s) => (
              <span
                key={s}
                className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
              >
                {s}
              </span>
            ))}
          </div>
        </Card>
      </div>
      {out && (
        <Card className="p-6">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            AI Resume Improvements
          </h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Improved Professional Summary
              </h4>

              <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
                {out.improved_summary}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Rewritten Resume Bullets
              </h4>

              <div className="space-y-3">
                {out.rewritten_bullets?.map((bullet, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-xl bg-emerald-50 p-4"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600 mt-1 shrink-0"
                    />

                    <span className="text-slate-700">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Recommended ATS Keywords
              </h4>

              <div className="flex flex-wrap gap-2">
                {out.keywords_to_add?.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium brand"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Recruiter Feedback
              </h4>

              <div className="space-y-2">
                {out.recruiter_feedback?.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-blue-50 p-3 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                ATS Improvements
              </h4>

              <div className="space-y-2">
                {out.ats_improvements?.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-amber-50 p-3 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
