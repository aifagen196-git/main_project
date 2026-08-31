import { useEffect, useState } from "react";
import { Briefcase, MapPin, Clock } from "lucide-react";
import { getInternalJobs } from "../services/internalJobs";

const M = {
  brand: "#6D4AFF",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
};

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

export default function InternalJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getInternalJobs()
      .then(setJobs)
      .catch((e) => {
        console.error("Failed to load internal jobs", e);
        setError("Couldn't load openings right now — try again shortly.");
        setJobs([]);
      });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.ink, margin: 0 }}>
          Internal Openings
        </h1>
        <p style={{ fontSize: 13.5, color: M.muted, marginTop: 4 }}>
          Roles posted directly by the AIFAGen team.
        </p>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {jobs === null && (
        <p style={{ color: M.faint, fontSize: 13.5 }}>Loading…</p>
      )}

      {jobs?.length === 0 && !error && (
        <div style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: M.muted, fontSize: 14, margin: 0 }}>No internal openings right now — check back soon.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs?.map((job) => (
          <div key={job.id} style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: M.ink, margin: 0 }}>{job.title}</h3>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 12.5, color: M.muted }}>
                  {job.department && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Briefcase size={13} /> {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={13} /> {job.location}
                    </span>
                  )}
                  {job.created_at && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Clock size={13} /> {relativePosted(job.created_at)}
                    </span>
                  )}
                </div>
              </div>
              {job.employment_type && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: M.brand, background: "#F3F0FF", borderRadius: 999, padding: "5px 12px", height: "fit-content", whiteSpace: "nowrap" }}>
                  {job.employment_type}
                </span>
              )}
            </div>

            {job.description && (
              <p style={{ fontSize: 13.5, color: M.body, marginTop: 12, marginBottom: job.skills?.length || job.apply_url ? 14 : 0, whiteSpace: "pre-line" }}>
                {job.description}
              </p>
            )}

            {job.skills?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: job.apply_url ? 14 : 0 }}>
                {job.skills.map((s) => (
                  <span key={s} style={{ fontSize: 11.5, color: M.muted, background: M.page, border: `1px solid ${M.line}`, borderRadius: 999, padding: "3px 10px" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: "#fff", background: M.brand, borderRadius: 8, padding: "9px 18px", textDecoration: "none" }}
              >
                Apply
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
