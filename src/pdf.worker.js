// Polyfills for the PDF.js worker context
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function (obj, options) {
    if (options?.transfer) {
      // For transferable objects, just return as-is (best effort)
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  };
}

// Load the real PDF.js worker
import 'pdfjs-dist/build/pdf.worker.min.mjs';
