// processors/salaryParser.js
//
// Extracts a normalized salary range from free-text (descriptions) or from the
// short pre-formatted strings some ATS feeds already provide
// ("$45 – $65 / hour", "₪80+ / hour", "USD 90k-110k").
//
// ATS-provided structured compensation fields should always be preferred by
// the caller when they exist — this covers everything else.
//
// Currency matters beyond display: a non-USD posting is a strong signal the
// role is not US-based, which the US gate can use.

const SYMBOLS = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "₪": "ILS",
  "₹": "INR",
  "¥": "JPY",
  "₩": "KRW",
  "R$": "BRL",
};
const CODES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "INR", "ILS", "JPY", "SGD", "CHF", "SEK",
  "NOK", "DKK", "PLN", "BRL", "MXN", "NZD", "ZAR", "KRW", "HKD",
]);

// A money amount: optional currency symbol, digits with , separators, optional
// decimals, optional k/K suffix. Kept as one reusable fragment.
const AMOUNT = String.raw`(?:[$£€₪₹¥₩]|R\$)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?([kK])?`;
const SEP = String.raw`\s*(?:-|–|—|to|through)\s*`;

const RANGE_RE = new RegExp(AMOUNT + SEP + AMOUNT, "");
const SINGLE_RE = new RegExp(AMOUNT, "");

const PERIOD_RE =
  /\b(hour|hourly|hr|year|yearly|yr|annual(?:ly)?|annum|month(?:ly)?|week(?:ly)?|day|daily)\b/i;

// Words that mark a number as compensation. Required (within LOOKBEHIND chars
// before the match) when the amount carries no currency symbol and no "k"
// suffix — otherwise any stray figure in a long description reads as pay.
const SALARY_CONTEXT =
  /\b(salary|salaries|compensation|comp|pay|paid|rate|wage|base|earn(?:ings)?|stipend|package|remuneration|range)\b/i;
const LOOKBEHIND = 60;
const LOOKAHEAD = 30;

function periodOf(text) {
  const m = String(text).match(PERIOD_RE);
  if (!m) return null;
  const p = m[1].toLowerCase();
  if (/^(hour|hourly|hr)$/.test(p)) return "hour";
  if (/^(month|monthly)$/.test(p)) return "month";
  if (/^(week|weekly)$/.test(p)) return "week";
  if (/^(day|daily)$/.test(p)) return "day";
  return "year";
}

function currencyOf(text) {
  const s = String(text);
  if (/R\$/.test(s)) return "BRL";
  for (const [sym, code] of Object.entries(SYMBOLS)) {
    if (sym !== "R$" && s.includes(sym)) return code;
  }
  const code = s.match(/\b([A-Z]{3})\b/);
  if (code && CODES.has(code[1])) return code[1];
  return null;
}

function toNumber(digits, kSuffix) {
  const n = Number(String(digits).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return kSuffix ? n * 1000 : n;
}

/**
 * Infer the period when the text doesn't say. Hourly rates and annual salaries
 * are orders of magnitude apart, so the magnitude itself is a reliable tell —
 * far better than defaulting everything to "year" (which turned "$23 / hour"
 * into a $23/year salary).
 */
function inferPeriod(amount) {
  if (amount == null) return "year";
  if (amount < 500) return "hour";
  if (amount < 20000) return "month";
  return "year";
}

/**
 * @param {string} text
 * @returns {{min:number, max:number, period:string, currency:string, isRange:boolean}|null}
 */
export function extractSalary(text = "") {
  const t = String(text);
  if (!t) return null;

  // Scope every signal to the neighbourhood of the matched amount. Scanning
  // the whole blob meant a 40-page description containing the word "month"
  // anywhere turned a stray "1648" into a monthly salary.
  const nearby = (m) => {
    const start = Math.max(0, m.index - LOOKBEHIND);
    const end = m.index + m[0].length + LOOKAHEAD;
    return {
      before: t.slice(start, m.index),
      window: t.slice(start, end),
      after: t.slice(m.index + m[0].length, end),
    };
  };

  // A bare number only counts as pay if it is marked as such: a currency
  // symbol/code on the amount, a "k" suffix, or a salary word just before it.
  const isCompensation = (m, hasK) => {
    const { before, window } = nearby(m);
    if (currencyOf(m[0])) return true;
    if (hasK) return true;
    return SALARY_CONTEXT.test(before) || SALARY_CONTEXT.test(window);
  };

  const range = t.match(RANGE_RE);
  if (range) {
    const min = toNumber(range[1], range[2]);
    let max = toNumber(range[3], range[4]);
    if (min == null || max == null) return null;
    if (!isCompensation(range, Boolean(range[2] || range[4]))) return null;

    const { window } = nearby(range);
    const currency = currencyOf(window) || "USD";
    const statedPeriod = periodOf(window);
    // "$50-60k" shorthand: the first number carries no k but shares the
    // second's magnitude.
    let lo = min;
    if (range[4] && !range[2] && min < max / 100) lo = min * 1000;
    if (max < lo) [lo, max] = [max, lo];
    return {
      min: lo,
      max,
      period: statedPeriod || inferPeriod(lo),
      currency,
      isRange: true,
    };
  }

  const single = t.match(SINGLE_RE);
  if (single) {
    if (!isCompensation(single, Boolean(single[2]))) return null;
    const { window } = nearby(single);
    const currency = currencyOf(window) || "USD";
    const statedPeriod = periodOf(window);
    const val = toNumber(single[1], single[2]);
    if (val == null) return null;
    return {
      min: val,
      max: val,
      period: statedPeriod || inferPeriod(val),
      currency,
      isRange: false,
    };
  }

  return null;
}

/** Convert any period to an approximate annual figure for comparison/sorting. */
export function toAnnual(salary) {
  if (!salary) return null;
  const factor = { hour: 2080, day: 260, week: 52, month: 12, year: 1 }[
    salary.period
  ];
  if (!factor) return null;
  return { min: salary.min * factor, max: salary.max * factor };
}

export default extractSalary;
