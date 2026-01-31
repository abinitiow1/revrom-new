export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 4000, retries = 0) {
  const start = Date.now();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ac.signal });
      clearTimeout(id);
      const took = Date.now() - start;
      try {
        console.info(`client-fetch: ${new URL(url, window.location.href).pathname} ${res.status} ${took}ms`);
      } catch {}
      return res;
    } catch (err: any) {
      clearTimeout(id);
      if (err?.name === 'AbortError') {
        if (attempt === retries) {
          const e: any = new Error('Request timed out');
          e.name = 'TimeoutError';
          throw e;
        }
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  const e: any = new Error('Failed to fetch');
  e.name = 'FetchError';
  throw e;
}
