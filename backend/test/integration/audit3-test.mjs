// Checks for this round's fixes against the local backend (port 5000).
// Sign-up rejections return before any account is made, so no email is sent.
// node audit3-test.mjs <repoRoot>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { upgradeToAal2 } from "./mfa-helper.mjs";

const root = process.argv[2];
const env = Object.fromEntries(fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const SB = env.SUPABASE_URL;
const S = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const API = "http://127.0.0.1:5000";
const tag = crypto.randomBytes(3).toString("hex");
let pass = 0, fail = 0;
const check = (l, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 120) }; } };
const post = async (p, body, token) => { const r = await fetch(API + p, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); return { status: r.status, body: await j(r) }; };
const get = async (p, token) => { const r = await fetch(API + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); return { status: r.status, body: await j(r) }; };

// ---- Sign-up must have what the form requires
const base = { email: `audit-su-${tag}@aifagenlabs.com`, password: crypto.randomBytes(12).toString("hex") };
const data = { first_name: "Su", last_name: "Test", area_of_interest: "devops", mobile: "(202) 555-0161" };
let r = await post("/api/auth/signup", { ...base, data: { ...data, first_name: "" } });
check("sign-up without first name refused", r.status === 400 && /first and last name/.test(r.body.message), r.body.message);
r = await post("/api/auth/signup", { ...base, data: { ...data, last_name: "" } });
check("sign-up without last name refused", r.status === 400, r.body.message);
r = await post("/api/auth/signup", { ...base, data: { ...data, area_of_interest: "" } });
check("sign-up without area refused", r.status === 400 && /area of interest/.test(r.body.message), r.body.message);
r = await post("/api/auth/signup", { ...base, data: { ...data, area_of_interest: "hacking" } });
check("sign-up with unknown area refused", r.status === 400, r.body.message);
r = await post("/api/auth/signup", { ...base, password: "short", data });
check("sign-up with 5-character password refused", r.status === 400 && /8 characters/.test(r.body.message), r.body.message);
const list = await j(await fetch(`${SB}/auth/v1/admin/users?per_page=1000`, { headers: S }));
check("no account created by refused sign-ups", !(list.users || []).some((u) => u.email === base.email));

// ---- Community: the link is in the site itself now; no server routes left
check("community server routes removed", (await get("/api/community")).status === 404 && (await post("/api/community/order", {})).status === 404);

// ---- Admin dashboard: a free trial is not a paying customer
let uid;
try {
  const email = `audit-ov-${tag}@aifagenlabs.com`;
  const password = crypto.randomBytes(16).toString("base64url");
  const u = await j(await fetch(`${SB}/auth/v1/admin/users`, { method: "POST", headers: S, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { first_name: "Ov", last_name: "Test", area_of_interest: "others", mobile: "+12025550162" } }) }));
  uid = u.id;
  const login = await post("/api/auth/login", { email, password });
  const tok = login.body.session?.access_token;
  await fetch(`${SB}/rest/v1/admins`, { method: "POST", headers: S, body: JSON.stringify({ user_id: uid }) });
  const adminTok = await upgradeToAal2(API, tok);
  const before = (await get("/api/admin/overview", adminTok)).body.subscriptions;
  check("admin overview reports ended plans", before && typeof before.ended === "number", JSON.stringify(before));
  await post("/api/payments/trial", {}, tok);
  const after = (await get("/api/admin/overview", adminTok)).body.subscriptions;
  check("starting a trial adds to 'on free trial'", after.trialing === before.trialing + 1, `${before.trialing} -> ${after.trialing}`);
  check("...but not to paying / basic", after.paying === before.paying && after.basic === before.basic, `paying ${before.paying} -> ${after.paying}`);
  const past = new Date(Date.now() - 60e3).toISOString();
  await fetch(`${SB}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: S, body: JSON.stringify({ current_period_end: past, trial_ends_at: past }) });
  const ended = (await get("/api/admin/overview", adminTok)).body.subscriptions;
  check("an ended trial moves to 'ended'", ended.ended === before.ended + 1 && ended.trialing === before.trialing, `ended ${before.ended} -> ${ended.ended}`);
  check("'Others' area accepted for accounts", (await get("/api/profile", tok)).body.profile?.area_of_interest === "others");
} finally {
  if (uid) {
    await fetch(`${SB}/rest/v1/admins?user_id=eq.${uid}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/rest/v1/trial_claims?phone=eq.${encodeURIComponent("+12025550162")}`, { method: "DELETE", headers: S });
  }
  console.log(`\nRESULT: ${pass} passed, ${fail} failed (test account deleted)`);
}

process.exitCode = fail ? 1 : 0;
