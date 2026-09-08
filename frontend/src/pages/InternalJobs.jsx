import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getInternalJobs } from "../services/internalJobs";

/* Standalone page for postings added by hand via the admin page — moved
   out of Dashboard.jsx into its own sidebar entry so it's not tucked away
   below "Top job matches". Same data source (GET /api/internal-jobs),
   same card markup, just given a real page shell (header + empty state)
   instead of hiding entirely when there's nothing to show. */

const S = {
  brand: "#6D4AFF",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

function jobInitial(company = "") {
  return String(company || "?").trim().slice(0, 1).toUpperCase() || "?";
}

export default function InternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getInternalJobs()
      .then((rows) => alive && setJobs(rows || []))
      .catch((e) => {
        console.error("Failed to load internal jobs", e);
        if (alive) setError(e?.message || "Internal jobs are unavailable.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const blurb = loading
    ? "Loading postings…"
    : jobs.length === 0
      ? "Nothing posted here yet — check back soon."
      : `${jobs.length} posting${jobs.length === 1 ? "" : "s"} added directly by the AIFAGen team.`;

  return (
    <div>
      <div style={{ animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both" }}>
        <div
          style={{
            fontFamily: S.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: S.faint,
          }}
        >
          Internal
        </div>
        <h1
          style={{
            fontFamily: S.display,
            fontSize: "clamp(28px,3.4vw,40px)",
            lineHeight: 1.04,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: "12px 0 0",
            color: S.ink,
          }}
        >
          Internal Jobs
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: 15, color: S.muted }}>{blurb}</p>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${S.line}`,
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
            marginTop: 26,
            color: S.faint,
          }}
        >
          <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto" }} />
        </div>
      ) : jobs.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: `1px dashed ${S.line}`,
            borderRadius: 20,
            padding: "64px 24px",
            textAlign: "center",
            marginTop: 26,
            animation: "v3FadeIn .3s ease both",
          }}
        >
          <div
            style={{
              fontFamily: S.display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: S.ink,
            }}
          >
            No internal jobs posted yet
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: S.muted }}>
            Postings added by the AIFAGen team through the admin page will show up here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 16,
            marginTop: 26,
          }}
        >
          {jobs.map((job, i) => (
            <div
              key={job.id}
              className="v3-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 22,
                background: "#fff",
                border: `1px solid ${S.line}`,
                borderRadius: 20,
                boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "#F3F6FD",
                    border: `1px solid ${S.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: S.display,
                    fontSize: 17,
                    fontWeight: 700,
                    color: S.ink,
                    flexShrink: 0,
                  }}
                >
                  {jobInitial(job.company || job.department)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: S.ink,
                      lineHeight: 1.3,
                    }}
                  >
                    {job.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: S.muted,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {/* Admin page's own schema doesn't always fill `company` —
                        fall back to `department`, then show whatever's left. */}
                    {[job.company || job.department, job.location, job.employment_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>

              {Array.isArray(job.skills) && job.skills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: S.brand,
                        background: "#F3F0FF",
                        borderRadius: 999,
                        padding: "3px 9px",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {job.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: S.muted,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {job.description}
                </p>
              )}

              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "auto",
                  background: S.brand,
                  borderRadius: 11,
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Apply
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
