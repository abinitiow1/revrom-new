import React, { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'compact';
  showRetry?: boolean;
};

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-script';

export default function Turnstile({
  siteKey,
  onToken,
  onError,
  theme = 'auto',
  size = 'normal',
  showRetry = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const reportedLoadFailureRef = useRef(false);

  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reset = useCallback(() => {
    if (!window.turnstile?.reset) return;
    try {
      window.turnstile.reset(widgetIdRef.current || undefined);
    } catch {
      // ignore
    }
    reportedLoadFailureRef.current = false;
    setHasError(false);
    onTokenRef.current('');
  }, []);

  useEffect(() => {
    if (!siteKey) return;

    const ensureScript = () => {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) return existing;
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
      return s;
    };

    const script = ensureScript();

    const reportLoadFailureOnce = (message: string) => {
      if (reportedLoadFailureRef.current) return;
      reportedLoadFailureRef.current = true;
      setHasError(true);
      onTokenRef.current('');
      onErrorRef.current?.(message);
    };

    const render = () => {
      if (!containerRef.current) return;
      if (!window.turnstile) {
        reportLoadFailureOnce(
          'Turnstile failed to load. This is usually caused by a strict Content-Security-Policy (missing unsafe-eval) or a privacy/ad-blocker blocking challenges.cloudflare.com.'
        );
        return;
      }

      // If the widget was already rendered, don't render again.
      if (widgetIdRef.current) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            setHasError(false);
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            onTokenRef.current('');
            setHasError(true);
            onErrorRef.current?.('Verification expired. Please click retry.');
            // Disabled auto-reset to prevent infinite loops
            // setTimeout(() => reset(), 50);
          },
          'error-callback': () => {
            onTokenRef.current('');
            setHasError(true);
            onErrorRef.current?.('Turnstile verification failed. Please click retry.');
            // Disabled auto-retry to prevent infinite loops
            // setTimeout(() => reset(), 200);
          },
        });
      } catch (e: any) {
        reportLoadFailureOnce(e?.message || 'Turnstile could not be initialized.');
      }
    };

    const onScriptError = () => {
      reportLoadFailureOnce(
        'Turnstile script failed to load. Check that challenges.cloudflare.com is allowed by your Content-Security-Policy and not blocked by an extension.'
      );
    };

    // If the script "loads" but is prevented from executing (common with CSP), we won’t get a clean error.
    // Add a short watchdog so users see a clear message instead of a stuck widget.
    const watchdog = window.setTimeout(() => {
      if (!widgetIdRef.current && !window.turnstile) {
        reportLoadFailureOnce(
          'Turnstile is blocked by your site security headers (Content-Security-Policy). Update CSP to allow challenges.cloudflare.com and include unsafe-eval, then redeploy.'
        );
      }
    }, 2500);

    // Render immediately if script already loaded, else wait for it.
    if (window.turnstile) render();
    else {
      script.addEventListener('load', render);
      script.addEventListener('error', onScriptError);
    }

    return () => {
      window.clearTimeout(watchdog);
      script.removeEventListener('load', render);
      script.removeEventListener('error', onScriptError);
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [reset, siteKey, size, theme]);

  return (
    <div>
      <style>{`
        .turnstile-retry-button {
          margin-top: 8px;
          font-size: 12px;
          background: transparent;
          border: none;
          padding: 0;
          text-decoration: underline;
          cursor: pointer;
          color: inherit;
        }
        .turnstile-retry-button:hover {
          opacity: 0.8;
        }
      `}</style>
      <div ref={containerRef} />
      {showRetry && hasError && (
        <button
          type="button"
          onClick={reset}
          className="turnstile-retry-button"
        >
          Retry verification
        </button>
      )}
    </div>
  );
}
