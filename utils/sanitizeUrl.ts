const stripDangerousWhitespace = (value: string) =>
  value.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

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
  const raw = String(rawEmail ?? '').trim();
  if (!raw) return null;

  // Minimal safety:
  // - block dangerous schemes (javascript:, data:, vbscript:)
  // - accept either "user@example.com" or "mailto:user@example.com"
  // - ignore any "?..." or "#..." that might be present
  // - reject whitespace/control chars to prevent header injection
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (/[\s\u0000-\u001F\u007F]/.test(cleaned)) return null;

  const lower = cleaned.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return null;

  let email = cleaned;
  if (lower.startsWith('mailto:')) email = cleaned.slice('mailto:'.length);

  email = email.split('?')[0].split('#')[0];
  if (!email) return null;

  // If what remains still looks like a different scheme, block it.
  if (/^[a-z][a-z0-9+.-]*:/i.test(email)) return null;

  return `mailto:${email}`;
};
