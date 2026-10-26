# AIFAGen

AI job-matching platform for US IT job seekers: users sign up, upload a resume,
and get ranked job matches, resume feedback and an application tracker. Plans are
paid through Razorpay; a 7-day free trial needs no payment.

| Part | What it is | Where |
|---|---|---|
| Website | React + Vite single-page app (marketing site and the signed-in app) | `frontend/` |
| API | Node.js + Express; the only thing the browser talks to | `backend/` |
| Database, auth, files | Supabase (Postgres, Auth, Storage) | `supabase/migrations/` |
| Admin console | Separate React app for the team, with two-step sign-in | kept outside this repo (see below) |
| Job collectors | Scripts that gather jobs from job boards into the database | separate repo `aifagen196-git/collectors` |

New here? Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) next, then
[docs/API.md](docs/API.md). To deploy, see [DEPLOY.md](DEPLOY.md).

## Run it locally

You need Node.js 22 and a Supabase project (a free one is fine; never use the live
project for experiments).

```bash
# 1. Database: in the Supabase SQL Editor run every file in supabase/migrations/
#    in order (0000 to the latest).

# 2. API
cd backend
cp .env.example .env        # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and at
                            # least one AI key (see docs/ARCHITECTURE.md, Settings)
npm install
npm run dev                 # http://localhost:5000

# 3. Website (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The website finds the API on port 5000 of the same host by default. Open
`http://localhost:5173/?preview` to see the signed-in screens with sample data and no
login (`?preview=none`, `=new`, `=trial`, `=ended` show the plan and trial states).
Preview mode only works in dev builds.

## Tests

```bash
cd backend && npm test         # 21 unit tests, about 3 seconds, no database or keys
cd backend && npm run test:matching   # ranking check: relevant jobs outrank irrelevant ones
cd frontend && npm run build   # the site must compile
```

GitHub runs all three on every push and pull request (`.github/workflows/ci.yml`); a
red cross means do not deploy that version.

The live-database checks in `backend/test/integration/` (sign-up, trial, payments,
uploads, admin two-step sign-in) are run by hand; read its README first, because they
create temporary accounts in the database named in `backend/.env`.

## Folder map

```
backend/src/
  server.js, app.js        start-up; middleware order, route mounting, error handler
  routes/                  one file per area: auth, profile, payments, resumes, jobs ...
  middleware/              requireAuth, requireVerified, requireActivePlan, requireAdmin, rate limits
  services/                business logic: ai/, matching/, jobs/, resume/, payments/
  config/ utils/ prompts/ knowledge/   Supabase client and support address, helpers, AI prompts, skill lists
backend/scripts/           evalMatching.js (npm run test:matching)
backend/test/              unit tests (npm test) and integration/ (by hand)
frontend/src/
  AIFAGen.jsx              root: marketing site / sign-in / plan picker / app
  components/landing/      the home page, one file per section
  pages/                   signed-in screens: Dashboard, JobMatches, Resume, Billing ...
  components/              marketing/ pages (shared SiteHeader, SiteFooter), layout/, common/
  services/                the only code that calls the API (api.js is the base client)
  data/site.js             contact email, phone, offices, social and WhatsApp links
  lib/ hooks/ utils/       sign-in session, hooks, plan rules and area list
supabase/migrations/       database history, numbered; run in order
docs/                      architecture and API reference
Caddyfile, docker-compose.yml, */Dockerfile   production setup
```

## Rules of the house

- **The browser only talks to our API.** No Supabase URL or key in the website; sign-in
  goes through `/api/auth/*`.
- **Secrets live in settings files only** (`.env`, never committed) and GitHub Secrets.
- **Every permission is checked on the server.** The website hides things for
  convenience; the API enforces them.
- **The database blocks direct writes** from the browser (row-level security plus
  revoked grants, migration 0020). All writes go through the API.
- **Changing a price, plan list or area?** Prices are in
  `backend/src/services/payments/razorpay.service.js` and
  `frontend/src/utils/plan.js`; areas are in
  `backend/src/services/resume/resumeOwnership.js`, `frontend/src/utils/areas.js`,
  the admin app's `lib/areas.js` and the sign-up function in the database (migration 0029).
  A unit test fails if the server and website disagree.
- **Changing the contact email, phone, an office, a social link or the WhatsApp link?**
  `frontend/src/data/site.js` only. The API's support address (used in its error
  messages) is `backend/src/config/site.js`.
- **Database changes are new numbered files** in `supabase/migrations/`; never edit one
  that has already been run.
- **Delete, don't comment out.** Unused files and code are removed; git keeps the
  history.

## Naming

| What | Pattern | Example |
|---|---|---|
| React components and pages | `PascalCase.jsx`, one component per file | `SiteFooter.jsx`, `JobMatches.jsx` |
| Hooks | `useThing.js` | `useProfile.js` |
| Website API calls | `services/<area>.js`, plain noun | `services/savedJobs.js` |
| API routes | `routes/<area>.routes.js`, mounted at `/api/<area>` in `app.js` | `savedJobs.routes.js` |
| API business logic | `services/<area>/<thing>.service.js` | `payments/razorpay.service.js` |
| Middleware | `requireThing.js` for checks that can refuse a request | `requireActivePlan.js` |
| Migrations | `NNNN_what_it_does.sql`, next free number | `0030_cleanup_follows_collectors.sql` |
| Constants | `UPPER_SNAKE_CASE` | `SUPPORT_EMAIL`, `PRICING_CARDS` |

A few older API helpers (`resumeOwnership.js`, `scoreMatch.js`, `usage.js`) predate the
`.service.js` rule; leave them unless you are already changing the file.

## The admin console

It is a separate React app (sign in with email, password and an authenticator-app code,
then nine pages: Dashboard, Users, Payments, Jobs, Internal Jobs, Collectors, AI Usage,
Audit Log, System). It is deliberately not in this repository. It calls only
`/api/admin/*`, with `VITE_API_URL` pointing at the API, and never touches Supabase. An
admin is an account listed in the database table `admins`.
