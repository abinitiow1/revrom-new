import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'compact';
};

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';

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

export default function Turnstile({ siteKey, onToken, onError, theme = 'auto', size = 'normal' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'verified'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const mountedRef = useRef(true);
  const renderAttemptedRef = useRef(false);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  // Debug logging on mount
  useEffect(() => {
    console.log('[Turnstile] ===== DEBUG INFO =====');
    console.log('[Turnstile] Hostname:', window.location.hostname);
    console.log('[Turnstile] Site key provided:', siteKey ? 'YES (' + siteKey.substring(0, 20) + '...)' : 'NO - MISSING!');
    console.log('[Turnstile] ========================');
    
    if (!siteKey) {
      setState('error');
      setErrorMsg('Site key missing - VITE_TURNSTILE_SITE_KEY not set in Vercel');
      onError?.('Missing site key');
      return;
    }
    
    if (!siteKey.startsWith('0x')) {
      setState('error');
      setErrorMsg('Invalid site key format');
      onError?.('Invalid key format');
      return;
    }
  }, [siteKey, onError]);

  useEffect(() => {
    if (!siteKey || !siteKey.startsWith('0x')) return;
    
    mountedRef.current = true;
    renderAttemptedRef.current = false;

    const renderWidget = () => {
      if (!mountedRef.current || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current || renderAttemptedRef.current) return;
      
      renderAttemptedRef.current = true;
      console.log('[Turnstile] Rendering widget...');

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            console.log('[Turnstile] ✓ SUCCESS - Token received');
            if (mountedRef.current) {
              setState('verified');
              setErrorMsg('');
              onTokenRef.current?.(token);
            }
          },
          'expired-callback': () => {
            console.log('[Turnstile] Token expired, auto-refreshing...');
            if (mountedRef.current && widgetIdRef.current && window.turnstile?.reset) {
              try {
                window.turnstile.reset(widgetIdRef.current);
                setState('ready');
              } catch {
                setState('error');
                setErrorMsg('Verification expired - click retry');
              }
            } else {
              setState('error');
              setErrorMsg('Verification expired - click retry');
            }
            onTokenRef.current?.('');
          },
          'error-callback': (code: string) => {
            console.error('[Turnstile] ✗ ERROR:', code, ERROR_MAP[code] || 'Unknown error');
            console.error('[Turnstile] Current hostname:', window.location.hostname);
            console.error('[Turnstile] Site key in use:', siteKey.substring(0, 20) + '...');
            
            if (mountedRef.current) {
              const msg = ERROR_MAP[code] || `Verification failed (error ${code})`;
              setState('error');
              setErrorMsg(msg);
              onTokenRef.current?.('');
              onErrorRef.current?.(msg);
            }
          },
        });
        
        console.log('[Turnstile] Widget rendered, ID:', widgetIdRef.current);
        if (mountedRef.current) {
          setState('ready');
        }
      } catch (err: any) {
        console.error('[Turnstile] Render exception:', err);
        if (mountedRef.current) {
          setState('error');
          setErrorMsg(err?.message || 'Failed to render widget');
        }
      }
    };

    // Load script and render
    const init = () => {
      if (window.turnstile) {
        console.log('[Turnstile] Script already loaded, rendering...');
        renderWidget();
        return;
      }

      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        console.log('[Turnstile] Script tag exists, waiting for load...');
        window.onTurnstileLoad = renderWidget;
        return;
      }

      console.log('[Turnstile] Loading Cloudflare script...');
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      
      window.onTurnstileLoad = () => {
        console.log('[Turnstile] Script loaded successfully');
        renderWidget();
      };
      
      script.onerror = () => {
        console.error('[Turnstile] Failed to load script');
        if (mountedRef.current) {
          setState('error');
          setErrorMsg('Failed to load Turnstile - check CSP headers');
        }
      };
      
      document.head.appendChild(script);
    };

    init();

    return () => {
      mountedRef.current = false;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { 
          window.turnstile.remove(widgetIdRef.current); 
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size]);

  const handleRetry = () => {
    console.log('[Turnstile] Retry clicked');
    if (widgetIdRef.current && window.turnstile?.reset) {
      try {
        setState('loading');
        setErrorMsg('');
        window.turnstile.reset(widgetIdRef.current);
        setState('ready');
      } catch {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="turnstile-container">
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
