# API reference

Base address: `https://aifagenlabs.com/api` (same origin as the website). Every reply is
JSON: `{ "success": true, ... }` or `{ "success": false, "message": "..." }`, sometimes
with a `code` (`PLAN_REQUIRED`, `VERIFICATION_REQUIRED`, `MFA_REQUIRED`, `TRIAL_USED`,
`AI_LIMIT`, `TOO_MANY_PAGES`, `NAME_MISMATCH`, `AREA_MISMATCH`, `UNREADABLE_RESUME`).

Protected routes need `Authorization: Bearer <access token>`.
Status codes: 400 bad input, 401 not signed in, 402 plan needed, 403 not allowed
(not verified / not admin / needs two-step), 404 unknown, 409 conflict (already used,
cap reached), 413 too large, 422 resume rejected, 429 limit reached, 5xx server.

**Access column:** *public* = no login; *login* = signed in; *plan* = signed in, email
verified and an active plan or trial; *admin* = admin account with two-step sign-in.

Limits: sign-in routes 30 per 10 min per IP; other signed-in routes 120 per minute per
user; uploads and AI writes 20 per 10 min; matches 30 per minute; see
`backend/src/app.js` for the rest.

## Health

| Method and path | Access | Purpose |
|---|---|---|
| `GET /health` | public | "AIFAGen Backend Running" |

## Auth (`/auth`)

| Method and path | Access | Purpose |
|---|---|---|
| `POST /signup` | public | body `email, password (8+), data: { first_name, last_name, area_of_interest, mobile }`; US mobile only; 409 if the mobile is already registered |
| `POST /login` | public | `email, password`; returns `session` |
| `POST /refresh` | public | `refresh_token`; returns a new session |
| `POST /forgot` | public | `email`; always answers success (no account probing) |
| `GET /user` | login | the signed-in user |
| `POST /password` | login | `password` (8+) |
| `POST /logout` | login | ends the session |
| `GET /mfa` | login | `aal` and the user's authenticator apps |
| `POST /mfa/enroll` | login | first-time set-up: returns `qrCode`, `secret`, `factorId` |
| `POST /mfa/verify` | login | `factorId, code`; returns an upgraded (`aal2`) session |

## Profile (`/profile`)

| Method and path | Access | Purpose |
|---|---|---|
| `GET /` | login | profile plus `email_verified`, `trial_eligible` |
| `PATCH /` | login | only `headline` and `location`; everything else is admin-only |
| `POST /avatar`, `DELETE /avatar` | login | profile photo (PNG/JPEG/WebP, 5 MB) |

## Payments (`/payments`)

| Method and path | Access | Purpose |
|---|---|---|
| `POST /trial` | login (verified) | start the 7-day free trial; 409 `TRIAL_USED` if taken |
| `POST /order` | login (verified) | `plan, billingCycle`; creates a Razorpay order, price set by the server |
| `POST /verify` | login (verified) | Razorpay `razorpay_order_id, razorpay_payment_id, razorpay_signature`; activates the plan |
| `POST /webhook` | public, signed | Razorpay events `payment.captured`, `order.paid`; signature header required |

Valid pairs: `basic:monthly`, `basic:semiannual` (one-time), `premium:semiannual` (one-time).

## Jobs, saved jobs, applications (all need a plan)

| Method and path | Purpose |
|---|---|
| `GET /jobs/matches` | ranked matches for the latest resume (empty without a resume) |
| `GET /jobs/search?q=` | keyword search over all jobs (2+ characters) |
| `GET /saved-jobs`, `GET /saved-jobs/ids`, `POST /saved-jobs`, `DELETE /saved-jobs/:jobId` | bookmarks (max 1,000) |
| `GET /applications`, `POST /applications`, `PATCH /applications/:id`, `DELETE /applications/:id` | tracker (max 1,000); statuses applied, interviewing, assessment, offer, rejected |
| `GET /internal-jobs` | postings added by the team |
| `GET /analytics` | application statistics |

## Resumes (`/resumes`, need a plan)

| Method and path | Purpose |
|---|---|
| `GET /`, `GET /latest` | the user's resumes (latest 10 kept) |
| `POST /` | multipart `file` (PDF or DOCX, 10 MB); runs checks and one AI call; 422 if name or area do not match |
| `POST /:id/analyze` | re-run the ATS analysis |
| `POST /:id/improve` | AI improvement suggestions |
| `POST /improved/docx`, `POST /:id/rewrite/docx` | download an improved resume as .docx |
| `DELETE /:id` | delete a resume and its file |

AI calls here count toward the daily limit (Basic and trial 20, Premium unlimited).

## Admin (`/admin`, admin with two-step sign-in)

| Method and path | Purpose |
|---|---|
| `GET /overview` | dashboard numbers (paying = active plan with time left; trials and ended plans counted apart) |
| `GET /users`, `GET /users/:id` | list (search, plan, status filters) and detail |
| `POST /users` | create an account (US or Indian mobile) |
| `PATCH /users/:id/details`, `PATCH /users/:id/plan` | edit profile fields; change plan with a reason (audited) |
| `GET /payments` | Razorpay transactions (live from Razorpay) |
| `GET/POST /manual-payments`, `PATCH/DELETE /manual-payments/:id` | cash and offline payments with partial amounts |
| `GET/POST /internal-jobs`, `PATCH/DELETE /internal-jobs/:id` | the team's own postings |
| `GET /jobs`, `GET /jobs/sources`, `PATCH /jobs/:id`, `POST /jobs/bulk` | moderate the job pool |
| `GET /collector-runs`, `POST /collectors/trigger` | collector status (with hours since last run); start a run |
| `GET /ai-usage`, `GET /audit-log`, `GET /system-health` | usage and cost, who-changed-what, integration status |
| `GET /subscriptions/expiring` | plans ending soon and lapsed ones |
| `GET/POST /admins`, `DELETE /admins/:id` | manage admin access |

Every admin change is written to `admin_audit_log`.
