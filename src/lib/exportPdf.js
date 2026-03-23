import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Create a redacted copy of the PDF by drawing black rectangles
 * over all redacted spans.
 *
 * @param {ArrayBuffer} originalBuffer - the original PDF bytes
 * @param {Array} redactedSpans - [{ pageIndex, rects: [{x, y, w, h}] }]
 *   where rects are in canvas coordinates (scale = 1.5)
 * @param {number} scale - the rendering scale used (to convert back to PDF units)
 * @returns {Promise<Uint8Array>} - the redacted PDF bytes
 */
export async function exportRedactedPdf(originalBuffer, redactedSpans, scale) {
  const pdfDoc = await PDFDocument.load(originalBuffer);
  const pages = pdfDoc.getPages();

  for (const { pageIndex, rects } of redactedSpans) {
    const page = pages[pageIndex];
    if (!page) continue;

    const { height } = page.getSize();

    for (const rect of rects) {
      // Convert from canvas coordinates back to PDF coordinates
      const pdfX = rect.x / scale;
      const pdfW = rect.w / scale;
      const pdfH = rect.h / scale;
      // Canvas Y is top-down, PDF Y is bottom-up
      const pdfY = height - (rect.y / scale) - pdfH;

      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Trigger a browser download of a Uint8Array as a file.
 */
export function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
