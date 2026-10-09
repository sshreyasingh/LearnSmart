const fsp = require('fs').promises;
const path = require('path');
const { embedQuery, cosineSimilarity, EMBEDDING_DIMENSION } = require('./embedding.service');

const VECTOR_CACHE_TTL = 60 * 60 * 1000;

const vectorStoreCache = new Map();

const getStoreDir = (projectId) => {
  return path.join(__dirname, '..', '..', 'uploads', 'vector_stores', String(projectId));
};

const getCachedStore = (projectId) => {
  const entry = vectorStoreCache.get(projectId);
  if (entry && Date.now() - entry.loadedAt < VECTOR_CACHE_TTL) {
    return entry.store;
  }
  return null;
};

const indexPipelineOutput = async (projectId, pipelineOutput) => {
  const storeDir = getStoreDir(projectId);
  await fsp.mkdir(storeDir, { recursive: true });

  const store = pipelineOutput.map((item) => ({
    chunkHash: item.chunkHash,
    filePath: item.filePath,
    fileName: item.fileName,
    language: item.language,
    content: item.content,
    startLine: item.startLine,
    endLine: item.endLine,
    functionName: item.functionName || null,
    className: item.className || null,
    symbolType: item.symbolType || null,
    vector: item.vector || new Array(EMBEDDING_DIMENSION).fill(0),
  }));

  const storePath = path.join(storeDir, 'store.json');
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  await fsp.writeFile(temporaryPath, JSON.stringify(store));
  await fsp.rename(temporaryPath, storePath);
  const { mtimeMs } = await fsp.stat(storePath);

  vectorStoreCache.set(projectId, { store, loadedAt: Date.now(), mtimeMs });

  return { indexed: store.length };
};

const loadStore = async (projectId) => {
  try {
    // Other server workers may have published a newer index.
    const storePath = path.join(getStoreDir(projectId), 'store.json');
    const { mtimeMs } = await fsp.stat(storePath);
    const cached = getCachedStore(projectId);
    if (cached && vectorStoreCache.get(projectId).mtimeMs === mtimeMs) return cached;
    const data = JSON.parse(
      await fsp.readFile(storePath, 'utf-8')
    );
    vectorStoreCache.set(projectId, { store: data, loadedAt: Date.now(), mtimeMs });
    return data;
  } catch {
    return [];
  }
};

const search = async (projectId, query, limit = 5) => {
  const store = await loadStore(projectId);
  if (!store || store.length === 0) return [];

  const hasVectors = store.some(item => item.vector?.some(v => v !== 0));
  const queryVector = hasVectors ? await embedQuery(query) : [];

  const scored = store
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryVector, item.vector || []),
    }))
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length) return scored;

  // Keep code retrieval usable when embeddings are unavailable or incomplete.
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9_]{3,}/g) || [])];
  return store.map(item => {
    const text = `${item.filePath} ${item.functionName || ''} ${item.content}`.toLowerCase();
    const matches = terms.filter(term => text.includes(term)).length;
    return { ...item, score: matches / Math.max(terms.length, 1) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
};

const deleteStore = async (projectId) => {
  vectorStoreCache.delete(projectId);
  try {
    await fsp.rm(getStoreDir(projectId), { recursive: true, force: true });
  } catch {}
};

module.exports = { indexPipelineOutput, search, deleteStore, loadStore };
