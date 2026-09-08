// processors/normalizeDiceDirect.js
//
// Maps one job-card object extracted from Dice's own rendered search page
// (see collectors/dice.js) into this app's row shape. The input here is
// already a plain object read out of the DOM inside the browser
// (page.evaluate) — this file has no HTML/DOM code of its own, same
// separation normalizeIndeed.js keeps from the Playwright page in
// collectors/indeed.js.
//
// VERIFIED against a real live page (2026-08-24/25, no cost — a direct page
// read, not a paid API). Dice.com's job data isn't in a clean JSON blob the
// way SimplyHired's is (no __NEXT_DATA__ equivalent found) — it renders via
// Next.js Server Components, so this reads the DOM directly instead, using
// stable data-testid/data-id attributes rather than CSS classes (Tailwind
// utility classes on this site are long, auto-generated, and not something
// to build a selector on).
//
// `posted` here is Dice's own relative text ("Today", "3d ago") — converted
// to an approximate ISO timestamp by relativeToISO (processors/
// relativeDate.js), same handling LinkedIn's collector already needed for
// its own relative-date field.

import relativeToISO from "./relativeDate.js";

const BASE_URL = "https://www.dice.com";

export default function normalizeDiceDirect(card) {
  return {
    source: "dice",
    source_job_id: card.dataId || card.dataGuid || "",
    title: card.title || "",
    company: card.company || "",
    location: card.location || "",
    apply_url: card.dataGuid ? `${BASE_URL}/job-detail/${card.dataGuid}` : "",
    salary: card.salary || "",
    posted_date: relativeToISO(card.posted || ""),
    // No detail-page description in this pass — the search card itself
    // carries no snippet text, only a title/company/location/badges (see
    // collectors/dice.js's header). role_family/skills extraction downstream
    // has less to work with here than for SimplyHired/Indeed until a
    // detail-page fetch step is added.
    description: "",
    employment_type: Array.isArray(card.badges) ? card.badges.join(", ") : "",
    is_remote_us: /remote/i.test(card.location || "") || /remote/i.test((card.badges || []).join(" ")),
  };
}
