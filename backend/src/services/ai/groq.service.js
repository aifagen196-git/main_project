// backend/src/services/ai/groq.service.js
//
// Groq provider (OpenAI-compatible REST, no SDK dependency). Used by the AI
// layer in anthropic.service.js according to which provider keys are set.
// Configure with GROQ_API_KEY (+ optional GROQ_MODEL) in backend/.env.

const GROQ_MODEL = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Per-request deadline. Must stay well under the frontend's upload timeout so a
// stalled provider surfaces as a fast, clear failure instead of a hung request.
const REQUEST_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 25000);

export function groqAvailable() {
  return Boolean(process.env.GROQ_API_KEY);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Text completion via Groq chat completions. Mirrors completeText's contract
 * (prompt + optional system + max tokens -> trimmed text).
 *
 * opts.json: force valid JSON output (response_format json_object) — REQUIRED
 * by callers that parse the reply; open models drift into markdown otherwise.
 * Retries 429/503 with backoff like the other providers.
 */
export async function groqCompleteText(prompt, system, maxTokens = 3000, opts = {}) {
  if (!groqAvailable()) throw new Error("GROQ_API_KEY not set");

  // Groq's json_object mode REJECTS the request (400) unless the word "json"
  // literally appears somewhere in the messages. Guarantee it regardless of
  // how the caller's prompt is worded.
  let sys = system;
  if (opts.json && !/json/i.test(`${system || ""} ${prompt}`)) {
    sys = `${system ? system + "\n\n" : ""}Respond with valid JSON only.`;
  }

  const body = {
    model: GROQ_MODEL(),
    max_tokens: maxTokens,
    messages: [
      ...(sys ? [{ role: "system", content: sys }] : []),
      { role: "user", content: prompt },
    ],
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  };

  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // HARD TIMEOUT. Without this a stalled Groq connection hangs forever and
    // takes the whole caller with it — a resume upload sat open past 100s with
    // no response and no error until the browser gave up ("The server took too
    // long to respond"). Never issue a provider request without a deadline.
    let res;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      // Timeout / network error — retry, then give up so the caller can fall
      // through to the next provider instead of blocking.
      lastErr = new Error(
        e.name === "TimeoutError" || e.name === "AbortError"
          ? `Groq request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : `Groq request failed: ${e.message}`,
      );
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(2000);
        continue;
      }
      throw lastErr;
    }

    if (res.status === 429 || res.status === 503) {
      // Groq sends retry-after on rate limits; honor it, else back off. Cap the
      // wait so a long retry-after can't stall the request past the caller's
      // own timeout.
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      lastErr = new Error(`Groq ${res.status}`);
      if (attempt === MAX_ATTEMPTS - 1) break;
      await sleep(Math.min(retryAfter || 3 * 2 ** attempt, 10) * 1000);
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error("Groq returned an empty response");
    return text;
  }
  throw lastErr;
}
