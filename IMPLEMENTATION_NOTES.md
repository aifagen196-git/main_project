# Matching Engine Upgrade — July 2026

Implemented from the 24-repo comparative analysis. All changes verified by
`node backend/scripts/evalMatching.js` (must pass before shipping scorer changes).

## Phase 1 — Judge calibration (prompts.js, matching.service.js)
- Rubric-anchored JUDGE_SYSTEM with explicit score bands (jobsensei pattern).
- Untrusted-scraped-data guard: instructions inside JD text are never commands.
- Heuristic baseline (score + breakdown) injected into the judge prompt as a
  calibration anchor; judge must justify >20-point deviations (JustHireMe).
- New `red_flags` field: deal-breaker subset of gaps, shown as 🚩 pill in UI.

## Phase 2 — Scorer upgrades (scoreMatch.js, skills.js)
- Soft caps replace hard gates for years/seniority mismatches: jobs stay in
  the feed capped at 30–45 with a visible reason (`cap_reason`, "Stretch" pill).
  US, work-auth, and role-family gates remain hard.
- Data-quality-adaptive weights: sparse collector rows (<2 structured signals)
  shift weight to domain 0.50 + skills 0.25 (ai-resume-matcher pattern).
- normalizeSkills expanded: ~90 new aliases (Jobalytics synonym groups,
  match-line dotted/undotted variants) + conservative suffix stripping.

## Phase 3 — Semantic stage (embeddings.service.js, migration 0007)
- pgvector columns activated (jobs.embedding, resumes.embedding, 1536 dims).
- OpenAI text-embedding-3-small provider, content-hash cached, fails soft:
  set EMBEDDINGS_API_KEY (or OPENAI_API_KEY) to enable; without it the scorer
  runs exactly as before.
- Cosine mapped to a 0..1 component, blended at 0.15 weight (proportionally
  shrinking the others); incremental backfill of MATCH_EMBED_BACKFILL (80)
  missing job vectors per match run.

## Phase 4 — Product layer
- feedbackRanker.js: bounded (±6 pt) personalization rerank learned from the
  user's saved + applied jobs (company / role family / remote / source).
- resume/atsScore.js: deterministic ATS breakdown (keyword 0.55 / skills 0.25 /
  sections 0.20, Resume-Matcher pattern) for the resume-review product.
- scripts/evalMatching.js: ranking regression harness.

## Env vars added
- EMBEDDINGS_API_KEY / EMBEDDINGS_PROVIDER / EMBEDDINGS_MODEL / EMBEDDINGS_DIMS
- MATCH_EMBED_BACKFILL (default 80)
