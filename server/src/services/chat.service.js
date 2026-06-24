const crypto = require('crypto');
const langchain = require('./langchain.service');
const chromaStore = require('./chromaStore.service');
const { search: jsonStoreSearch } = require('./vectorStore.service');
const AppError = require('../utils/AppError');

const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGES_PER_SESSION = 50;
const MAX_SESSIONS_PER_PROJECT = 20;

const extractFileReferences = (text) => {
  const refs = [];
  const patterns = [
    /file:([^\s`"]+)/g,
    /`([^`]+\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|css|html|json|yaml|yml))`/g,
    /\b(src\/[\w\/.-]+\.(js|ts|jsx|tsx|py|java))\b/g,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      if (!refs.some((r) => r.filePath === m[1])) refs.push({ filePath: m[1] });
    }
  }
  return refs;
};

// ===== Session Management (unchanged) =====

const getOrCreateSession = async (projectId, userId, sessionId, question) => {
  if (!ChatSession || !ChatMessage) {
    return { _id: `session_${Date.now()}`, projectId, userId, sessionName: question.substring(0, 80), messageCount: 0, createdAt: new Date(), updatedAt: new Date() };
  }

  if (sessionId) {
    const session = await ChatSession.findOne({ _id: sessionId, projectId, userId });
    if (session) {
      if (session.messageCount >= MAX_MESSAGES_PER_SESSION) return await createNewSession(projectId, userId, question);
      return session;
    }
  }

  const active = await ChatSession.findOne({ projectId, userId }).sort({ updatedAt: -1 }).limit(1);
  if (active && active.messageCount < MAX_MESSAGES_PER_SESSION) return active;
  return await createNewSession(projectId, userId, question);
};

const createNewSession = async (projectId, userId, question) => {
  if (!ChatSession) return { _id: `session_${Date.now()}`, projectId, userId, sessionName: question.substring(0, 80), messageCount: 0, createdAt: new Date(), updatedAt: new Date() };

  const count = await ChatSession.countDocuments({ projectId, userId });
  if (count >= MAX_SESSIONS_PER_PROJECT) {
    const oldest = await ChatSession.find({ projectId, userId }).sort({ updatedAt: 1 }).limit(1);
    if (oldest.length > 0) {
      if (ChatMessage) await ChatMessage.deleteMany({ sessionId: oldest[0]._id });
      await ChatSession.findByIdAndDelete(oldest[0]._id);
    }
  }

  return ChatSession.create({ projectId, userId, sessionName: question.substring(0, 80), messageCount: 0 });
};

const getConversationHistory = async (sessionId) => {
  if (!ChatMessage) return [];
  return ChatMessage.find({ sessionId }).sort({ createdAt: -1 }).limit(MAX_HISTORY_MESSAGES).select('role content createdAt').then(msgs => msgs.reverse());
};

const saveMessage = async (sessionId, projectId, userId, role, content, metadata = {}) => {
  const msgData = { sessionId, projectId, userId, role, content, referencedFiles: metadata.referencedFiles || [], retrievedChunks: metadata.retrievedChunks || [], suggestedFollowUps: metadata.suggestedFollowUps || [], tokenUsage: metadata.tokenUsage || null, feedback: null, fromCache: metadata.fromCache || false };

  if (ChatMessage) {
    const message = await ChatMessage.create(msgData);
    if (ChatSession) await ChatSession.findByIdAndUpdate(sessionId, { $inc: { messageCount: 1 }, $set: { updatedAt: new Date() } });
    return message;
  }
  return { _id: `msg_${Date.now()}`, ...msgData };
};

const detectFollowUp = (question, previousMessages) => {
  if (!previousMessages || previousMessages.length === 0) return false;
  const lower = question.toLowerCase().trim();
  const starters = ['and', 'also', 'what about', 'how about', 'why', 'can you', 'could you', 'tell me more', 'elaborate', 'go deeper', 'explain further', 'what else', 'show me'];
  for (const s of starters) { if (lower.startsWith(s)) return true; }
  if (/\b(it|this|that|they|them|those|these)\b/i.test(lower) && question.length < 60) return true;
  if (question.length < 30 && previousMessages.length >= 2) return true;
  return false;
};

// ===== Vector Search with ChromaDB fallback =====

const searchChunks = async (projectId, queryText, limit = 5) => {
  // Try ChromaDB first
  if (chromaStore.isReady()) {
    const results = await chromaStore.search(projectId, queryText, limit);
    if (results && results.length > 0) return results;
  }

  // Fall back to JSON vector store
  try {
    return await jsonStoreSearch(projectId, queryText, limit);
  } catch {
    return [];
  }
};

// ===== Caching helpers =====

const getCachedResponse = async (cacheKey) => {
  try {
    const AiCache = require('../models/AiCache');
    const cached = await AiCache.findOne({ cacheKey, expiresAt: { $gt: new Date() } });
    return cached ? cached.data : null;
  } catch {
    return null;
  }
};

const setCachedResponse = async (cacheKey, data) => {
  try {
    const AiCache = require('../models/AiCache');
    await AiCache.findOneAndUpdate(
      { cacheKey },
      { data, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { upsert: true }
    );
  } catch {}
};

// ===== Core RAG: askQuestion =====

const askQuestion = async (projectId, userId, question, projectInfo, options = {}) => {
  if (!question || question.trim().length === 0) throw new AppError('Question is required', 400, 'QUESTION_REQUIRED');

  const session = await getOrCreateSession(projectId, userId, options.sessionId, question.trim());
  const history = await getConversationHistory(session._id);
  const isFollowUp = detectFollowUp(question, history);

  const queryText = isFollowUp
    ? `${question}\nPrevious: ${history.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(' ')}`
    : question;

  const retrievedChunks = await searchChunks(projectId, queryText, 5);

  await saveMessage(session._id, projectId, userId, 'user', question.trim());

  try {
    const result = await langchain.executeRAG({
      question: question.trim(),
      retrievedChunks: retrievedChunks || [],
      projectInfo,
      chatHistory: history,
      useCache: true,
    });

    const fileRefs = extractFileReferences(result.content);

    if (result.fromCache) {
      const cached = await getCachedResponse(`chat_${crypto.createHash('sha256').update(question.trim()).digest('hex')}`);
      if (cached) {
        const saved = await saveMessage(session._id, projectId, userId, 'assistant', result.content, {
          referencedFiles: fileRefs,
          retrievedChunks: (retrievedChunks || []).map(c => ({ chunkId: c.filePath, filePath: c.filePath, relevance: c.score || 0.5 })),
          suggestedFollowUps: cached.followUps || [],
          fromCache: true,
        });
        return { message: { id: saved._id, content: result.content, fileRefs, role: 'assistant' }, sessionId: session._id, sessionName: session.sessionName, suggestedFollowUps: cached.followUps || [], isFollowUp, fromCache: true };
      }
    }

    const followUps = result.fromCache
      ? (await getCachedResponse(`chat_followups_${crypto.createHash('sha256').update(question.trim()).digest('hex')}`)) || []
      : await langchain.generateFollowUpQuestions(question.trim(), result.content);

    const saved = await saveMessage(session._id, projectId, userId, 'assistant', result.content, {
      referencedFiles: fileRefs,
      retrievedChunks: (retrievedChunks || []).map(c => ({ chunkId: c.filePath, filePath: c.filePath, relevance: c.score || 0.5 })),
      suggestedFollowUps: followUps,
      fromCache: result.fromCache,
    });

    // Cache follow-ups
    if (followUps.length) {
      await setCachedResponse(`chat_followups_${crypto.createHash('sha256').update(question.trim()).digest('hex')}`, followUps);
    }

    return { message: { id: saved._id, content: result.content, fileRefs, role: 'assistant' }, sessionId: session._id, sessionName: session.sessionName, suggestedFollowUps: followUps, isFollowUp, fromCache: result.fromCache };
  } catch (error) {
    throw error;
  }
};

// ===== Streaming RAG: askQuestionStream =====

const askQuestionStream = async (projectId, userId, question, projectInfo, onChunk, options = {}) => {
  if (!question || question.trim().length === 0) { if (onChunk) onChunk({ type: 'error', message: 'Question required' }); throw new AppError('Question is required', 400, 'QUESTION_REQUIRED'); }

  const session = await getOrCreateSession(projectId, userId, options.sessionId, question.trim());
  const history = await getConversationHistory(session._id);
  const isFollowUp = detectFollowUp(question, history);

  if (onChunk) onChunk({ type: 'thinking', message: 'Searching relevant code...' });

  const queryText = isFollowUp
    ? `${question}\nPrevious: ${history.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(' ')}`
    : question;

  const retrievedChunks = await searchChunks(projectId, queryText, 5);

  if (onChunk) onChunk({ type: 'thinking', message: `Found ${(retrievedChunks || []).length} relevant chunks...` });

  await saveMessage(session._id, projectId, userId, 'user', question.trim());

  let fullContent = '';
  const fileRefsFound = [];
  let isCached = false;

  if (onChunk) onChunk({ type: 'start', sessionId: session._id, sessionName: session.sessionName });

  try {
    // Check cache first
    const cacheKey = crypto.createHash('sha256').update(`chat_stream_${question.trim()}_${projectId}`).digest('hex');
    const cachedResponse = await getCachedResponse(cacheKey);

    if (cachedResponse) {
      isCached = true;
      fullContent = cachedResponse.content;

      if (onChunk) onChunk({ type: 'cache_hit', message: 'Retrieved from cache' });
      // For cached responses, send as a single chunk
      const refs = extractFileReferences(fullContent);
      for (const ref of refs) {
        if (onChunk) onChunk({ type: 'file_ref', file: ref.filePath });
      }
      if (onChunk) onChunk({ type: 'chunk', content: fullContent });

      const followUps = cachedResponse.followUps || [];
      const saved = await saveMessage(session._id, projectId, userId, 'assistant', fullContent, {
        referencedFiles: refs,
        retrievedChunks: (retrievedChunks || []).map(c => ({ chunkId: c.filePath, filePath: c.filePath, relevance: c.score || 0.5 })),
        suggestedFollowUps: followUps,
        fromCache: true,
      });
      if (onChunk) onChunk({ type: 'done', messageId: saved._id, suggestedFollowUps: followUps, fromCache: true });
      return { messageId: saved._id, sessionId: session._id, sessionName: session.sessionName, content: fullContent, fileRefs: refs, suggestedFollowUps: followUps, fromCache: true };
    }

    // Not cached — stream from LangChain
    if (onChunk) onChunk({ type: 'generating', message: 'Generating response...' });

    await langchain.executeStreamingRAG({
      question: question.trim(),
      retrievedChunks: retrievedChunks || [],
      projectInfo,
      chatHistory: history,
      onChunk: (chunk) => {
        fullContent += chunk.content;
        if (onChunk) {
          const newRefs = extractFileReferences(chunk.content);
          for (const ref of newRefs) {
            if (!fileRefsFound.some(r => r.filePath === ref.filePath)) {
              fileRefsFound.push(ref);
              if (onChunk) onChunk({ type: 'file_ref', file: ref.filePath });
            }
          }
          onChunk({ type: 'chunk', content: chunk.content });
        }
      },
    });

    const allFileRefs = extractFileReferences(fullContent);
    const followUps = await langchain.generateFollowUpQuestions(question.trim(), fullContent);

    const saved = await saveMessage(session._id, projectId, userId, 'assistant', fullContent, {
      referencedFiles: allFileRefs,
      retrievedChunks: (retrievedChunks || []).map(c => ({ chunkId: c.filePath, filePath: c.filePath, relevance: c.score || 0.5 })),
      suggestedFollowUps: followUps,
    });

    // Cache the response
    await setCachedResponse(cacheKey, { content: fullContent, followUps });

    if (onChunk) onChunk({ type: 'done', messageId: saved._id, suggestedFollowUps: followUps, fromCache: false });
    return { messageId: saved._id, sessionId: session._id, sessionName: session.sessionName, content: fullContent, fileRefs: allFileRefs, suggestedFollowUps: followUps, fromCache: false };
  } catch (error) {
    if (fullContent && onChunk) {
      onChunk({ type: 'error', message: `Partial: ${error.message}` });
      await saveMessage(session._id, projectId, userId, 'assistant', fullContent, { referencedFiles: extractFileReferences(fullContent), suggestedFollowUps: [], tokenUsage: null });
      return { messageId: null, sessionId: session._id, content: fullContent, partial: true };
    }
    throw error;
  }
};

// ===== Session CRUD (unchanged) =====

const listSessions = async (projectId, userId) => {
  if (ChatSession) return ChatSession.find({ projectId, userId }).sort({ updatedAt: -1 }).select('sessionName messageCount createdAt updatedAt').limit(20);
  return [];
};

const getSessionMessages = async (sessionId) => {
  if (ChatMessage) return ChatMessage.find({ sessionId }).sort({ createdAt: 1 }).select('-retrievedChunks');
  return [];
};

const deleteSession = async (sessionId, projectId, userId) => {
  if (ChatMessage) await ChatMessage.deleteMany({ sessionId });
  if (ChatSession) await ChatSession.findOneAndDelete({ _id: sessionId, projectId, userId });
};

module.exports = { askQuestion, askQuestionStream, listSessions, getSessionMessages, deleteSession, extractFileReferences, detectFollowUp };
