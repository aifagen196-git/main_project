// Two-step sign-in for admins, against the local backend (port 5000).
// A throwaway admin account, deleted at the end. Codes are made the way an
// authenticator app makes them (RFC 6238 TOTP).
// node mfa-test.mjs <repoRoot>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.argv[2];
const env = Object.fromEntries(fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const SB = env.SUPABASE_URL;
const S = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const API = "http://127.0.0.1:5000";
let pass = 0, fail = 0;
const check = (l, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 120) }; } };
const call = async (m, p, token, body) => { const r = await fetch(API + p, { method: m, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await j(r) }; };
const aal = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url")).aal;

function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
function totp(secret, offset = 0) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const h = crypto.createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

let uid;
try {
  const email = `audit-mfa-${crypto.randomBytes(3).toString("hex")}@aifagenlabs.com`;
  const password = crypto.randomBytes(16).toString("base64url");
  const u = await j(await fetch(`${SB}/auth/v1/admin/users`, { method: "POST", headers: S, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { first_name: "Mfa", last_name: "Admin", area_of_interest: "others", mobile: "+12025550193" } }) }));
  uid = u.id;
  await fetch(`${SB}/rest/v1/admins`, { method: "POST", headers: S, body: JSON.stringify({ user_id: uid }) });

  let s = (await call("POST", "/api/auth/login", null, { email, password })).body.session;
  check("password sign-in gives a one-step session", aal(s.access_token) === "aal1");
  let r = await call("GET", "/api/admin/overview", s.access_token);
  check("admin pages refused without the second step", r.status === 403 && r.body.code === "MFA_REQUIRED", `${r.status} ${r.body.code}`);
  r = await call("GET", "/api/auth/mfa", s.access_token);
  check("status: no authenticator app yet", r.status === 200 && r.body.factors.length === 0 && r.body.aal === "aal1");

  r = await call("POST", "/api/auth/mfa/enroll", s.access_token);
  check("set-up returns a QR code and secret", r.status === 200 && /^data:image\/svg\+xml/.test(r.body.qrCode || "") && !!r.body.secret, `${r.status} ${r.body.message || ""}`);
  const { factorId, secret } = r.body;
  r = await call("POST", "/api/auth/mfa/verify", s.access_token, { factorId, code: "000000" === totp(secret) ? "111111" : "000000" });
  check("wrong code refused", r.status === 400, r.body.message);
  r = await call("POST", "/api/auth/mfa/verify", s.access_token, { factorId, code: totp(secret) });
  check("right code accepted, session upgraded", r.status === 200 && aal(r.body.session.access_token) === "aal2", `${r.status} ${r.body.message || ""}`);
  s = r.body.session;
  check("admin pages open after the second step", (await call("GET", "/api/admin/overview", s.access_token)).status === 200);
  r = await call("POST", "/api/auth/refresh", null, { refresh_token: s.refresh_token });
  check("refreshed session keeps the second step", r.status === 200 && aal(r.body.session.access_token) === "aal2");
  check("set-up can't be redone once an app is set up", (await call("POST", "/api/auth/mfa/enroll", s.access_token)).status === 409);

  // Next sign-in: password again → one-step session → code → admin access
  let s2 = (await call("POST", "/api/auth/login", null, { email, password })).body.session;
  check("new sign-in starts at one step again", aal(s2.access_token) === "aal1");
  r = await call("GET", "/api/auth/mfa", s2.access_token);
  check("status lists the set-up app", r.body.factors.length === 1 && r.body.factors[0].id === factorId);
  check("admin pages refused until the code", (await call("GET", "/api/admin/overview", s2.access_token)).status === 403);
  await new Promise((res) => setTimeout(res, 31000)); // a fresh 30-second code
  r = await call("POST", "/api/auth/mfa/verify", s2.access_token, { factorId, code: totp(secret) });
  check("code on a later sign-in works", r.status === 200 && aal(r.body.session.access_token) === "aal2", `${r.status} ${r.body.message || ""}`);
  check("normal (non-admin) features unaffected", (await call("GET", "/api/profile", s2.access_token)).status === 200);
} catch (e) {
  fail++;
  console.log("ERROR", e.stack || e);
} finally {
  if (uid) {
    await fetch(`${SB}/rest/v1/admins?user_id=eq.${uid}`, { method: "DELETE", headers: S });
    const d = await fetch(`${SB}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: S });
    console.log(`\ncleanup: test admin deleted (${d.status})`);
  }
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
}

process.exitCode = fail ? 1 : 0;
