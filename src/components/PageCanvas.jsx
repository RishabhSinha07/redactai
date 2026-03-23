import { useEffect, useRef, useState, useCallback } from 'react';
import { spanToRects } from '../lib/pdfUtils';
import styles from './PageCanvas.module.css';

const SCALE = 1.5;

function drawRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export default function PageCanvas({ page, pageIndex, spans, items, styles: fontStyles, modelColorMap, command, onRedactionChange }) {
  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Use STATE for dimensions so re-render happens when they're known
  const [canvasDims, setCanvasDims] = useState({ w: 612 * SCALE, h: 792 * SCALE });
  const [viewport, setViewport] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [redactions, setRedactions] = useState([]);

  // 1. Render PDF page + set dimensions
  useEffect(() => {
    if (!page) return;
    const vp = page.getViewport({ scale: SCALE });
    setViewport(vp);
    setCanvasDims({ w: vp.width, h: vp.height });

    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    canvas.width = vp.width;
    canvas.height = vp.height;

    if (renderTaskRef.current) renderTaskRef.current.cancel();
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
    renderTaskRef.current = task;
    task.promise.catch(err => {
      if (err?.name !== 'RenderingCancelledException') console.error(err);
    });
  }, [page]);

  // 2. Map spans → highlights
  useEffect(() => {
    if (!items || !viewport) return;

    const newHighlights = spans
      .map(span => ({
        span,
        rects: spanToRects(span, span.charMap, items, fontStyles, viewport),
      }))
      .filter(h => h.rects.length > 0);

    setHighlights(newHighlights);
    setRedactions([]);
  }, [spans, items, viewport, fontStyles]);

  // 3. Handle commands
  useEffect(() => {
    if (command === 'redact-all') {
      setRedactions(prev => [...prev, ...highlights]);
      setHighlights([]);
    } else if (command === 'clear-all') {
      setHighlights(prev => [...prev, ...redactions]);
      setRedactions([]);
    }
  }, [command]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Notify parent
  useEffect(() => {
    onRedactionChange?.(pageIndex, redactions.length);
  }, [redactions.length, pageIndex, onRedactionChange]);

  // 5. Draw overlay — key fix: set canvas size from state, not ref
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const { w, h } = canvasDims;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const r = 3;

    // Highlights — color by source: yellow for regex, model color for NER
    for (const { span, rects } of highlights) {
      const mc = span.modelId && modelColorMap?.[span.modelId];
      if (mc) {
        ctx.fillStyle = mc.fill;
        ctx.strokeStyle = mc.stroke;
      } else {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      }
      ctx.lineWidth = 1;
      for (const { x, y, w: rw, h: rh } of rects) {
        drawRoundRect(ctx, x, y, rw, rh, r);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Redactions
    for (const { rects } of redactions) {
      ctx.fillStyle = '#1a1a1a';
      for (const { x, y, w: rw, h: rh } of rects) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        drawRoundRect(ctx, x, y, rw, rh, r);
        ctx.fill();
        ctx.restore();
      }
    }
  }, [highlights, redactions, canvasDims]);

  // Click handler
  const handleClick = useCallback((e) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    function hitTest(list) {
      for (let i = list.length - 1; i >= 0; i--) {
        for (const { x, y, w, h } of list[i].rects) {
          if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) return i;
        }
      }
      return -1;
    }

    const ri = hitTest(redactions);
    if (ri !== -1) {
      const restored = redactions[ri];
      setRedactions(prev => prev.filter((_, i) => i !== ri));
      setHighlights(prev => [...prev, restored]);
      return;
    }

    const hi = hitTest(highlights);
    if (hi !== -1) {
      const applied = highlights[hi];
      setHighlights(prev => prev.filter((_, i) => i !== hi));
      setRedactions(prev => [...prev, applied]);
    }
  }, [highlights, redactions]);

  return (
    <div
      className={styles.wrapper}
      style={{ width: canvasDims.w, height: canvasDims.h }}
    >
      <canvas ref={pdfCanvasRef} className={styles.pdf} />
      <canvas
        ref={overlayRef}
        className={styles.overlay}
        onClick={handleClick}
        title="Click highlight → redact · Click black bar → undo"
      />
    </div>
  );
}
