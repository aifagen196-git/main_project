// Brute-force protection and password change, against the local API.
// Throwaway accounts, deleted at the end. Each check uses its own made-up
// X-Forwarded-For address (only possible locally; in production Caddy sets
// that header) so per-IP buckets don't interfere with each other.
// Usage: node test/integration/security-test.mjs <repo root>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const root = process.argv[2];
const env = Object.fromEntries(fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const API = "http://127.0.0.1:5000";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const tag = crypto.randomBytes(3).toString("hex");
const ip = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
let pass = 0, fail = 0;
const check = (name, ok, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };
async function call(method, p, { body, token, from = ip() } = {}) {
  const r = await fetch(API + p, { method, headers: { "Content-Type": "application/json", "X-Forwarded-For": from, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const created = [];
async function makeUser(name) {
  const email = `sec-${name}-${tag}@example.com`;
  const password = "Pw-" + crypto.randomBytes(9).toString("hex");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: "Sec", last_name: "Test", area_of_interest: "others" } });
  if (error) throw error;
  created.push(data.user.id);
  return { id: data.user.id, email, password };
}
const login = (u, password = u.password) => call("POST", "/api/auth/login", { body: { email: u.email, password } });

try {
  // ---- Per-account sign-in limit: 10 wrong passwords, from 11 different addresses
  const victim = await makeUser("victim");
  const codes = [];
  for (let i = 0; i < 11; i++) codes.push((await login(victim, "wrong-" + i)).status);
  check("wrong passwords refused", codes.slice(0, 10).every((c) => c === 400), codes.join(","));
  check("11th try on the same account blocked, even from a new address", codes[10] === 429, String(codes[10]));
  const right = await login(victim);
  check("the right password is blocked too until the wait is over", right.status === 429, String(right.status));
  const other = await makeUser("other");
  check("other accounts are unaffected", (await login(other)).status === 200);

  // ---- Per-visitor limit still there: 30 attempts from one address
  const from = ip(), st = [];
  for (let i = 0; i < 31; i++) st.push((await call("POST", "/api/auth/login", { from, body: { email: `x${i}-${tag}@example.com`, password: "" } })).status);
  check("one address: 31st sign-in attempt blocked", st[30] === 429 && st.slice(0, 30).every((c) => c === 400), `${st[29]},${st[30]}`);

  // ---- Email flood: 5 reset emails an hour per address
  const fe = [];
  for (let i = 0; i < 6; i++) fe.push((await call("POST", "/api/auth/forgot", { body: { email: `nobody-${tag}@example.com` } })).status);
  check("reset emails to one address: 6th refused", fe.slice(0, 5).every((c) => c === 200) && fe[5] === 429, fe.join(","));

  // ---- Password change
  const u = await makeUser("pw");
  const s1 = (await login(u)).body.session;   // this device
  const s2 = (await login(u)).body.session;   // another device
  let r = await call("POST", "/api/auth/password", { token: s1.access_token, body: { password: "New-pass-" + tag } });
  check("change without the current password refused", r.status === 400 && r.body.code === "CURRENT_PASSWORD_REQUIRED", `${r.status} ${r.body.code}`);
  r = await call("POST", "/api/auth/password", { token: s1.access_token, body: { password: "New-pass-" + tag, currentPassword: "not-it" } });
  check("change with a wrong current password refused", r.status === 400 && r.body.code === "WRONG_PASSWORD", `${r.status} ${r.body.code}`);
  const newPw = "New-pass-" + tag;
  r = await call("POST", "/api/auth/password", { token: s1.access_token, body: { password: newPw, currentPassword: u.password } });
  check("change with the current password works", r.status === 200, String(r.status));
  const fresh = r.body.session;
  check("old password no longer works", (await login(u)).status === 400);
  check("new password works", (await login(u, newPw)).status === 200);
  r = await call("POST", "/api/auth/refresh", { body: { refresh_token: s2.refresh_token } });
  check("other device signed out", r.status === 401, String(r.status));
  r = await call("POST", "/api/auth/refresh", { body: { refresh_token: s1.refresh_token } });
  check("the old session on this device is replaced", r.status === 401, String(r.status));
  r = fresh ? await call("POST", "/api/auth/refresh", { body: { refresh_token: fresh.refresh_token } }) : { status: 0 };
  check("this device stays signed in with the session it got back", r.status === 200, String(r.status));

  // ---- Guessing the current password: 5 wrong per 15 minutes
  const g = await makeUser("guess");
  const gs = (await login(g)).body.session;
  const gc = [];
  for (let i = 0; i < 6; i++) gc.push((await call("POST", "/api/auth/password", { token: gs.access_token, body: { password: "Another-" + tag, currentPassword: "guess-" + i } })).status);
  check("6th current-password guess blocked", gc.slice(0, 5).every((c) => c === 400) && gc[5] === 429, gc.join(","));

  // ---- Reset link: no current password needed
  const rl = await makeUser("reset");
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "recovery", email: rl.email });
  if (linkErr) throw linkErr;
  const pub = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: rec, error: recErr } = await pub.auth.verifyOtp({ type: "recovery", token_hash: link.properties.hashed_token });
  if (recErr) throw recErr;
  r = await call("POST", "/api/auth/password", { token: rec.session.access_token, body: { password: "Reset-pass-" + tag } });
  check("after a reset link, the new password is set without the old one", r.status === 200 && !!r.body.session, `${r.status} ${r.body.message || ""}`);
  check("reset password works for sign-in", (await login(rl, "Reset-pass-" + tag)).status === 200);
} catch (e) {
  fail++;
  console.log("ERROR", e.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\ncleanup: ${created.length} test accounts deleted`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
