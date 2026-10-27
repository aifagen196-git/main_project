// Turnstile against Cloudflare's real check, with Cloudflare's published test
// keys (always pass / always fail / already used). Starts the API inside this
// script on a spare port with those keys, so the normal local server is
// untouched. Talks to Supabase only for a couple of failed sign-ins.
// Usage: node test/integration/turnstile-test.mjs <repo root>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
for (const l of fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}
const SITE = "1x00000000000000000000AA";
const PASS = "1x0000000000000000000000000000000AA";
const FAIL = "2x0000000000000000000000000000000AA";
const SPENT = "3x0000000000000000000000000000000AA";
const DUMMY = "XXXX.DUMMY.TOKEN.XXXX";
process.env.TURNSTILE_SITE_KEY = SITE;
process.env.TURNSTILE_SECRET_KEY = PASS;

const { default: app } = await import(pathToFileURL(path.join(root, "backend/src/app.js")).href);
const server = app.listen(0);
const API = `http://127.0.0.1:${server.address().port}`;
const ip = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
let pass = 0, fail = 0;
const check = (name, ok, info = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };
async function call(method, p, body) {
  const r = await fetch(API + p, { method, headers: { "Content-Type": "application/json", "X-Forwarded-For": ip() }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const email = `turnstile-${crypto.randomBytes(3).toString("hex")}@example.com`;
const login = (captchaToken) => call("POST", "/api/auth/login", { email, password: "wrong-password", captchaToken });

try {
  const cfg = await call("GET", "/api/auth/config");
  check("sign-in form gets the site key", cfg.body.turnstileSiteKey === SITE, String(cfg.body.turnstileSiteKey));

  let r = await login();
  check("login without the check refused", r.status === 400 && r.body.code === "CAPTCHA_FAILED", `${r.status} ${r.body.code}`);
  r = await call("POST", "/api/auth/signup", { email, password: "Pw-123456789" });
  check("sign-up without the check refused", r.status === 400 && r.body.code === "CAPTCHA_FAILED", `${r.status} ${r.body.code}`);

  r = await login(DUMMY);
  check("a passing token gets through to the password check", r.status === 400 && !r.body.code && /invalid/i.test(r.body.message || ""), `${r.status} ${r.body.message}`);

  process.env.TURNSTILE_SECRET_KEY = FAIL;
  r = await login(DUMMY);
  check("a failing token is refused", r.status === 400 && r.body.code === "CAPTCHA_FAILED", `${r.status} ${r.body.code}`);
  process.env.TURNSTILE_SECRET_KEY = SPENT;
  r = await login(DUMMY);
  check("a used token is refused", r.status === 400 && r.body.code === "CAPTCHA_FAILED", `${r.status} ${r.body.code}`);

  // Bots that can't pass the check can't lock the account: 12 refusals,
  // then the owner (passing the check) still reaches the password check.
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await login(DUMMY)).status);
  process.env.TURNSTILE_SECRET_KEY = PASS;
  r = await login(DUMMY);
  check("refused checks don't count towards the account lock", codes.every((c) => c === 400) && r.status === 400 && !r.body.code, `then ${r.status} ${r.body.message}`);

  delete process.env.TURNSTILE_SITE_KEY;
  r = await login();
  check("with the keys removed, the check is off", r.status === 400 && !r.body.code, `${r.status} ${r.body.message}`);
} catch (e) {
  fail++;
  console.log("ERROR", e.message);
} finally {
  server.close();
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
