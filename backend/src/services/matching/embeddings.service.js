// backend/src/services/matching/embeddings.service.js
//
// Stage-2 semantic retrieval: embeds resumes and job descriptions so the
// scorer can blend a cosine-similarity component (job.__semantic) into the
// heuristic score. Design constraints:
//
//   - PLUGGABLE provider. OpenAI text-embedding-3-small by default (1536 dims,
//     matches the pgvector column in migration 0007). Fails soft: if no
//     EMBEDDINGS_API_KEY is configured, every call returns null and the scorer
//     simply runs without the semantic component — nothing breaks.
//   - E5-style asymmetric prefixes are NOT needed for OpenAI models, but the
//     resume/job framing below mirrors resu-matchr's query:/passage: idea:
//     embed the two sides with consistent role framing so the space is stable.
//   - CONTENT-HASH CACHE (match-line pattern): embeddings are deterministic,
//     so re-embedding identical text is pure waste. In-process LRU keyed by
//     sha256; persisted vectors live in the DB columns (jobs.embedding,
//     resumes.embedding) so restarts don't re-pay for the whole pool.

import crypto from "crypto";

const PROVIDER = process.env.EMBEDDINGS_PROVIDER || "openai";
const API_KEY = process.env.EMBEDDINGS_API_KEY || process.env.OPENAI_API_KEY || "";
const MODEL = process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
const DIMS = Number(process.env.EMBEDDINGS_DIMS || 1536);
const MAX_CHARS = 8000; // ~2k tokens; JDs beyond this add noise, not signal.

export function embeddingsEnabled() {
  return Boolean(API_KEY) && PROVIDER === "openai";
}

// ---- cache -----------------------------------------------------------------
const CACHE_MAX = 2000;
const cache = new Map(); // sha256 -> vector

function cacheKey(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit) {
    // refresh recency (Map preserves insertion order)
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit || null;
}

function cacheSet(key, vec) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, vec);
}

// ---- provider --------------------------------------------------------------
async function embedBatchOpenAI(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIMS }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embeddings API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Embed a list of texts. Returns an array of vectors (or nulls per item on
 * failure). Cached by content hash. Returns all-null when disabled.
 */
export async function embedTexts(texts = []) {
  if (!embeddingsEnabled() || !texts.length) return texts.map(() => null);

  const prepared = texts.map((t) => String(t || "").slice(0, MAX_CHARS));
  const out = new Array(texts.length).fill(null);
  const missing = [];

  prepared.forEach((t, i) => {
    if (!t.trim()) return;
    const hit = cacheGet(cacheKey(t));
    if (hit) out[i] = hit;
    else missing.push(i);
  });

  // Batch the misses (OpenAI accepts up to 2048 inputs; stay conservative).
  const BATCH = 64;
  for (let start = 0; start < missing.length; start += BATCH) {
    const idxs = missing.slice(start, start + BATCH);
    try {
      const vecs = await embedBatchOpenAI(idxs.map((i) => prepared[i]));
      idxs.forEach((i, j) => {
        out[i] = vecs[j];
        cacheSet(cacheKey(prepared[i]), vecs[j]);
      });
    } catch (e) {
      console.error("Embedding batch failed:", e.message);
      // leave nulls — scorer degrades gracefully
    }
  }
  return out;
}

/** Framing helpers (resu-matchr convention): consistent role framing. */
export function resumeEmbeddingText(profile = {}, resumeText = "") {
  const head = [
    `Candidate: ${profile.role_family || ""} ${profile.seniority || ""}`,
    `Skills: ${(profile.skills || []).slice(0, 30).join(", ")}`,
    String(resumeText).slice(0, 4000),
  ].join("\n");
  return head;
}

export function jobEmbeddingText(job = {}) {
  return [
    `Job: ${job.title || ""} at ${job.company || ""}`,
    `Required: ${(job.skills_required || []).join(", ")}`,
    String(job.description || "").slice(0, 5000),
  ].join("\n");
}

/** Cosine similarity for two same-length vectors; 0 on any problem. */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Map raw cosine (typically 0.15–0.75 for text-embedding-3-small on this
 * domain) onto a usable 0..1 component. Below `lo` reads as unrelated; above
 * `hi` as strongly related. Linear in between — calibrated conservatively so
 * the semantic component rescues relevant jobs without inflating noise.
 */
export function cosineToComponent(sim, lo = 0.2, hi = 0.6) {
  if (sim <= lo) return 0;
  if (sim >= hi) return 1;
  return (sim - lo) / (hi - lo);
}
