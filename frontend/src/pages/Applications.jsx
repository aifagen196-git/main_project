import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

import { matchHex } from "../utils/matchHex";
import {
  getApplications,
  addApplication,
  deleteApplication,
  updateApplicationStatus,
  APPLICATION_STATUSES,
} from "../services/applications";

/* Presentation is an exact port of the "AIFAGen v3" tracker screen. The status
   dot and colour the spec computes per row are surfaced here as a read-only
   label, since this page — unlike the mockup — actually manages application
   state. */

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

/** Local (not UTC) YYYY-MM-DD key — grouping by the day the user actually
 * sees on their calendar, not whatever day UTC midnight happens to fall on. */
function dateKey(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // "list" | "calendar"
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));

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

  // M8: move an application between stages. The backend PATCH always
  // worked and updateApplicationStatus() was written — it just had no call
  // site, so status could only ever be set at creation time (which in turn
  // meant the Dashboard's interview/offer counts could never move — M9).
  async function changeStatus(id, status) {
    const prev = apps;
    setApps((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await updateApplicationStatus(id, status);
    } catch (e) {
      console.error(e);
      setErr(e.message);
      setApps(prev);
    }
  }

  const byStatus = (s) => apps.filter((a) => a.status === s);

  // Search filters the tracker itself (company + role), not the job pool —
  // this page only ever shows applications the user has already logged.
  const term = search.trim().toLowerCase();
  const visible = apps.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (!term) return true;
    return (
      (a.company || "").toLowerCase().includes(term) ||
      (a.role || "").toLowerCase().includes(term)
    );
  });

  // Group every application by the local calendar day it was applied on
  // (applied_at, already set server-side at insert time).
  const appsByDate = useMemo(() => {
    const map = {};
    for (const a of apps) {
      const raw = a.applied_at || a.created_at;
      if (!raw) continue;
      const key = dateKey(new Date(raw));
      (map[key] ||= []).push(a);
    }
    return map;
  }, [apps]);

  const calGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: new Date(year, month, i - startOffset + 1), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return cells;
  }, [calMonth]);

  const selectedApps = appsByDate[selectedDate] || [];
  const todayKey = dateKey(today);

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "inline-flex",
              background: A.page,
              border: `1px solid ${A.line}`,
              borderRadius: 12,
              padding: 4,
            }}
          >
            <button
              onClick={() => setView("list")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "9px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: view === "list" ? A.ink : "transparent",
                color: view === "list" ? A.page : A.body,
                transition: "background .18s, color .18s",
              }}
            >
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "9px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: view === "calendar" ? A.ink : "transparent",
                color: view === "calendar" ? A.page : A.body,
                transition: "background .18s, color .18s",
              }}
            >
              Calendar
            </button>
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

      {view === "list" && (
      <>
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

      {/* ---------------- SEARCH ---------------- */}
      <div style={{ position: "relative", marginTop: 18 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your applications by company or role…"
          aria-label="Search applications"
          className="v3-search"
          style={{
            width: "100%",
            background: "#fff",
            border: `1px solid ${A.line}`,
            borderRadius: 14,
            padding: "14px 44px 14px 42px",
            fontSize: 14.5,
            color: A.ink,
            outline: "none",
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            transition: "background .2s,border-color .2s,box-shadow .2s",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 11,
            height: 11,
            border: `1.8px solid ${A.faint}`,
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
            background: A.faint,
            transform: "rotate(45deg)",
            transformOrigin: "left center",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
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
              color: A.faint,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Spell out the filtered count while a search is narrowing the list. */}
      {term && !loading && (
        <div
          style={{
            marginTop: 16,
            fontFamily: A.mono,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: A.faint,
          }}
        >
          {visible.length} of {apps.length} matching “{search.trim()}”
        </div>
      )}

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
              {term
                ? "No matching applications"
                : statusFilter
                  ? "Nothing at this stage"
                  : "No applications tracked yet"}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: A.muted }}>
              {term
                ? `Nothing here matches “${search.trim()}”.`
                : statusFilter
                  ? "Pick another stage, or clear the filter."
                  : "Add one above, or mark a job as applied from your matches."}
            </p>
            {term && (
              <button
                onClick={() => setSearch("")}
                style={{
                  marginTop: 16,
                  background: A.ink,
                  border: "none",
                  borderRadius: 11,
                  padding: "11px 18px",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: A.page,
                  cursor: "pointer",
                }}
              >
                Clear search
              </button>
            )}
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
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                    aria-label={`Status for ${a.role}`}
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: A.body,
                      textTransform: "capitalize",
                      background: "transparent",
                      border: `1px solid ${A.line}`,
                      borderRadius: 8,
                      padding: "4px 6px",
                      cursor: "pointer",
                    }}
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s} style={{ textTransform: "capitalize" }}>
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
      </>
      )}

      {view === "calendar" && (
        <div
          style={{
            marginTop: 24,
            maxWidth: 760,
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 260px",
            gap: 16,
            alignItems: "start",
            animation: "riseIn .4s cubic-bezier(.2,.7,.2,1) both",
          }}
        >
          {/* ---------------- MONTH GRID ---------------- */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${A.line}`,
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: A.display, fontSize: 15, fontWeight: 700, color: A.ink }}>
                {calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <button
                  onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  style={{
                    width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: A.page, border: `1px solid ${A.line}`, borderRadius: 8, cursor: "pointer", color: A.body,
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => {
                    setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(todayKey);
                  }}
                  style={{
                    height: 26, padding: "0 10px", background: A.page, border: `1px solid ${A.line}`,
                    borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, color: A.body,
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  aria-label="Next month"
                  style={{
                    width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: A.page, border: `1px solid ${A.line}`, borderRadius: 8, cursor: "pointer", color: A.body,
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  style={{
                    textAlign: "center", fontFamily: A.mono, fontSize: 9, fontWeight: 700,
                    letterSpacing: ".08em", textTransform: "uppercase", color: A.faint, padding: "3px 0",
                  }}
                >
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {calGrid.map(({ date, inMonth }) => {
                const key = dateKey(date);
                const dayApps = appsByDate[key] || [];
                const isSelected = key === selectedDate;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    style={{
                      aspectRatio: "1",
                      maxHeight: 52,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textAlign: "left",
                      padding: 4,
                      borderRadius: 9,
                      cursor: "pointer",
                      background: isSelected ? "#F3F0FF" : "#fff",
                      border: `1px solid ${isSelected ? A.brand : A.line}`,
                      opacity: inMonth ? 1 : 0.4,
                      transition: "background .15s, border-color .15s",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        width: 16, height: 16,
                        alignItems: "center", justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: 10, fontWeight: 700,
                        background: isToday ? A.brand : "transparent",
                        color: isToday ? "#fff" : A.ink,
                      }}
                    >
                      {date.getDate()}
                    </span>
                    {dayApps.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {dayApps.slice(0, 3).map((a) => {
                          const col = COLS.find((c) => c.k === a.status);
                          return (
                            <span
                              key={a.id}
                              style={{ width: 5, height: 5, borderRadius: "50%", background: col?.hex || A.faint }}
                            />
                          );
                        })}
                        {dayApps.length > 3 && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: A.faint }}>
                            +{dayApps.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------- SELECTED DAY PANEL ---------------- */}
          <div>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                fontSize: 13.5, fontWeight: 700, color: A.ink,
              }}
            >
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long", month: "long", day: "numeric",
              })}
              <span
                style={{
                  fontFamily: A.mono, fontSize: 11, fontWeight: 700, color: A.faint,
                  background: A.page, border: `1px solid ${A.line}`, borderRadius: 999,
                  padding: "2px 9px",
                }}
              >
                {selectedApps.length}
              </span>
            </div>

            {selectedApps.length === 0 ? (
              <div
                style={{
                  background: "#fff", border: `1px dashed ${A.lineMid}`, borderRadius: 16,
                  padding: "32px 18px", textAlign: "center", fontSize: 13, color: A.muted,
                }}
              >
                No applications on this day.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedApps.map((a) => {
                  const col = COLS.find((c) => c.k === a.status);
                  const score = a.match_score;
                  return (
                    <div
                      key={a.id}
                      style={{
                        background: "#fff", border: `1px solid ${A.line}`, borderRadius: 14,
                        padding: "12px 14px", boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: 9, background: "#F3F6FD",
                            border: `1px solid ${A.line}`, display: "flex", alignItems: "center",
                            justifyContent: "center", fontFamily: A.display, fontSize: 13, fontWeight: 700,
                            color: A.ink, flexShrink: 0,
                          }}
                        >
                          {(a.company || "?").trim().charAt(0).toUpperCase() || "?"}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: A.ink }}>{a.role}</div>
                          <div style={{ fontSize: 11.5, color: A.muted, marginTop: 1 }}>{a.company}</div>
                        </div>
                        <button
                          onClick={() => remove(a.id)}
                          aria-label={`Remove ${a.role}`}
                          style={{
                            background: "transparent", border: "none", borderRadius: 8, padding: 5,
                            cursor: "pointer", color: A.faint, display: "inline-flex", flexShrink: 0,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: col?.hex || A.faint }} />
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: A.body, textTransform: "capitalize" }}>
                            {a.status}
                          </span>
                        </div>
                        <span style={{ fontFamily: A.mono, fontSize: 11.5, fontWeight: 700, color: score ? matchHex(score) : A.faint }}>
                          {score ? `${score}%` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
