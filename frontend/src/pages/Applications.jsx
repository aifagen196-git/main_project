import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { matchHex } from "../utils/matchHex";
import {
  getApplications,
  addApplication,
  updateApplicationStatus,
  deleteApplication,
  APPLICATION_STATUSES,
} from "../services/applications";

/* Presentation is an exact port of the "AIFAGen v3" tracker screen. The status
   dot and colour the spec computes per row are surfaced here alongside the
   status control, since this page — unlike the mockup — actually manages
   application state. */

const A = {
  brand: "#6D4AFF",
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

const COLS = [
  { k: "applied", label: "Applied", hex: A.brand },
  { k: "interviewing", label: "Interviewing", hex: "#F59E0B" },
  { k: "assessment", label: "Assessment", hex: "#334155" },
  { k: "offer", label: "Offer", hex: A.clay },
  { k: "rejected", label: "Closed", hex: A.faint },
];

/** "12 Aug 2026" for the tracker's date column. */
function formatWhen(value) {
  const ts = Date.parse(value || "");
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    getApplications()
      .then(setApps)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const created = await addApplication(form);
      setApps((a) => [created, ...a]);
      setForm({ company: "", role: "", status: "applied" });
      setShowAdd(false);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  }

  async function moveStatus(id, status) {
    const prev = apps;
    setApps((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await updateApplicationStatus(id, status);
    } catch (e) {
      console.error(e);
      setApps(prev);
    }
  }

  async function remove(id) {
    const prev = apps;
    setApps((a) => a.filter((x) => x.id !== id));
    try {
      await deleteApplication(id);
    } catch (e) {
      console.error(e);
      setApps(prev);
    }
  }

  const byStatus = (s) => apps.filter((a) => a.status === s);

  const visible = statusFilter ? apps.filter((a) => a.status === statusFilter) : apps;

  const chipStyle = (active) => ({
    background: active ? A.ink : A.page,
    border: `1px solid ${active ? A.ink : A.line}`,
    borderRadius: 9,
    padding: "7px 13px",
    fontSize: 12.5,
    fontWeight: 700,
    color: active ? A.page : A.body,
    cursor: "pointer",
    transition: "background .18s, color .18s, border-color .18s",
    whiteSpace: "nowrap",
  });

  const fieldLabel = {
    fontFamily: A.mono,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: A.faint,
  };

  const fieldInput = {
    width: "100%",
    marginTop: 8,
    background: A.page,
    border: `1px solid ${A.line}`,
    borderRadius: 11,
    padding: "12px 13px",
    fontSize: 14,
    color: A.ink,
    outline: "none",
    transition: "background .2s,border-color .2s",
  };

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
          <div
            style={{
              fontFamily: A.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: A.faint,
            }}
          >
            Tracker
          </div>
          <h1
            style={{
              fontFamily: A.display,
              fontSize: "clamp(28px,3.4vw,40px)",
              lineHeight: 1.04,
              letterSpacing: "-.035em",
              fontWeight: 700,
              margin: "12px 0 0",
              color: A.ink,
            }}
          >
            Every application in one place.
          </h1>
          <p style={{ margin: "9px 0 0", fontSize: 15, color: A.muted }}>
            A running list of everything you have applied to.
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="v3-btn-dark"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            background: A.ink,
            border: "none",
            borderRadius: 12,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 700,
            color: A.page,
            cursor: "pointer",
          }}
        >
          + Add application
        </button>
      </div>

      {/* ---------------- ADD FORM ---------------- */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          style={{
            marginTop: 22,
            background: "#fff",
            border: `1px solid ${A.line}`,
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            animation: "riseIn .3s cubic-bezier(.2,.7,.2,1) both",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 14,
              alignItems: "end",
            }}
          >
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Company</span>
              <input
                placeholder="Acme Inc."
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Role</span>
              <input
                placeholder="Backend Engineer"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="v3-field"
                style={fieldInput}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: A.brand,
                border: "none",
                borderRadius: 11,
                padding: 13,
                fontSize: 14,
                fontWeight: 700,
                color: A.page,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
          {err && (
            <div style={{ marginTop: 12, fontSize: 13, color: A.clay }}>{err}</div>
          )}
        </form>
      )}

      {/* ---------------- COUNT ---------------- */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#fff",
          border: `1px solid ${A.line}`,
          borderRadius: 18,
          padding: "20px 22px",
          boxShadow: "0 1px 2px rgba(15,23,42,.04)",
          animation: "riseIn .5s cubic-bezier(.2,.7,.2,1) .08s both",
        }}
      >
        <div
          style={{
            fontFamily: A.mono,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: A.ink,
            lineHeight: 1,
          }}
        >
          {loading ? "—" : apps.length}
        </div>
        <div
          style={{
            fontFamily: A.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: A.faint,
          }}
        >
          Applications
          <br />
          submitted
        </div>
      </div>

      {/* ---------------- STATUS FILTER ---------------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 18,
        }}
      >
        <button onClick={() => setStatusFilter("")} style={chipStyle(!statusFilter)}>
          All {apps.length}
        </button>
        {COLS.map((c) => {
          const n = apps.filter((a) => a.status === c.k).length;
          const active = statusFilter === c.k;
          return (
            <button
              key={c.k}
              onClick={() => setStatusFilter(active ? "" : c.k)}
              style={{
                ...chipStyle(active),
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.hex,
                  flexShrink: 0,
                }}
              />
              {c.label} {n}
            </button>
          );
        })}
      </div>

      {/* ---------------- LIST ---------------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {loading ? (
          <div
            style={{
              background: "#fff",
              border: `1px solid ${A.line}`,
              borderRadius: 16,
              padding: 40,
              textAlign: "center",
              color: A.faint,
            }}
          >
            <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} />
          </div>
        ) : visible.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: `1px dashed ${A.lineMid}`,
              borderRadius: 20,
              padding: "56px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: A.display,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: A.ink,
              }}
            >
              {statusFilter ? "Nothing at this stage" : "No applications tracked yet"}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: A.muted }}>
              {statusFilter
                ? "Pick another stage, or clear the filter."
                : "Add one above, or mark a job as applied from your matches."}
            </p>
          </div>
        ) : (
          visible.map((a, i) => {
            const col = COLS.find((c) => c.k === a.status);
            const score = a.match_score;
            return (
              <div
                key={a.id}
                className="v3-approw"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  background: "#fff",
                  border: `1px solid ${A.line}`,
                  borderRadius: 16,
                  padding: "15px 18px",
                  boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                  animation: `riseIn .55s cubic-bezier(.2,.7,.2,1) ${i * 55}ms both`,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "#F3F6FD",
                    border: `1px solid ${A.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: A.display,
                    fontSize: 15,
                    fontWeight: 700,
                    color: A.ink,
                    flexShrink: 0,
                  }}
                >
                  {(a.company || "?").trim().charAt(0).toUpperCase() || "?"}
                </div>

                <div style={{ minWidth: 150, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: A.ink }}>
                    {a.role}
                  </div>
                  <div style={{ fontSize: 12.5, color: A.muted, marginTop: 2 }}>
                    {a.company}
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: A.mono,
                    fontSize: 12,
                    color: A.muted,
                    minWidth: 104,
                  }}
                >
                  {formatWhen(a.applied_at || a.created_at)}
                </span>

                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: col?.hex || A.faint,
                      flexShrink: 0,
                    }}
                  />
                  <select
                    value={a.status}
                    onChange={(e) => moveStatus(a.id, e.target.value)}
                    aria-label={`Status for ${a.role}`}
                    style={{
                      background: A.page,
                      border: `1px solid ${A.line}`,
                      borderRadius: 9,
                      padding: "6px 9px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: A.body,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <span
                  style={{
                    fontFamily: A.mono,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: score ? matchHex(score) : A.faint,
                    minWidth: 40,
                    textAlign: "right",
                  }}
                >
                  {score ? `${score}%` : "—"}
                </span>

                <button
                  onClick={() => remove(a.id)}
                  aria-label={`Remove ${a.role}`}
                  className="v3-removebtn"
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: 9,
                    padding: 7,
                    cursor: "pointer",
                    color: A.faint,
                    display: "inline-flex",
                    transition: "background .18s,color .18s",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
