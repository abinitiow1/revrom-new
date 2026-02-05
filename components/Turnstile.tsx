import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { getHostname } from '../utils/env';
import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { loadTurnstile } from '../utils/turnstileLoader';
import type { TurnstileAPI } from '../utils/turnstileTypes';

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'compact';
  action?: string;
  /**
   * Optional: lazy-mount the widget until visible or interacted with.
   * This reduces cold-load flakiness and avoids multiple widgets competing at startup.
   */
  lazy?: boolean;
};

// Cloudflare error codes - https://developers.cloudflare.com/turnstile/reference/client-side-errors/
const ERROR_MAP: Record<string, string> = {
  '110200': 'Domain not allowed in Cloudflare widget settings',
  '400020': 'Domain not allowed - add this hostname to Cloudflare Turnstile',
  '110420': 'Hostname not allowed for this sitekey',
  '110100': 'Invalid sitekey - check VITE_TURNSTILE_SITE_KEY',
  '110110': 'Invalid sitekey format',
  '110500': 'Challenge timed out',
  '110600': 'Challenge failed',
  '600000': 'Internal error - try again',
  '600010': 'Verification could not start (configuration / browser privacy). If you are in private mode or using strict tracking prevention, try normal mode or a different browser.',
  '600020': 'Verification failed to execute (temporary). Refresh and try again.',
};

// Only treat truly-temporary failures as transient.
// `600010` is commonly caused by privacy / PAT / browser configuration and will NOT resolve by auto-retrying.
const TRANSIENT_ERROR_CODES = new Set(['600020']);

export type TurnstileHandle = {
  getToken: () => string;
  reset: () => void;
};

