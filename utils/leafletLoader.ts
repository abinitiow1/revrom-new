/**
 * Leaflet loader (singleton)
 *
 * Why:
 * - Loading Leaflet globally in `index.html` slows down first paint on mobile.
 * - Only the trip route map needs Leaflet, so we load it on-demand.
 */

const LEAFLET_SCRIPT_ID = 'leaflet-js';
const LEAFLET_STYLE_ID = 'leaflet-css';

const LEAFLET_JS_SRC = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_SRC = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

// Integrity hashes must match the exact file.
const LEAFLET_JS_INTEGRITY = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
const LEAFLET_CSS_INTEGRITY = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';

type LeafletGlobal = typeof window & { L?: any };

let loadPromise: Promise<any> | null = null;

const waitFor = async <T>(
  fn: () => T | null | undefined,
  opts: { timeoutMs: number; intervalMs: number; label: string },
): Promise<T> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= opts.timeoutMs) {
    const val = fn();
    if (val) return val;
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }
  throw new Error(`Timed out waiting for ${opts.label}`);
};

export function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet can only load in the browser'));
  }

  const w = window as LeafletGlobal;
  if (w.L) return Promise.resolve(w.L);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // CSS
    const existingStyle = document.getElementById(LEAFLET_STYLE_ID) as HTMLLinkElement | null;
    if (!existingStyle) {
      const link = document.createElement('link');
      link.id = LEAFLET_STYLE_ID;
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_SRC;
      link.integrity = LEAFLET_CSS_INTEGRITY;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // JS
    let script = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = LEAFLET_SCRIPT_ID;
      script.src = LEAFLET_JS_SRC;
      script.async = true;
      script.defer = true;
      script.integrity = LEAFLET_JS_INTEGRITY;
      script.crossOrigin = '';
      document.head.appendChild(script);
    }

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const onLoad = () => resolve();
        const onError = () => reject(new Error('Failed to load Leaflet script'));
        script!.addEventListener('load', onLoad, { once: true });
        script!.addEventListener('error', onError, { once: true });
      }),
      waitFor(() => (w.L ? true : null), { timeoutMs: 10_000, intervalMs: 50, label: 'Leaflet script execution' }).then(
        () => undefined,
      ),
    ]);

    return await waitFor(() => w.L, { timeoutMs: 10_000, intervalMs: 50, label: 'window.L' });
  })();

  return loadPromise;
}

