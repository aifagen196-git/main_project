import { test } from "node:test";
import assert from "node:assert/strict";

import { existingAccount } from "../src/utils/existingAccount.js";

const now = Date.parse("2026-10-27T12:00:00Z");

test("sign-up: a new account is not mistaken for an existing one", () => {
  const user = { identities: [{ id: "x" }], email_confirmed_at: null, created_at: "2026-10-27T11:59:59Z" };
  assert.equal(existingAccount(user, null, now), null);
});

test("sign-up: confirmed email already registered", () => {
  const user = { identities: [], email_confirmed_at: null, created_at: "2026-10-27T11:59:59Z" };
  assert.equal(existingAccount(user, null, now), "confirmed");
});

test("sign-up: unconfirmed email already registered", () => {
  const user = { identities: [{ id: "x" }], email_confirmed_at: null, created_at: "2026-10-20T08:00:00Z" };
  assert.equal(existingAccount(user, null, now), "unconfirmed");
});

test("sign-up: signed straight in (confirmation off) is a new account", () => {
  const user = { identities: [{ id: "x" }], email_confirmed_at: "2026-10-27T12:00:00Z", created_at: "2026-10-27T12:00:00Z" };
  assert.equal(existingAccount(user, { access_token: "t" }, now), null);
});
