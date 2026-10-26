import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { nameMatches, areaMatches, AREA_IDS, AREAS, areaForFamily } from "../src/services/resume/resumeOwnership.js";

const acct = { first_name: "Audit", last_name: "Probe" };

test("name: own name passes, in any order, with initials", () => {
  assert.equal(nameMatches(acct, "Audit Probe", ""), true);
  assert.equal(nameMatches(acct, "Probe, Audit", ""), true);
  assert.equal(nameMatches(acct, "A. Probe", "A. Probe"), true);
});

test("name: someone else's resume fails, even with the account email in the text", () => {
  assert.equal(nameMatches(acct, "Michael Johnson", "Michael Johnson\naudit.probe@example.com"), false);
  assert.equal(nameMatches(acct, "Audit Smith", ""), false);
});

test("name: AI missed the name -> the top of the text decides", () => {
  assert.equal(nameMatches(acct, "", "AUDIT PROBE\nDevOps"), true);
  assert.equal(nameMatches(acct, "", "Michael Johnson\nDevOps"), false);
});

test("areas: every area has a label and a rule", () => {
  assert.equal(AREA_IDS.length, 30);
  for (const id of AREA_IDS) {
    const r = AREAS[id];
    assert.ok(r.label, id);
    assert.ok(r.any || r.families || r.keywords, `${id} needs a rule`);
  }
});

test("areas: matching rules", () => {
  assert.equal(areaMatches("devops", "devops", ""), true);
  assert.equal(areaMatches("devops", "supply-chain", ""), false);
  assert.equal(areaMatches("sap", "other", "SAP S/4 HANA consultant"), true);
  assert.equal(areaMatches("sap", "other", "Java developer"), false);
  assert.equal(areaMatches("java-developer", "backend-engineering", "Spring Boot microservices"), true);
  assert.equal(areaMatches("java-developer", "backend-engineering", "Python Django"), false);
  assert.equal(areaMatches("cybersecurity", "software-engineering", "security"), false);
  assert.equal(areaMatches("others", "supply-chain", "anything"), true);
  assert.equal(areaMatches("not-an-area", "devops", "x"), false);
});

test("areas: backfill from the resume field", () => {
  assert.equal(areaForFamily("cloud-engineering"), "cloud-engineer");
  assert.equal(areaForFamily("design"), "ui-ux-designer");
  assert.equal(areaForFamily("other"), null);
});
