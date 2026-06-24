const path = require('path');
const fsp = require('fs').promises;
const fileService = require('./file.service');
const gitService = require('./git.service');
const { chunkAllFiles } = require('./chunking.service');
const { embedBatch, embedQuery, cosineSimilarity, EMBEDDING_DIMENSION } = require('./embedding.service');
const { buildAnalysisContext } = require('./promptBuilder.service');
const { estimateTokens } = require('./ai.service');
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

    emitProgress(res, PROGRESS_EVENTS.CHUNKING, { message: 'Chunking code for embeddings...' });
    sendProgress(pidStr, PROGRESS_EVENTS.CHUNKING, { message: 'Chunking code for embeddings...' });

    const chunks = await chunkAllFiles(parsedFiles, (progress) => {
      if (progress.processed % 10 === 0 || progress.processed === progress.total) {
        emitProgress(res, PROGRESS_EVENTS.CHUNKING, {
          message: `Chunked ${progress.processed}/${progress.total} files`,
          processed: progress.processed,
          total: progress.total,
          chunksSoFar: progress.chunksSoFar,
        });
        sendProgress(pidStr, PROGRESS_EVENTS.CHUNKING, {
          message: `Chunked ${progress.processed}/${progress.total} files`,
        });
      }
    });

    emitProgress(res, PROGRESS_EVENTS.CHUNKING, {
      message: `Created ${chunks.length} code chunks`,
      totalChunks: chunks.length,
    });

    emitProgress(res, PROGRESS_EVENTS.EMBEDDING, { message: 'Generating embeddings...' });
    sendProgress(pidStr, PROGRESS_EVENTS.EMBEDDING, { message: 'Generating embeddings...' });

    const textsToEmbed = chunks.map((chunk) => {
      const symbolInfo = chunk.functionName ? ` [${chunk.symbolType}: ${chunk.functionName}]` :
        chunk.className ? ` [${chunk.symbolType}: ${chunk.className}]` : '';
      return `File: ${chunk.filePath} (lines ${chunk.startLine + 1}-${chunk.endLine})${symbolInfo}\n\n${chunk.content}`;
    });

    const vectors = await embedBatch(textsToEmbed, (progress) => {
      if (progress.embedded % 20 === 0 || progress.embedded === progress.total) {
        emitProgress(res, PROGRESS_EVENTS.EMBEDDING, {
          message: `Embedded ${progress.embedded}/${progress.total} chunks`,
          embedded: progress.embedded,
          total: progress.total,
        });
        sendProgress(pidStr, PROGRESS_EVENTS.EMBEDDING, {
          message: `Embedded ${progress.embedded}/${progress.total} chunks`,
        });
      }
    });

    // Validate vector quality
    const zeroVectors = vectors.filter(v => v.every(c => c === 0)).length;
    const zeroPct = vectors.length > 0 ? Math.round((zeroVectors / vectors.length) * 100) : 0;
    if (zeroPct > 50) {
      console.error(`[Pipeline] CRITICAL: ${zeroPct}% of chunk vectors are zero — RAG retrieval will not work. Check OpenRouter embedding API key and rate limits.`);
    } else if (zeroPct > 20) {
      console.warn(`[Pipeline] WARNING: ${zeroPct}% of vectors are zero. RAG quality may be reduced.`);
    } else if (zeroPct > 0) {
      console.warn(`[Pipeline] ${zeroPct}% of vectors are zero (${zeroVectors}/${vectors.length})`);
    } else {
      console.log(`[Pipeline] Vector quality OK — all ${vectors.length} embeddings are non-zero`);
    }

    emitProgress(res, PROGRESS_EVENTS.BUILDING_INDEX, { message: 'Building vector index...' });
    sendProgress(pidStr, PROGRESS_EVENTS.BUILDING_INDEX, { message: 'Building vector index...' });

    const vectorStore = chunks.map((chunk, i) => ({
      chunkHash: `${chunk.filePath}:${chunk.startLine}:${chunk.endLine}`,
      filePath: chunk.filePath,
      fileName: chunk.fileName,
      language: chunk.language,
      content: chunk.content,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      functionName: chunk.functionName || null,
      className: chunk.className || null,
      symbolType: chunk.symbolType || null,
      isSubChunk: chunk.isSubChunk || false,
      tokenCount: chunk.tokenCount || 0,
      vector: vectors[i] || new Array(EMBEDDING_DIMENSION).fill(0),
    }));

    // Index into JSON store (always)
    try {
      await indexJsonStore(projectId, vectorStore);
    } catch (err) {
      console.warn('[Pipeline] JSON store indexing failed:', err.message);
    }

    // Index into ChromaDB (if available)
    if (chromaStore.isReady()) {
      try {
        emitProgress(res, PROGRESS_EVENTS.BUILDING_INDEX, { message: 'Indexing into ChromaDB...' });
        const result = await chromaStore.indexChunks(projectId, chunks, vectors);
        if (result) {
          emitProgress(res, PROGRESS_EVENTS.BUILDING_INDEX, { message: `Indexed ${result.indexed} chunks in ChromaDB` });
        }
      } catch (err) {
        console.warn('[Pipeline] ChromaDB indexing skipped:', err.message);
      }
    }

    emitProgress(res, PROGRESS_EVENTS.READY, {
      message: 'Pipeline complete — ready for AI analysis',
      totalChunks: vectorStore.length,
      totalFiles: textFiles.length,
      totalLOC: parsedFiles.reduce((s, f) => s + f.loc, 0),
    });
    sendProgress(pidStr, PROGRESS_EVENTS.READY, {
      message: 'Project ready! View on dashboard or click View to analyze.',
    });

    return {
      projectDir,
      extractDir,
      textFiles: parsedFiles,
      chunks,
      vectorStore,
    };
  } catch (error) {
    emitProgress(res, PROGRESS_EVENTS.ERROR, {
      message: error.message,
      phase: PROGRESS_EVENTS.ERROR,
    });
    sendProgress(pidStr, PROGRESS_EVENTS.ERROR, { message: error.message });
    throw error;
  }
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
  runRAGQuery,
  cleanupProject,
  emitProgress,
  PROGRESS_EVENTS,
  getProjectDir,
};
