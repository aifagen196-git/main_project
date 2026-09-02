// collectors/config/usStates.js
//
// US state abbreviations Jobvertise's own search form accepts as `state=`.
// Confirmed live 2026-08-27: the same keyword query returns a completely
// different, non-overlapping 15-item result set per state (e.g.
// state=TX vs no state at all) — Jobvertise's RSS feed has no pagination
// param, so this is the lever for real bulk volume: keyword × state
// combinations instead of one fixed 15-item feed per keyword.

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default US_STATES;
