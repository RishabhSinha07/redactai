import { Link } from 'react-router-dom';
import styles from './Landing.module.css';

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Instant Regex Scan',
    desc: 'SSNs, emails, phone numbers, credit cards, IPs, and dates detected in under 100ms using battle-tested patterns.',
    tag: 'REGEX',
    tagColor: 'var(--highlight-regex)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
    title: 'AI Name Detection',
    desc: 'BERT-based NER model identifies person names, organizations, and locations that regex cannot catch.',
    tag: 'NER',
    tagColor: 'var(--highlight-ner)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Zero Data Leaves',
    desc: 'Everything runs in your browser via WebAssembly. No server. No uploads. Your documents stay on your machine.',
    tag: 'PRIVATE',
    tagColor: 'rgba(34, 197, 94, 0.4)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
      </svg>
    ),
    title: 'Click to Redact',
    desc: 'Click any highlight to apply a black bar. Click the bar to undo. Redact all or clear all with one button.',
    tag: 'UX',
    tagColor: 'rgba(218, 119, 86, 0.4)',
  },
];

const STEPS = [
  { num: '01', title: 'Upload', desc: 'Drop a PDF or click to browse. The file never leaves your device.' },
  { num: '02', title: 'Review', desc: 'PII is highlighted instantly. Yellow for regex, purple for AI-detected entities.' },
  { num: '03', title: 'Redact', desc: 'Click highlights to apply black bars. Export or review findings.' },
];

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <line x1="7" y1="9" x2="17" y2="9"/>
              <line x1="7" y1="13" x2="13" y2="13"/>
              <line x1="7" y1="17" x2="10" y2="17"/>
            </svg>
          </div>
          <span>RedactAI</span>
        </div>
        <Link to="/app" className={styles.headerCta}>
          Launch App
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </header>

      <main className={styles.content}>
        {/* Hero heading */}
        <section className={styles.heroSection}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Open-source &middot; Browser-only &middot; Zero uploads
          </div>
          <h1 className={styles.heroTitle}>
            AI-powered redaction<br />
            <span className={styles.heroAccent}>that never sees your data</span>
          </h1>
          <p className={styles.heroSub}>
            The NER model runs directly in your browser via WebAssembly.
            Your documents are never uploaded, stored, or transmitted — not even for a millisecond.
          </p>
          <Link to="/app" className={styles.ctaButton}>
            Start Redacting
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <p className={styles.ctaHint}>No sign-up required. Free and open source.</p>
        </section>

        {/* Privacy details */}
        <section className={styles.privacySection}>
          <h2 className={styles.sectionTitle}>Your data never leaves</h2>
          <p className={styles.privacySub}>
            Most redaction tools upload your documents to a server. RedactAI is different —
            the AI model runs <strong>directly in your browser</strong> using WebAssembly.
            Not a single byte of your document is ever transmitted.
          </p>

          <div className={styles.archDiagram}>
            <div className={styles.archNode}>
              <div className={styles.archIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span className={styles.archLabel}>Your PDF</span>
            </div>
            <div className={styles.archArrow}>
              <div className={styles.archArrowLine} />
              <span className={styles.archArrowText}>stays local</span>
            </div>
            <div className={`${styles.archNode} ${styles.archNodeAccent}`}>
              <div className={styles.archIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                  <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                  <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                  <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                </svg>
              </div>
              <span className={styles.archLabel}>BERT NER Model</span>
              <span className={styles.archSublabel}>runs in WebAssembly</span>
            </div>
            <div className={styles.archArrow}>
              <div className={styles.archArrowLine} />
              <span className={styles.archArrowText}>all in-browser</span>
            </div>
            <div className={styles.archNode}>
              <div className={styles.archIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span className={styles.archLabel}>Redacted Output</span>
            </div>
          </div>

          <div className={styles.privacyCards}>
            <div className={styles.privacyCard}>
              <div className={styles.privacyCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div>
                <h4 className={styles.privacyCardTitle}>No server uploads</h4>
                <p className={styles.privacyCardDesc}>Your PDF is read into browser memory. It never touches a network request.</p>
              </div>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.privacyCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <div>
                <h4 className={styles.privacyCardTitle}>On-device AI inference</h4>
                <p className={styles.privacyCardDesc}>The BERT NER model (110M params) runs via ONNX Runtime WASM — no API calls, no cloud.</p>
              </div>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.privacyCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </div>
              <div>
                <h4 className={styles.privacyCardTitle}>Model cached locally</h4>
                <p className={styles.privacyCardDesc}>Downloaded once from HuggingFace Hub, then cached in IndexedDB. Loads instantly on return.</p>
              </div>
            </div>
          </div>

          <Link to="/app" className={styles.ctaButton}>
            Start Redacting
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <p className={styles.ctaHint}>No sign-up required. Free and open source.</p>
        </section>

        {/* How it works */}
        <section className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.stepsGrid}>
            {STEPS.map(step => (
              <div key={step.num} className={styles.stepCard}>
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Detection layers</h2>
          <div className={styles.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureTop}>
                  <div className={styles.featureIcon}>{f.icon}</div>
                  <span className={styles.featureTag} style={{ background: f.tagColor }}>{f.tag}</span>
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={styles.bottomCta}>
          <h2 className={styles.bottomCtaTitle}>Ready to redact?</h2>
          <p className={styles.bottomCtaSub}>No sign-up, no uploads, no tracking. Just open the app and drop a PDF.</p>
          <Link to="/app" className={styles.ctaButton}>
            Launch RedactAI
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>RedactAI is open source. All processing happens client-side via WebAssembly.</p>
          <p className={styles.footerMono}>Xenova/bert-base-NER &middot; pdfjs-dist &middot; ONNX Runtime Web</p>
        </footer>
      </main>
    </div>
  );
}
