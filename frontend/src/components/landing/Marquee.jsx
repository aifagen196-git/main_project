import { PLACED_AT } from "../../data/companies";
import { V3, v3Kicker } from "./theme";

// Scrolling strip of companies where users have been placed.
export default function Marquee() {
  return (
    <div
      style={{
        borderTop: `1px solid ${V3.line}`,
        borderBottom: `1px solid ${V3.line}`,
        background: "var(--surface-3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            ...v3Kicker(V3.faint),
            letterSpacing: ".14em",
          }}
        >
          Candidates placed at
        </span>
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            maskImage:
              "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "max-content",
              gap: 44,
              animation: "marquee 26s linear infinite",
            }}
          >
            {[...PLACED_AT, ...PLACED_AT].map((name, i) => (
              <span
                key={`${name}-${i}`}
                style={{
                  fontFamily: V3.display,
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "-.02em",
                  color: V3.body,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
