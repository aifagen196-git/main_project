# Architecture

## The big picture

```
 Browser (website, admin console)
      |  only ever calls  /api/...
      v
 Express API (backend/) ----> Supabase  (Postgres, Auth, Storage)  using the secret key
      |                  ---> Razorpay  (orders, payment checks; webhook comes back in)
      |                  ---> AI providers (Claude, Groq, Gemini)
      |
 Collectors (separate repo, GitHub Actions) ----> Supabase  (fills the jobs table)
```

The website and admin console never contain a Supabase address or key. Everything goes
through the API, which holds the secret key, so the browser can be treated as untrusted.

## Sign-in and permissions

1. The browser posts email and password to `/api/auth/login`; the API signs in with
   Supabase Auth and returns a session (access token, refresh token). The website keeps
   it in `localStorage` (`aifagen.session`) and refreshes it in the background
   (`frontend/src/lib/authClient.js`). Tokens are sent as `Authorization: Bearer ...`
   (not cookies), which is why cross-site request forgery does not apply.
2. Every protected route runs `requireAuth`, which asks Supabase to validate the token
   (`auth.getUser`). Anonymous Supabase accounts are refused.
3. Further checks are chained per route in `backend/src/app.js` (read it top to bottom;
   the order matters):

| Check | Meaning |
|---|---|
| `requireVerified` | email address confirmed |
| `requireActivePlan` | plan is `basic`/`premium`, status `active`/`trialing`, end date not passed (cached 60 s, never past the end date) |
| `requireAdmin` | the user is in the `admins` table **and** the session passed the authenticator-app step (`aal2`) |
| rate limiters | per user for signed-in routes, per IP for sign-in routes (Caddy sets `X-Forwarded-For` to the real IP; the API container isn't reachable otherwise), plus per-account limits on wrong passwords, codes and emails (see `docs/API.md`) |

Supabase sees every sign-in coming from this server, so the API passes the visitor's IP
in `Sb-Forwarded-For`; Supabase uses it for its own per-IP limits once "IP address
forwarding" is on (Authentication, Rate Limits) and the server uses the `sb_secret_` key.
Changing a password needs the current one, except within an hour of a reset link.

4. The database is a second wall: row-level security is on and client write grants are
   revoked (migration 0020). Plan columns on `profiles` are protected by a trigger, so
   only the API (secret key) can change a plan.

Admins use a second factor (TOTP via Supabase Auth): `/api/auth/mfa`, `/mfa/enroll`,
`/mfa/verify`. A lost phone is fixed in Supabase (Authentication, Users, the user, MFA).

## Plans, trial and payments

- Plans: `none`, `basic`, `premium` (locked by migration 0022). One monthly Basic plan
  and one-time Basic and Premium payments. **Nothing renews automatically**: a plan
  simply ends on `profiles.current_period_end`.
- **Free trial** (`POST /api/payments/trial`): Basic features, status `trialing`, exactly
  7 days. One per account and one per sign-up mobile number (`trial_claims`, migration
  0026). No payment details are taken.
- **Paying**: `POST /api/payments/order` creates a Razorpay order whose price comes
  from the server (`razorpay.service.js`, never from the browser). After checkout the
  browser calls `/verify`; Razorpay also calls `/api/payments/webhook`. Both end in
  `activatePaidPlan()` (`routes/payments.routes.js`), which applies a payment once
  (keyed on the payment id). The plan bought applies right away and its time is added
  **after** any time left, free trial or paid (`paidTimeStartsAt`), so paying early
  never loses days and customers can extend their current plan. Basic can't be ordered
  while Premium runs (`PLAN_INCLUDED`).
- Webhook signatures are verified against `RAZORPAY_WEBHOOK_SECRET`; a failed handler
  returns 500 so Razorpay retries, and the idempotent activation makes retries safe.
- Manual / cash payments are only *recorded* by admins (`manual_payments`); they do not
  switch a plan on. Admins change plans with the Users page.

## Resumes

`POST /api/resumes` (`routes/resumes.routes.js`): checks file type from the real header
(PDF or DOCX, 10 MB), guards against zip bombs (DOCX) and long PDFs (20 pages), extracts
text, runs one AI call that returns the structured profile and an ATS analysis (counts
toward the daily AI limit: 20 a day on Basic and trial, unlimited on Premium; enforced by
the `consume_ai_usage` database function), then applies the **ownership rules**
(`services/resume/resumeOwnership.js`): the name on the resume must match the account's
name, and the resume's field must fit the account's area of interest (30 areas; "Others"
accepts any). Each account keeps its latest 10 resumes.

Name, mobile and area of interest are **admin-only fields**; users cannot edit them.

## Matching

`services/jobs/matching.service.js`: loads the user's latest resume profile and the
live job pool, drops jobs that fail hard rules (role family, seniority, location), scores
the rest, asks an AI judge about the top few, and caches the result per user for 30
minutes. A user with no resume gets no matches. Before changing the scoring, run
`npm run test:matching` in `backend/`: it checks that relevant jobs still outrank
irrelevant ones for a set of sample candidates (it also runs in CI).

## Jobs and the collectors

The `jobs` table is filled by the collectors repo (about 45 sources: ATS boards,
aggregators, scrapers). Each run writes a row to `collector_runs`. Two nightly cron jobs
in Supabase delete old and deactivated jobs; since migration 0030 "old" is measured from
the last successful collector run, so a stopped collector cannot empty the site. The
admin Collectors page shows per-source status and warns after 12 hours with no run.

## Database

Tables: `profiles` (one per user; plan, trial, area, mobile), `resumes`, `applications`,
`saved_jobs`, `user_job_preferences`, `jobs`, `internal_jobs`, `ai_usage`, `admins`,
`admin_audit_log`, `collector_runs`, `manual_payments`, `trial_claims`
(`user_job_preferences` is no longer used: matching works from the resume only). Storage buckets:
`resumes` (private, PDF/DOCX) and `avatars` (public images). `supabase/migrations/` is the
full history; run in order, never edit a file that has been run. The sign-up trigger
`handle_new_user` copies name, mobile and area into `profiles` and drops unknown areas.

## Website structure

- `AIFAGen.jsx` is the root: it switches between the marketing site, sign-in, password
  reset, the plan picker and the signed-in app (`components/layout/AppShell.jsx`).
- The landing page is `components/landing/LandingPage.jsx`, one file per section (Hero,
  Features, HowItWorks, PricingSection, FAQ, JoinSection ...); its colours and type are
  in `theme.js`, its animations in `motion.js`. Global CSS beyond Tailwind is in
  `styles/app.css` (loaded after `index.css`).
- Signed-in screens are lazy-loaded pages in `pages/`; each page is wrapped in an error
  boundary so one crash does not blank the app.
- All network calls go through `services/` (`api.js` adds the token, refreshes it on
  401, and turns 402/403 into a profile refresh).
- `utils/plan.js` holds plan rules and the plan cards shown on both the landing page and
  the in-app plan picker; `utils/areas.js` the area list; `data/site.js` the contact
  email, phone, offices, social links and the WhatsApp community link.
- Inner marketing pages (About, Services, Contact, legal pages ...) share
  `components/marketing/SiteHeader.jsx` and `SiteFooter.jsx`; the landing page uses
  the footer in its compact form. Pages are picked from `MARKETING_PAGES` in
  `AIFAGen.jsx`.
- The production build gets a Content-Security-Policy meta tag (`vite.config.js`); if the
  site starts using a new outside service, add it there or the browser will block it.

## Settings

Backend (`backend/.env`; examples in `backend/.env.example`):

| Setting | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | database access; the secret key never leaves the server |
| `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `SITE_URL` | server port, mode, allowed website origins, address used in emailed links |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_CURRENCY` | payments |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_JUDGE_MODEL`, `ANTHROPIC_MAX_RETRIES` | Claude (first choice) |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_TIMEOUT_MS`, `GEMINI_API_KEY`, `GEMINI_MODEL` | fallback AI providers |
| `EMBEDDINGS_PROVIDER`, `EMBEDDINGS_API_KEY`, `EMBEDDINGS_MODEL`, `EMBEDDINGS_DIMS`, `OPENAI_API_KEY` | optional semantic scoring |
| `MATCH_*`, `MAX_POSTING_AGE_DAYS` | matching tuning (cache minutes, pool size, judge count) |
| `AI_MODEL_PRICES` | per-model prices for the admin AI cost page |
| `GITHUB_TOKEN`, `COLLECTORS_REPO`, `COLLECTORS_WORKFLOW`, `COLLECTORS_REF` | lets the admin start a collector run |

Website (`frontend/.env`): only `VITE_API_URL`, and only when the API is on another
address. Never put a secret in a `VITE_` setting; it ends up in the public JavaScript.

## Where the security controls are

| Control | Where |
|---|---|
| Input escaping in searches | `admin.routes.js`, `matching.service.js` (characters stripped before `.or()` filters) |
| Upload checks | `resumes.routes.js`, `profile.routes.js` (avatars) |
| Rate limits and per-account caps | `middleware/rateLimiter.js`; caps in `applications`, `savedJobs`, `resumes` routes |
| Generic error messages | `app.js` error handler, `utils/dbError.js` |
| Webhook signature | `services/payments/razorpay.service.js` |
| Security headers | Caddyfile (HSTS etc.), CSP in `frontend/vite.config.js`, helmet in `app.js` |
| Request log without search terms | `app.js` (morgan) |
