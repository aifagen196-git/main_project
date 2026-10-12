import { AREA_IDS } from "../services/resume/resumeOwnership.js";

// The Area of interest choices (services/resume/resumeOwnership.js AREAS).
// Phone numbers are checked in utils/phone.js.
export function validArea(v) {
  return AREA_IDS.includes(v);
}
