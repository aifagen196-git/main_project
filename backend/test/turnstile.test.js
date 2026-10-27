import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile, turnstileSiteKey } from "../src/utils/turnstile.js";
import { requireTurnstile } from "../src/middleware/requireTurnstile.js";

const reply = (body) => async () => ({ json: async () => body });

test("turnstile: Cloudflare's answer decides", async () => {
  assert.deepEqual(await verifyTurnstile("tok", { fetchImpl: reply({ success: true, action: "login" }), action: "login" }), { ok: true });
  assert.equal((await verifyTurnstile("tok", { fetchImpl: reply({ success: false, "error-codes": ["timeout-or-duplicate"] }) })).reason, "timeout-or-duplicate");
  assert.equal((await verifyTurnstile("tok", { fetchImpl: reply({ success: true, action: "signup" }), action: "login" })).reason, "wrong-action");
});

test("turnstile: no token, oversized token or no answer is refused", async () => {
  assert.equal((await verifyTurnstile("", {})).reason, "missing");
  assert.equal((await verifyTurnstile("x".repeat(2049), {})).reason, "missing");
  const down = async () => { throw new Error("network"); };
  assert.equal((await verifyTurnstile("tok", { fetchImpl: down })).reason, "unreachable");
});

function run(mw, body = {}) {
  return new Promise((resolve) => {
    const req = { body, headers: {}, socket: { remoteAddress: "203.0.113.9" } };
    const res = { status(s) { this.s = s; return this; }, json(b) { resolve({ status: this.s, body: b }); } };
    mw(req, res, () => resolve({ next: true }));
  });
}

test("turnstile: off until both keys are set", async () => {
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(turnstileSiteKey(), null);
  assert.deepEqual(await run(requireTurnstile("login")), { next: true });
});

test("turnstile: with keys set, the form needs a passing token", async () => {
  process.env.TURNSTILE_SITE_KEY = "site";
  process.env.TURNSTILE_SECRET_KEY = "secret";
  try {
    const pass = async () => ({ ok: true });
    const missing = async () => ({ ok: false, reason: "missing" });
    const down = async () => ({ ok: false, reason: "unreachable" });
    assert.deepEqual(await run(requireTurnstile("login", pass), { captchaToken: "t" }), { next: true });
    const r1 = await run(requireTurnstile("login", missing));
    assert.equal(r1.status, 400);
    assert.equal(r1.body.code, "CAPTCHA_FAILED");
    assert.equal((await run(requireTurnstile("login", down), { captchaToken: "t" })).status, 503);
  } finally {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});
