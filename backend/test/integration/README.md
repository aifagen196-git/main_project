# Live-database checks (run by hand)

These start from real sign-ups, trials, payments (orders only), uploads and admin
two-step sign-in. They create temporary accounts in the database named in
`backend/.env` and delete them at the end, but they DO touch that database, use
AI credits (resume upload) and create unpaid Razorpay orders. Never point them at
production data unless you mean to; a separate test Supabase project is better.

1. Start the server: `cd backend && npm run dev` (port 5000).
2. Run one: `npm run test:integration -- key-test` (or `trial-test`, `audit3-test`,
   `audit4-test`, `mfa-test`), or all with `npm run test:integration`.

Each prints PASS/FAIL lines and a RESULT line; the exit code is 1 on any failure.
