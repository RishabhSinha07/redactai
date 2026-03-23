import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let ner = null;

/**
 * Build token-to-character offset map.
 *
 * Strategy: encode each character individually to find which token it maps to,
 * then build a reverse map from token index → character range.
 *
 * This is slower but avoids the sequential cursor desync problem entirely.
 */
function buildTokenOffsets(tokenizer, text) {
  // Tokenize the full text to get the token list
  const tokens = tokenizer.tokenize(text, { add_special_tokens: false });
  const offsets = new Array(tokens.length).fill(null);

  // Walk through text character by character
  // For each token, find where it appears in the text
  let textPos = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];

    if (token === '[UNK]') {
      // Skip whitespace, assign one char
      while (textPos < text.length && /\s/.test(text[textPos])) textPos++;
      offsets[ti] = { start: textPos, end: Math.min(textPos + 1, text.length) };
      textPos = Math.min(textPos + 1, text.length);
      continue;
    }

    const isSubword = token.startsWith('##');
    const clean = isSubword ? token.slice(2) : token;

    // For non-subword tokens, skip whitespace
    if (!isSubword) {
      while (textPos < text.length && /\s/.test(text[textPos])) textPos++;
    }

    // Match character by character from textPos
    const matchStart = textPos;
    let matched = true;

    for (let ci = 0; ci < clean.length; ci++) {
      if (textPos >= text.length) { matched = false; break; }
      // Case-insensitive comparison
      if (text[textPos].toLowerCase() === clean[ci].toLowerCase()) {
        textPos++;
      } else {
        matched = false;
        break;
      }
    }

    if (matched) {
      offsets[ti] = { start: matchStart, end: textPos };
    } else {
      // Fallback: search nearby
      textPos = matchStart; // reset
      const searchEnd = Math.min(matchStart + 50, text.length);
      const lowerClean = clean.toLowerCase();
      let found = false;
      for (let s = matchStart; s < searchEnd; s++) {
        if (text.substring(s, s + clean.length).toLowerCase() === lowerClean) {
          offsets[ti] = { start: s, end: s + clean.length };
          textPos = s + clean.length;
          found = true;
          break;
        }
      }
      if (!found) {
        offsets[ti] = { start: matchStart, end: matchStart + clean.length };
        textPos = matchStart + clean.length;
      }
    }
  }

  return offsets;
}

/**
 * Aggregate B-/I- token entities into grouped spans.
 */
function aggregateEntities(rawTokens, tokenOffsets, originalText) {
  if (!rawTokens || !rawTokens.length) return [];

  const groups = [];
  let current = null;

  for (const tok of rawTokens) {
    const tag = tok.entity;
    const dashIdx = tag.indexOf('-');
    const prefix = dashIdx !== -1 ? tag.slice(0, dashIdx) : 'B';
    const label = dashIdx !== -1 ? tag.slice(dashIdx + 1) : tag;
    const offsetIdx = tok.index - 1; // subtract 1 for [CLS]

    if (prefix === 'B' || !current || current.label !== label) {
      if (current) groups.push(current);
      current = { label, indices: [offsetIdx], score: tok.score };
    } else {
      current.indices.push(offsetIdx);
      current.score = Math.min(current.score, tok.score);
    }
  }
  if (current) groups.push(current);

  const result = [];
  for (const group of groups) {
    let start = Infinity, end = -Infinity;
    let valid = true;

    for (const idx of group.indices) {
      if (idx < 0 || idx >= tokenOffsets.length || !tokenOffsets[idx]) { valid = false; break; }
      start = Math.min(start, tokenOffsets[idx].start);
      end = Math.max(end, tokenOffsets[idx].end);
    }

    if (!valid || start >= end || start >= originalText.length) continue;
    end = Math.min(end, originalText.length);

    // Reject spans that cross newlines (they span multiple table rows)
    const word = originalText.slice(start, end);
    if (word.includes('\n')) continue;

    result.push({ entity_group: group.label, score: group.score, word, start, end });
  }

  return result;
}

self.onmessage = async ({ data }) => {
  if (data.type === 'LOAD_MODEL') {
    const modelId = data.modelId || 'Xenova/bert-base-NER';
    console.log(`[NER worker] Loading model: ${modelId}`);
    try {
      ner = await pipeline('token-classification', modelId, {
        progress_callback: (p) => {
          console.log('[NER worker] progress:', p.status, p.file, p.progress?.toFixed(1));
          self.postMessage({ type: 'MODEL_PROGRESS', ...p });
        },
      });
      console.log('[NER worker] Model ready');
      self.postMessage({ type: 'MODEL_READY' });
    } catch (err) {
      console.error('[NER worker] Load error:', err);
      self.postMessage({ type: 'MODEL_ERROR', error: err.message });
    }
  }

  if (data.type === 'RUN_NER') {
    if (!ner) {
      self.postMessage({ type: 'NER_ERROR', error: 'Model not loaded' });
      return;
    }
    try {
      const tokenOffsets = buildTokenOffsets(ner.tokenizer, data.text);
      const rawTokens = await ner(data.text, { ignore_labels: ['O'] });
      const entities = aggregateEntities(rawTokens, tokenOffsets, data.text);
      console.log(`[NER worker] Page ${data.pageIndex}: ${rawTokens.length} raw → ${entities.length} grouped`);
      self.postMessage({ type: 'NER_RESULTS', entities, pageIndex: data.pageIndex });
    } catch (err) {
      console.error('[NER worker] Inference error:', err);
      self.postMessage({ type: 'NER_ERROR', error: err.message });
    }
  }
};
