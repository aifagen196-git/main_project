# AIFAGen — Job Matching Upgrade

This replaces the single skill-overlap number with a four-stage funnel:

```
upload/collect → [Stage 0] structured extraction (LLM, once)
match request  → [Stage 1] hard gates  (USA / work-auth / experience)
               → [Stage 2] weighted score (skills + role + experience + location + edu)
               → [Stage 4] LLM judge on the top 15 (calibrated score + gap analysis)
```

Stage 3 (embedding retrieval with pgvector) is scaffolded in the migration but
**off by default** — you don't need it to get most of the accuracy. Turn it on
later when your job table is large.

## Files & where they go

| File | Drop into | What it does |
|---|---|---|
| `src/utils/matching/skillNormalizer.js` | new | Canonicalizes skill aliases (Postgres→postgresql, k8s→kubernetes…) |
| `src/utils/matching/calculateMatch.js` | **replaces** existing | Gates + weighted scorer. Keeps a `calculateMatch()` shim for old callers |
| `src/prompts/extractionPrompts.js` | new | Stage 0 prompts + JSON schema for résumé and JD |
| `src/prompts/judgePrompt.js` | new | Stage 4 judge prompt |
| `src/services/profileExtractor.js` | new | Calls your proxy, validates + defaults the structured output |
| `src/services/matchingService.js` | **replaces** existing | Orchestrates the whole funnel; returns the UI's shape |
| `supabase/migrations/0002_matching.sql` | new | Adds `profile` jsonb + gate columns (+ optional pgvector) |
| `supabase/functions/claude-proxy/index.ts` | **replaces** existing | Configurable reliable model + JSON-object mode |

## Wiring it in (3 edits beyond dropping files)

**1. Run extraction when a résumé is uploaded.** In `src/services/resume.js`,
after you have the résumé text (you already extract it via `resumeExtractor.js`),
call the extractor and persist it:

```js
import { extractResumeProfile } from "./profileExtractor.js";
// ...after extractResumeText(file):
const profile = await extractResumeProfile(text);
await supabase.from("resumes")
  .update({ profile, extracted_skills: profile.skills })
  .eq("file_path", fileName);
```

**2. Extract job skills at collection time** (fixes the empty `skills: []`).
In `job-engine/collectors/greenhouse.js`, replace the `skills: []` line by extracting from
the description before `saveJob`:

```js
import { extractJobProfile } from "../src/services/profileExtractor.js";
// ...
const profile = await extractJobProfile(description);
await saveJob({
  /* ...existing fields... */
  skills: profile.skills_required,
  skills_required: profile.skills_required,
  skills_preferred: profile.skills_preferred,
  role_family: profile.role_family,
  country: profile.country,
  min_years: profile.min_years,
  is_remote_us: profile.is_remote_us,
  profile,
});
```
(The collector runs in Node, not the browser, so point `callClaude` at your
provider directly there, or call OpenRouter inline — it just needs to return the
same JSON.)

**3. Set the model secret** so the proxy stops using the free model:

```bash
supabase secrets set OPENROUTER_MODEL="<a reliable paid model id>"
```

Then `supabase functions deploy claude-proxy` and apply the migration
(`supabase db push`).

## What the UI gets for free

`JobMatches.jsx` already renders `match_score` and `skills`, so it works with no
changes. You now also receive per-job `match_breakdown` (the 0–1 factor scores),
`match_reasons`, `gaps`, and `match_reasoning` for the shortlisted jobs — surface
those to turn a bare "82%" into "82% — strong skills, 1 year light on experience."

## Order to ship (highest ROI first)

1. Deploy the proxy change + set the model. (Fixes silent JSON failures.)
2. Apply the migration.
3. Add job extraction to the collector and re-run it. (Fills empty skills.)
4. Add résumé extraction on upload.
5. Drop in the new `calculateMatch.js` + `matchingService.js`.

After step 5 you have the full gated, weighted, AI-judged funnel. Tune
`DEFAULT_WEIGHTS` and the `RELATED` role-family map in `calculateMatch.js` against
your real data.

## Later: the embedding upgrade (Stage 2)

When you want semantic recall beyond aliases, uncomment the pgvector block in the
migration, embed each `profile` (résumé and job) once with an embedding model,
store the vector, and rank survivors by cosine distance before the judge. The
funnel doesn't otherwise change — embeddings just replace/augment the keyword
skill factor as the cheap recall stage.
