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

  await fsp.writeFile(
    path.join(storeDir, 'store.json'),
    JSON.stringify(store.map(({ vector, ...rest }) => ({ ...rest, vector })))
  );

  vectorStoreCache.set(projectId, { store, loadedAt: Date.now() });

  return { indexed: store.length };
};

const loadStore = async (projectId) => {
  const cached = getCachedStore(projectId);
  if (cached) return cached;

  try {
    const data = JSON.parse(
      await fsp.readFile(path.join(getStoreDir(projectId), 'store.json'), 'utf-8')
    );
    vectorStoreCache.set(projectId, { store: data, loadedAt: Date.now() });
    return data;
  } catch {
    return [];
  }
};

const search = async (projectId, query, limit = 5) => {
  const store = await loadStore(projectId);
  if (!store || store.length === 0) return [];

  const queryVector = await embedQuery(query);
  if (!queryVector || queryVector.length === 0) return [];

  const scored = store
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryVector, item.vector || []),
    }))
    .filter((item) => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
};

const deleteStore = async (projectId) => {
  vectorStoreCache.delete(projectId);
  try {
    await fsp.rm(getStoreDir(projectId), { recursive: true, force: true });
  } catch {}
};

module.exports = { indexPipelineOutput, search, deleteStore, loadStore };
