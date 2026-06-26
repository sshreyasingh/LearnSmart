const crypto = require('crypto');
const fsp = require('fs').promises;
const path = require('path');
const { getEmbeddingModel } = require('../config/openrouter');
const AppError = require('../utils/AppError');

const EMBEDDING_DIMENSION = 2048;
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const embeddingCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_DIR = path.join(__dirname, '..', '..', 'uploads', 'embedding_cache');

const estimateTokens = (text) => text ? Math.ceil(text.length / 3.5) : 0;
const hashText = (text) => crypto.createHash('sha256').update(text).digest('hex');

const initCache = async () => { try { await fsp.mkdir(CACHE_DIR, { recursive: true }); } catch {} };

const loadCacheFromDisk = async () => {
  try {
    const files = await fsp.readdir(CACHE_DIR);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const d = JSON.parse(await fsp.readFile(path.join(CACHE_DIR, f), 'utf-8'));
        if (Array.isArray(d)) {
          // New batch format: array of {key, vector, timestamp}
          for (const entry of d) {
            if (entry.key && entry.vector) {
              embeddingCache.set(entry.key, { vector: entry.vector, timestamp: entry.timestamp || 0 });
            }
          }
        } else if (d.vector) {
          // Legacy single-entry format
          embeddingCache.set(f.replace('.json', ''), { vector: d.vector, timestamp: d.timestamp || 0 });
        }
      } catch {}
    }
  } catch {}
};

const getCachedEmbedding = (text) => {
  const h = hashText(text), e = embeddingCache.get(h);
  return e && Date.now() - e.timestamp < CACHE_TTL ? e.vector : null;
};

let diskWriteTimer = null;

const persistCacheToDisk = async () => {
  try {
    const entries = [];
    for (const [key, val] of embeddingCache) {
      if (val.vector) entries.push({ key, vector: val.vector, timestamp: val.timestamp });
    }
    if (entries.length === 0) return;
    // Batch-write all entries as individual files to avoid rewriting one giant file
    await fsp.writeFile(
      path.join(CACHE_DIR, `batch_${Date.now()}.json`),
      JSON.stringify(entries)
    );
    // Clean up old batch files, keep only the last 3
    const files = (await fsp.readdir(CACHE_DIR)).filter(f => f.startsWith('batch_'));
    if (files.length > 3) {
      const toRemove = files.sort().slice(0, files.length - 3);
      for (const f of toRemove) {
        await fsp.unlink(path.join(CACHE_DIR, f)).catch(() => {});
      }
    }
  } catch {}
};

const scheduleDiskPersist = () => {
  if (diskWriteTimer) clearTimeout(diskWriteTimer);
  diskWriteTimer = setTimeout(() => {
    diskWriteTimer = null;
    persistCacheToDisk().catch(() => {});
  }, 5000);
};

const setCachedEmbedding = (text, vector) => {
  embeddingCache.set(hashText(text), { vector, timestamp: Date.now() });
  scheduleDiskPersist();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryableError = (error) => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || 0;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (/rate|quota|exceeded|timeout|econnreset|econnrefused|econnaborted|unavailable|too many/i.test(msg)) return true;
  return false;
};

const getRetryDelay = (attempt) => BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);

const embedSingle = async (text) => {
  if (!text || !text.trim()) return new Array(EMBEDDING_DIMENSION).fill(0);

  const cached = getCachedEmbedding(text);
  if (cached) return cached;

  const model = getEmbeddingModel();
  if (!model) throw new AppError('OpenRouter embedding not configured', 500, 'EMBEDDING_NOT_CONFIGURED');

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await model.create(text);
      const values = resp.data?.[0]?.embedding || [];
      const vector = values.length >= EMBEDDING_DIMENSION
        ? values.slice(0, EMBEDDING_DIMENSION)
        : [...values, ...new Array(EMBEDDING_DIMENSION - values.length).fill(0)];

      setCachedEmbedding(text, vector);
      return vector;
    } catch (error) {
      lastError = error;
      const msg = (error.message || '').toLowerCase();

      if (!isRetryableError(error)) {
        // Non-retryable error (auth, bad request, etc.) — throw immediately
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        console.warn(`[Embedding] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms for "${text.substring(0, 60)}...": ${msg}`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  console.error(`[Embedding] All ${MAX_RETRIES} retries failed for "${text.substring(0, 60)}..."`);
  throw lastError || new AppError('Embedding failed after all retries', 500, 'EMBEDDING_FAILED');
};

const embedBatch = async (texts, onProgress) => {
  const model = getEmbeddingModel();
  if (!model) throw new AppError('OpenRouter embedding not configured', 500, 'EMBEDDING_NOT_CONFIGURED');

  const results = new Array(texts.length);
  let cursor = 0;
  let done = 0;
  let total = texts.length;
  let zeroCount = 0;

  const worker = async () => {
    while (cursor < total) {
      const i = cursor++;
      try {
        results[i] = await embedSingle(texts[i]);
        // Count zero vectors for quality tracking
        if (results[i].every(v => v === 0)) zeroCount++;
      } catch (err) {
        console.error(`[Embedding] Failed to embed chunk ${i}/${total}: ${err.message}`);
        // Don't silently fill with zeros — the pipeline will detect and handle this
        results[i] = new Array(EMBEDDING_DIMENSION).fill(0);
        zeroCount++;
      }
      done++;
      if (onProgress && done % 5 === 0) onProgress({ embedded: done, total });
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, texts.length) }, () => worker());
  await Promise.all(workers);

  // Log quality warning
  const zeroPct = total > 0 ? Math.round((zeroCount / total) * 100) : 0;
  if (zeroPct > 20) {
    console.warn(`[Embedding] WARNING: ${zeroPct}% of vectors are zero — embedding quality may be degraded`);
  } else if (zeroCount > 0) {
    console.warn(`[Embedding] ${zeroCount}/${total} vectors are zero (${zeroPct}%)`);
  }

  return results;
};

const embedQuery = async (text) => {
  try {
    return await embedSingle(text);
  } catch (err) {
    console.error(`[Embedding] Query embedding failed: ${err.message}`);
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }
};

const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const d = Math.sqrt(nA) * Math.sqrt(nB);
  return d === 0 ? 0 : dot / d;
};

const clearCache = () => embeddingCache.clear();

initCache().then(() => loadCacheFromDisk()).catch(() => {});

module.exports = { embedSingle, embedBatch, embedQuery, cosineSimilarity, clearCache, EMBEDDING_DIMENSION };
