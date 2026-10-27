import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { paidTimeStartsAt, basicWhilePremium, periodEndFor } from "../src/routes/payments.routes.js";

const now = new Date("2026-10-27T12:00:00Z");
const inDays = (d) => new Date(now.getTime() + d * 864e5).toISOString();

test("paying: with no plan, the time starts now", () => {
  assert.equal(paidTimeStartsAt({ plan: "none", subscription_status: "inactive" }, now).getTime(), now.getTime());
});

test("paying: during the free trial, the time starts when the trial ends", () => {
  const p = { plan: "basic", subscription_status: "trialing", current_period_end: inDays(4) };
  assert.equal(paidTimeStartsAt(p, now).toISOString(), inDays(4));
});

test("paying: with paid time left, the new time is added after it", () => {
  const p = { plan: "basic", subscription_status: "active", current_period_end: inDays(10) };
  assert.equal(paidTimeStartsAt(p, now).toISOString(), inDays(10));
  assert.equal(periodEndFor("monthly", paidTimeStartsAt(p, now)), "2026-12-06T12:00:00.000Z");
});

test("paying: an ended plan starts again from now", () => {
  const p = { plan: "premium", subscription_status: "active", current_period_end: inDays(-2) };
  assert.equal(paidTimeStartsAt(p, now).getTime(), now.getTime());
});

test("paying: Basic can't be bought while Premium runs", () => {
  const premium = { plan: "premium", subscription_status: "active", current_period_end: inDays(30) };
  assert.equal(basicWhilePremium(premium, "basic", now), true);
  assert.equal(basicWhilePremium(premium, "premium", now), false);
  assert.equal(basicWhilePremium({ ...premium, current_period_end: inDays(-1) }, "basic", now), false);
  assert.equal(basicWhilePremium({ plan: "basic", subscription_status: "active", current_period_end: inDays(30) }, "basic", now), false);
});
