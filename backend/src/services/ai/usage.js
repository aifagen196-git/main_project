import { supabase } from "../../config/supabase.js";

let warnedMissing = false;

/**
 * Atomically check + consume one AI use for a user (server-side plan
 * enforcement). Returns true if allowed.
 *
 * FAIL-OPEN by design: the enforcement depends on the `consume_ai_usage` RPC +
 * `ai_usage` table. If that infrastructure isn't set up in the database, we let
 * the AI feature work (return true) instead of blocking it — so the app is
 * usable out of the box. When the RPC exists, limits are enforced normally.
 */
export async function consumeAiUsage(userId) {
  const { data, error } = await supabase.rpc("consume_ai_usage", {
    p_user_id: userId,
  });
  if (error) {
    // Not-set-up errors (missing function/table) → allow. Log once.
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        "[usage] consume_ai_usage unavailable — AI usage limits are NOT enforced. " +
          "Apply supabase/migrations/0000_init.sql to enable them. (" +
          error.message +
          ")",
      );
    }
    return true;
  }
  return data === true;
}
