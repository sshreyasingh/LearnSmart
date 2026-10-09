const path = require('path');
const fsp = require('fs').promises;
const fileService = require('./file.service');
const gitService = require('./git.service');
const { chunkAllFiles } = require('./chunking.service');
const { embedBatch } = require('./embedding.service');
const chromaStore = require('./chromaStore.service');
const { indexPipelineOutput: indexJsonStore } = require('./vectorStore.service');
const { sendProgress } = require('./progress.service');
const AppError = require('../utils/AppError');

const PROGRESS_EVENTS = {
  CLONING: 'cloning',
  READING_FILES: 'reading_files',
  CHUNKING: 'chunking',
  EMBEDDING: 'embedding',
  BUILDING_INDEX: 'building_index',
  READY: 'ready',
  DONE: 'done',
  ERROR: 'error',
};

const getProjectDir = (userId, projectId) => {
  return path.join(__dirname, '..', '..', 'uploads', userId.toString(), projectId.toString());
};

const emitProgress = (res, phase, data = {}) => {
  if (!res || typeof res.write !== 'function') return;
  res.write(`data: ${JSON.stringify({ phase, ...data })}\n\n`);
};

const runIngestionPipeline = async (options) => {
  const { userId, projectId, uploadMethod, zipBuffer, githubOwner, githubRepo, githubToken, repoUrl, res } = options;

  const projectDir = getProjectDir(userId, projectId);
  const extractDir = path.join(projectDir, 'extracted');
  await fsp.mkdir(extractDir, { recursive: true });

  emitProgress(res, PROGRESS_EVENTS.CLONING, { message: 'Starting repository ingestion...' });

  const pidStr = projectId.toString();

  try {
    if (uploadMethod === 'zip' && zipBuffer) {
      emitProgress(res, PROGRESS_EVENTS.CLONING, { message: 'Extracting ZIP archive...' });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: 'Extracting ZIP archive...' });
      const result = await fileService.extractZip(zipBuffer, extractDir);
      emitProgress(res, PROGRESS_EVENTS.CLONING, {
        message: `Extracted ${result.textFileCount} files from ZIP`,
        fileCount: result.textFileCount,
        totalSizeKB: result.totalSizeKB,
      });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, {
        message: `Extracted ${result.textFileCount} files`,
        fileCount: result.textFileCount,
      });
    } else if (uploadMethod === 'github' && githubOwner && githubRepo) {
      emitProgress(res, PROGRESS_EVENTS.CLONING, { message: `Cloning github.com/${githubOwner}/${githubRepo}...` });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: `Cloning github.com/${githubOwner}/${githubRepo}...` });
      await gitService.cloneFromGitHub(githubOwner, githubRepo, extractDir, githubToken, (p) => {
        if (p.progress !== undefined) {
          emitProgress(res, PROGRESS_EVENTS.CLONING, { message: `Cloning... ${p.progress}%`, progress: p.progress });
          sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: `Cloning... ${p.progress}%`, progress: p.progress });
        }
      });
      emitProgress(res, PROGRESS_EVENTS.CLONING, { message: 'Repository cloned successfully' });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: 'Repository cloned successfully' });
    } else if (uploadMethod === 'url' && repoUrl) {
      emitProgress(res, PROGRESS_EVENTS.CLONING, { message: `Cloning ${repoUrl}...` });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: `Cloning ${repoUrl}...` });
      await gitService.cloneRepo(repoUrl, extractDir, (p) => {
        if (p.progress !== undefined) {
          emitProgress(res, PROGRESS_EVENTS.CLONING, { message: `Cloning... ${p.progress}%`, progress: p.progress });
          sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: `Cloning... ${p.progress}%`, progress: p.progress });
        }
      });
      emitProgress(res, PROGRESS_EVENTS.CLONING, { message: 'Repository cloned successfully' });
      sendProgress(pidStr, PROGRESS_EVENTS.CLONING, { message: 'Repository cloned successfully' });
    } else {
      throw new AppError('No source code provided', 400, 'NO_SOURCE_CODE');
    }

    emitProgress(res, PROGRESS_EVENTS.READING_FILES, { message: 'Discovering files...' });
    sendProgress(pidStr, PROGRESS_EVENTS.READING_FILES, { message: 'Scanning source files...' });

    const textFiles = await fileService.readAllTextFiles(extractDir);

    if (!textFiles || textFiles.length === 0) {
      throw new AppError('No readable source files found', 400, 'NO_FILES_FOUND');
    }

    const parsedFiles = textFiles.map((f) => ({
      filePath: f.filePath,
      fileName: f.fileName || path.basename(f.filePath),
      language: f.language,
      content: f.content,
      loc: f.loc,
      sizeKB: f.sizeKB,
    }));

    emitProgress(res, PROGRESS_EVENTS.READING_FILES, {
      message: `Found ${textFiles.length} source files`,
      fileCount: textFiles.length,
      totalLOC: parsedFiles.reduce((s, f) => s + f.loc, 0),
    });
    sendProgress(pidStr, PROGRESS_EVENTS.READING_FILES, {
      message: `Found ${textFiles.length} source files`,
      fileCount: textFiles.length,
    });

    return { projectDir, extractDir, textFiles: parsedFiles };

  } catch (error) {
    emitProgress(res, PROGRESS_EVENTS.ERROR, {
      message: error.message,
      phase: PROGRESS_EVENTS.ERROR,
    });
    sendProgress(pidStr, PROGRESS_EVENTS.ERROR, { message: error.message });
    throw error;
  }
};

