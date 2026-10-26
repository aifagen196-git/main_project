# Deploying AIFAGen

Production runs on one server with Docker Compose: **Caddy** (HTTPS and routing) in
front of an **nginx** container serving the website and a **Node** container running
the API. The database, login and file storage are in Supabase, so the server holds no
user data.

```
browser -> Caddy (443) -+-> frontend (nginx :80)        aifagenlabs.com, www
                        +-> backend  (node :3000)       /api/*  (prefix removed by Caddy;
                                                         the API puts it back, see app.js)
                        api.aifagenlabs.com -> backend  (prefix kept)
```

## Settings

One file, `.env` in the project folder next to `docker-compose.yml`, feeds the API
container (`env_file: .env`). Never commit it. Full list with explanations:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#settings). The ones a deploy needs:

| Setting | Value |
|---|---|
| `SUPABASE_URL` | the project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key (`sb_secret_...`) from Supabase, Settings, API Keys |
| `CORS_ORIGIN` | `https://aifagenlabs.com,https://www.aifagenlabs.com` (add the admin console's address) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | live keys from Razorpay |
| `RAZORPAY_WEBHOOK_SECRET` | a long random value you choose; also entered in Razorpay (below) |
| `RAZORPAY_CURRENCY` | `USD` |
| `ANTHROPIC_API_KEY` (and/or `GROQ_API_KEY`, `GEMINI_API_KEY`) | at least one AI provider |
| `GITHUB_TOKEN` | optional: lets the admin "Start refresh" button run the collectors |

`NODE_ENV=production` and `PORT=3000` are set by `docker-compose.yml`. The WhatsApp
community link is in the website code, not a setting.

## First-time setup

1. Create the Supabase project and run every file in `supabase/migrations/` in order in
   the SQL Editor. In Supabase turn **off** "Allow anonymous sign-ins".
2. Point DNS for `aifagenlabs.com`, `www` and `api` at the server; open ports 80 and 443.
3. Create `.env` as above, then:
   ```bash
   git clone https://github.com/aifagen196-git/main_project.git && cd main_project
   docker compose up -d --build
   ```
   Caddy gets the HTTPS certificates by itself on first start.
4. **Razorpay webhook** (Dashboard, Live mode, Account & Settings, Webhooks, Add):
   URL `https://aifagenlabs.com/api/payments/webhook`, secret = `RAZORPAY_WEBHOOK_SECRET`,
   events `payment.captured` and `order.paid`. This is what switches on a plan when a
   customer closes the page right after paying.
5. Make the first admin: create the account normally, then in the SQL Editor run
   `insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';`
   On first admin sign-in they scan a QR code with an authenticator app.
6. Collectors: see below.

## Releasing a new version

```bash
git pull origin main
docker compose up -d --build
```

Then check `https://aifagenlabs.com/api/health` says "AIFAGen Backend Running" and that
the latest commit is what you expect: `git log --oneline -1`.

- **Database changes first.** If the release adds files in `supabase/migrations/`, run
  them in the SQL Editor **before** the deploy, in number order.
- **New settings** go into `.env` before the rebuild; changing `.env` alone needs
  `docker compose up -d` to take effect.
- **Rolling back:** `git checkout <previous commit>` then `docker compose up -d --build`.
  Migrations are not undone; they are written to be safe to re-run.
- **Look at the CI result** on GitHub for the commit first (green tick = tests passed).

## Looking after it

```bash
docker compose ps                    # is everything up?
docker compose logs -f backend       # API log (method, path, status; no search terms)
docker compose logs --tail 100 caddy
```

- The nightly job cleanup runs inside Supabase (pg_cron: `cleanup-old-jobs` and
  `cleanup-inactive-jobs`). Since migration 0030 it measures job age from the last
  successful collector run, so it never empties the site if the collectors stop.
- Supabase backups: enable daily backups in the Supabase dashboard.
- Rotating a key: change it in `.env` (and GitHub Secrets for the collectors), then
  `docker compose up -d`. Disable old Supabase keys only after the server uses the new one.

## Collectors (job gathering)

They live in a separate repository, `aifagen196-git/collectors`, and run on GitHub
Actions every 6 hours (`job-engine.yml`). Secrets are set in that repo under Settings,
Secrets and variables, Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY` and the job-board keys named in the workflow file.

A full run takes about two hours, so a **private** repo uses up GitHub's free 2,000
monthly minutes in a few days and GitHub then refuses scheduled runs (jobs go stale).
Keep the collectors repo **public** (free, unlimited), pay for minutes, or run a
self-hosted runner. The admin Collectors page shows a red banner when no run has arrived
for 12 hours, and can start a run if `GITHUB_TOKEN` is set.

## Known leftovers

- `docker-compose.yml` still passes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
  build arguments; the website no longer uses them. Harmless; remove when convenient.
- The production Caddyfile does not set a Content-Security-Policy; the website adds its
  own through the built `index.html` (see `frontend/vite.config.js`).
