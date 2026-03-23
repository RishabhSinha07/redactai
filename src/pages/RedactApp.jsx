import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Upload from '../components/Upload';
import DocumentViewer from '../components/DocumentViewer';
import StatusBar from '../components/StatusBar';
import styles from './RedactApp.module.css';

// Each model gets an auto-assigned color
const AVAILABLE_MODELS = [
  {
    id: 'Xenova/bert-base-NER',
    name: 'BERT NER',
    desc: 'General-purpose NER (person, org, location)',
    size: '~65 MB',
    color: { fill: 'rgba(218, 119, 86, 0.28)', stroke: 'rgba(218, 119, 86, 0.55)', solid: '#da7756' },
  },
  {
    id: 'Xenova/bert-base-NER-uncased',
    name: 'BERT NER (uncased)',
    desc: 'Case-insensitive — better for uppercase docs',
    size: '~65 MB',
    color: { fill: 'rgba(94, 186, 171, 0.28)', stroke: 'rgba(94, 186, 171, 0.55)', solid: '#5ebaab' },
  },
  {
    id: 'Xenova/distilbert-base-multilingual-cased-ner-hrl',
    name: 'Multilingual NER',
    desc: 'Supports English, French, German, Spanish & more',
    size: '~90 MB',
    color: { fill: 'rgba(147, 130, 220, 0.28)', stroke: 'rgba(147, 130, 220, 0.55)', solid: '#9382dc' },
  },
];

export default function RedactApp() {
  const [fileBuffer, setFileBuffer] = useState(null);
  const [fileName, setFileName] = useState('');
  const [enabledModels, setEnabledModels] = useState([AVAILABLE_MODELS[0].id]);
  const [modelStatuses, setModelStatuses] = useState({});
  const [totalSpans, setTotalSpans] = useState(0);
  const [redactedCount, setRedactedCount] = useState(0);
  const [modelProgress, setModelProgress] = useState(null);
  const [perModelProgress, setPerModelProgress] = useState({});

  function handleFile(buffer, name) {
    setFileBuffer(buffer);
    setFileName(name);
    setTotalSpans(0);
    setRedactedCount(0);
  }

  function toggleModel(id) {
    setEnabledModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  const handleSpanCounts = useCallback((total, redacted) => {
    setTotalSpans(total);
    setRedactedCount(redacted);
  }, []);

  const handleModelProgress = useCallback((p) => {
    if (p.modelId) {
      setPerModelProgress(prev => ({
        ...prev,
        [p.modelId]: { ...prev[p.modelId], ...p },
      }));
    }
    setModelProgress(prev => ({ ...prev, ...p }));
  }, []);

  const handleModelStatus = useCallback((status) => {
    setModelStatuses(prev => ({ ...prev, latest: status }));
  }, []);

  const overallStatus = modelStatuses.latest || 'idle';

  const modelColorMap = {};
  for (const m of AVAILABLE_MODELS) {
    modelColorMap[m.id] = m.color;
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <line x1="7" y1="9" x2="17" y2="9"/>
              <line x1="7" y1="13" x2="13" y2="13"/>
              <line x1="7" y1="17" x2="10" y2="17"/>
            </svg>
          </div>
          <span>RedactAI</span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.privacy}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Browser-only
          </span>
          {fileBuffer && (
            <button className={styles.newPdfBtn} onClick={() => handleFile(null, '')}>
              New PDF
            </button>
          )}
        </div>
      </header>

      <StatusBar
        enabledModels={enabledModels}
        perModelProgress={perModelProgress}
        modelColorMap={modelColorMap}
        totalSpans={totalSpans}
        redactedCount={redactedCount}
      />

      <div className={styles.body}>
        {!fileBuffer && (
          <div className={styles.uploadWrap}>
            <div className={styles.uploadHero}>
              <h1 className={styles.uploadTitle}>Upload a PDF to redact</h1>
              <p className={styles.uploadSub}>
                Drop a file below. PII will be detected automatically using regex and AI.
              </p>
            </div>
            <Upload onFile={handleFile} />

            <div className={styles.modelPicker}>
              <p className={styles.modelPickerTitle}>NER Models</p>
              <p className={styles.modelPickerSub}>Select which AI models to run. Each adds a different highlight color.</p>
              <div className={styles.modelPickerGrid}>
                {AVAILABLE_MODELS.map(m => {
                  const enabled = enabledModels.includes(m.id);
                  return (
                    <label key={m.id} className={`${styles.modelCard} ${enabled ? styles.modelCardActive : ''}`}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleModel(m.id)}
                        className={styles.modelCardCheck}
                      />
                      <span className={styles.modelCardDot} style={{ background: enabled ? m.color.solid : 'var(--border)' }} />
                      <div className={styles.modelCardBody}>
                        <span className={styles.modelCardName}>{m.name}</span>
                        <span className={styles.modelCardDesc}>{m.desc}</span>
                        <span className={styles.modelCardSize}>{m.size}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <DocumentViewer
          fileBuffer={fileBuffer}
          fileName={fileName}
          enabledModels={enabledModels}
          availableModels={AVAILABLE_MODELS}
          modelColorMap={modelColorMap}
          onToggleModel={toggleModel}
          onStatusChange={handleModelStatus}
          onSpanCounts={handleSpanCounts}
          onModelProgress={handleModelProgress}
          hidden={!fileBuffer}
        />
      </div>
    </div>
  );
}
