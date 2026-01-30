import React, { useEffect, useMemo, useRef } from 'react';

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
};

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function Turnstile({ siteKey, onToken, onError, theme = 'auto', size = 'normal' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const scriptId = useMemo(() => 'cf-turnstile-script', []);

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
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('');
            onError?.('Turnstile verification failed. Please try again.');
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
  }, [onError, onToken, scriptId, siteKey, size, theme]);

  return <div ref={containerRef} />;
}

