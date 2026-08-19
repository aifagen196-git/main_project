# Deploying AIFAGen

Three pieces, three destinations:

| Piece       | Host                    | Why |
|-------------|-------------------------|-----|
| `frontend/` | Vercel                  | Static Vite build, trivial env-var management, free subdomain to start. |
| `backend/`  | Railway                 | Needs a persistent process, not serverless — it keeps an in-memory job-matching cache warm (see `warmJobPoolCache` in `backend/src/server.js`); a serverless cold start would silently reintroduce the ~60s "no job matches" bug this cache exists to prevent. |
| `job-engine/` | GitHub Actions (scheduled workflow) | The collectors are long, sequential CLI scripts, not HTTP handlers — no fit for a serverless duration limit. Already wired up at `.github/workflows/job-engine.yml`. |

Repo-side config for all three is already in place (`frontend/vercel.json`, `backend/railway.toml`, the workflow file). What's left needs your accounts/browser — I can't complete OAuth or create third-party accounts on your behalf.

## 0. Push this repo to GitHub

Neither Vercel nor Railway auto-deploys from a local folder, and the job-engine workflow only runs once it's *on* GitHub.

```bash
# create an empty repo on github.com first, then:
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin master
```

## 1. Deploy the backend first (Railway)

Order matters — the frontend needs the backend's URL, but not vice versa yet.

1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → select this repo.
2. In the service settings, set **Root Directory** to `backend`.
3. Add environment variables (Settings → Variables) — see `backend/.env.example` for the full list with descriptions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `NODE_ENV=production`
   - `CORS_ORIGIN` — leave a placeholder for now (e.g. `https://placeholder.vercel.app`); you'll update it in step 3 once the frontend has a real URL. **Until this is set correctly, every request from the frontend will fail CORS — this looks identical to "the backend is down" in the browser.**
4. Deploy. Railway assigns a domain like `https://your-service.up.railway.app` — copy it, you need it next.
5. Sanity check: `curl https://your-service.up.railway.app/api/health` should return `{"success":true,...}`.

## 2. Deploy the frontend (Vercel)

1. [vercel.com](https://vercel.com) (you already have an account) → New Project → import this repo.
2. Set **Root Directory** to `frontend`. Build command and output directory are already declared in `frontend/vercel.json`.
3. Add environment variables (Settings → Environment Variables) — see `frontend/.env.example`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = the Railway URL from step 1 (e.g. `https://your-service.up.railway.app`, **no trailing slash**)
4. Deploy. Vercel assigns a domain like `https://your-app.vercel.app`.

## 3. Close the loop: point CORS at the real frontend URL

Back in Railway → the backend service → Variables:

- Set `CORS_ORIGIN` to the real Vercel URL from step 2 (e.g. `https://your-app.vercel.app`). Comma-separate multiple origins if you later add a custom domain: `https://your-app.vercel.app,https://aifagenlabs.com`.
- Redeploy the backend service so the new value takes effect.

## 4. Verify end to end

Open the Vercel URL, sign in, and confirm the dashboard loads real data (not the dev preview — `?preview` is compiled out of production builds entirely, so it won't work there regardless). If sign-in or data loading fails, check in this order:

1. Browser console/network tab — a CORS error means step 3 wasn't completed correctly.
2. `curl <railway-url>/api/health` — confirms the backend itself is up.
3. Railway's deploy logs — confirms env vars are actually set (a missing `SUPABASE_SERVICE_ROLE_KEY` fails loudly here, not silently).

## 5. Enable the job-engine workflow

1. GitHub repo → Settings → Secrets and variables → Actions → New repository secret, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL` (optional — only if the code has no built-in default)
2. The workflow (`.github/workflows/job-engine.yml`) runs automatically every 6 hours once merged to the default branch. To confirm it works without waiting: Actions tab → "job-engine collectors" → **Run workflow** (manual trigger).
3. Adjust the cron schedule in the workflow file to taste — 6 hours is a starting point, not a measured requirement.

## Notes

- **Custom domain**: add it in Vercel first (Settings → Domains), then update `CORS_ORIGIN` on Railway to include it — CORS is exact-origin matching, so a bare domain add on Vercel alone does nothing on the backend side.
- **Rotating a key**: update it in the relevant platform's dashboard (Railway for backend secrets, GitHub Actions secrets for job-engine) and redeploy/rerun — nothing in this repo needs to change.
- **Supabase project must be reachable**: if it's paused or over its storage quota, every deployed piece fails the same way local dev did — check the Supabase dashboard first if things stop working after having worked.
