// Re-export the canonical skill extractor. Single source of truth lives in
// backend/src/knowledge/skills.js — do not duplicate the dictionary here.
export { extractSkills, SKILLS } from "../../backend/src/knowledge/skills.js";
