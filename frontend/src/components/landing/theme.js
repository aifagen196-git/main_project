/* Landing page design tokens.
   Exact port of the "AIFAGen v3" design. Palette, type ramp, spacing and
   motion are taken verbatim from the spec, so static properties are written
   inline rather than as Tailwind utilities — the spec leans on clamp() and
   precise hex values that don't map cleanly onto the token scale. Hover and
   keyframe rules live in styles/app.css. */

// Theme tokens. Brand/accent hues are constant across themes; surfaces, ink
// and lines resolve through the CSS variables in index.css so the whole
// marketing + app shell follows the Appearance setting.
export const V3 = {
  brand: "#6D4AFF",
  ochre: "#F59E0B",
  clay: "#F43F5E",
  track: "var(--surface-3)",
  // Cards designed to be dark in the light theme stay dark in the dark
  // theme — flipping them with the surface would invert the intent.
  inverse: "var(--inverse)",
  onInverse: "var(--on-inverse)",

  ink: "var(--ink)",
  page: "var(--surface-2)",
  surface: "var(--surface)",
  line: "var(--line)",
  lineSoft: "var(--line-soft)",
  lineMid: "var(--line)",
  body: "var(--ink-2)",
  muted: "var(--ink-2)",
  faint: "var(--ink-3)",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const v3Kicker = (color) => ({
  fontFamily: V3.mono,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color,
});

export const v3Score = (score) =>
  score >= 80 ? V3.brand : score >= 60 ? V3.ochre : V3.clay;

// Section headings.
export const h2Style = {
  fontFamily: V3.display,
  fontSize: "clamp(30px,3.6vw,46px)",
  lineHeight: 1.05,
  letterSpacing: "-.035em",
  fontWeight: 700,
  margin: "16px 0 0",
};
