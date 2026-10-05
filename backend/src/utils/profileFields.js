import { AREA_IDS } from "../services/resume/resumeOwnership.js";

// Name, mobile number and area of interest are set at sign-up and can only be
// changed by an admin (PATCH /api/admin/users/:id/details).

// Same rules as the sign-up form (AuthScreen.jsx): 7-15 digits, optional
// leading +, spaces/dashes/brackets allowed.
const MOBILE_RE = /^\+?[0-9(][0-9 ()-]{6,18}$/;
export function validMobile(v) {
  const digits = v.replace(/\D/g, "").length;
  return MOBILE_RE.test(v) && digits >= 7 && digits <= 15;
}

// The Area of interest choices (services/resume/resumeOwnership.js AREAS).
export function validArea(v) {
  return AREA_IDS.includes(v);
}
