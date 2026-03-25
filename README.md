<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="RedactAI logo" />
</p>

<h1 align="center">RedactAI</h1>

<p align="center">
  <strong>AI-powered PDF redaction that never sees your data.</strong><br/>
  The NER model runs directly in your browser via WebAssembly — your documents are never uploaded, stored, or transmitted.
</p>

<p align="center">
  <a href="#features">Features</a>&nbsp;&nbsp;&bull;&nbsp;&nbsp;<a href="#how-it-works">How It Works</a>&nbsp;&nbsp;&bull;&nbsp;&nbsp;<a href="#getting-started">Getting Started</a>&nbsp;&nbsp;&bull;&nbsp;&nbsp;<a href="#tech-stack">Tech Stack</a>&nbsp;&nbsp;&bull;&nbsp;&nbsp;<a href="#project-structure">Project Structure</a>
</p>

---

## Why RedactAI?

Most redaction tools upload your sensitive documents to a server. **RedactAI is different** — the AI model runs entirely in your browser using WebAssembly. Not a single byte of your document is ever transmitted.

```
┌──────────────┐      stays local      ┌──────────────────┐      all in-browser      ┌──────────────────┐
│   Your PDF   │ ───────────────────▶  │  BERT NER Model  │ ──────────────────────▶  │  Redacted Output │
│              │                        │  (WebAssembly)   │                          │                  │
└──────────────┘                        └──────────────────┘                          └──────────────────┘
```

- **No server uploads** — your PDF is read into browser memory and never touches a network request
- **On-device AI inference** — the BERT NER model (110M params) runs via ONNX Runtime WASM
- **Model cached locally** — downloaded once from HuggingFace Hub, then cached in IndexedDB

---

## Features

### Detection Layers

| Layer | What it catches | Speed |
|-------|----------------|-------|
| **Regex Scan** | SSNs, emails, phone numbers, credit cards, IP addresses, dates | < 100ms |
| **AI / NER** | Person names, organizations, locations, misc entities | ~2-5s per page |
| **Manual Draw** | Anything you select with click-and-drag | Instant |

### Interaction

- **Click to redact** — click any highlight to apply a black bar
- **Click to undo** — click a black bar to restore the original text
- **Redact All / Clear All** — bulk actions with one button
- **Draw mode** — manually draw rectangles over text to redact
- **Findings panel** — filterable table of all detections with type, source, and confidence

### Multi-Model Support

Choose from multiple NER models depending on your needs:

| Model | Size | Best for |
|-------|------|----------|
| `Xenova/bert-base-NER` | ~65 MB | English documents (default) |
| `Xenova/bert-base-NER-uncased` | ~65 MB | Case-insensitive detection |
| `Xenova/distilbert-NER-multilingual` | ~90 MB | Non-English documents |

Models are downloaded once and cached in your browser's IndexedDB for instant loading on return visits.

---

## How It Works

```
 01                        02                          03
 ─────────                 ─────────                   ─────────
 UPLOAD                    REVIEW                      REDACT

 Drop a PDF or click       PII is highlighted          Click highlights to
 to browse. The file       instantly. Yellow for       apply black bars.
 never leaves your         regex, purple for           Export the clean PDF
 device.                   AI-detected entities.       or review findings.
```

Under the hood:

1. **PDF.js** renders each page to a canvas and extracts text with character-level positions
2. **Regex patterns** scan the extracted text for structured PII (SSNs, emails, etc.)
3. **Web Workers** run BERT-based NER models via HuggingFace Transformers.js + ONNX Runtime WASM
4. **Span merging** deduplicates overlapping detections from regex and multiple NER models
5. **pdf-lib** generates the final redacted PDF with black rectangles drawn over sensitive areas

---

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/yourusername/redactai.git
cd redactai

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build    # Creates optimized dist/ folder
npm run preview  # Preview the production build locally
```

### Lint

```bash
npm run lint
```

### Test

```bash
npx playwright test
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 19 + React Router 7 |
| **Build** | Vite 8 |
| **AI/ML** | HuggingFace Transformers.js (ONNX Runtime WASM) |
| **PDF Rendering** | PDF.js (pdfjs-dist 4.0) |
| **PDF Export** | pdf-lib |
| **Styling** | CSS Modules |
| **Testing** | Playwright |
| **Deployment** | Vercel |

---

## Project Structure

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Router (/ and /app)
├── pages/
│   ├── Landing.jsx             # Marketing landing page
│   └── RedactApp.jsx           # Main app with file handling
├── components/
│   ├── Upload.jsx              # Drag-and-drop PDF upload
│   ├── DocumentViewer.jsx      # Orchestrator: PDF loading, model workers, state
│   ├── PageCanvas.jsx          # PDF rendering + interactive highlight/redaction overlay
│   ├── FindingsPanel.jsx       # Modal with filterable detection results
│   └── StatusBar.jsx           # Model loading status & detection counts
├── lib/
│   ├── pdfUtils.js             # Text extraction & span-to-rect mapping
│   ├── regex.js                # PII regex patterns
│   ├── spanMerger.js           # Deduplication of overlapping spans
│   └── exportPdf.js            # Redacted PDF generation
├── workers/
│   └── ner.worker.js           # Web Worker running BERT inference
└── styles/
    └── global.css              # CSS variables & resets
```

---

## Privacy Architecture

RedactAI requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers for SharedArrayBuffer support in Web Workers. These are configured in `vite.config.js` for development and handled by Vercel's edge network in production.

**What happens when you use RedactAI:**

1. Your PDF is loaded into browser memory via the File API
2. PDF.js extracts text — no network calls
3. Regex patterns run synchronously on the main thread
4. BERT models run in Web Workers via WASM — no API calls to any server
5. The redacted PDF is generated client-side with pdf-lib
6. You download the result directly — nothing is ever sent anywhere

---

## License

Open source. See the repo for license details.
