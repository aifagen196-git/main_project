import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV } from "../../data/constants";
import { PLAN_LABEL, isPaidPlan } from "../../utils/plan";
import { signOut } from "../../services/auth";

/* Port of the "AIFAGen v3" app sidebar. The spec drops icons in favour of a
   status dot per item, an active state that inverts to the ink pill, and a
   mono count on the right. Static properties are inline; hover, and the
   below-1024px slide-over behaviour, live in the v3 CSS block in AIFAGen.jsx.

   The account block at the bottom came from the spec's topbar. That bar was
   removed — once search moved onto the pages that own it, the only things
   left were this menu and a decorative bell, which did not justify 74px of
   permanent vertical space on every screen. */

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

const acctItem = {
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: 11,
  padding: "10px 12px",
  fontSize: 13.5,
  fontWeight: 600,
  color: C.body,
  cursor: "pointer",
};

export default function Sidebar({ open, setOpen, exit, plan, profile, counts = {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const paid = isPaidPlan(plan);

  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);

  // Close the account menu on click-outside or Escape.
  useEffect(() => {
    if (!acctOpen) return;
    const onDown = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setAcctOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [acctOpen]);

  const goto = (path) => {
    setAcctOpen(false);
    setOpen(false);
    navigate(path);
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

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

        {/* ---------------- ACCOUNT ---------------- */}
        <div
          ref={acctRef}
          style={{
            position: "relative",
            padding: "0 14px 14px",
            flexShrink: 0,
          }}
        >
          {acctOpen && (
            <div
              style={{
                position: "absolute",
                // Sits clear above the trigger. The container's bottom padding
                // is inside its box, so anchor past 100% rather than short of
                // it — otherwise the menu overlaps the button it opened from.
                bottom: "calc(100% + 6px)",
                left: 14,
                right: 14,
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 15,
                boxShadow: "0 24px 54px -28px rgba(15,23,42,.32)",
                padding: 8,
                zIndex: 50,
                animation: "riseIn .2s cubic-bezier(.2,.7,.2,1) both",
              }}
            >
              <button
                className="v3-softbtn"
                onClick={() => goto("/settings")}
                style={acctItem}
              >
                Profile &amp; settings
              </button>
              <button
                className="v3-softbtn"
                onClick={() => goto("/resume")}
                style={acctItem}
              >
                My resume
              </button>
              <button
                className="v3-dangerbtn"
                onClick={() => {
                  setAcctOpen(false);
                  signOut().catch(() => {});
                }}
                style={{ ...acctItem, color: C.clay }}
              >
                Log out
              </button>
            </div>
          )}

          <button
            className="v3-softbtn"
            onClick={() => setAcctOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={acctOpen}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 11,
              background: acctOpen ? C.page : "transparent",
              border: `1px solid ${acctOpen ? C.lineMid : C.line}`,
              borderRadius: 14,
              padding: 10,
              cursor: "pointer",
              transition: "background .18s, border-color .18s",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: C.brand,
                color: C.page,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: C.display,
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </span>
            <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
              <span
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: C.ink,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.full_name || "User"}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 11.5,
                  color: C.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.email || ""}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                fontSize: 10,
                color: C.faint,
                transform: acctOpen ? "rotate(180deg)" : "none",
                transition: "transform .2s",
              }}
            >
              ▲
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
