// processors/retry.js
//
// Shared retry helper for collectors. Wraps a single async attempt with
// exponential backoff + jitter, and honors a `Retry-After` header when present
// (capped — a bare `retry-after: 3952` from Groq once caused a 66-minute hang
// in the backend; the same class of bug is possible here against any ATS/API).

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryAfterMs(err) {
  const header = err?.response?.headers?.["retry-after"];
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds)) return null;
  return seconds * 1000;
}

function isRetryable(err) {
  const status = err?.response?.status;
  if (status === 429) return true;
  if (status >= 500) return true;
  // Network-level failures (timeout, reset, DNS) — no response at all.
  if (!status) return true;
  return false;
}

/**
 * @param {() => Promise<any>} fn - the attempt to retry
 * @param {object} opts
 * @param {number} opts.maxRetries
 * @param {number} opts.baseDelayMs
 * @param {number} opts.maxDelayMs
 * @param {(err: any) => boolean} opts.shouldRetry - override default retry predicate
 * @param {(attempt: number, delayMs: number, err: any) => void} opts.onRetry
 */
export async function withRetry(fn, opts = {}) {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const shouldRetry = opts.shouldRetry ?? isRetryable;

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !shouldRetry(err)) throw err;

      const backoff = Math.min(
        baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs,
        maxDelayMs,
      );
      const delayMs = Math.min(retryAfterMs(err) ?? backoff, maxDelayMs);

      opts.onRetry?.(attempt + 1, delayMs, err);
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

export default withRetry;
