/**
 * PII regex patterns. Returns Span[] with {start, end, type, source: 'regex'}.
 */

const PATTERNS = [
  { type: 'SSN',         re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'Email',       re: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
  { type: 'Phone',       re: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: 'CreditCard',  re: /\b(?:\d[ \-]?){13,16}\b/g },
  { type: 'IPAddress',   re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { type: 'Date',        re: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g },
];

/**
 * @param {string} text
 * @returns {{ start: number, end: number, type: string, source: 'regex' }[]}
 */
export function runRegex(text) {
  const spans = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, type, source: 'regex' });
    }
  }
  return spans;
}
