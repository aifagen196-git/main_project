// Re-export shim: the new (collectors/normalize/*) files expect
// collectors/processors/extractProfile.js, but the real implementation (and
// all the helpers it composes — experienceExtractor, educationExtractor,
// etc.) already lives at job-engine/processors/, shared with every other
// collector. Avoids a second copy of that logic.
export * from "../../processors/extractProfile.js";
