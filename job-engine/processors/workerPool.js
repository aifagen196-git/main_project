// processors/workerPool.js
//
// Bounded-concurrency task runner. Collectors need to fetch many independent
// detail pages without either serializing (too slow) or firing all requests
// at once (gets the IP rate-limited/blocked). This runs `concurrency` workers
// pulling from a shared queue.

/**
 * @param {Array<T>} items
 * @param {(item: T, index: number) => Promise<R>} worker
 * @param {number} concurrency
 * @returns {Promise<R[]>} results in the same order as `items`
 */
export async function runPool(items, worker, concurrency = 5) {
  const results = new Array(items.length);
  let idx = 0;

  async function runOne() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    runOne,
  );
  await Promise.all(workers);
  return results;
}

export default runPool;
