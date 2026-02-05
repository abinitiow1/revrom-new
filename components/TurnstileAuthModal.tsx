import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Turnstile, { type TurnstileHandle } from './Turnstile';

type Props = {
  siteKey: string;
  action: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  /**
   * Must call the backend immediately after receiving a Turnstile token.
   * Throw to indicate authorization failure (modal will reset and require re-verification).
   */
  authorize: (token: string) => Promise<void>;
  /**
   * Called after backend authorization succeeds.
   * Parent should close the modal and then perform the protected action (e.g., open WhatsApp/email).
   */
  onAuthorized: () => void;
};

const isAbortError = (e: unknown) =>
  (e instanceof DOMException && e.name === 'AbortError') ||
  String((e as any)?.name || '').toLowerCase() === 'aborterror';

export default function TurnstileAuthModal({
  siteKey,
  action,
  title = 'Verify to continue',
  description = 'Please complete verification. We will continue automatically after verification.',
  confirmLabel = 'Retry',
  onCancel,
  authorize,
  onAuthorized,
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const mountedRef = useRef(true);
  const authorizingRef = useRef(false);
  const authorizedRef = useRef(false);

  const [status, setStatus] = useState<'idle' | 'authorizing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const canRender = typeof document !== 'undefined';

  const subtitle = useMemo(() => {
    if (status === 'authorizing') return 'Authorizing…';
    if (status === 'error') return 'Verification failed. Please try again.';
    return description;
  }, [description, status]);

  useEffect(() => {
    mountedRef.current = true;
    setStatus('idle');
    setErrorMsg('');
    authorizingRef.current = false;
    authorizedRef.current = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Focus close button for accessibility.
    closeBtnRef.current?.focus?.();
  }, []);

  const startAuthorization = async (token: string) => {
    if (!token) return;
    if (authorizedRef.current) return;
    if (authorizingRef.current) return;
    authorizingRef.current = true;
    setStatus('authorizing');
    setErrorMsg('');

    try {
      await authorize(token);
      if (!mountedRef.current) return;
      authorizedRef.current = true;
      onAuthorized();
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (isAbortError(e)) return;
      const msg = String(e?.message || 'Authorization failed.');
      setStatus('error');
      setErrorMsg(msg);
      authorizingRef.current = false;
      try {
        turnstileRef.current?.reset();
      } catch {}
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Only close if the backdrop itself was clicked (not the dialog contents).
    if (e.target === e.currentTarget) onCancel();
  };

  if (!canRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-start sm:items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="turnstile-auth-title"
        tabIndex={-1}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-border dark:border-dark-border pointer-events-auto"
      >
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="min-w-0">
            <h3 id="turnstile-auth-title" className="text-lg font-black text-foreground dark:text-dark-foreground">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground dark:text-dark-muted-foreground">{subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close verification"
            onClick={onCancel}
            className="text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 shrink-0"
          >
            X
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background p-3">
            <Turnstile
              ref={turnstileRef}
              siteKey={siteKey}
              theme="auto"
              size="compact"
              action={action}
              onToken={(t) => {
                // Do not store token in React state; authorize immediately.
                void startAuthorization(t);
              }}
              onError={(m) => {
                // SDK errors: show but allow retry.
                if (!mountedRef.current) return;
                setStatus('error');
                setErrorMsg(String(m || 'Verification error.'));
                authorizingRef.current = false;
              }}
            />
          </div>

          {status === 'error' ? (
            <div className="text-sm text-red-600 dark:text-red-300">
              {errorMsg || 'Verification failed. Please try again.'}
            </div>
          ) : null}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-border dark:border-dark-border text-sm font-bold text-foreground dark:text-dark-foreground"
              disabled={status === 'authorizing'}
            >
              Cancel
            </button>
            {status === 'error' ? (
              <button
                type="button"
                onClick={() => {
                  // In explicit mode, token is delivered via callback; this just resets the widget/UI.
                  setStatus('idle');
                  setErrorMsg('');
                  try {
                    turnstileRef.current?.reset();
                  } catch {}
                }}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-sm"
                title="Retry verification"
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
