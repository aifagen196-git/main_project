# AIFAGen

AI career platform — marketing site + dashboard app (React + Vite + Tailwind).

## Run locally
```bash
npm install
npm run dev
```
Open the printed localhost URL.

## Build for production
```bash
npm run build      # outputs static files to ./dist
npm run preview    # preview the production build locally
```

## Deploy
Any static host works. Easiest options:

**Vercel** — push this folder to GitHub, then "Import Project" at vercel.com
(framework auto-detected as Vite). Or, from this folder:
```bash
npm i -g vercel
vercel
```

**Netlify** — run `npm run build`, then drag the `dist/` folder onto
app.netlify.com/drop. Or connect the repo with build command `npm run build`
and publish directory `dist`.

**Cloudflare Pages / GitHub Pages** — same idea: build command `npm run build`,
output directory `dist`.

## Note on the AI features
The "Improve with AI" button calls Claude directly from the browser. That call
will fail in production (you must never expose an API key client-side), so it
falls back to a demo result. To make it real, add a small backend route
(e.g. a Vercel/Netlify serverless function) that holds your ANTHROPIC_API_KEY
and proxies the request, then point the fetch in AIFAGen.jsx at that route.