// Indexing is optional enrichment; source analysis can run independently.
const runIndexingPipeline = async ({ projectId, textFiles }) => {
  const pidStr = projectId.toString();
  sendProgress(pidStr, PROGRESS_EVENTS.CHUNKING, { message: 'Preparing code search...' });
  const chunks = await chunkAllFiles(textFiles);
  const lexicalStore = chunks.map(chunk => ({
    ...chunk, chunkHash: `${chunk.filePath}:${chunk.startLine}:${chunk.endLine}`, vector: [],
  }));
  // Publish searchable source chunks before waiting for the embedding provider.
  await indexJsonStore(pidStr, lexicalStore);
  const texts = chunks.map(chunk => `File: ${chunk.filePath} (lines ${chunk.startLine + 1}-${chunk.endLine})\n\n${chunk.content}`);
  let vectors;
  try {
    vectors = await embedBatch(texts, ({ embedded, total }) => {
      if (embedded % 20 === 0 || embedded === total) {
        sendProgress(pidStr, PROGRESS_EVENTS.EMBEDDING, { message: `Embedded ${embedded}/${total} chunks` });
      }
    });
  } catch (error) {
    console.warn('Semantic indexing unavailable:', error.message);
    return { chunks, vectorStore: lexicalStore, warning: 'Semantic search unavailable; code chat uses keyword search.' };
  }

  const missing = vectors.filter(vector => !vector.some(value => value !== 0)).length;
  const warning = missing ? `Semantic indexing incomplete (${missing}/${chunks.length} chunks missing); keyword search is available.` : null;
  const vectorStore = lexicalStore.map((chunk, i) => ({ ...chunk, vector: vectors[i] || [] }));
  await indexJsonStore(pidStr, vectorStore);
  if (chromaStore.isReady() && !missing) {
    await chromaStore.indexChunks(pidStr, chunks, vectors);
  }
  return { chunks, vectorStore, warning };
};

const runRAGQuery = async (options) => {
  const {
    question,
    projectId,
    vectorStoreService,
    promptBuilder,
    aiService,
    projectInfo,
    conversationHistory = [],
    analysisType = 'chat',
    systemRole = null,
    maxTokens = 2000,
    jsonFormat = null,
  } = options;

  const retrievedChunks = await vectorStoreService.search(projectId, question, 5);

  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: 'No relevant code context found for this query. Ensure the project has been indexed.',
      chunks: [],
    };
  }

  let messages;
  if (jsonFormat) {
    const result = promptBuilder.buildJSONPrompt({
      question,
      jsonShape: jsonFormat,
      retrievedChunks,
      projectInfo,
      systemRole,
    });
    messages = result.messages;
  } else {
    const result = promptBuilder.buildRAGPrompt({
      question,
      retrievedChunks,
      projectInfo,
      conversationHistory,
      analysisType,
      systemRole,
    });
    messages = result.messages;
  }

  const result = await aiService.callGemini(messages, { max_tokens: maxTokens, temperature: 0.2 });

  return {
    answer: result.content,
    chunks: retrievedChunks,
    usage: result.usage,
  };
};

const cleanupProject = async (userId, projectId) => {
  const projectDir = getProjectDir(userId, projectId);
  await gitService.removeDir(projectDir).catch(() => {});
};

module.exports = {
  runIngestionPipeline,
  runIndexingPipeline,
  runRAGQuery,
  cleanupProject,
  emitProgress,
  PROGRESS_EVENTS,
  getProjectDir,
};
