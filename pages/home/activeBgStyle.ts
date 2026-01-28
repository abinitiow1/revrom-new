import type React from 'react';

// `backgroundOpacity` in Admin is "BG Intensity" (how visible the image is).
// We convert it to a dark overlay that keeps text readable on top of images.
export const getActiveBgStyle = (url?: string, opacity: number = 0.95): React.CSSProperties => {
  if (!url) return {};

  const clamped = Math.min(1, Math.max(0, opacity ?? 0.95));

  // Prefer a dark overlay in both themes so white headings remain readable.
  // Keep a slightly lighter minimum overlay in light theme.
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const minOverlay = isDark ? 0.35 : 0.25;
  const maxOverlay = 0.92;
  const overlayOpacity = Math.min(maxOverlay, Math.max(minOverlay, 1 - clamped));

  const isMobile =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(max-width: 768px)').matches;

  return {
    backgroundImage: `linear-gradient(rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${overlayOpacity})), url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: isMobile ? 'scroll' : 'fixed',
  };
};

