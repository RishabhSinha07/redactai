import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import PageCanvas from './PageCanvas';
import FindingsPanel from './FindingsPanel';
import { extractText } from '../lib/pdfUtils';
import { runRegex } from '../lib/regex';
import { mergeSpans } from '../lib/spanMerger';
import { exportRedactedPdf, downloadBlob } from '../lib/exportPdf';
import styles from './DocumentViewer.module.css';

const SCALE = 1.5;

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function DocumentViewer({
  fileBuffer, fileName, enabledModels, availableModels, modelColorMap, onToggleModel,
  onStatusChange, onSpanCounts, onModelProgress, hidden,
}) {
  const [pages, setPages] = useState([]);
  const [redactionCounts, setRedactionCounts] = useState({});
  const [command, setCommand] = useState(null);
  const [findings, setFindings] = useState([]);
  const [showFindings, setShowFindings] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const pdfBytesRef = useRef(null); // preserved copy of PDF bytes for export

  // One worker per model
  const workersRef = useRef({}); // { modelId: worker }
  const modelReadyRef = useRef(new Set());
  const pageDataRef = useRef([]);

  // Manage workers — boot new ones, terminate removed ones
  useEffect(() => {
    const current = workersRef.current;
    const enabledSet = new Set(enabledModels);

    // Terminate workers for deselected models
    for (const id of Object.keys(current)) {
      if (!enabledSet.has(id)) {
        current[id].terminate();
        delete current[id];
        modelReadyRef.current.delete(id);
        // Remove spans from this model
        removeModelSpans(id);
      }
    }

    // Boot workers for newly selected models
    for (const modelId of enabledModels) {
      if (current[modelId]) continue;

      onStatusChange('loading');
      const worker = new Worker(
        new URL('../workers/ner.worker.js', import.meta.url),
        { type: 'module' }
      );
      current[modelId] = worker;

      worker.onmessage = ({ data }) => {
        if (data.type === 'MODEL_PROGRESS') {
          onModelProgress?.({
            modelId,
            status: data.status, file: data.file,
            progress: data.progress ?? 0, loaded: data.loaded ?? 0, total: data.total ?? 0,
          });
        }
        if (data.type === 'MODEL_READY') {
          modelReadyRef.current.add(modelId);
          onStatusChange('ready');
          onModelProgress?.({ modelId, status: 'ready', ready: true });
          runNERForModel(modelId);
        }
        if (data.type === 'NER_RESULTS') {
          handleNERResults(data.entities, data.pageIndex, modelId);
        }
        if (data.type === 'MODEL_ERROR') {
          console.error(`[${modelId}] load error:`, data.error);
          onModelProgress?.({ modelId, status: 'error', error: data.error, failed: true });
          onStatusChange('ready');
        }
        if (data.type === 'NER_ERROR') {
          console.error(`[${modelId}] inference error:`, data.error);
        }
      };

      worker.postMessage({ type: 'LOAD_MODEL', modelId });
    }

    return () => {
      for (const w of Object.values(current)) w.terminate();
      workersRef.current = {};
      modelReadyRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledModels.join(',')]);

  // Load PDF
  useEffect(() => {
    if (!fileBuffer) return;
    loadPDF(fileBuffer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileBuffer]);

  async function loadPDF(buffer) {
    // Copy buffer before PDF.js detaches it
    pdfBytesRef.current = buffer.slice(0);
    onStatusChange('running');
    setLoadError(null);
    setLoading(true);
    pageDataRef.current = [];
    setPages([]);
    setRedactionCounts({});
    setCommand(null);

    try {
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const loadedPages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const { fullText, charMap, items, styles } = await extractText(page);
        pageDataRef.current[i - 1] = { fullText, charMap, items, styles };

        const regexSpans = runRegex(fullText).map(s => ({
          ...s, charMap, pageIndex: i - 1,
        }));

        loadedPages.push({ page, pageIndex: i - 1, spans: regexSpans, items, styles });
      }

      setPages(loadedPages);

      const regexFindings = loadedPages.flatMap(p =>
        p.spans.map(s => {
          const pd = pageDataRef.current[s.pageIndex];
          return {
            word: pd ? pd.fullText.slice(s.start, s.end) : '',
            type: s.type, source: 'regex', score: 1, pageIndex: s.pageIndex,
          };
        })
      );
      setFindings(regexFindings);

      const total = loadedPages.reduce((acc, p) => acc + p.spans.length, 0);
      onSpanCounts?.(total, 0);
      setLoading(false);
      onStatusChange('ready');

      // Run NER for all ready models
      for (const mid of modelReadyRef.current) {
        runNERForModel(mid);
      }
    } catch (err) {
      console.error('PDF load error:', err);
      setLoading(false);
      setLoadError(err.message || 'Failed to load PDF');
      onStatusChange('idle');
    }
  }

  function runNERForModel(modelId) {
    const worker = workersRef.current[modelId];
    if (!worker || !pageDataRef.current.length) return;
    onStatusChange('running');
    pageDataRef.current.forEach((pd, idx) => {
      if (pd?.fullText) {
        worker.postMessage({ type: 'RUN_NER', text: pd.fullText, pageIndex: idx });
      }
    });
  }

  function handleNERResults(entities, pageIndex, modelId) {
    const pd = pageDataRef.current[pageIndex];
    if (!pd) return;

    const nerSpans = (entities || [])
      .filter(e => e.entity_group !== 'O' && e.score > 0.75 && e.start != null && e.end != null)
      .map(e => ({
        start: e.start, end: e.end, type: e.entity_group,
        source: 'ner', modelId, charMap: pd.charMap, pageIndex,
      }));

    // Findings
    const newFindings = (entities || [])
      .filter(e => e.entity_group !== 'O' && e.score > 0.5 && e.start != null)
      .map(e => ({
        word: e.word, type: e.entity_group,
        source: modelId, score: e.score, pageIndex,
      }));
    setFindings(prev => [
      ...prev.filter(f => !(f.source === modelId && f.pageIndex === pageIndex)),
      ...newFindings,
    ]);

    setPages(prev => {
      const updated = [...prev];
      const entry = updated[pageIndex];
      if (!entry) return prev;

      // Keep regex + spans from OTHER models, add this model's spans
      const kept = entry.spans.filter(s => s.source === 'regex' || (s.source === 'ner' && s.modelId !== modelId));
      const merged = mergeSpans([...kept, ...nerSpans]);
      updated[pageIndex] = { ...entry, spans: merged };

      const total = updated.reduce((acc, p) => acc + p.spans.length, 0);
      setRedactionCounts(rc => {
        const redacted = Object.values(rc).reduce((a, b) => a + b, 0);
        onSpanCounts?.(total, redacted);
        return rc;
      });
      return updated;
    });

    onStatusChange('done');
  }

  function removeModelSpans(modelId) {
    setPages(prev => prev.map(entry => ({
      ...entry,
      spans: entry.spans.filter(s => !(s.source === 'ner' && s.modelId === modelId)),
    })));
    setFindings(prev => prev.filter(f => f.source !== modelId));
  }

  const redactionRectsRef = useRef({}); // { pageIndex: rects[] }

  const handleRedactionChange = useCallback((pageIndex, count, rects) => {
    redactionRectsRef.current[pageIndex] = rects || [];
    setRedactionCounts(prev => {
      const next = { ...prev, [pageIndex]: count };
      setPages(ps => {
        const total = ps.reduce((acc, p) => acc + p.spans.length, 0);
        const redacted = Object.values(next).reduce((a, b) => a + b, 0);
        onSpanCounts?.(total, redacted);
        return ps;
      });
      return next;
    });
  }, [onSpanCounts]);

  async function handleDownload() {
    if (!pdfBytesRef.current) return;
    const redactedSpans = Object.entries(redactionRectsRef.current)
      .filter(([, rects]) => rects.length > 0)
      .map(([pageIndex, rects]) => ({ pageIndex: Number(pageIndex), rects }));

    if (redactedSpans.length === 0) {
      alert('No redactions applied yet. Click highlights to redact them first.');
      return;
    }

    const bytes = await exportRedactedPdf(pdfBytesRef.current, redactedSpans, SCALE);
    const redactedName = fileName.replace(/\.pdf$/i, '') + '_redacted.pdf';
    downloadBlob(bytes, redactedName);
  }

  function issueCommand(cmd) {
    setCommand(cmd);
    setTimeout(() => setCommand(null), 0);
  }

  // Loading state
  if (loading && !pages.length) {
    return hidden ? null : (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading PDF...</p>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return hidden ? null : (
      <div className={styles.loadingWrap}>
        <p className={styles.errorText}>Failed to load PDF</p>
        <p className={styles.errorDetail}>{loadError}</p>
      </div>
    );
  }

  if (!pages.length) return null;

  return (
    <div className={styles.layout} style={hidden ? { display: 'none' } : {}}>
      <aside className={styles.sidebar}>
        <p className={styles.filename}>{fileName}</p>
        <p className={styles.meta}>{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => issueCommand('redact-all')}>
            Redact All
          </button>
          <button className={styles.btnSecondary} onClick={() => issueCommand('clear-all')}>
            Clear All
          </button>
          <button
            className={`${styles.btnDraw} ${drawMode ? styles.btnDrawActive : ''}`}
            onClick={() => setDrawMode(d => !d)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M8 12h8"/>
            </svg>
            {drawMode ? 'Drawing Mode ON' : 'Manual Redact'}
          </button>
          <button className={styles.btnFindings} onClick={() => setShowFindings(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            View Findings ({findings.length})
          </button>
          <button className={styles.btnDownload} onClick={handleDownload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Redacted PDF
          </button>
        </div>
        {/* Models */}
        <div className={styles.modelsSection}>
          <p className={styles.modelsTitle}>NER Models</p>
          {(availableModels || []).map(m => {
            const enabled = enabledModels.includes(m.id);
            return (
              <label key={m.id} className={`${styles.modelToggle} ${enabled ? styles.modelToggleActive : ''}`}>
                <span className={styles.modelToggleDot} style={{ background: enabled ? m.color.solid : 'var(--border)' }} />
                <div className={styles.modelToggleInfo}>
                  <span className={styles.modelToggleName}>{m.name}</span>
                  <span className={styles.modelToggleDesc}>{m.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => onToggleModel?.(m.id)}
                  className={styles.modelToggleCheck}
                />
              </label>
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.swatchRegex} /> Regex
          </div>
          {enabledModels.map(mid => {
            const c = modelColorMap?.[mid];
            const m = availableModels?.find(am => am.id === mid);
            return c ? (
              <div key={mid} className={styles.legendItem}>
                <span className={styles.swatchDynamic} style={{ background: c.fill, borderColor: c.stroke }} />
                {m?.name || mid.split('/').pop()}
              </div>
            ) : null;
          })}
          <div className={styles.legendItem}>
            <span className={styles.swatchRedaction} /> Redacted
          </div>
          <p className={styles.hint}>Click highlight → redact<br />Click black bar → undo</p>
        </div>
      </aside>
      <main className={styles.pages}>
        {pages.map((pageData) => (
          <div key={pageData.pageIndex} className={styles.pageWrapper}>
            <p className={styles.pageLabel}>Page {pageData.pageIndex + 1}</p>
            <PageCanvas
              page={pageData.page}
              pageIndex={pageData.pageIndex}
              spans={pageData.spans}
              items={pageData.items}
              styles={pageData.styles}
              modelColorMap={modelColorMap}
              drawMode={drawMode}
              command={command}
              onRedactionChange={handleRedactionChange}
            />
          </div>
        ))}
      </main>
      {showFindings && (
        <FindingsPanel findings={findings} onClose={() => setShowFindings(false)} />
      )}
    </div>
  );
}
