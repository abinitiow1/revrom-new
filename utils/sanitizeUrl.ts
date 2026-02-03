const stripDangerousWhitespace = (value: string) =>
  value.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

const isProbablyEmail = (value: string) => /^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$/.test(value);

export const safeExternalUrl = (raw: string | null | undefined): string | null => {
  const value = stripDangerousWhitespace(String(raw ?? ''));
  if (!value) return null;

  try {
    // Use a fixed base to safely parse relative URLs (we reject them below for external usage).
    const url = new URL(value, 'https://example.com');
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    // Disallow relative inputs (e.g. "/foo") for "external" links.
    if (url.origin === 'https://example.com') return null;

    return url.toString();
  } catch {
    return null;
  }
};

export const safeImageUrl = (raw: string | null | undefined): string | null => {
  const value = stripDangerousWhitespace(String(raw ?? ''));
  if (!value) return null;

  try {
    const url = new URL(value, 'https://example.com');
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    // Allow absolute and relative paths for images.
    if (url.origin === 'https://example.com') return url.pathname + url.search + url.hash;

    return url.toString();
  } catch {
    return null;
  }
};

export const safeMailtoHref = (rawEmail: string | null | undefined): string | null => {
  const email = stripDangerousWhitespace(String(rawEmail ?? '')).toLowerCase();
  if (!email) return null;
  if (!isProbablyEmail(email)) return null;
  return `mailto:${email}`;
};

