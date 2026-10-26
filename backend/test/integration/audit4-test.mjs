// Checks this round's server changes against the local backend (port 5000):
// resume upload counts toward the daily AI allowance, only the latest 10
// resumes are kept, applications are capped, admin sees time since last
// collector run. One throwaway account (deleted at the end, with its rows).
// node audit4-test.mjs <repoRoot>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { upgradeToAal2 } from "./mfa-helper.mjs";

const root = process.argv[2];
const env = Object.fromEntries(fs.readFileSync(path.join(root, "backend/.env"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const { Document, Packer, Paragraph } = createRequire(path.join(root, "backend/package.json"))("docx");
const SB = env.SUPABASE_URL;
const S = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const API = "http://127.0.0.1:5000";
const tag = crypto.randomBytes(3).toString("hex");
let pass = 0, fail = 0;
const check = (l, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 120) }; } };
const sb = async (m, p, body, h = {}) => j(await fetch(SB + p, { method: m, headers: { ...S, ...h }, body: body ? JSON.stringify(body) : undefined }));
const countRows = async (t, q) => (await fetch(`${SB}/rest/v1/${t}?select=id&${q}`, { method: "HEAD", headers: { ...S, Prefer: "count=exact" } })).headers.get("content-range")?.split("/")[1];

let uid;
try {
  const email = `audit-q-${tag}@aifagenlabs.com`;
  const password = crypto.randomBytes(16).toString("base64url");
  const u = await sb("POST", "/auth/v1/admin/users", { email, password, email_confirm: true, user_metadata: { first_name: "Quota", last_name: "Tester", area_of_interest: "devops", mobile: "+12025550171" } });
  uid = u.id;
  const login = await j(await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }));
  const tok = login.session.access_token;
  const H = { Authorization: `Bearer ${tok}` };
  await fetch(API + "/api/payments/trial", { method: "POST", headers: H });

  // ---- 12 old resumes already stored → after one upload only 10 remain
  const old = Array.from({ length: 12 }, (_, i) => ({ user_id: uid, file_name: `old-${i}.pdf`, file_path: `${uid}/old-${i}.pdf`, extracted_text: "old", uploaded_at: new Date(Date.now() - (i + 1) * 864e5).toISOString() }));
  await sb("POST", "/rest/v1/resumes", old, { Prefer: "return=minimal" });
  check("12 old resumes seeded", (await countRows("resumes", `user_id=eq.${uid}`)) === "12");

  const doc = await Packer.toBuffer(new Document({ sections: [{ children: [
    "Quota Tester", "Senior DevOps Engineer", "Austin, TX",
    "Summary: DevOps engineer with 7 years building CI/CD pipelines, Kubernetes platforms and AWS infrastructure with Terraform.",
    "Experience: Senior DevOps Engineer, Acme (2020-2025) - Jenkins and GitHub Actions pipelines, EKS clusters, Terraform modules, Prometheus and Grafana monitoring, Docker, Helm.",
    "Skills: AWS, Kubernetes, Docker, Terraform, Jenkins, Ansible, Helm, Linux, Python, Bash",
  ].map((t) => new Paragraph(t)) }] }));
  const usedBefore = Number(await countRows("ai_usage", `user_id=eq.${uid}`));
  const fd = new FormData();
  fd.append("file", new Blob([doc], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "qt.docx");
  const up = await fetch(API + "/api/resumes", { method: "POST", headers: H, body: fd });
  const upb = await j(up);
  check("real resume upload accepted", up.status === 201, `${up.status} ${upb.message || ""}`);
  const usedAfter = Number(await countRows("ai_usage", `user_id=eq.${uid}`));
  check("upload counted toward the daily AI allowance", usedAfter === usedBefore + 1, `${usedBefore} -> ${usedAfter}`);
  const left = await sb("GET", `/rest/v1/resumes?user_id=eq.${uid}&select=file_name&order=uploaded_at.desc`);
  check("only the latest 10 resumes kept", left.length === 10 && left[0].file_name === "qt.docx", `${left.length} left, newest ${left[0]?.file_name}`);

  // ---- Daily allowance used up → upload refused, nothing stored
  const fill = Array.from({ length: 25 }, () => ({ user_id: uid }));
  await sb("POST", "/rest/v1/ai_usage", fill, { Prefer: "return=minimal" });
  const fd2 = new FormData();
  fd2.append("file", new Blob([doc], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "qt2.docx");
  const up2 = await fetch(API + "/api/resumes", { method: "POST", headers: H, body: fd2 });
  const up2b = await j(up2);
  check("upload refused once today's allowance is used", up2.status === 429 && up2b.code === "AI_LIMIT", `${up2.status} ${up2b.message}`);
  check("refused upload left no new resume", (await countRows("resumes", `user_id=eq.${uid}`)) === "10");

  // ---- Applications cap
  const apps = Array.from({ length: 1000 }, (_, i) => ({ user_id: uid, company: "Cap Co", role: `Role ${i}`, status: "applied" }));
  await sb("POST", "/rest/v1/applications", apps, { Prefer: "return=minimal" });
  const ap = await fetch(API + "/api/applications", { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ company: "One more", role: "Engineer" }) });
  const apb = await j(ap);
  check("application #1001 refused", ap.status === 409, `${ap.status} ${apb.message}`);

  // ---- Admin: time since last collector run
  await sb("POST", "/rest/v1/admins", { user_id: uid });
  const adminTok = await upgradeToAal2(API, tok);
  const cr = await j(await fetch(API + "/api/admin/collector-runs", { headers: { Authorization: `Bearer ${adminTok}` } }));
  check("admin sees hours since the last collector run", typeof cr.hoursSinceLastRun === "number" && !!cr.lastRunAt, `${cr.hoursSinceLastRun} h since ${cr.lastRunAt}`);
} catch (e) {
  fail++;
  console.log("ERROR", e.stack || e);
} finally {
  if (uid) {
    await fetch(`${SB}/rest/v1/admins?user_id=eq.${uid}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/rest/v1/applications?user_id=eq.${uid}`, { method: "DELETE", headers: S });
    const files = await sb("POST", "/storage/v1/object/list/resumes", { prefix: uid, limit: 100 });
    for (const f of files || []) await fetch(`${SB}/storage/v1/object/resumes/${uid}/${f.name}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: S });
    await fetch(`${SB}/rest/v1/trial_claims?phone=eq.${encodeURIComponent("+12025550171")}`, { method: "DELETE", headers: S });
    const leftover = await countRows("resumes", `user_id=eq.${uid}`);
    console.log(`\ncleanup: account deleted, resumes left=${leftover}`);
  }
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
}

process.exitCode = fail ? 1 : 0;
