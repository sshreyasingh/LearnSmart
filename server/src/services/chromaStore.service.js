const { ChromaClient } = require('chromadb');
const { env } = require('../config/env');
const { embedQuery, cosineSimilarity, EMBEDDING_DIMENSION } = require('./embedding.service');

let client = null;
let ready = false;
let connectionError = null;

const getClient = () => {
  if (client) return client;
  try {
    client = new ChromaClient({ path: env.CHROMA_URL || 'http://localhost:8000' });
    return client;
  } catch (err) {
    connectionError = err.message;
    return null;
  }
};

const isReady = () => ready;
const getConnectionError = () => connectionError;

const heartbeat = async () => {
  try {
    const c = getClient();
    if (!c) { ready = false; return false; }
    await c.heartbeat();
    ready = true;
    connectionError = null;
    return true;
  } catch (err) {
    ready = false;
    connectionError = err.message;
    return false;
  }
};

const COLLECTION_PREFIX = 'ls_project_';

const getOrCreateCollection = async (projectId) => {
  const c = getClient();
  if (!c) throw new Error('ChromaDB not connected');

  const name = `${COLLECTION_PREFIX}${projectId}`;
  try {
    return await c.getOrCreateCollection({ name, metadata: { 'hnsw:space': 'cosine' } });
  } catch (err) {
    throw new Error(`Failed to access ChromaDB collection: ${err.message}`);
  }
};

const indexChunks = async (projectId, chunks, vectors) => {
  if (!chunks || !chunks.length || !vectors || !vectors.length) {
    return { indexed: 0 };
  }

  try {
    const collection = await getOrCreateCollection(projectId);

    const ids = chunks.map((_, i) => `${projectId}_chunk_${i}_${Date.now()}`);
    const documents = chunks.map((chunk) => {
      const header = chunk.functionName
        ? `[Function: ${chunk.functionName}]\n`
        : chunk.className
          ? `[Class: ${chunk.className}]\n`
          : '';
      return `${header}${chunk.content}`;
    });
    const metadatas = chunks.map((chunk) => ({
      filePath: chunk.filePath || '',
      fileName: chunk.fileName || '',
      language: chunk.language || '',
      functionName: chunk.functionName || '',
      className: chunk.className || '',
      symbolType: chunk.symbolType || '',
      projectId: String(projectId),
      startLine: chunk.startLine ?? 0,
      endLine: chunk.endLine ?? 0,
      isSubChunk: chunk.isSubChunk ? 'true' : 'false',
    }));

    // ChromaDB expects the collection to already exist. Add in batches.
    const BATCH_SIZE = 20;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, ids.length);
      await collection.add({
        ids: ids.slice(i, end),
        embeddings: vectors.slice(i, end),
        documents: documents.slice(i, end),
        metadatas: metadatas.slice(i, end),
      });
    }

    return { indexed: chunks.length };
  } catch (err) {
    // Fall back to JSON store
    return null;
  }
};

const search = async (projectId, query, limit = 5) => {
  try {
    const collection = await getOrCreateCollection(projectId);

    const queryVector = await embedQuery(query);
    if (!queryVector || !queryVector.length) return [];

    const results = await collection.query({
      queryEmbeddings: [queryVector],
      nResults: limit * 2,
    });

    if (!results || !results.ids || !results.ids[0]) return [];
    const { ids, distances, metadatas, documents } = results;
    const scored = [];

    for (let i = 0; i < (ids[0] || []).length; i++) {
      const distance = distances?.[0]?.[i] ?? 1;
      const score = Math.max(0, 1 - distance);

      if (score < 0.1) continue;
      if (scored.length >= limit) break;

      scored.push({
        chunkHash: ids[0][i],
        filePath: metadatas?.[0]?.[i]?.filePath || '',
        fileName: metadatas?.[0]?.[i]?.fileName || '',
        language: metadatas?.[0]?.[i]?.language || '',
        content: documents?.[0]?.[i] || '',
        startLine: parseInt(metadatas?.[0]?.[i]?.startLine || '0', 10),
        endLine: parseInt(metadatas?.[0]?.[i]?.endLine || '0', 10),
        functionName: metadatas?.[0]?.[i]?.functionName || null,
        className: metadatas?.[0]?.[i]?.className || null,
        symbolType: metadatas?.[0]?.[i]?.symbolType || null,
        score,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (err) {
    // Fall back to JSON store
    return [];
  }
};

const deleteProjectStore = async (projectId) => {
  try {
    const c = getClient();
    if (!c) return;
    const name = `${COLLECTION_PREFIX}${projectId}`;
    const collections = await c.listCollections();
    if (collections.some((col) => col.name === name)) {
      await c.deleteCollection({ name });
    }
  } catch {
    // Ignore deletion errors
  }
};

// Try to connect on startup (non-blocking)
heartbeat().catch(() => {});

// Periodically check connection
setInterval(() => heartbeat().catch(() => {}), 60000);

module.exports = {
  isReady,
  getConnectionError,
  heartbeat,
  indexChunks,
  search,
  deleteProjectStore,
};
