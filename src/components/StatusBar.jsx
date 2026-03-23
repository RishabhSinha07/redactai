import styles from './StatusBar.module.css';

function fmt(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ModelPill({ modelId, progress, color }) {
  const shortName = modelId.split('/').pop();
  const isReady = progress?.ready === true;
  const isFailed = progress?.failed === true;
  const status = progress?.status;
  const isDownloading = !isReady && !isFailed && ['initiate', 'download', 'progress'].includes(status);
  const isLoading = !isReady && !isFailed && !isDownloading;
  const pct = progress?.progress ?? 0;

  let stateClass = isReady ? styles.ready : isFailed ? styles.failed : styles.loading;

  return (
    <div className={`${styles.modelPill} ${stateClass}`} style={{ '--pill-color': color?.solid || 'var(--accent)' }}>
      <span className={styles.pillDot} style={{ background: isFailed ? 'var(--danger)' : color?.solid || 'var(--accent)' }} />
      <span className={styles.pillName}>{shortName}</span>

      {isReady && <span className={styles.badge}>Ready</span>}
      {isFailed && <span className={styles.badgeFailed}>Failed</span>}

      {isDownloading && pct > 0 && (
        <div className={styles.pillProgress}>
          <div className={styles.pillProgressFill} style={{ width: `${pct}%`, background: color?.solid || 'var(--accent)' }} />
        </div>
      )}

      {(isDownloading || (isLoading && progress)) && <span className={styles.spinner} />}
      {isLoading && !progress && <span className={styles.pillSub}>Loading…</span>}
    </div>
  );
}

export default function StatusBar({ enabledModels, perModelProgress, modelColorMap, totalSpans, redactedCount }) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {(enabledModels || []).map(mid => (
          <ModelPill
            key={mid}
            modelId={mid}
            progress={perModelProgress?.[mid]}
            color={modelColorMap?.[mid]}
          />
        ))}
        {(!enabledModels || enabledModels.length === 0) && (
          <span className={styles.noModels}>No models selected</span>
        )}
      </div>

      <div className={styles.right}>
        {totalSpans > 0 && (
          <>
            <span className={styles.stat}>
              <span className={styles.statVal}>{totalSpans}</span> detected
            </span>
            <span className={styles.divider}>·</span>
            <span className={styles.stat}>
              <span className={styles.statVal}>{redactedCount}</span> redacted
            </span>
          </>
        )}
      </div>
    </div>
  );
}
