import { useState } from "react";
import { MessageSquare, Menu } from "lucide-react";
import { V3 } from "./theme";

function V3Logo({ size = 34, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
      <img
        src="/logo.png"
        alt="AIFAGen"
        style={{ height: size, width: size, objectFit: "contain" }}
      />
      {children}
    </div>
  );
}

export default function LandingNav({ enter }) {
  const [open, setOpen] = useState(false);
  const scrollTo = (e, id) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 74,
      behavior: "smooth",
    });
  };
  const LINKS = [
    ["Features", "features"],
    ["How it works", "how-it-works"],
    ["FAQ", "faq"],
  ];
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "var(--nav-bg)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${V3.line}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 clamp(16px,4vw,24px)",
          height: 74,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <V3Logo size={34}>
          <span
            style={{
              fontFamily: V3.display,
              fontSize: "clamp(19px,3vw,23px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              whiteSpace: "nowrap",
              color: V3.ink,
            }}
          >
            AIFAGen
          </span>
        </V3Logo>

        <nav
          className="v3-narrowhide"
          style={{ display: "flex", alignItems: "center", gap: 26, marginLeft: 18 }}
        >
          {LINKS.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollTo(e, id)}
              className="v3-navlink"
              style={{ fontSize: 14, fontWeight: 600, color: V3.body }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div
          className="v3-hdrbtns"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <a
            href="https://wa.me/918978939314?text=Hi%2C%20I%27m%20interested%20in%20AIFAGen%20and%20would%20like%20to%20connect."
            target="_blank"
            rel="noopener noreferrer"
            className="v3-narrowhide"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "#25D366",
              borderRadius: 11,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            <MessageSquare size={15} />
            Let's Connect
          </a>
          <button
            onClick={enter}
            className="v3-btn-outline"
            style={{
              background: "transparent",
              border: `1px solid ${V3.lineMid}`,
              borderRadius: 11,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: V3.ink,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Login
          </button>
          <button
            className="v3-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${V3.lineMid}`,
              borderRadius: 10,
              padding: 10,
              cursor: "pointer",
              width: 38,
              height: 38,
            }}
          >
            <span style={{ display: "block", width: 16, height: 1.8, background: V3.inverse, margin: "0 auto" }} />
            <span style={{ display: "block", width: 16, height: 1.8, background: V3.inverse, margin: "0 auto" }} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 16px 16px",
            borderTop: `1px solid ${V3.line}`,
            background: "var(--surface)",
          }}
        >
          {LINKS.map(([label, id], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollTo(e, id)}
              style={{
                padding: "12px 6px",
                fontSize: 15,
                fontWeight: 600,
                color: V3.ink,
                borderBottom: i < LINKS.length - 1 ? `1px solid ${V3.lineSoft}` : "none",
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="https://wa.me/918978939314?text=Hi%2C%20I%27m%20interested%20in%20AIFAGen%20and%20would%20like%20to%20connect."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 6px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              background: "#25D366",
            }}
          >
            <MessageSquare size={16} />
            Let's Connect
          </a>
        </nav>
      )}
    </header>
  );
}
