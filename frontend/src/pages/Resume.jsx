import { useEffect, useState, useRef } from "react";

import {
  uploadResume,
  validateResumeFile,
  getLatestResume,
  improveResume,
  downloadFullResume,
} from "../services/resume";
import { matchHex } from "../utils/matchHex";

/* Exact port of the "AIFAGen v3" resume screen. Upload, analysis, improve and
   download all still run through the existing services. */

const R = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  track: "#EDF0F8",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

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

  const resumeScore = Number(analysis.resume_score ?? 0);
  const atsScore = Number(analysis.ats_score ?? analysis.resume_score ?? 0);
  const hasResume = Boolean(selectedResume);
  const skillsFound = analysis.skills_found || [];
  const skillsMissing = analysis.skills_missing || [];
  const parsePct = busy ? 60 : hasResume ? 100 : 0;

  const atsLabel =
    atsScore >= 85
      ? "Highly compatible"
      : atsScore >= 70
        ? "Compatible"
        : atsScore >= 50
          ? "Needs work"
          : "Poorly parsed";

  const kicker = {
    fontFamily: R.mono,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: R.faint,
  };

  const cardStyle = (delay) => ({
    minWidth: 0,
    background: "#fff",
    border: `1px solid ${R.line}`,
    borderRadius: 20,
    padding: 26,
    boxShadow: "0 1px 2px rgba(15,23,42,.04)",
    animation: `riseIn .6s cubic-bezier(.2,.7,.2,1) ${delay}ms both`,
  });

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 16,
          animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ ...kicker, fontSize: 10, letterSpacing: ".16em" }}>Resume</div>
          <h1
            style={{
              fontFamily: R.display,
              fontSize: "clamp(28px,3.4vw,40px)",
              lineHeight: 1.04,
              letterSpacing: "-.035em",
              fontWeight: 700,
              margin: "12px 0 0",
              color: R.ink,
            }}
          >
            What recruiters will see.
          </h1>
          <p style={{ margin: "9px 0 0", fontSize: 15, color: R.muted }}>
            AI-powered feedback to help you create a resume that gets you
            interviews.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="v3-btn-outline"
            style={{
              background: "#fff",
              border: `1px solid ${R.lineMid}`,
              borderRadius: 12,
              padding: "13px 19px",
              fontSize: 14,
              fontWeight: 700,
              color: R.ink,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.65 : 1,
            }}
          >
            {hasResume ? "Replace resume" : "Upload resume"}
          </button>
          <button
            onClick={improve}
            disabled={busy || !hasResume}
            className="v3-btn-dark"
            style={{
              background: R.ink,
              border: "none",
              borderRadius: 12,
              padding: "13px 19px",
              fontSize: 14,
              fontWeight: 700,
              color: R.page,
              cursor: busy || !hasResume ? "default" : "pointer",
              opacity: busy || !hasResume ? 0.65 : 1,
            }}
          >
            {busy ? "Working…" : "Improve resume"}
          </button>
        </div>
      </div>

      {improveError && (
        <div
          style={{
            marginTop: 20,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13.5,
            color: "#92400E",
          }}
        >
          {improveError}
        </div>
      )}

      {!hasResume ? (
        <div
          style={{
            background: "#fff",
            border: `1px dashed ${R.lineMid}`,
            borderRadius: 20,
            padding: "64px 24px",
            textAlign: "center",
            marginTop: 26,
          }}
        >
          <div
            style={{
              fontFamily: R.display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: R.ink,
            }}
          >
            No resume yet
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: R.muted }}>
            Upload a PDF or Word file and the analysis appears here.
          </p>
        </div>
      ) : (
        <>
          {/* ---------------- SCORE + ATS ---------------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 16,
              marginTop: 26,
            }}
          >
            <div data-r="wide" className="v3-settings-wide" style={cardStyle(80)}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28 }}>
                <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: `conic-gradient(${matchHex(resumeScore)} ${(resumeScore * 3.6).toFixed(1)}deg, ${R.track} 0)`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 15,
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
                        fontFamily: R.mono,
                        fontSize: 38,
                        fontWeight: 700,
                        color: R.ink,
                        lineHeight: 1,
                        letterSpacing: "-.03em",
                      }}
                    >
                      {resumeScore || "—"}
                    </span>
                    <span style={{ ...kicker, marginTop: 5 }}>/ 100</span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={kicker}>
                    {busy ? "Analyzing" : analysis.experience_level || "Analyzed"}
                  </div>
                  <h2
                    style={{
                      fontFamily: R.display,
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      margin: "10px 0 0",
                      color: R.ink,
                    }}
                  >
                    {selectedResume?.file_name || "Your resume"}
                  </h2>
                  <p
                    style={{
                      margin: "9px 0 0",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: R.muted,
                    }}
                  >
                    {analysis.summary ||
                      "Analysis is not available for this resume yet."}
                  </p>

                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: R.muted,
                      }}
                    >
                      <span style={kicker}>Parse progress</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontFamily: R.mono,
                          fontWeight: 700,
                          color: R.ink,
                        }}
                      >
                        {parsePct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 20,
                        background: R.lineSoft,
                        marginTop: 9,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${parsePct}%`,
                          borderRadius: 20,
                          background: R.brand,
                          transformOrigin: "left",
                          animation: "sweep .6s cubic-bezier(.2,.7,.2,1) both",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle(160)}>
              <div style={kicker}>ATS compatibility</div>
              <div
                style={{
                  fontFamily: R.mono,
                  fontSize: 46,
                  fontWeight: 700,
                  letterSpacing: "-.04em",
                  color: R.brand,
                  lineHeight: 1,
                  marginTop: 14,
                }}
              >
                {atsScore || "—"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: R.brand, marginTop: 6 }}>
                {atsLabel}
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 20,
                  background: R.lineSoft,
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${atsScore}%`,
                    borderRadius: 20,
                    background: R.brand,
                    transformOrigin: "left",
                    animation: "sweep .6s cubic-bezier(.2,.7,.2,1) 120ms both",
                  }}
                />
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: R.muted }}>
                Clean single-column structure, standard section headings, no
                tables. Parsers will read every line.
              </p>
            </div>
          </div>

          {/* ---------------- TABS + SKILLS ---------------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div data-r="wide" className="v3-settings-wide" style={cardStyle(240)}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  borderBottom: `1px solid ${R.lineSoft}`,
                  paddingBottom: 2,
                }}
              >
                {Object.keys(tabs).map((t) => {
                  const on = tab === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${on ? R.brand : "transparent"}`,
                        borderRadius: 0,
                        padding: "10px 12px",
                        fontSize: 13.5,
                        fontFamily: "inherit",
                        fontWeight: on ? 700 : 600,
                        color: on ? R.ink : R.muted,
                        cursor: "pointer",
                        transition: "color .18s,border-color .18s",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
                {(tabs[tab] || []).length === 0 ? (
                  <p style={{ margin: "10px 4px", fontSize: 14, color: R.muted }}>
                    Nothing recorded under {tab.toLowerCase()} for this resume.
                  </p>
                ) : (
                  (tabs[tab] || []).map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: 14,
                        padding: "14px 4px",
                        borderBottom: `1px solid ${R.page}`,
                        animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${index * 55}ms both`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: R.mono,
                          fontSize: 11,
                          fontWeight: 700,
                          color: R.faint,
                          flexShrink: 0,
                          paddingTop: 2,
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                        {typeof item === "string" ? item : JSON.stringify(item)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={cardStyle(320)}>
              <div style={kicker}>Skills found</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
                {skillsFound.length === 0 ? (
                  <span style={{ fontSize: 13, color: R.muted }}>None extracted yet.</span>
                ) : (
                  skillsFound.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: R.brand,
                        background: "#F0EDFF",
                        borderRadius: 8,
                        padding: "6px 11px",
                      }}
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>

              <div style={{ ...kicker, marginTop: 26 }}>Worth adding</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
                {skillsMissing.length === 0 ? (
                  <span style={{ fontSize: 13, color: R.muted }}>
                    No gaps flagged against your target roles.
                  </span>
                ) : (
                  skillsMissing.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: R.clay,
                        background: "#FFF0F3",
                        borderRadius: 8,
                        padding: "6px 11px",
                      }}
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ---------------- IMPROVED OUTPUT ---------------- */}
          {out && (
            <div style={{ ...cardStyle(0), marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={kicker}>Improved draft</div>
                <button
                  onClick={download}
                  disabled={downloading}
                  style={{
                    marginLeft: "auto",
                    background: R.ink,
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 15px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: R.page,
                    cursor: downloading ? "default" : "pointer",
                    opacity: downloading ? 0.65 : 1,
                  }}
                >
                  {downloading ? "Preparing…" : "Download .docx"}
                </button>
              </div>
              <pre
                style={{
                  margin: "16px 0 0",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#334155",
                }}
              >
                {out}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
