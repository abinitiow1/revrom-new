/**
 * Normalizes destination names for consistent matching.
 * Converts "Ladakh" and "Ladakh, India" to "ladakh" for comparison.
 */
export const normalizeDestination = (dest: string): string => {
  return (dest || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s*,\s*/g, ' ') // Convert commas with spaces to single space
    .replace(/[^a-z0-9\s]+/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Compares two destination names ignoring case, punctuation, and extra info
 */
export const destinationsMatch = (dest1: string, dest2: string): boolean => {
  return normalizeDestination(dest1) === normalizeDestination(dest2);
};

/**
 * Filters and deduplicates destinations using normalization
 */
export const deduplicateDestinations = (destinations: string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const dest of destinations) {
    const normalized = normalizeDestination(dest);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(dest); // Keep original format
    }
  }

  return unique;
};
