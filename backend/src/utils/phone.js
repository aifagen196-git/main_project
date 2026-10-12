// SMS needs numbers in international (E.164) form: + country code + digits,
// e.g. +15551234567. People type them with spaces, dashes and brackets, and
// US users often leave off the +1.
export function toE164(input) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return /^\d{8,15}$/.test(digits) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`; // US number without country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
