import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { getAnalytics } from "../services/analytics";
import { planLimits } from "../utils/plan";

/* Analytics screen in the "AIFAGen v3" design language.
 *
 * Every figure here is derived server-side from the user's own applications
 * (see backend/src/routes/analytics.routes.js). This page previously rendered
 * a hardcoded fixture module presenting invented numbers as the user's real
 * history; that module is gone.
 */

const A = {
  brand: "#6D4AFF",
  ochre: "#F59E0B",
  clay: "#F43F5E",
  slate: "#334155",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  track: "#EDF0F8",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const STATUS_META = {
  applied: { label: "Applied", color: A.brand },
  interviewing: { label: "Interviewing", color: A.ochre },
  assessment: { label: "Assessment", color: A.slate },
  offer: { label: "Offer", color: A.clay },
  rejected: { label: "Closed", color: A.faint },
};

const kicker = {
  fontFamily: A.mono,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: A.faint,
};

const card = (delay = 0) => ({
  minWidth: 0,
  background: "#fff",
  border: `1px solid ${A.line}`,
  borderRadius: 20,
  padding: 26,
  boxShadow: "0 1px 2px rgba(15,23,42,.04)",
  animation: `riseIn .6s cubic-bezier(.2,.7,.2,1) ${delay}ms both`,
});

/** Signed percentage, or null when there's no prior period to compare to. */
function Delta({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span
      style={{
        fontFamily: A.mono,
        fontSize: 11,
        fontWeight: 700,
        color: up ? A.brand : A.clay,
      }}
    >
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function StatTile({ label, value, suffix, delta, i }) {
  return (
    <div style={{ ...card(80 + i * 55), padding: 20 }}>
      <div style={kicker}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
        <span
          style={{
            fontFamily: A.mono,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: A.ink,
            lineHeight: 1,
          }}
        >
          {value}
          {suffix}
        </span>
        <Delta value={delta} />
      </div>
    </div>
  );
}

export default function Analytics({ plan }) {
  const navigate = useNavigate();
  const allowed = planLimits(plan).advancedAnalytics;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let active = true;
    getAnalytics()
      .then((d) => active && setData(d))
      .catch((e) => active && setErr(e.message || "Could not load analytics."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [allowed]);

  const header = (
    <div style={{ animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both" }}>
      <div style={{ ...kicker, fontSize: 10, letterSpacing: ".16em" }}>Analytics</div>
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
        How your search is going.
      </h1>
      <p style={{ margin: "9px 0 0", fontSize: 15, color: A.muted }}>
        Measured from the applications you've tracked.
      </p>
    </div>
  );

  // ---- Plan gate ---------------------------------------------------------
  if (!allowed) {
    return (
      <div>
        {header}
        <div
          style={{
            ...card(80),
            marginTop: 26,
            background: A.ink,
            border: "none",
            color: A.page,
            textAlign: "center",
            padding: "56px 26px",
          }}
        >
          <div style={{ ...kicker, color: A.faint }}>Professional</div>
          <div
            style={{
              fontFamily: A.display,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-.03em",
              margin: "12px 0 0",
            }}
          >
            Analytics is part of Professional
          </div>
          <p
            style={{
              margin: "10px auto 0",
              maxWidth: "34em",
              fontSize: 14,
              lineHeight: 1.6,
              color: A.faint,
            }}
          >
            See your response rate, interview conversion and where your
            applications actually come from — measured from your own tracked
            applications, not estimates.
          </p>
          <button
            onClick={() => navigate("/pricing")}
            className="v3-btn-light"
            style={{
              marginTop: 22,
              background: A.page,
              border: "none",
              borderRadius: 11,
              padding: "13px 24px",
              fontSize: 13.5,
              fontWeight: 700,
              color: A.ink,
              cursor: "pointer",
            }}
          >
            See plans
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {header}
        <div style={{ ...card(80), marginTop: 26, textAlign: "center", color: A.faint }}>
          Loading your numbers…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div>
        {header}
        <div
          style={{
            ...card(80),
            marginTop: 26,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
            Couldn't load analytics
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#92400E" }}>{err}</p>
        </div>
      </div>
    );
  }

  const t = data?.totals;
  const hasData = t && t.applications > 0;

  // ---- Empty state -------------------------------------------------------
  if (!hasData) {
    return (
      <div>
        {header}
        <div
          style={{
            background: "#fff",
            border: `1px dashed ${A.lineMid}`,
            borderRadius: 20,
            padding: "64px 24px",
            textAlign: "center",
            marginTop: 26,
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
            Nothing to measure yet
          </div>
          <p style={{ margin: "8px 0 18px", fontSize: 14, color: A.muted }}>
            Track an application and your response rate, interview conversion
            and trends start showing up here.
          </p>
          <button
            onClick={() => navigate("/matches")}
            style={{
              background: A.ink,
              border: "none",
              borderRadius: 11,
              padding: "12px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              color: A.page,
              cursor: "pointer",
            }}
          >
            Browse matches
          </button>
        </div>
      </div>
    );
  }

  const funnelMax = Math.max(...data.funnel.map((f) => f.count), 1);
  const sourceTotal = data.sources.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div>
      {header}

      {/* ---- Stat tiles ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))",
          gap: 16,
          marginTop: 26,
        }}
      >
        <StatTile label="Applications" value={t.applications} delta={data.deltas.applications} i={0} />
        <StatTile label="Response rate" value={t.responseRate} suffix="%" i={1} />
        <StatTile label="In interview" value={t.interviews} delta={data.deltas.interviews} i={2} />
        <StatTile label="Offers" value={t.offers} delta={data.deltas.offers} i={3} />
        <StatTile
          label="Avg. response"
          value={t.avgResponseDays === null ? "—" : t.avgResponseDays}
          suffix={t.avgResponseDays === null ? "" : "d"}
          i={4}
        />
      </div>

      {/* ---- Trend ---- */}
      <div style={{ ...card(300), marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={kicker}>Cumulative over 8 weeks</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: A.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: A.brand }} />
              Applications
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: A.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: A.ochre }} />
              In interview
            </span>
          </div>
        </div>

        <div style={{ width: "100%", height: 230, marginTop: 18 }}>
          <ResponsiveContainer>
            <AreaChart data={data.trend} margin={{ left: -22, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="anaA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A.brand} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={A.brand} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anaI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A.ochre} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={A.ochre} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={A.lineSoft} vertical={false} />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 10.5, fill: A.faint }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: A.faint }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: `1px solid ${A.line}`,
                  borderRadius: 12,
                  fontSize: 12.5,
                  boxShadow: "0 18px 40px -28px rgba(15,23,42,.4)",
                }}
              />
              <Area
                type="monotone"
                dataKey="a"
                name="Applications"
                stroke={A.brand}
                strokeWidth={2.5}
                fill="url(#anaA)"
              />
              <Area
                type="monotone"
                dataKey="i"
                name="In interview"
                stroke={A.ochre}
                strokeWidth={2.5}
                fill="url(#anaI)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Funnel + sources ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={card(360)}>
          <div style={kicker}>Pipeline by stage</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {data.funnel.map((f, i) => {
              const meta = STATUS_META[f.status] || { label: f.status, color: A.faint };
              return (
                <div key={f.status}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: A.body,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: meta.color,
                      }}
                    />
                    {meta.label}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: A.mono,
                        fontWeight: 700,
                        color: A.ink,
                      }}
                    >
                      {f.count}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 20,
                      background: A.track,
                      marginTop: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(f.count / funnelMax) * 100}%`,
                        borderRadius: 20,
                        background: meta.color,
                        transformOrigin: "left",
                        animation: `sweep .6s cubic-bezier(.2,.7,.2,1) ${i * 70}ms both`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={card(420)}>
          <div style={kicker}>Where they came from</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {data.sources.map((s, i) => (
              <div key={s.name}>
                <div style={{ display: "flex", fontSize: 13, color: A.body }}>
                  {s.name}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: A.mono,
                      fontWeight: 700,
                      color: A.ink,
                    }}
                  >
                    {s.count}
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 20,
                    background: A.track,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(s.count / sourceTotal) * 100}%`,
                      borderRadius: 20,
                      background: i === 0 ? A.brand : A.slate,
                      transformOrigin: "left",
                      animation: `sweep .6s cubic-bezier(.2,.7,.2,1) ${i * 70}ms both`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {data.topCompanies.length > 0 && (
            <>
              <div style={{ ...kicker, marginTop: 26 }}>Most applied to</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                {data.topCompanies.map((c) => (
                  <div
                    key={c.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: `1px solid ${A.page}`,
                      fontSize: 13.5,
                      color: A.body,
                    }}
                  >
                    {c.name}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: A.mono,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: A.muted,
                      }}
                    >
                      {c.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
