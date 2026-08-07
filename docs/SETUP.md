# AIFAGen — Setup & Integration Guide

This guide takes the app from "demo" to a working product with real auth, a
plan-gated dashboard, Stripe subscriptions, and real AI. Do the steps in order.

The architecture:

```
Browser (React)
  ├─ Supabase Auth ............... login / signup / session
  ├─ profiles table .............. stores plan + subscription_status (source of truth for gating)
  └─ Edge Functions (Deno):
       ├─ create-checkout-session . starts Stripe Checkout
       ├─ stripe-webhook .......... Stripe → writes plan/status into profiles
       ├─ create-portal-session ... manage / cancel / invoices
       └─ claude-proxy ............ calls Anthropic with the secret key (server-side)
```

---

## 0. Prerequisites

- Node.js 18+ and npm
- A Supabase project (you already have one)
- A Stripe account (create at https://dashboard.stripe.com — use **Test mode** while building)
- An Anthropic API key (https://console.anthropic.com)
- The Supabase CLI: `npm i -g supabase`

---

## 1. Install & run the frontend

```bash
npm install
cp .env.example .env     # then fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

(The repo already ships a `.env` with your project's values; keep or replace it.)

---

## 2. Run the database migration

Open **Supabase → SQL Editor**, paste the entire contents of
`supabase/migrations/0001_subscriptions.sql`, and click **Run**.

This adds the subscription columns to `profiles`, sets row-level-security so each
user only sees their own row, and installs a trigger that auto-creates a profile
when someone signs up.

> Tip: For the smoothest signup→pricing flow while testing, turn **off** email
> confirmation: Supabase → Authentication → Providers → Email → uncheck
> "Confirm email". (With it on, users must confirm before they can log in and
> reach the pricing gate.)

Also make sure **Realtime** is enabled for the `profiles` table (Supabase →
Database → Replication → `supabase_realtime` → enable `profiles`). This lets the
dashboard update instantly after payment. If you skip it, the app still works —
it falls back to polling after checkout.

---

## 3. Create your Stripe products & prices

In **Stripe → Product catalog**, create two products, each with a **monthly** and
a **yearly** recurring price:

| Product             | Monthly | Yearly (≈20% off) |
|---------------------|---------|-------------------|
| Professional        | $19/mo  | $180/yr           |
| Career Accelerator  | $49/mo  | $468/yr           |

Copy the four **Price IDs** (they look like `price_1AbC...`). You'll need them in
step 5. (Free has no Stripe price — it's activated directly in the app.)

---

## 4. Link the Supabase CLI to your project

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

(Your project ref is the subdomain in your Supabase URL, e.g. `bslevipv...`.)

---

## 5. Set Edge Function secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  ANTHROPIC_API_KEY=sk-ant-xxx \
  APP_URL=http://localhost:5173 \
  PRICE_PROFESSIONAL_MONTHLY=price_xxx \
  PRICE_PROFESSIONAL_ANNUAL=price_xxx \
  PRICE_CAREER_MONTHLY=price_xxx \
  PRICE_CAREER_ANNUAL=price_xxx
```

- `STRIPE_SECRET_KEY` — Stripe → Developers → API keys → Secret key
- `APP_URL` — where your app runs. Use your real domain in production
  (e.g. `https://app.yoursite.com`). This is where Stripe sends users back.
- `STRIPE_WEBHOOK_SECRET` is set in step 7 (after the endpoint exists).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set them.

---

## 6. Deploy the Edge Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy claude-proxy
# The webhook must NOT require a Supabase JWT (Stripe doesn't send one):
supabase functions deploy stripe-webhook --no-verify-jwt
```

Each function gets a URL like:
`https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`

---

## 7. Create the Stripe webhook

In **Stripe → Developers → Webhooks → Add endpoint**:

- **Endpoint URL**: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
- **Events to send**: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

After creating it, copy the **Signing secret** (`whsec_...`) and set it:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
# redeploy so the function picks up the new secret:
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 8. Enable the Stripe Billing Portal

**Stripe → Settings → Billing → Customer portal** → activate it (allow plan
changes / cancellation). This powers the "Manage subscription" button.

---

## 9. Test the full flow

1. Sign up a new account → you should land on the **pricing gate** (no dashboard yet).
2. Click **Free** → dashboard opens immediately on the Free plan (AI limited to 5/day).
3. Or click a paid plan → redirected to **Stripe Checkout**. Use test card
   `4242 4242 4242 4242`, any future expiry, any CVC.
4. After paying you return to the app; within a few seconds the webhook flips your
   status to `trialing`/`active` and the dashboard unlocks the paid features.
5. Open **Billing → Manage subscription** to view invoices or cancel.

---

## How plan-gating works in the app

- `src/utils/plan.js` defines each plan's limits (`PLAN_LIMITS`) and the
  `isSubscribed()` check used by the onboarding gate in `src/AIFAGen.jsx`.
- Free tier caps AI actions at 5/day (tracked client-side); hitting the cap shows
  an "Upgrade" button. To make limits tamper-proof, enforce them inside the
  `claude-proxy` function too (read the user's plan from `profiles` and count
  usage in a table) — the client gating is a good default to start.

## Going to production

- Switch Stripe to **Live mode**, recreate products/prices, and update the
  secrets with live keys + a live webhook endpoint.
- Set `APP_URL` to your production domain and redeploy the functions.
- Build with `npm run build` and deploy `dist/` (Vercel, Netlify, Cloudflare Pages…).
- Add your production domain to Supabase → Authentication → URL Configuration.

## Files added/changed in this integration

- `supabase/migrations/0001_subscriptions.sql` — schema, RLS, signup trigger
- `supabase/functions/*` — the four Edge Functions
- `src/services/subscription.js`, `src/services/ai.js` — client calls to the functions
- `src/utils/plan.js` — plan config + gating
- `src/pages/Pricing.jsx`, `src/pages/Billing.jsx` — new screens
- `src/AIFAGen.jsx`, `src/components/layout/*` — onboarding gate + routing
- Bug fixes in `Resume.jsx`, `SettingsView.jsx`, `SavedJobs.jsx`
- Responsive fixes (hero, application stepper, sidebar)
