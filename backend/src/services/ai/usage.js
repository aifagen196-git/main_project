import { AsyncLocalStorage } from "node:async_hooks";
import { supabase } from "../../config/supabase.js";

let warnedMissing = false;

/**
 * Request-scoped AI context: which user and which feature the current call
 * belongs to, plus the ai_usage row consume_ai_usage() created for it.
 *
 * The provider chain (anthropic.service.js) is three layers below the route
 * that knows the user, and every provider returns a bare string, so there is
 * no parameter to thread attribution through without changing the signature of
 * every AI function and its callers. AsyncLocalStorage carries it implicitly
 * instead, and stays correct under concurrency — each request gets its own
 * store.
 */
const aiContext = new AsyncLocalStorage();

/** Runs `fn` with an AI attribution context attached. */
export function withAiContext({ userId, feature }, fn) {
  return aiContext.run({ userId, feature, usageId: null }, fn);
}

/** The current context, or null outside a withAiContext() scope. */
export function currentAiContext() {
  return aiContext.getStore() || null;
}

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

  // Two shapes, depending on whether migration 0018 has been applied:
  //   boolean  — the original function; allowed, but the row can't be attributed
  //   bigint   — post-0018; the id of the ai_usage row just created
  //   null     — denied, either way
  const store = aiContext.getStore();
  if (typeof data === "number") {
    if (store) store.usageId = data;
    return true;
  }
  return data === true;
}

// Per-1M-token prices, used to turn token counts into the admin's cost
// figure. Only Anthropic's published rates are hardcoded — Groq and Gemini
// prices are not included because guessing them would produce a confident
// wrong number, and both providers change tiers often.
//
// Since Claude is currently disabled and Groq/Gemini serve every call, that
// means no cost is recorded by default. Set AI_MODEL_PRICES to fix that, e.g.
//
//   AI_MODEL_PRICES={"gemini-3.1-flash-lite":{"in":0.1,"out":0.4}}
//
// Keys match on prefix, so a dated snapshot (claude-haiku-4-5-20251001) hits
// its base entry. Treat every figure here as an estimate, not billing.
const DEFAULT_PRICE_PER_MTOK = {
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-opus-5": { in: 5, out: 25 },
  "claude-opus-4-8": { in: 5, out: 25 },
};

let priceTable = null;
function prices() {
  if (priceTable) return priceTable;
  priceTable = { ...DEFAULT_PRICE_PER_MTOK };
  const raw = process.env.AI_MODEL_PRICES;
  if (raw) {
    try {
      Object.assign(priceTable, JSON.parse(raw));
    } catch (e) {
      console.warn("[usage] AI_MODEL_PRICES is not valid JSON — ignoring it:", e.message);
    }
  }
  return priceTable;
}

function estimateCost(model, inputTokens, outputTokens) {
  if (!model || (!inputTokens && !outputTokens)) return null;
  const table = prices();
  const key = Object.keys(table).find((k) => String(model).startsWith(k));
  if (!key) return null;
  const p = table[key];
  const cost = ((inputTokens || 0) / 1e6) * p.in + ((outputTokens || 0) / 1e6) * p.out;
  return Math.round(cost * 1e6) / 1e6;
}

/**
 * Attaches provider/model/token/cost detail to the ai_usage row for the
 * current request. Called by whichever provider actually served the call, so
 * it records the provider that succeeded rather than the one we tried first.
 *
 * Never throws and never blocks the AI response: attribution is telemetry, and
 * losing a row of it must not fail the user's request. A no-op when there's no
 * context (a call outside a request) or no usage id (pre-0018 database).
 */
export async function reportAiCall({
  provider,
  model,
  inputTokens,
  outputTokens,
  success = true,
  error = null,
}) {
  const store = aiContext.getStore();
  if (!store?.usageId) return;

  const patch = {
    provider: provider || null,
    model: model || null,
    feature: store.feature || null,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    cost_usd: estimateCost(model, inputTokens, outputTokens),
    success,
    error: error ? String(error).slice(0, 500) : null,
  };

  const { error: dbError } = await supabase
    .from("ai_usage")
    .update(patch)
    .eq("id", store.usageId);

  if (dbError && !/column .* does not exist|schema cache/i.test(dbError.message)) {
    console.warn("[usage] attribution write failed:", dbError.message);
  }
}
