// processors/extractJobProfile.js
//
// Default-export shim so callers can `import extractJobProfile from
// "./extractJobProfile.js"`. The real implementation (regex/dictionary
// heuristic, or Claude when COLLECTOR_LLM=on) lives in extractProfile.js and is
// shared with the ATS collectors, so there is a single source of truth.
import { extractJobProfile } from "../collectors/processors/extractProfile.js";

export default extractJobProfile;
