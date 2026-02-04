/**
 * Cloudflare Turnstile loader (singleton)
 *
 * Why:
 * - In SPAs, multiple Turnstile widgets can mount at once.
 * - Relying on a global `window.onTurnstileLoad` callback is race-prone because it can be overwritten.
 * - A shared Promise ensures the script is injected once and all widgets await readiness.
 */
import type { TurnstileAPI } from './turnstileTypes';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loadPromise: Promise<TurnstileAPI> | null = null;

const waitFor = async <T>(
  fn: () => T | null | undefined,
  opts: { timeoutMs: number; intervalMs: number; label: string }
): Promise<T> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= opts.timeoutMs) {
    const val = fn();
    if (val) return val;
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }

  throw new Error(`Timed out waiting for ${opts.label}`);
};

export function loadTurnstile(): Promise<TurnstileAPI> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile can only load in the browser'));
  }

  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // If script already exists, do not inject again.
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // If the script is blocked by CSP/network, script.onerror fires but can be missed if attached late.
    // We therefore also poll for `window.turnstile` with a timeout.
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const onLoad = () => resolve();
        const onError = () => reject(new Error('Failed to load Turnstile script'));
        script!.addEventListener('load', onLoad, { once: true });
        script!.addEventListener('error', onError, { once: true });
      }),
      // Some browsers won't fire `load` for already-cached scripts if listener added late.
      waitFor(
        () => (window.turnstile ? true : null),
        { timeoutMs: 10_000, intervalMs: 50, label: 'Turnstile script execution' }
      ).then(() => undefined),
    ]);

    return await waitFor(
      () => window.turnstile,
      { timeoutMs: 10_000, intervalMs: 50, label: 'window.turnstile' }
    );
  })();

  return loadPromise;
}
