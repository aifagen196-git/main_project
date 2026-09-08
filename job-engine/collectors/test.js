// collectors/test.js

import dotenv from "dotenv";

dotenv.config({ path: ".env" });

console.log(process.env.SUPABASE_URL);
console.log(
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "SERVICE KEY FOUND"
    : "SERVICE KEY MISSING",
);
