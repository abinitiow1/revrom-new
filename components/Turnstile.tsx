import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const scriptId = useMemo(() => 'cf-turnstile-script', []);

  const reset = useCallback(() => {
    if (!window.turnstile?.reset) return;
    try {
      window.turnstile.reset(widgetIdRef.current || undefined);
      setHasError(false);
      onToken('');
    } catch {
      // ignore
    }
  }, [onToken]);

  useEffect(() => {
    if (!siteKey) return;

    const ensureScript = () => {
      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (existing) return existing;
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
      return s;
    };

    const script = ensureScript();

    const render = () => {
      if (!containerRef.current) return;
      if (!window.turnstile) return;

      // If the widget was already rendered, don't render again.
      if (widgetIdRef.current) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            setHasError(false);
            onToken(token);
          },
          'expired-callback': () => {
            onToken('');
            // Expired tokens are common; reset so the user can re-verify.
            setTimeout(() => reset(), 50);
          },
          'error-callback': () => {
            onToken('');
            setHasError(true);
            onError?.('Turnstile verification failed. Please try again.');
            // If Cloudflare fails (common on some devices/browsers), reset so user can retry.
            setTimeout(() => reset(), 200);
          },
        });
      } catch (e: any) {
        onError?.(e?.message || 'Turnstile could not be initialized.');
      }
    };

    // Render immediately if script already loaded, else wait for it.
    if (window.turnstile) render();
    else script.addEventListener('load', render);

    return () => {
      script.removeEventListener('load', render);
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [onError, onToken, reset, scriptId, siteKey, size, theme]);

  return (
    <div>
      <div ref={containerRef} />
      {showRetry && hasError && (
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            fontSize: 12,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textDecoration: 'underline',
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          Retry verification
        </button>
      )}
    </div>
  );
}
