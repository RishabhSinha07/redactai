// Polyfill for Promise.withResolvers (Chrome 119+, Safari 17.2+)
// Required by pdfjs-dist on older mobile browsers
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill for structuredClone (Chrome 98+, Safari 15.4+)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}
