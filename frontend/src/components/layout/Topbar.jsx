import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "../../services/auth";

/* Port of the "AIFAGen v3" app topbar. The spec draws the notification glyph
   from bare spans rather than an icon set, so that is reproduced here as-is.
   Hover and focus states live in the v3 CSS block in AIFAGen.jsx.

   The spec's global search box lived here but has been moved: searching is
   now per-page (Job Matches searches the job pool, Applications filters the
   tracker), so each page owns an input scoped to what it actually shows. */

const C = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  mono: "'JetBrains Mono',monospace",
};

const menuItem = {
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  fontWeight: 600,
  color: C.body,
  cursor: "pointer",
};

export default function Topbar({ profile, setOpen }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the profile menu on click-outside or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: 74,
        flexShrink: 0,
        background: "rgba(255,255,255,.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${C.line}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 clamp(16px,3vw,32px)",
      }}
    >
      <button
        className="v3-burger"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: 4,
          background: "transparent",
          border: `1px solid ${C.lineMid}`,
          borderRadius: 10,
          padding: 10,
          cursor: "pointer",
        }}
      >
        <span style={{ display: "block", width: 16, height: 1.8, background: C.ink }} />
        <span style={{ display: "block", width: 16, height: 1.8, background: C.ink }} />
        <span style={{ display: "block", width: 11, height: 1.8, background: C.ink }} />
      </button>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          className="v3-iconbtn"
          aria-label="Notifications"
          style={{
            position: "relative",
            display: "inline-flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "flex-end",
            background: "#fff",
            border: `1px solid ${C.line}`,
            borderRadius: 11,
            padding: 12,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "block", width: 14, height: 1.8, borderRadius: 2, background: C.body }} />
          <span style={{ display: "block", width: 14, height: 1.8, borderRadius: 2, background: C.body }} />
          <span style={{ display: "block", width: 9, height: 1.8, borderRadius: 2, background: C.body }} />
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: C.clay,
              border: "1.5px solid #fff",
            }}
          />
        </button>

        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            className="v3-softbtn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profile menu"
            aria-expanded={menuOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "transparent",
              border: "none",
              borderRadius: 12,
              padding: "5px 8px 5px 5px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: C.brand,
                color: C.page,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: C.mono,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {initials}
            </span>
            <span
              className="v3-narrowhide"
              style={{ fontSize: 14, fontWeight: 700, color: C.ink }}
            >
              {profile?.full_name || "Loading…"}
            </span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 48,
                right: 0,
                width: 264,
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 17,
                boxShadow: "0 24px 54px -28px rgba(15,23,42,.32)",
                padding: 9,
                zIndex: 50,
                animation: "riseIn .22s cubic-bezier(.2,.7,.2,1) both",
              }}
            >
              <div style={{ padding: 12, borderRadius: 13, background: C.page }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profile?.full_name || "User"}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profile?.email || ""}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  marginTop: 8,
                }}
              >
                <button
                  className="v3-softbtn"
                  onClick={() => go("/settings")}
                  style={menuItem}
                >
                  Profile &amp; settings
                </button>
                <button
                  className="v3-softbtn"
                  onClick={() => go("/resume")}
                  style={menuItem}
                >
                  My resume
                </button>
                <button
                  className="v3-dangerbtn"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut().catch(() => {});
                  }}
                  style={{ ...menuItem, color: C.clay }}
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
