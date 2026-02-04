import React, { useEffect, useRef, useState } from 'react';
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
  '600010': 'Configuration error - check that www.revrom.in is added to allowed domains in Cloudflare Turnstile dashboard',
  '600020': 'Execution error - refresh and try again',
};

const TRANSIENT_ERROR_CODES = new Set(['600010', '600020']);

export default function Turnstile({ siteKey, onToken, onError, theme = 'auto', size = 'normal', lazy = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'verified'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const mountedRef = useRef(true);
  const renderAttemptedRef = useRef(false);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const retryAttemptedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  // Debug logging on mount
  useEffect(() => {
    const hostname = getHostname();
    logInfo('Turnstile', 'Initializing', { hostname });
    logDebug('Turnstile', 'Site key status', siteKey ? 'provided' : 'missing');
    
    if (!siteKey) {
      setState('error');
      setErrorMsg('Site key missing - VITE_TURNSTILE_SITE_KEY not set in Vercel');
      onError?.('Missing site key');
      logError('Turnstile', 'Site key missing - verification will fail');
      return;
    }
    
    if (!siteKey.startsWith('0x')) {
      setState('error');
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

    const clearRetryTimer = () => {
      if (retryTimerRef.current != null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const renderWidget = (api: TurnstileAPI) => {
      if (!mountedRef.current || !containerRef.current) return;
      if (widgetIdRef.current || renderAttemptedRef.current) return;
      
      renderAttemptedRef.current = true;
      logInfo('Turnstile', 'Rendering widget');

      try {
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            logInfo('Turnstile', 'Token verified successfully');
            if (mountedRef.current) {
              setState('verified');
              setErrorMsg('');
              onTokenRef.current?.(token);
            }
          },
          'expired-callback': () => {
            logWarn('Turnstile', 'Token expired, clearing and attempting auto-refresh');
            // Clear expired token immediately
            onTokenRef.current?.('');
            
            if (mountedRef.current && widgetIdRef.current && api.reset) {
              try {
                api.reset(widgetIdRef.current);
                setState('ready');
                logInfo('Turnstile', 'Widget reset after expiry');
              } catch (resetError: unknown) {
                const errorMsg = resetError instanceof Error ? resetError.message : 'Unknown error during reset';
                logError('Turnstile', 'Reset failed after token expiry', errorMsg);
                setState('error');
                setErrorMsg('Verification expired - click retry');
              }
            } else {
              logWarn('Turnstile', 'Cannot reset widget - missing API or mounted state');
              setState('error');
              setErrorMsg('Verification expired - click retry');
            }
          },
          'error-callback': (code: string) => {
            const hostname = getHostname();
            const errorDescription = ERROR_MAP[code] || 'Unknown error';
            logError('Turnstile', `Verification error (${code})`, `Hostname: ${hostname}, Error: ${errorDescription}`);
            
            if (mountedRef.current) {
              // Clear token on error
              onTokenRef.current?.('');

              // Transient first-load flakiness: retry once after a short delay.
              if (TRANSIENT_ERROR_CODES.has(code) && !retryAttemptedRef.current) {
                retryAttemptedRef.current = true;
                clearRetryTimer();
                setState('loading');
                setErrorMsg('');

                retryTimerRef.current = window.setTimeout(() => {
                  if (!mountedRef.current || !widgetIdRef.current) return;
                  logWarn('Turnstile', `Transient error (${code}) - retrying once`);

                  try {
                    if (api.reset) {
                      api.reset(widgetIdRef.current);
                      setState('ready');
                      return;
                    }
                  } catch (e: unknown) {
                    logWarn('Turnstile', 'Reset failed during retry', e instanceof Error ? e.message : String(e));
                  }

                  try {
                    if (api.remove) {
                      api.remove(widgetIdRef.current);
                    }
                  } catch (e: unknown) {
                    logWarn('Turnstile', 'Remove failed during retry', e instanceof Error ? e.message : String(e));
                  } finally {
                    widgetIdRef.current = null;
                    renderAttemptedRef.current = false;
                  }

                  renderWidget(api);
                }, 500);

                return;
              }

              const msg = `Verification failed (error ${code})`;
              setState('error');
              setErrorMsg(msg);
              onErrorRef.current?.(msg);
            }
          },
        });
        
        logInfo('Turnstile', 'Widget rendered', `ID: ${widgetIdRef.current}`);
        if (mountedRef.current) {
          setState('ready');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logError('Turnstile', 'Widget render failed', errorMsg);
        if (mountedRef.current) {
          setState('error');
          setErrorMsg('Failed to render widget: ' + errorMsg);
          // Clear token on error
          onTokenRef.current?.('');
        }
      }
    };

    const start = async () => {
      if (!mountedRef.current || !containerRef.current) return;
      if (!shouldLoad) return;

      try {
        const api = await loadTurnstile();
        if (!mountedRef.current) return;
        logInfo('Turnstile', 'Script ready, rendering');
        renderWidget(api);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError('Turnstile', 'Failed to load Turnstile', msg);
        if (mountedRef.current) {
          setState('error');
          setErrorMsg('Failed to load Turnstile. Please retry.');
          onErrorRef.current?.('Failed to load Turnstile');
        }
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      clearRetryTimer();
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
      // Clear token on unmount
      onTokenRef.current?.('');
    };
  }, [siteKey, theme, size, shouldLoad]);

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
    if (widgetIdRef.current && window.turnstile?.reset) {
      try {
        setState('loading');
        setErrorMsg('');
        window.turnstile.reset(widgetIdRef.current);
        setState('ready');
        logInfo('Turnstile', 'Widget reset successfully');
      } catch (resetError: unknown) {
        const errorMsg = resetError instanceof Error ? resetError.message : 'Unknown error';
        logError('Turnstile', 'Reset failed on retry, reloading page', errorMsg);
        window.location.reload();
      }
    } else {
      logWarn('Turnstile', 'Cannot reset widget, reloading page');
      window.location.reload();
    }
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
}
