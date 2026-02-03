import React, { useEffect, useRef, useState } from 'react';
import { getHostname } from '../utils/env';
import { logError, logWarn, logInfo, logDebug } from '../utils/logger';

/**
 * Turnstile widget render options type
 * Defines all supported options for Cloudflare Turnstile widget
 */
interface TurnstileRenderOptions {
  sitekey: string;
  theme: 'auto' | 'light' | 'dark';
  size: 'normal' | 'compact';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (code: string) => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  'unsupported-callback'?: () => void;
}

/**
 * Turnstile API interface
 * Defines the global window.turnstile API shape
 */
interface TurnstileAPI {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
  isReady: () => boolean;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
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

    const renderWidget = () => {
      if (!mountedRef.current || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current || renderAttemptedRef.current) return;
      
      renderAttemptedRef.current = true;
      logInfo('Turnstile', 'Rendering widget');

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
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
            
            if (mountedRef.current && widgetIdRef.current && window.turnstile?.reset) {
              try {
                window.turnstile.reset(widgetIdRef.current);
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
              const msg = `Verification failed (error ${code})`;
              setState('error');
              setErrorMsg(msg);
              // Clear token on error
              onTokenRef.current?.('');
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

    // Load script and render
    const init = () => {
      if (window.turnstile) {
        logInfo('Turnstile', 'Script already loaded, rendering');
        renderWidget();
        return;
      }

      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        logInfo('Turnstile', 'Script tag exists, waiting for load event');
        window.onTurnstileLoad = renderWidget;
        return;
      }

      logInfo('Turnstile', 'Loading Cloudflare Turnstile script');
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      
      window.onTurnstileLoad = () => {
        logInfo('Turnstile', 'Script loaded successfully');
        renderWidget();
      };
      
      script.onerror = () => {
        logError('Turnstile', 'Failed to load script from CDN');
        if (mountedRef.current) {
          setState('error');
          setErrorMsg('Failed to load Turnstile - check CSP headers and internet connection');
          onErrorRef.current?.('Failed to load Turnstile script');
        }
      };
      
      document.head.appendChild(script);
    };

    init();

    return () => {
      mountedRef.current = false;
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
  }, [siteKey, theme, size]);

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
