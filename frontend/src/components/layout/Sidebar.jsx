import { useLocation, useNavigate } from "react-router-dom";
import { NAV } from "../../data/constants";
import { PLAN_LABEL, isPaidPlan } from "../../utils/plan";

/* Exact port of the "AIFAGen v3" app sidebar. The spec drops icons in favour
   of a status dot per item, an active state that inverts to the ink pill, and
   a mono count on the right. Static properties are inline; hover, and the
   below-1024px slide-over behaviour, live in the v3 CSS block in AIFAGen.jsx. */

const C = {
  brand: "#6D4AFF",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export default function Sidebar({ open, setOpen, exit, plan, counts = {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const paid = isPaidPlan(plan);

  return (
    <>
      {open && (
        <div
          className="v3-scrim"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(15,23,42,.3)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <aside
        className="v3-sidebar"
        data-open={open ? "1" : "0"}
        style={{
          width: 270,
          flexShrink: 0,
          background: "#fff",
          borderRight: `1px solid ${C.line}`,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <button
          onClick={exit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            height: 74,
            padding: "0 22px",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${C.lineSoft}`,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="AIFAGen"
            style={{ height: 32, width: 32, objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: C.display,
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: "-.03em",
              color: C.ink,
            }}
          >
            AIFAGen
          </span>
        </button>

        <nav
          className="scroll"
          style={{
            position: "relative",
            flex: 1,
            overflowY: "auto",
            padding: "18px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.faint,
              padding: "0 10px 10px",
            }}
          >
            Workspace
          </div>

          {NAV.map((n) => {
            const active = location.pathname === `/${n.id}`;
            const count = counts[n.id];
            return (
              <button
                key={n.id}
                className="v3-navbtn"
                data-active-nav={active ? "1" : "0"}
                onClick={() => {
                  navigate(`/${n.id}`);
                  setOpen(false);
                }}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "11px 12px",
                  border: "none",
                  borderRadius: 12,
                  background: active ? C.ink : "transparent",
                  color: active ? C.page : C.body,
                  fontSize: 14,
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: active ? C.brand : C.lineMid,
                    transition: "background .2s",
                  }}
                />
                <span style={{ flex: 1, textAlign: "left" }}>{n.label}</span>
                <span
                  style={{
                    fontFamily: C.mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: active ? "#A8B3C4" : C.faint,
                  }}
                >
                  {count == null || count === 0 ? "" : count}
                </span>
              </button>
            );
          })}

          <div
            style={{ height: 1, background: C.lineSoft, margin: "14px 10px" }}
          />

          <button
            className="v3-softbtn"
            onClick={() => {
              navigate("/settings");
              setOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "11px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: C.muted,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: C.lineMid,
              }}
            />
            <span style={{ flex: 1, textAlign: "left" }}>Help &amp; Support</span>
          </button>
        </nav>

        <div style={{ padding: 14, flexShrink: 0 }}>
          <div style={{ background: C.ink, borderRadius: 17, padding: 19 }}>
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: C.faint,
              }}
            >
              Current plan
            </div>
            <div
              style={{
                fontFamily: C.display,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: C.page,
                marginTop: 4,
              }}
            >
              {PLAN_LABEL[plan] || "Free"}
            </div>
            <p
              style={{
                margin: "9px 0 0",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: C.faint,
              }}
            >
              {paid
                ? "Manage your subscription and invoices."
                : "Unlock unlimited AI matching, resume optimization and more."}
            </p>
            {!paid && (
              <button
                className="v3-btn-light"
                onClick={() => {
                  navigate("/pricing");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  marginTop: 15,
                  background: C.page,
                  border: "none",
                  borderRadius: 11,
                  padding: 11,
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: C.ink,
                  cursor: "pointer",
                }}
              >
                Upgrade now
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
