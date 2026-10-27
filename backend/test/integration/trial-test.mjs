// End-to-end free-trial test against the local backend (feature/free-trial
// branch, port 5000) and the real database. Three throwaway accounts, all
// deleted at the end. Mobile numbers are in the 555-01xx range, which is
// reserved for fiction and never assigned to a real person.
// node trial-test.mjs <repoRoot> <worktree>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const [root, wt] = process.argv.slice(2);
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
for (const [k, v] of Object.entries(env)) process.env[k] ??= v;
const SB = env.SUPABASE_URL;
const S = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const API = "http://127.0.0.1:5000";
const DAY = 864e5;
const tag = crypto.randomBytes(3).toString("hex");
const PHONE_A = "+12025550142";
const PHONE_B = "+12025550144";
const PHONE_C = "+12025550143";

let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 150) }; } };
const sb = async (m, p, b, h = {}) => j(await fetch(SB + p, { method: m, headers: { ...S, ...h }, body: b ? JSON.stringify(b) : undefined }));
const created = [];

async function makeUser(name, mobile) {
  const email = `audit-trial-${name}-${tag}@aifagenlabs.com`;
  const u = await sb("POST", "/auth/v1/admin/users", {
    email, password: crypto.randomBytes(18).toString("base64url"), email_confirm: true,
    user_metadata: { first_name: "Trial", last_name: name.toUpperCase(), area_of_interest: "devops", mobile },
  });
  if (!u.id) throw new Error("create user failed: " + JSON.stringify(u).slice(0, 200));
  created.push(u.id);
  const link = await sb("POST", "/auth/v1/admin/generate_link", { type: "magiclink", email });
  const sess = await sb("POST", "/auth/v1/verify", { type: "magiclink", token_hash: link.hashed_token || link.properties?.hashed_token });
  return { id: u.id, email, H: { Authorization: `Bearer ${sess.access_token}`, "Content-Type": "application/json" } };
}
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: u.H, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await j(r) }; };
const profileRow = async (id) => (await sb("GET", `/rest/v1/profiles?id=eq.${id}&select=*`))[0];

// The webhook handler, called directly with a correctly signed test event.
process.env.RAZORPAY_WEBHOOK_SECRET = "local-test-" + tag;
const { razorpayWebhook } = await import(pathToFileURL(path.join(wt, "backend/src/routes/paymentsWebhook.routes.js")).href);
async function webhook(orderId, paymentId) {
  const raw = Buffer.from(JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: orderId } } } }));
  const sig = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");
  let status = 200, out;
  await razorpayWebhook({ headers: { "x-razorpay-signature": sig }, body: raw }, { status(s) { status = s; return this; }, json(b) { out = b; return this; } });
  return { status, out };
}
const near = (a, b, ms = 5 * 60e3) => Math.abs(new Date(a) - new Date(b)) < ms;
const addMonth = (d, n = 1) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

