const { env } = require('../config/env');
const { embedQuery } = require('./embedding.service');

let ready = false;
let connectionError = null;

const ML_BASE = () => env.ML_SERVICE_URL || 'http://localhost:8000';

const isReady = () => ready;
const getConnectionError = () => connectionError;

const heartbeat = async () => {
  try {
    const res = await fetch(`${ML_BASE()}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    ready = true;
    connectionError = null;
    return true;
  } catch (err) {
    ready = false;
    connectionError = err.message;
    return false;
  }
};

const indexChunks = async (projectId, chunks, vectors) => {
  if (!chunks || !chunks.length || !vectors || !vectors.length) {
    return { indexed: 0 };
  }

  try {
    const res = await fetch(`${ML_BASE()}/api/v1/collections/${projectId}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, vectors }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Index failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // Fall back to JSON store
    return null;
  }
};

const search = async (projectId, query, limit = 5) => {
  try {
    const queryVector = await embedQuery(query);
    if (!queryVector || !queryVector.length) return [];

    const res = await fetch(`${ML_BASE()}/api/v1/collections/${projectId}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_vector: queryVector, limit }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Search failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // Fall back to JSON store
    return [];
  }
};

const deleteProjectStore = async (projectId) => {
  try {
    await fetch(`${ML_BASE()}/api/v1/collections/${projectId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });
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
