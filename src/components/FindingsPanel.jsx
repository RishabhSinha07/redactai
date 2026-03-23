import { useState } from 'react';
import styles from './FindingsPanel.module.css';

const TYPE_LABELS = {
  PER: 'Person',
  ORG: 'Organization',
  LOC: 'Location',
  MISC: 'Miscellaneous',
  SSN: 'SSN',
  Email: 'Email',
  Phone: 'Phone',
  CreditCard: 'Credit Card',
  IPAddress: 'IP Address',
  Date: 'Date',
};

const SOURCE_LABELS = { regex: 'Regex', ner: 'NER (AI)' };

export default function FindingsPanel({ findings, onClose }) {
  const [filterSource, setFilterSource] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const types = [...new Set(findings.map(f => f.type))].sort();
  const sources = [...new Set(findings.map(f => f.source))].sort();

  const filtered = findings.filter(f => {
    if (filterSource !== 'all' && f.source !== filterSource) return false;
    if (filterType !== 'all' && f.type !== filterType) return false;
    return true;
  });

  const grouped = {};
  for (const f of filtered) {
    const key = f.pageIndex ?? 0;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Detection Results</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Source</label>
            <select
              className={styles.select}
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
            >
              <option value="all">All ({findings.length})</option>
              {sources.map(s => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s} ({findings.filter(f => f.source === s).length})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.select}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All types</option>
              {types.map(t => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t} ({findings.filter(f => f.type === t).length})
                </option>
              ))}
            </select>
          </div>
          <span className={styles.count}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className={styles.body}>
          {Object.keys(grouped).sort((a, b) => a - b).map(pageIdx => (
            <div key={pageIdx}>
              <p className={styles.pageHeader}>Page {Number(pageIdx) + 1}</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Text</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[pageIdx].map((f, i) => (
                    <tr key={i}>
                      <td className={styles.textCell}>
                        <span className={`${styles.textBadge} ${styles[f.source]}`}>
                          {f.word}
                        </span>
                      </td>
                      <td>
                        <span className={styles.typeBadge}>{TYPE_LABELS[f.type] ?? f.type}</span>
                      </td>
                      <td>
                        <span className={`${styles.sourceBadge} ${styles[f.source]}`}>
                          {SOURCE_LABELS[f.source] ?? f.source}
                        </span>
                      </td>
                      <td className={styles.score}>
                        {f.score != null ? `${(f.score * 100).toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className={styles.empty}>No findings match the current filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
