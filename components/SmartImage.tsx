import React, { useEffect, useRef, useState } from 'react';

const cx = (...parts: Array<string | undefined | null | false>) => parts.filter(Boolean).join(' ');
const hasPositionClass = (s: string | undefined | null) => /\b(static|relative|absolute|fixed|sticky)\b/.test(s || '');

type SmartImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> & {
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
  /**
   * If true, forces the image to fill the wrapper (width/height 100%).
   * Useful for fixed-height cards and absolute-fill hero tiles.
   */
  fill?: boolean;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

/**
 * Image with a lightweight skeleton placeholder to improve perceived loading
 * across slow mobile connections (iOS/Android).
 */
const SmartImage: React.FC<SmartImageProps> = ({
  wrapperClassName,
  skeletonClassName,
  fallbackSrc,
  fill,
  src,
  className,
  onLoad,
  onError,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const prevSrcRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      setLoaded(false);
      setUsingFallback(false);
    }
  }, [src]);

  const effectiveSrc = usingFallback ? fallbackSrc : src;
  const fillStyle = fill ? ({ width: '100%', height: '100%' } as const) : null;

  return (
    <div className={cx(hasPositionClass(wrapperClassName) ? 'overflow-hidden' : 'relative overflow-hidden', wrapperClassName)}>
      {!loaded ? (
        <div
          aria-hidden="true"
          className={cx(
            'absolute inset-0 bg-slate-200/70 dark:bg-neutral-800/60 animate-pulse motion-reduce:animate-none pointer-events-none',
            skeletonClassName
          )}
        />
      ) : null}
      <img
        {...imgProps}
        src={effectiveSrc}
        style={fillStyle ? { ...(imgProps as any).style, ...fillStyle } : (imgProps as any).style}
        className={cx(
          'transition-opacity duration-500 will-change-[opacity]',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!usingFallback && fallbackSrc) {
            setUsingFallback(true);
            setLoaded(false);
            return;
          }
          setLoaded(true);
          onError?.(e);
        }}
      />
    </div>
  );
};

export default SmartImage;
