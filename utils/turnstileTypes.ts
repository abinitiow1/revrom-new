/**
 * Minimal Cloudflare Turnstile types used by the app.
 * Kept in a standalone module so the loader and component don't depend on each other.
 */

export interface TurnstileRenderOptions {
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

export interface TurnstileAPI {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset?: (widgetId: string) => void;
  remove?: (widgetId: string) => void;
  getResponse?: (widgetId: string) => string | undefined;
  isReady?: () => boolean;
}

