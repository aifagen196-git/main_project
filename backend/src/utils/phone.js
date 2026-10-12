// Phone numbers in international (E.164) form: + country code + digits.
//
// Users who sign up or verify themselves may only use US numbers. Admins
// creating or editing accounts may also use Indian numbers (team members and
// clients in India).

// US (NANP): area code and exchange each start 2-9, e.g. +1 (555) 234-5678.
const US = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
// India: 10-digit mobile numbers start 6-9.
const INDIA = /^\+91[6-9]\d{9}$/;

function normalize(input) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`; // US number typed without +1
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** A US mobile number as +1XXXXXXXXXX, or null. */
export function toUsE164(input) {
  const n = normalize(input);
  return n && US.test(n) ? n : null;
}

/** A US or Indian mobile number in E.164, or null (admin-entered numbers). */
export function toAdminE164(input) {
  const n = normalize(input);
  return n && (US.test(n) || INDIA.test(n)) ? n : null;
}
