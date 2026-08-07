import Anthropic from "@anthropic-ai/sdk";
import { geminiAvailable, geminiCompleteText } from "./gemini.service.js";
import { groqAvailable, groqCompleteText } from "./groq.service.js";

// Anthropic client. Credentials live only on the server (ANTHROPIC_API_KEY).
// Created lazily: constructing the SDK without a key throws, and the key may
// deliberately be absent while another provider (Groq/Gemini) is active.
let client = null;
function anthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends a prompt to Claude and returns the text response. Retries once on a
 * 429 rate-limit, honoring the retry-after header. Prompts in this app ask for
 * JSON only; callers parse the result.
 */
/** Calls the API, retrying 429 (rate limit) / 529 (overloaded) with backoff. */
async function createMessage(params) {
  const c = anthropicClient();
  if (!c) throw new Error("ANTHROPIC_API_KEY not set");
  const MAX_ATTEMPTS = Number(process.env.ANTHROPIC_MAX_RETRIES || 4);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await c.messages.create(params);
    } catch (e) {
      const retryable = e.status === 429 || e.status === 529;
      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = Number(e.headers?.["retry-after"]) || 0;
        const backoff = retryAfter || Math.min(4 * 2 ** attempt, 30); // 4,8,16,30s
        await sleep(backoff * 1000);
        continue;
      }
      throw e;
    }
  }
}

function textOf(response) {
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// PROVIDER CHAIN: Claude (if key set) -> Groq (if key set) -> Gemini (if key
// set). Every AI feature funnels through completeText/completeJson, so this
// one chain covers resume analysis, improve, rewrite, and the judge. A
// provider without a key is skipped, so commenting keys in .env is how you
// pick the active provider. opts.json forces JSON output mode on Groq/Gemini
// — open/lite models ignore prose "JSON only" instructions otherwise.
export async function completeText(
  prompt,
  system,
  maxTokens = 3000,
  model = MODEL,
  opts = {},
) {
  let lastErr;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await createMessage({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      });
      return textOf(response);
    } catch (e) {
      lastErr = e;
      console.warn(`[ai] Claude failed (${e.status || e.message}) — trying next provider`);
    }
  }

  if (groqAvailable()) {
    try {
      return await groqCompleteText(prompt, system, maxTokens, { json: opts.json });
    } catch (e) {
      lastErr = e;
      console.warn(`[ai] Groq failed (${String(e.message).slice(0, 80)}) — trying next provider`);
    }
  }

  if (geminiAvailable()) {
    try {
      return await geminiCompleteText(prompt, system, maxTokens, { json: opts.json });
    } catch (e) {
      lastErr = e;
      console.warn(`[ai] Gemini failed (${String(e.message).slice(0, 80)})`);
    }
  }

  throw lastErr || new Error("No AI provider configured (set ANTHROPIC_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY)");
}

/** Strip code fences and pull out the outermost JSON object if the model
 *  wrapped it in prose. */
function extractJsonText(raw) {
  let s = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (s.startsWith("{") || s.startsWith("[")) return s;
  // Model prefixed prose — salvage the first {...} / [...] block.
  const start = s.search(/[{[]/);
  if (start === -1) return s;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  return end > start ? s.slice(start, end + 1) : s;
}

/**
 * Same as completeText but strips markdown code fences and parses JSON.
 * Retries once on a malformed response (a truncated or prose-wrapped reply is
 * a transient model failure, not a permanent one). Throws if it can't parse.
 */
export async function completeJson(
  prompt,
  system,
  maxTokens = 3000,
  model = MODEL,
) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await completeText(prompt, system, maxTokens, model, { json: true });
    try {
      return JSON.parse(extractJsonText(raw));
    } catch (e) {
      lastErr = e;
      console.warn(
        `completeJson: invalid JSON (attempt ${attempt + 1}/2):`,
        raw.slice(0, 120).replace(/\n/g, " "),
      );
    }
  }
  throw lastErr;
}

let structuredUnsupported = false;

/**
 * Structured output: the model is CONSTRAINED to the given JSON schema, so
 * enums can't drift and the reply is always valid JSON (no fences, no prose,
 * no retry-on-parse cost). Falls back to prompt-based JSON if the API/model
 * rejects the parameter.
 */
export async function completeStructured(
  prompt,
  system,
  schema,
  maxTokens = 3000,
  model = MODEL,
) {
  // Schema-constrained output is a Claude-only feature; only attempt it when
  // Claude is the active provider. Any failure falls through to prompt-JSON
  // via completeJson, whose provider chain (Claude -> Groq -> Gemini) enforces
  // JSON output mode on the non-Claude providers.
  if (process.env.ANTHROPIC_API_KEY && !structuredUnsupported) {
    try {
      const response = await createMessage({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
        output_config: { format: { type: "json_schema", schema } },
      });
      if (response.stop_reason === "refusal") {
        throw new Error("Model refused the request");
      }
      return JSON.parse(textOf(response));
    } catch (e) {
      // 400 => this model/API doesn't accept output_config; don't retry it again.
      if (e.status === 400) {
        structuredUnsupported = true;
        console.warn(
          "[ai] structured outputs unavailable, falling back to prompt-JSON:",
          String(e.message).slice(0, 100),
        );
      } else {
        console.warn(
          `[ai] Claude structured call failed (${e.status || e.message}) — falling back to prompt-JSON chain`,
        );
      }
    }
  }
  return completeJson(prompt, system, maxTokens, model);
}
