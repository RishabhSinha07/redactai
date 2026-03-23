/**
 * Merges and deduplicates spans from regex + NER.
 * - Sort by start
 * - Remove spans fully contained within another
 * - For overlapping spans, keep the longer one
 * @param {Array} spans
 * @returns {Array} sorted, deduplicated spans
 */
export function mergeSpans(spans) {
  if (!spans.length) return [];

  // Sort by start, then by length (longest first)
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const merged = [];
  for (const span of sorted) {
    if (!merged.length) {
      merged.push(span);
      continue;
    }
    const prev = merged[merged.length - 1];
    // Fully contained — skip
    if (span.start >= prev.start && span.end <= prev.end) continue;
    // Overlapping — keep longer
    if (span.start < prev.end) {
      if ((span.end - span.start) > (prev.end - prev.start)) {
        merged[merged.length - 1] = span;
      }
      continue;
    }
    merged.push(span);
  }

  return merged;
}
