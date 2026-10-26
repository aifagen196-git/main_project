// Turns a password-only session into a two-step (aal2) one through the API,
// the way an admin does with an authenticator app. For the test scripts.
import crypto from "node:crypto";
function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
export function totp(secret) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
export async function upgradeToAal2(api, token) {
  const post = async (p, body) => (await fetch(api + p, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body || {}) })).json();
  const e = await post("/api/auth/mfa/enroll");
  const v = await post("/api/auth/mfa/verify", { factorId: e.factorId, code: totp(e.secret) });
  if (!v.session?.access_token) throw new Error("two-step upgrade failed: " + JSON.stringify(v).slice(0, 120));
  return v.session.access_token;
}
