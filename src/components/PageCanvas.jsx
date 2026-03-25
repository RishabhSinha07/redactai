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

export default function PageCanvas({ page, pageIndex, spans, items, styles: fontStyles, modelColorMap, drawMode, command, onRedactionChange }) {
  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [canvasDims, setCanvasDims] = useState({ w: 612 * SCALE, h: 792 * SCALE });
  const [viewport, setViewport] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [redactions, setRedactions] = useState([]);

  // Drawing state for manual redaction
  const [drawing, setDrawing] = useState(null); // { startX, startY, curX, curY }

  // 1. Render PDF page
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
    const allRects = redactions.flatMap(r => r.rects);
    onRedactionChange?.(pageIndex, redactions.length, allRects);
  }, [redactions, pageIndex, onRedactionChange]);

  // 5. Draw overlay
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const { w, h } = canvasDims;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const r = 3;

    // Highlights
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

    // Active drawing rectangle
    if (drawing) {
      const dx = Math.min(drawing.startX, drawing.curX);
      const dy = Math.min(drawing.startY, drawing.curY);
      const dw = Math.abs(drawing.curX - drawing.startX);
      const dh = Math.abs(drawing.curY - drawing.startY);
      if (dw > 2 && dh > 2) {
        ctx.strokeStyle = 'var(--accent, #da7756)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        drawRoundRect(ctx, dx, dy, dw, dh, r);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(218, 119, 86, 0.1)';
        drawRoundRect(ctx, dx, dy, dw, dh, r);
        ctx.fill();
      }
    }
  }, [highlights, redactions, canvasDims, drawing, modelColorMap]);

  // Convert mouse/touch event to canvas coordinates
  function toCanvasCoords(e) {
    const canvas = overlayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // Click handler (normal mode)
  const handleClick = useCallback((e) => {
    if (drawMode) return; // handled by mouse events in draw mode

    const canvas = overlayRef.current;
    if (!canvas) return;
    const { x: cx, y: cy } = toCanvasCoords(e);

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
      // Only restore to highlights if it came from a detected span (not manual)
      if (restored.span) {
        setHighlights(prev => [...prev, restored]);
      }
      return;
    }

    const hi = hitTest(highlights);
    if (hi !== -1) {
      const applied = highlights[hi];
      setHighlights(prev => prev.filter((_, i) => i !== hi));
      setRedactions(prev => [...prev, applied]);
    }
  }, [highlights, redactions, drawMode]);

  // Draw mode handlers
  function handleMouseDown(e) {
    if (!drawMode) return;
    e.preventDefault();
    const { x, y } = toCanvasCoords(e);
    setDrawing({ startX: x, startY: y, curX: x, curY: y });
  }

  function handleMouseMove(e) {
    if (!drawing) return;
    const { x, y } = toCanvasCoords(e);
    setDrawing(prev => prev ? { ...prev, curX: x, curY: y } : null);
  }

  function handleMouseUp() {
    if (!drawing) return;
    const dx = Math.min(drawing.startX, drawing.curX);
    const dy = Math.min(drawing.startY, drawing.curY);
    const dw = Math.abs(drawing.curX - drawing.startX);
    const dh = Math.abs(drawing.curY - drawing.startY);
    setDrawing(null);

    // Only create redaction if rectangle is big enough
    if (dw > 5 && dh > 5) {
      setRedactions(prev => [
        ...prev,
        { span: null, rects: [{ x: dx, y: dy, w: dw, h: dh }] },
      ]);
    }
  }

  return (
    <div
      className={styles.wrapper}
      style={{ width: canvasDims.w, height: canvasDims.h }}
    >
      <canvas ref={pdfCanvasRef} className={styles.pdf} />
      <canvas
        ref={overlayRef}
        className={`${styles.overlay} ${drawMode ? styles.overlayDraw : ''}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        title={drawMode ? 'Click and drag to draw a redaction box' : 'Click highlight → redact · Click black bar → undo'}
      />
    </div>
  );
}