const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile(
  { siteKey, onToken, onError, theme = 'auto', size = 'normal', action, lazy = false }: Props,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'verified'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const mountedRef = useRef(true);
  const renderAttemptedRef = useRef(false);
  const tokenRef = useRef<string>('');
  const stateRef = useRef<'loading' | 'ready' | 'error' | 'verified'>('loading');
  const verifiedRef = useRef(false);
  const apiRef = useRef<TurnstileAPI | null>(null);
  const renderWidgetRef = useRef<((api: TurnstileAPI) => void) | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const retryAttemptedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  const setStateSafe = (next: 'loading' | 'ready' | 'error' | 'verified') => {
    stateRef.current = next;
    setState(next);
  };

  const clearToken = () => {
    verifiedRef.current = false;
    tokenRef.current = '';
    onTokenRef.current?.('');
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current != null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const performReset = (reason: 'user' | 'imperative' | 'expired' | 'transient') => {
    const api = apiRef.current || window.turnstile;
    const id = widgetIdRef.current;

    clearRetryTimer();
    // Preserve the transient-retry flag during the transient auto-reset to avoid retry loops.
    if (reason !== 'transient') retryAttemptedRef.current = false;
    renderAttemptedRef.current = false;

    clearToken();
    setErrorMsg('');
    setStateSafe('loading');

    if (!api || !id) {
      logWarn('Turnstile', `Reset requested (${reason}) but widget is not ready yet`);
      setStateSafe('ready');
      return;
    }

    try {
      if (api.reset) {
        api.reset(id);
        setStateSafe('ready');
        logInfo('Turnstile', `Widget reset (${reason})`);
        return;
      }
    } catch (e: unknown) {
      logWarn('Turnstile', `Reset failed (${reason})`, e instanceof Error ? e.message : String(e));
    }

    try {
      api.remove?.(id);
    } catch (e: unknown) {
      logWarn('Turnstile', `Remove failed (${reason})`, e instanceof Error ? e.message : String(e));
    } finally {
      widgetIdRef.current = null;
      const el = containerRef.current;
      if (el) {
        delete el.dataset.turnstileWidgetId;
        delete el.dataset.turnstileBound;
      }
    }

    try {
      renderWidgetRef.current?.(api);
    } catch (e: unknown) {
      logWarn('Turnstile', `Re-render failed (${reason})`, e instanceof Error ? e.message : String(e));
      setStateSafe('error');
      setErrorMsg('Verification failed to restart. Please try again.');
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      getToken: () => tokenRef.current,
      reset: () => {
        performReset('imperative');
      },
    }),
    []
  );

  // Debug logging on mount
  useEffect(() => {
    const hostname = getHostname();
    logInfo('Turnstile', 'Initializing', { hostname });
    logDebug('Turnstile', 'Site key status', siteKey ? 'provided' : 'missing');
    
    if (!siteKey) {
      setStateSafe('error');
      setErrorMsg('Site key missing - VITE_TURNSTILE_SITE_KEY not set in Vercel');
      onError?.('Missing site key');
      logError('Turnstile', 'Site key missing - verification will fail');
      return;
    }
    
    if (!siteKey.startsWith('0x')) {
      setStateSafe('error');
      setErrorMsg('Invalid site key format');
      onError?.('Invalid key format');
      logError('Turnstile', 'Site key format invalid - must start with "0x"');
      return;
    }
  }, [siteKey, onError]);

  useEffect(() => {
    if (!siteKey || !siteKey.startsWith('0x')) return;
    
    mountedRef.current = true;
    renderAttemptedRef.current = false;
    retryAttemptedRef.current = false;

    const bindContainer = (widgetId: string) => {
      const el = containerRef.current;
      if (!el) return;
      el.dataset.turnstileBound = '1';
      el.dataset.turnstileWidgetId = widgetId;
    };

    const readBoundWidgetId = () => {
      const el = containerRef.current;
      const id = el?.dataset?.turnstileWidgetId;
      return id && id.length ? id : null;
    };

    const renderWidget = (api: TurnstileAPI) => {
      if (!mountedRef.current || !containerRef.current) return;
      if (widgetIdRef.current || renderAttemptedRef.current) return;

      // StrictMode / double-initialization safety: if this DOM node already has a widget bound, reuse it.
      const existingId = readBoundWidgetId();
      if (existingId) {
        widgetIdRef.current = existingId;
        const existingToken = api.getResponse?.(existingId) || '';
        if (existingToken) tokenRef.current = existingToken;
        setStateSafe(existingToken ? 'verified' : 'ready');
        setErrorMsg('');
        return;
      }

      if (containerRef.current.dataset.turnstileBound === '1') {
        // Bound without an id; avoid re-rendering.
        return;
      }
      
      renderAttemptedRef.current = true;
      logInfo('Turnstile', 'Rendering widget');
      containerRef.current.dataset.turnstileBound = '1';

      try {
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          action: action?.trim() || undefined,
          callback: (token: string) => {
            logInfo('Turnstile', 'Token verified successfully');
            if (mountedRef.current) {
              verifiedRef.current = true;
              tokenRef.current = token;
              setStateSafe('verified');
              setErrorMsg('');
              onTokenRef.current?.(token);
            }
          },
          'expired-callback': () => {
            logWarn('Turnstile', 'Token expired, clearing and attempting auto-refresh');
            performReset('expired');
          },
          'error-callback': (code: string) => {
            const hostname = getHostname();
            const errorDescription = ERROR_MAP[code] || 'Unknown error';
            logError('Turnstile', `Verification error (${code})`, `Hostname: ${hostname}, Error: ${errorDescription}`);
            
            if (mountedRef.current) {
              // After a token is verified, ignore all subsequent errors until expiry.
              // This prevents late PAT/bootstrap errors from downgrading the UI or clearing state.
              if (verifiedRef.current && tokenRef.current) {
                logWarn('Turnstile', `Ignoring error (${code}) because token is already verified`);
                return;
              }

              // Durable token rule:
              // - Do NOT clear a valid token here.
              // - Ignore transient errors if we already have a verified token.
              if (stateRef.current === 'verified' && tokenRef.current && TRANSIENT_ERROR_CODES.has(code)) {
                logWarn('Turnstile', `Ignoring transient error (${code}) because token is already verified`);
                return;
              }

              // Transient first-load flakiness: retry once after a short delay.
              if (TRANSIENT_ERROR_CODES.has(code) && !retryAttemptedRef.current) {
                retryAttemptedRef.current = true;
                clearRetryTimer();
                setStateSafe('loading');
                setErrorMsg('');

                retryTimerRef.current = window.setTimeout(() => {
                  if (!mountedRef.current || !widgetIdRef.current) return;
                  logWarn('Turnstile', `Transient error (${code}) - retrying once (after delay)`);

                  performReset('transient');
                }, 1500);

                return;
              }

              // Only show UI errors for "real" failures.
              // If the error code isn't mapped, keep it generic.
              const mapped = ERROR_MAP[code];
              const msg = mapped ? `${mapped} (code ${code})` : `Verification failed (error ${code})`;
              setStateSafe('error');
              setErrorMsg(msg);
              onErrorRef.current?.(msg);
            }
          },
        });
        
        logInfo('Turnstile', 'Widget rendered', `ID: ${widgetIdRef.current}`);
        if (widgetIdRef.current) bindContainer(widgetIdRef.current);
        if (mountedRef.current) {
          // Do not overwrite a synchronously-verified token (rare, but can happen).
          if (!tokenRef.current && stateRef.current !== 'verified') setStateSafe('ready');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logError('Turnstile', 'Widget render failed', errorMsg);
        if (mountedRef.current) {
          setStateSafe('error');
          setErrorMsg('Failed to render widget: ' + errorMsg);
        }
      }
    };

    const start = async () => {
      if (!mountedRef.current || !containerRef.current) return;
      if (!shouldLoad) return;

      try {
        const api = await loadTurnstile();
        if (!mountedRef.current) return;
        apiRef.current = api;
        renderWidgetRef.current = renderWidget;
        logInfo('Turnstile', 'Script ready, rendering');
        renderWidget(api);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError('Turnstile', 'Failed to load Turnstile', msg);
        if (mountedRef.current) {
          setStateSafe('error');
          setErrorMsg('Failed to load Turnstile. Please retry.');
          onErrorRef.current?.('Failed to load Turnstile');
        }
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      clearRetryTimer();
      apiRef.current = null;
      renderWidgetRef.current = null;
      // Cleanup: Remove widget and clear token
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { 
          window.turnstile.remove(widgetIdRef.current);
          logInfo('Turnstile', 'Widget removed on component unmount');
        } catch (cleanupError: unknown) {
          const errorMsg = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
          logWarn('Turnstile', 'Failed to remove widget on unmount', errorMsg);
        }
        widgetIdRef.current = null;
      }
      // Do NOT clear token on unmount. The token belongs to the parent form session,
      // and clearing it here can race with navigation / StrictMode lifecycles.
      const el = containerRef.current;
      if (el) {
        delete el.dataset.turnstileWidgetId;
        delete el.dataset.turnstileBound;
      }
    };
  }, [siteKey, shouldLoad]);

  // Optional lazy-mount: load when widget is visible.
  useEffect(() => {
    if (!lazy) return;
    if (shouldLoad) return;
    if (!containerRef.current) return;

    let cancelled = false;
    const el = containerRef.current;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (cancelled) return;
        if (entry?.isIntersecting) {
          setShouldLoad(true);
        }
      },
      { root: null, threshold: 0.1 }
    );

    obs.observe(el);
    return () => {
      cancelled = true;
      try { obs.disconnect(); } catch {}
    };
  }, [lazy, shouldLoad]);

  const handleRetry = () => {
    logInfo('Turnstile', 'User clicked retry button');
    performReset('user');
  };

  return (
    <div
      className="turnstile-container"
      onFocusCapture={() => { if (lazy && !shouldLoad) setShouldLoad(true); }}
      onPointerDown={() => { if (lazy && !shouldLoad) setShouldLoad(true); }}
      onMouseEnter={() => { if (lazy && !shouldLoad) setShouldLoad(true); }}
    >
      <div ref={containerRef} />
      
      {state === 'loading' && (
        <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground">
          Loading verification...
        </p>
      )}
      
      {state === 'verified' && (
        <p className="text-xs text-green-600 dark:text-green-400">✓ Verified</p>
      )}
      
      {state === 'error' && (
        <div className="mt-2">
          <p className="text-xs text-red-500 dark:text-red-400 mb-1">{errorMsg}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-brand-primary underline hover:opacity-80"
          >
            Retry verification
          </button>
        </div>
      )}
    </div>
  );
});

export default Turnstile;
