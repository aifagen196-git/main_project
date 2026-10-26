import test from "node:test";
import assert from "node:assert/strict";
import { isSubscribed, trialDaysLeft } from "../../frontend/src/utils/plan.js";

const DAY = 864e5;
const trial = (days) => ({ plan: "basic", subscription_status: "trialing", current_period_end: new Date(Date.now() + days * DAY).toISOString() });

test("plan: access needs a paid plan, an active status and time left", () => {
  assert.equal(isSubscribed(trial(3)), true);
  assert.equal(isSubscribed(trial(-1)), false);
  assert.equal(isSubscribed({ plan: "none", subscription_status: "active" }), false);
  assert.equal(isSubscribed({ plan: "premium", subscription_status: "canceled" }), false);
  assert.equal(isSubscribed({ plan: "premium", subscription_status: "active", current_period_end: null }), true);
});

test("plan: trial days left round up", () => {
  assert.equal(trialDaysLeft(trial(3.5)), 4);
  assert.equal(trialDaysLeft(trial(0.2)), 1);
  assert.equal(trialDaysLeft(trial(-1)), 0);
  assert.equal(trialDaysLeft({ plan: "premium", subscription_status: "active" }), null);
});
