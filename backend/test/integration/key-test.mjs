// Checks the backend (port 5000, main code) works end to end on the new
// Supabase secret key: password login, refresh, profile, avatar storage,
// admin pages. One throwaway account, deleted at the end (admins row too).
// node key-test.mjs <repoRoot>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { upgradeToAal2 } from "./mfa-helper.mjs";

const root = process.argv[2];
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const SB = env.SUPABASE_URL;
const S = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const API = "http://127.0.0.1:5000";
const tag = crypto.randomBytes(3).toString("hex");
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 150) }; } };
const call = async (m, p, { token, body, raw, type } = {}) => {
  const r = await fetch(API + p, {
    method: m,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...(type ? { "Content-Type": type } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: r.status, body: await j(r) };
};

// A valid 1x1 PNG (the avatar route checks the real file header).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

let uid;
try {
  const email = `audit-key-${tag}@aifagenlabs.com`;
  const password = crypto.randomBytes(18).toString("base64url");
  const u = await j(await fetch(`${SB}/auth/v1/admin/users`, { method: "POST", headers: S, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { first_name: "Key", last_name: "Test", area_of_interest: "devops", mobile: "+12025550146" } }) }));
  uid = u.id;
  check("create account (auth admin)", !!uid);

  const login = await call("POST", "/api/auth/login", { body: { email, password } });
  const token = login.body.session?.access_token;
  check("password login through the site", login.status === 200 && !!token, String(login.status));
  check("current user", (await call("GET", "/api/auth/user", { token })).status === 200);
  const ref = await call("POST", "/api/auth/refresh", { body: { refresh_token: login.body.session?.refresh_token } });
  check("session refresh", ref.status === 200 && !!ref.body.session?.access_token, String(ref.status));
  const tok = ref.body.session?.access_token || token;

  const prof = await call("GET", "/api/profile", { token: tok });
  check("profile loads", prof.status === 200 && prof.body.profile?.email === email);
  const pat = await call("PATCH", "/api/profile", { token: tok, body: { headline: "Key test" } });
  check("profile saves", pat.status === 200 && pat.body.profile?.headline === "Key test", String(pat.status));

  const fd = new FormData();
  fd.append("file", new Blob([PNG], { type: "image/png" }), "a.png");
  const av = await fetch(API + "/api/profile/avatar", { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
  const avb = await j(av);
  check("avatar upload (file storage)", av.status === 200 && !!avb.profile?.avatar_url, `${av.status} ${avb.message || ""}`);
  check("avatar remove", (await call("DELETE", "/api/profile/avatar", { token: tok })).status === 200);

  const tr = await call("POST", "/api/payments/trial", { token: tok });
  check("start free trial", tr.status === 200, String(tr.status));
  check("app features open on trial", (await call("GET", "/api/jobs/matches", { token: tok })).status === 200);
  const ord = await call("POST", "/api/payments/order", { token: tok, body: { plan: "basic", billingCycle: "monthly" } });
  check("Razorpay checkout order", ord.status === 200 && !!ord.body.order?.id, String(ord.status));

  // Admin pages, as a temporary admin
  await fetch(`${SB}/rest/v1/admins`, { method: "POST", headers: S, body: JSON.stringify({ user_id: uid }) });
  check("admin pages need the second step", (await call("GET", "/api/admin/overview", { token: tok })).status === 403);
  const adminTok = await upgradeToAal2(API, tok);
  for (const p of ["/api/admin/overview", "/api/admin/users?page=1", "/api/admin/payments?days=30", "/api/admin/manual-payments", "/api/admin/collector-runs", "/api/admin/audit-log", "/api/admin/system-health", "/api/admin/subscriptions/expiring"]) {
    const r = await call("GET", p, { token: adminTok });
    check(`admin ${p}`, r.status === 200, `${r.status} ${r.body.message || ""}`);
  }
  await fetch(`${SB}/rest/v1/admins?user_id=eq.${uid}`, { method: "DELETE", headers: S });
  check("admin access removed again", (await call("GET", "/api/admin/overview", { token: adminTok })).status === 403);

  check("log out", (await call("POST", "/api/auth/logout", { token: tok })).status === 200);
} catch (e) {
  fail++;
  console.log("ERROR", e.stack || e);
} finally {
  if (uid) {
    await fetch(`${SB}/rest/v1/admins?user_id=eq.${uid}`, { method: "DELETE", headers: S });
    const d = await fetch(`${SB}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/rest/v1/trial_claims?phone=eq.${encodeURIComponent("+12025550146")}`, { method: "DELETE", headers: S });
    const left = await j(await fetch(`${SB}/rest/v1/profiles?id=eq.${uid}&select=id`, { headers: S }));
    console.log(`\ncleanup: account deleted (${d.status}), profile left=${left.length}`);
  }
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
}

process.exitCode = fail ? 1 : 0;
