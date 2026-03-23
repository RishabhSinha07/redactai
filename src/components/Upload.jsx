import { useRef, useState } from 'react';
import styles from './Upload.module.css';

export default function Upload({ onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result, file.name);
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className={styles.icon}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className={styles.primary}>Drop a PDF here</p>
      <p className={styles.secondary}>or click to browse — files never leave your browser</p>
    </div>
  );
}