try {
  const A = await makeUser("a", PHONE_A);
  const B = await makeUser("b", PHONE_B);
  const C = await makeUser("c", PHONE_C);

  // ---- A: new account, trial, then pays during the trial
  let p = await api(A, "GET", "/api/profile");
  check("A new account: trial offered, email verified, no plan",
    p.body.profile?.trial_eligible === true && p.body.profile?.email_verified === true && p.body.profile?.plan === "none",
    JSON.stringify({ e: p.body.profile?.trial_eligible, v: p.body.profile?.email_verified, plan: p.body.profile?.plan, mobile: p.body.profile?.mobile }));
  check("A before trial: app features blocked (402)", (await api(A, "GET", "/api/jobs/matches")).status === 402);

  const t = await api(A, "POST", "/api/payments/trial");
  const tr = t.body.trial || {};
  const len = new Date(tr.trial_ends_at) - new Date(tr.trial_started_at);
  check("A starts trial without paying", t.status === 200 && tr.plan === "basic" && tr.subscription_status === "trialing", `${t.status} ${JSON.stringify(t.body).slice(0, 120)}`);
  check("A trial lasts exactly 7 days", len === 7 * DAY && tr.current_period_end === tr.trial_ends_at, `${len / DAY} days`);
  const m = await api(A, "GET", "/api/jobs/matches");
  check("A during trial: app features open", m.status === 200, String(m.status));
  check("A second trial refused", (await api(A, "POST", "/api/payments/trial")).body.code === "TRIAL_USED");
  p = await api(A, "GET", "/api/profile");
  check("A no longer offered a trial", p.body.profile?.trial_eligible === false);

  // ---- B: a number that already had a trial (e.g. on a deleted account)
  await sb("POST", "/rest/v1/trial_claims", { phone: PHONE_B, user_id: null });
  const b = await api(B, "POST", "/api/payments/trial");
  check("B whose number already had a trial: refused", b.status === 409 && /mobile/.test(b.body.message || ""), b.body.message);

  // ---- Sign-up with a number already on an account
  const dup = await fetch(API + "/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `audit-trial-dup-${tag}@aifagenlabs.com`, password: crypto.randomBytes(12).toString("hex"), data: { first_name: "Dup", last_name: "X", area_of_interest: "devops", mobile: "(202) 555-0142" } }) });
  const dupb = await j(dup);
  check("Sign-up with a taken number: clear message", dup.status === 409 && /already registered/.test(dupb.message || ""), `${dup.status} ${dupb.message}`);
  check("B still has no plan after refusal", (await profileRow(B.id)).plan === "none");

  // ---- A pays during the trial (simulated Razorpay webhook for a real order)
  const o = await api(A, "POST", "/api/payments/order", { plan: "basic", billingCycle: "monthly" });
  check("A can open checkout during the trial", o.status === 200 && !!o.body.order?.id, String(o.status));
  const before = await profileRow(A.id);
  const w1 = await webhook(o.body.order.id, `pay_TEST${tag}A`);
  const after = await profileRow(A.id);
  const expected = addMonth(before.trial_ends_at);
  check("A webhook activates the paid plan", w1.status === 200 && after.subscription_status === "active" && after.plan === "basic" && after.billing_cycle === "monthly", `${w1.status} ${after.subscription_status}`);
  check("A keeps free days: paid month starts at trial end", near(after.current_period_end, expected), `end=${after.current_period_end} expected≈${expected.toISOString()}`);
  const w2 = await webhook(o.body.order.id, `pay_TEST${tag}A`);
  const again = await profileRow(A.id);
  check("A same payment delivered twice: no extra time", w2.status === 200 && again.current_period_end === after.current_period_end);
  check("A app still open after paying", (await api(A, "GET", "/api/jobs/matches")).status === 200);

  // ---- B pays directly (no trial): month starts now
  const ob = await api(B, "POST", "/api/payments/order", { plan: "basic", billingCycle: "monthly" });
  await webhook(ob.body.order.id, `pay_TEST${tag}B`);
  const bAfter = await profileRow(B.id);
  check("B pays without a trial: month starts now", bAfter.subscription_status === "active" && near(bAfter.current_period_end, addMonth(new Date())), bAfter.current_period_end);

  // ---- B pays again with time left: the new month is added after it
  const ob2 = await api(B, "POST", "/api/payments/order", { plan: "basic", billingCycle: "monthly" });
  await webhook(ob2.body.order.id, `pay_TEST${tag}B2`);
  const bExt = await profileRow(B.id);
  check("B pays again early: month added after the current one", near(bExt.current_period_end, addMonth(bAfter.current_period_end)), bExt.current_period_end);

  // ---- B upgrades: Premium applies now, its 6 months come after the time left
  const op = await api(B, "POST", "/api/payments/order", { plan: "premium", billingCycle: "semiannual" });
  await webhook(op.body.order.id, `pay_TEST${tag}BP`);
  const bPrem = await profileRow(B.id);
  check("B upgrades: Premium now, time added after", bPrem.plan === "premium" && near(bPrem.current_period_end, addMonth(bExt.current_period_end, 6)), `${bPrem.plan} ${bPrem.current_period_end}`);
  const ob3 = await api(B, "POST", "/api/payments/order", { plan: "basic", billingCycle: "monthly" });
  check("B on Premium can't order Basic", ob3.status === 409 && ob3.body.code === "PLAN_INCLUDED", `${ob3.status} ${ob3.body.code}`);

  // ---- C: trial ends → access stops
  const tc = await api(C, "POST", "/api/payments/trial");
  check("C starts trial", tc.status === 200);
  const past = new Date(Date.now() - 60e3).toISOString();
  await sb("PATCH", `/rest/v1/profiles?id=eq.${C.id}`, { trial_ends_at: past, current_period_end: past });
  check("C after trial end: app features blocked (402)", (await api(C, "GET", "/api/jobs/matches")).status === 402);
  p = await api(C, "GET", "/api/profile");
  check("C after trial end: no second trial offered", p.body.profile?.trial_eligible === false && !!p.body.profile?.trial_ends_at);
  check("C after trial end: trial can't restart", (await api(C, "POST", "/api/payments/trial")).status === 409);
  check("C after trial end: can still open checkout", (await api(C, "POST", "/api/payments/order", { plan: "basic", billingCycle: "monthly" })).status === 200);

  // ---- Users can't edit trial dates themselves
  const pub = fs.readFileSync(path.join(root, "frontend/.env"), "utf8").match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
  if (pub) {
    const r = await fetch(`${SB}/rest/v1/profiles?id=eq.${C.id}`, { method: "PATCH", headers: { apikey: pub, Authorization: C.H.Authorization, "Content-Type": "application/json" }, body: JSON.stringify({ trial_ends_at: "2099-01-01", current_period_end: "2099-01-01" }) });
    check("C can't extend own trial through the database", r.status === 401 || r.status === 403, String(r.status));
  }
} catch (e) {
  fail++;
  console.log("ERROR", e.stack || e);
} finally {
  for (const id of created) await fetch(`${SB}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: S });
  await fetch(`${SB}/rest/v1/trial_claims?phone=in.(${[PHONE_A, PHONE_B, PHONE_C].map(encodeURIComponent).join(",")})`, { method: "DELETE", headers: S });
  const left = await sb("GET", `/rest/v1/profiles?id=in.(${created.join(",")})&select=id`);
  const claims = await sb("GET", `/rest/v1/trial_claims?select=phone`);
  console.log(`\ncleanup: ${created.length} test accounts deleted, profiles left=${left.length}, trial_claims left=${claims.length}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
}

process.exitCode = fail ? 1 : 0;
