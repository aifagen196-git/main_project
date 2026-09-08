import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { matchHex } from "../utils/matchHex";
import { getSavedJobs } from "../services/savedJobs";

/* Exact port of the "AIFAGen v3" shortlist screen. */

const S = {
  clay: "#F43F5E",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export default function SavedJobs({ saved, toggle }) {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSavedJobs()
      .then((rows) => active && setJobs(rows))
      .catch((e) => console.error("Failed to load saved jobs", e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Reflect un-saves immediately using the shared `saved` id list.
  const list = jobs.filter((j) => saved.includes(j.id));

  const blurb = loading
    ? "Loading your shortlist…"
    : list.length === 0
      ? "Bookmark a match and it will wait for you here."
      : `${list.length} role${list.length === 1 ? "" : "s"} you've bookmarked to revisit.`;

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
          Saved
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
          Shortlist
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: 15, color: S.muted }}>{blurb}</p>
      </div>

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
      ) : list.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: `1px dashed ${S.lineMid}`,
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
            Nothing saved yet
          </div>
          <p style={{ margin: "8px 0 18px", fontSize: 14, color: S.muted }}>
            Bookmark a match and it will wait for you here.
          </p>
          <button
            onClick={() => navigate("/matches")}
            style={{
              background: S.ink,
              border: "none",
              borderRadius: 11,
              padding: "12px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              color: S.page,
              cursor: "pointer",
            }}
          >
            Browse matches
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 16,
            marginTop: 26,
          }}
        >
          {list.map((j, i) => {
            const score = j.match_score ?? 0;
            return (
              <div
                key={j.id}
                className="v3-savedcard"
                style={{
                  background: "#fff",
                  border: `1px solid ${S.line}`,
                  borderRadius: 20,
                  padding: 22,
                  boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                  animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
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
                    {(j.company || "?").trim().charAt(0).toUpperCase() || "?"}
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
                      {j.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: S.muted, marginTop: 2 }}>
                      {j.company}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: S.mono,
                      fontSize: 13.5,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      color: matchHex(score),
                    }}
                  >
                    {score}%
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 14px",
                    marginTop: 16,
                    fontSize: 12.5,
                    color: S.muted,
                  }}
                >
                  {j.location && <span>{j.location}</span>}
                  {j.salary && (
                    <span style={{ fontFamily: S.mono, fontWeight: 700, color: S.body }}>
                      {j.salary}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
                  <a
                    href={j.apply_url || "#"}
                    target={j.apply_url ? "_blank" : undefined}
                    rel={j.apply_url ? "noreferrer" : undefined}
                    className="v3-applybtn"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      background: S.ink,
                      border: "none",
                      borderRadius: 11,
                      padding: 11,
                      fontSize: 13,
                      fontWeight: 700,
                      color: S.page,
                      cursor: "pointer",
                      transition: "background .2s",
                    }}
                  >
                    Apply now
                  </a>
                  <button
                    onClick={() => toggle(j.id)}
                    className="v3-removecard"
                    style={{
                      background: "#fff",
                      border: `1px solid ${S.lineMid}`,
                      borderRadius: 11,
                      padding: "11px 15px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: S.muted,
                      cursor: "pointer",
                      transition: "border-color .2s,color .2s",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
