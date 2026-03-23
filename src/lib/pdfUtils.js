/**
 * Extract text content and build a charMap from a PDF.js page.
 *
 * @param {import('pdfjs-dist').PDFPageProxy} page
 * @returns {{ fullText: string, charMap: object[], items: object[], styles: object }}
 */
export async function extractText(page) {
  const textContent = await page.getTextContent();
  const items = textContent.items.filter(item => typeof item.str === 'string');
  const styles = textContent.styles || {};

  let fullText = '';
  const charMap = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    for (let c = 0; c < item.str.length; c++) {
      charMap.push({ itemIndex: i, charOffset: c });
    }
    fullText += item.str;
    if (item.hasEOL) {
      charMap.push({ itemIndex: i, charOffset: item.str.length - 1 });
      fullText += '\n';
    } else if (i < items.length - 1) {
      const nextItem = items[i + 1];
      if (item.str.length > 0 && nextItem.str.length > 0 && !item.str.endsWith(' ')) {
        charMap.push({ itemIndex: i, charOffset: item.str.length - 1 });
        fullText += ' ';
      }
    }
  }

  return { fullText, charMap, items, styles };
}

/**
 * Map a character-range span to pixel rectangles on the canvas.
 */
export function spanToRects(span, charMap, items, styles, viewport) {
  if (!charMap || !items || !viewport) return [];

  const scale = viewport.scale;

  // Group consecutive chars by item
  const grouped = new Map();
  for (let ci = span.start; ci < span.end && ci < charMap.length; ci++) {
    const { itemIndex, charOffset } = charMap[ci];
    if (!grouped.has(itemIndex)) {
      grouped.set(itemIndex, { minOffset: charOffset, maxOffset: charOffset });
    } else {
      const g = grouped.get(itemIndex);
      g.minOffset = Math.min(g.minOffset, charOffset);
      g.maxOffset = Math.max(g.maxOffset, charOffset);
    }
  }

  const rawRects = [];
  for (const [itemIndex, { minOffset, maxOffset }] of grouped) {
    const item = items[itemIndex];
    if (!item || !item.str || item.str.length === 0) continue;

    const t = item.transform;

    // Font size from transform matrix
    const fontSize = Math.abs(t[0]) * scale;
    const itemHeight = fontSize > 0 ? fontSize : (Math.abs(item.height) * scale || 14 * scale);

    // Character width: use item.width if available, otherwise estimate from font size
    // PDF tables often have item.width = 0 for individually-placed characters
    let charWidth;
    if (item.width > 0 && item.str.length > 0) {
      charWidth = (item.width / item.str.length) * scale;
    } else {
      // Estimate: average character is ~0.5× the font size
      charWidth = (fontSize > 0 ? fontSize : 14 * scale) * 0.55;
    }

    // Position
    const baseX = t[4] * scale;
    const baseY = viewport.height - (t[5] * scale);

    const x = baseX + minOffset * charWidth;
    const y = baseY - itemHeight;
    const w = (maxOffset - minOffset + 1) * charWidth;

    rawRects.push({
      x,
      y,
      w: Math.max(w, 4),
      h: Math.max(itemHeight, 8),
    });
  }

  // Merge rects on the same line that are horizontally adjacent (gap < 2px)
  if (rawRects.length <= 1) return rawRects;

  rawRects.sort((a, b) => {
    const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
    if (Math.abs(dy) > 4) return dy;
    return a.x - b.x;
  });

  const merged = [rawRects[0]];
  for (let i = 1; i < rawRects.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = rawRects[i];
    const sameLine = Math.abs((prev.y + prev.h / 2) - (curr.y + curr.h / 2)) < 4;
    const gap = curr.x - (prev.x + prev.w);
    if (sameLine && gap < 2) {
      const maxX = Math.max(prev.x + prev.w, curr.x + curr.w);
      const minY = Math.min(prev.y, curr.y);
      const maxH = Math.max(prev.y + prev.h, curr.y + curr.h) - minY;
      merged[merged.length - 1] = { x: prev.x, y: minY, w: maxX - prev.x, h: maxH };
    } else {
      merged.push(curr);
    }
  }

  return merged;
}
