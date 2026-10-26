import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { toUsE164, toAdminE164 } from "../src/utils/phone.js";
import { PRICING, planAmount } from "../src/services/payments/razorpay.service.js";
import { periodEndFor, VALID_PAIRS, TRIAL_DAYS } from "../src/routes/payments.routes.js";
import { PRICING_CARDS } from "../../frontend/src/utils/plan.js";
import { AREAS_OF_INTEREST } from "../../frontend/src/utils/areas.js";
import { AREA_IDS, AREAS } from "../src/services/resume/resumeOwnership.js";
import { validArea } from "../src/utils/profileFields.js";

test("phone: US numbers only for self sign-up", () => {
  assert.equal(toUsE164("(202) 555-0145"), "+12025550145");
  assert.equal(toUsE164("+1 202 555 0145"), "+12025550145");
  assert.equal(toUsE164("+91 98765 43210"), null);
  assert.equal(toUsE164("123"), null);
  assert.equal(toUsE164("(055) 555-0145"), null);
});

test("phone: admins may also use Indian numbers", () => {
  assert.equal(toAdminE164("+91 98765 43210"), "+919876543210");
  assert.equal(toAdminE164("+44 20 7946 0958"), null);
});

test("prices: server prices match the plan cards the site shows", () => {
  for (const card of PRICING_CARDS) {
    assert.equal(PRICING[card.id][card.billingCycle], card.price, `${card.id}:${card.billingCycle}`);
    assert.ok(VALID_PAIRS.has(`${card.id}:${card.billingCycle}`));
  }
  assert.equal(VALID_PAIRS.size, PRICING_CARDS.length);
  assert.equal(planAmount("basic", "monthly"), 22900);
  assert.throws(() => planAmount("basic", "lifetime"));
});

test("plan period: monthly adds a month, one-time adds six", () => {
  const from = new Date("2026-01-15T10:00:00Z");
  assert.equal(periodEndFor("monthly", from), "2026-02-15T10:00:00.000Z");
  assert.equal(periodEndFor("semiannual", from), "2026-07-15T10:00:00.000Z");
});

test("trial is 7 days", () => assert.equal(TRIAL_DAYS, 7));

test("areas: website, admin-facing list and server list agree", () => {
  assert.deepEqual(AREAS_OF_INTEREST.map((a) => a[0]).sort(), [...AREA_IDS].sort());
  for (const [id, label] of AREAS_OF_INTEREST) assert.equal(AREAS[id].label, label);
  assert.equal(validArea("devops"), true);
  assert.equal(validArea("<script>"), false);
});
