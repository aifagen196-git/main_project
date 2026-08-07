// backend/src/services/ai/gemini.service.js
//
// BACKUP provider: Google Gemini, used only when the Claude call fails
// (anthropic.service.js falls back here). Plain REST — no SDK dependency.
// Configure with GEMINI_API_KEY (+ optional GEMINI_MODEL) in backend/.env.

// Model CHAIN, tried in order. First entry is the configured/primary model;
// the rest absorb per-model quota limits (429) and retirements (404) — Google
// ages out pinned ids for new API keys, so never rely on a single one.
//
// gemini-3.1-flash-lite is the primary on purpose: it's a current STABLE
// model, answers in <1s, and free-tier quota actually allows it. The bigger
// "thinking" flashes (3.5-flash, flash-latest) give better quality but take
// 10-25s per call — acceptable as a last resort, not as the default backup.
function modelChain() {
  const chain = [
    process.env.GEMINI_MODEL,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
  ].filter(Boolean);
  return [...new Set(chain)];
}

export function geminiAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel(model, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const MAX_ATTEMPTS = 2;
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 503) {
      // Transient overload: brief retry on the SAME model.
      lastErr = new Error(`Gemini ${model}: 503`);
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new Error(`Gemini ${model}: ${res.status} ${detail.slice(0, 150)}`);
      // 404 (model retired for this key) / 429 (per-model quota) — caller
      // should move on to the next model in the chain.
      err.tryNextModel = res.status === 404 || res.status === 429;
      throw err;
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();
    if (!text) {
      // Thinking models can burn the whole token budget on thoughts.
      const err = new Error(`Gemini ${model}: empty response`);
      err.tryNextModel = true;
      throw err;
    }
    return text;
  }
  lastErr.tryNextModel = true;
  throw lastErr;
}

/**
 * Text completion via Gemini generateContent. Mirrors completeText's
 * contract (prompt + optional system + max tokens -> trimmed text).
 * Walks the model chain so one retired/quota-capped model can't kill the backup.
 *
 * opts.json: force syntactically valid JSON output (responseMimeType). The
 * lite models routinely IGNORE prose "reply with JSON only" instructions and
 * answer in markdown — which silently broke resume analysis during fallback.
 * Callers that parse the reply must set this.
 */
export async function geminiCompleteText(prompt, system, maxTokens = 3000, opts = {}) {
  if (!geminiAvailable()) throw new Error("GEMINI_API_KEY not set");

  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let lastErr;
  for (const model of modelChain()) {
    try {
      return await callModel(model, body);
    } catch (e) {
      lastErr = e;
      if (!e.tryNextModel) throw e;
      console.warn(`[gemini] ${String(e.message).slice(0, 120)} — trying next model`);
    }
  }
  throw lastErr;
}
