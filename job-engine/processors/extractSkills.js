// Re-export the canonical skill extractor. Single source of truth lives in
// job-engine/vendor/skills.js — do not duplicate the dictionary here.
export { extractSkills, SKILLS } from "../vendor/skills.js";
