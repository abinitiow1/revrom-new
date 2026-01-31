export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 3000, retries = 0) {
  const start = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ac.signal });
      clearTimeout(id);
      const took = Date.now() - start;
      try {
        console.info(`upstream-fetch: ${new URL(url).hostname} ${res.status} ${took}ms`);
      } catch {}
      return res;
    } catch (err: any) {
      clearTimeout(id);
      // If aborted due to timeout, convert to a clearer error on last attempt
      if (err?.name === 'AbortError') {
        if (attempt === retries) {
          const e: any = new Error('Upstream request timed out');
          e.statusCode = 504;
          throw e;
        }
      }

      if (attempt === retries) throw err;
      // Simple exponential-ish backoff
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  const e: any = new Error('Failed to fetch');
  e.statusCode = 502;
  throw e;
}
