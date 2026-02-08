const NORM_MEM_MAX = 2000;
const normMem = new Map<string, string>();

export const normalizeText = (s: string) => {
  const raw = String(s || '');
  const hit = normMem.get(raw);
  if (hit !== undefined) return hit;

  const out = raw
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  normMem.set(raw, out);
  while (normMem.size > NORM_MEM_MAX) {
    const k = normMem.keys().next().value as string | undefined;
    if (!k) break;
    normMem.delete(k);
  }

  return out;
};

export const stripParens = (s: string) => String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

export const cleanLocationFragment = (s: string) => {
  let out = stripParens(s);
  out = out.split(/\bvia\b/i)[0]?.trim() || out;
  out = out.replace(/[|/\\]+/g, ' ');
  out = out.replace(/^(day\s*\d+\s*[:\-]\s*)/i, '');
  out = out.replace(
    /^(arrival|arrive|drive|ride|transfer|travel|journey|return|back|explore|visit|excursion|sightseeing)\b[:\-–—]?\s*/i,
    '',
  );
  out = out.replace(/^(to|in|at|from)\b[:\-–—]?\s*/i, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > 70) out = out.slice(0, 70).trim();
  return out;
};

export const isMeaningfulLocationText = (s: string) => {
  const t = String(s || '').trim();
  if (t.length < 2) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  const bad = new Set([
    'day',
    'explore',
    'arrival',
    'departure',
    'ride',
    'transfer',
    'journey',
    'travel',
    'acclimatization',
    'sightseeing',
    'excursion',
  ]);
  if (bad.has(normalizeText(t))) return false;
  return true;
};

export const splitWaypoints = (s: string) =>
  String(s || '')
    .split(/,|&|\band\b|\+|\//i)
    .map((p) => cleanLocationFragment(p))
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(isMeaningfulLocationText)
    .slice(0, 4);
