const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, SystemMessagePromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence, RunnablePassthrough } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { AIMessage, HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { InMemoryCache } = require('@langchain/core/caches');
const { env } = require('../config/env');
const chromaStore = require('./chromaStore.service');

const AiCache = require('../models/AiCache');

// ===== Cache (must be defined before models that use it) =====

class MongoDBCache extends InMemoryCache {
  constructor() {
    super();
    this.mongoCache = new Map();
  }

  async lookup(prompt) {
    const cached = await super.lookup(prompt);
    if (cached) return cached;

    try {
      const key = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
      const hash = require('crypto').createHash('sha256').update(key).digest('hex');
      const fromDb = await AiCache.findOne({ cacheKey: `lc_${hash}`, expiresAt: { $gt: new Date() } });
      if (fromDb) {
        this.mongoCache.set(hash, fromDb.data);
        return fromDb.data;
      }
    } catch {}
    return null;
  }

  async update(prompt, value) {
    await super.update(prompt, value);
    try {
      const key = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
      const hash = require('crypto').createHash('sha256').update(key).digest('hex');
      this.mongoCache.set(hash, value);

      await AiCache.findOneAndUpdate(
        { cacheKey: `lc_${hash}` },
        { data: value, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        { upsert: true }
      );
    } catch {}
  }
}

const responseCache = new MongoDBCache();

// ===== OpenRouter-Compliant Models =====

const chatModel = new ChatOpenAI({
  model: env.OPENROUTER_MODEL,
  temperature: 0.2,
  maxTokens: 4096,
  configuration: {
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'LearnSmart',
    },
  },
  apiKey: env.OPENROUTER_API_KEY,
  maxRetries: 2,
  timeout: 180000,
});

const streamingModel = new ChatOpenAI({
  model: env.OPENROUTER_MODEL,
  temperature: 0.3,
  maxTokens: 2000,
  streaming: true,
  configuration: {
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'LearnSmart',
    },
  },
  apiKey: env.OPENROUTER_API_KEY,
  maxRetries: 2,
  timeout: 180000,
});

const liteModel = new ChatOpenAI({
  model: env.OPENROUTER_MODEL,
  temperature: 0.1,
  maxTokens: 512,
  configuration: {
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'LearnSmart',
    },
  },
  apiKey: env.OPENROUTER_API_KEY,
  maxRetries: 1,
});

// ===== Embedding Model =====

const embeddingModel = new OpenAIEmbeddings({
  model: env.OPENROUTER_EMBEDDING_MODEL,
  configuration: {
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'LearnSmart',
    },
  },
  apiKey: env.OPENROUTER_API_KEY,
  maxRetries: 1,
  timeout: 30000,
  batchSize: 10,
});

// ===== Prompt Templates =====

const RAG_SYSTEM_PROMPT = `You are an AI assistant for codebase analysis. Help the user understand their code and answer questions about programming, software architecture, and technology.

## Rules
- When code chunks are available, reference specific files and code symbols.
- If no specific code chunks were retrieved, answer based on your general programming knowledge — the user is learning and needs help.
- Explain concepts clearly.
- Use code blocks with proper language annotations when showing code.
- If the user asks about the uploaded project's specific implementation and no code context is available, tell them you don't have that specific file's code but offer general guidance.`;

const RAG_PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`{system_prompt}

## Project Context
{project_context}

## Retrieved Code Chunks
{code_context}

## Instructions
Answer using the code chunks above if they're relevant. If no code chunks are available or they don't answer the question, use your general programming knowledge to help. Always be helpful.`),
  new MessagesPlaceholder('chat_history'),
  HumanMessagePromptTemplate.fromTemplate('{question}'),
]);

const FOLLOW_UP_PROMPT = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Based on the question and answer, suggest exactly 3 relevant follow-up questions. Return ONLY a JSON array of strings, nothing else. Example: ["Question 1?", "Question 2?", "Question 3?"]'
  ),
  HumanMessagePromptTemplate.fromTemplate('Question: {question}\nAnswer: {answer}'),
]);

// ===== RAG Chain =====

const buildRAGChain = () => {
  return RunnableSequence.from([
    {
      system_prompt: () => RAG_SYSTEM_PROMPT,
      project_context: (input) => formatProjectContext(input.projectInfo),
      code_context: (input) => formatCodeContext(input.retrievedChunks),
      chat_history: (input) => input.chatHistory || [],
      question: (input) => input.question,
    },
    RAG_PROMPT_TEMPLATE,
    chatModel,
    new StringOutputParser(),
  ]);
};

const buildStreamingRAGChain = () => {
  return RunnableSequence.from([
    {
      system_prompt: () => RAG_SYSTEM_PROMPT,
      project_context: (input) => formatProjectContext(input.projectInfo),
      code_context: (input) => formatCodeContext(input.retrievedChunks),
      chat_history: (input) => input.chatHistory || [],
      question: (input) => input.question,
    },
    RAG_PROMPT_TEMPLATE,
    streamingModel,
    new StringOutputParser(),
  ]);
};

// ===== Formatters =====

const formatProjectContext = (projectInfo = {}) => {
  const parts = [];
  if (projectInfo.projectName) parts.push(`Project: ${projectInfo.projectName}`);
  if (projectInfo.detectedTechStack?.length) parts.push(`Tech Stack: ${projectInfo.detectedTechStack.join(', ')}`);
  if (projectInfo.fileCount) parts.push(`Files: ${projectInfo.fileCount}`);
  if (projectInfo.totalLOC) parts.push(`LOC: ${projectInfo.totalLOC}`);
  return parts.join(' | ');
};

const formatCodeContext = (chunks = []) => {
  if (!chunks.length) return 'No specific code chunks were retrieved for this query. Answer based on general programming knowledge.';
  return chunks
    .map((chunk) => {
      const relevance = chunk.score !== undefined ? ` (relevance: ${Math.round(chunk.score * 100)}%)` : '';
      const header = chunk.filePath || 'unknown';
      const lang = chunk.language || '';
      const symbol = chunk.functionName
        ? `\n  Function: ${chunk.functionName}`
        : chunk.className
          ? `\n  Class: ${chunk.className}`
          : '';
      return `--- ${header}${relevance}${symbol} ---\n\`\`\`${lang}\n${chunk.content || ''}\n\`\`\``;
    })
    .join('\n\n');
};

const formatChatHistory = (messages = []) => {
  return messages.map((m) => {
    if (m.role === 'user') return new HumanMessage(m.content);
    if (m.role === 'assistant') return new AIMessage(m.content);
    return new SystemMessage(m.content);
  });
};

// ===== Core RAG Execution =====

const executeRAG = async ({ question, retrievedChunks, projectInfo, chatHistory = [], useCache = true }) => {
  const chain = buildRAGChain();

  const chainInput = {
    question,
    retrievedChunks,
    projectInfo,
    chatHistory: formatChatHistory(chatHistory),
  };

  const cacheKey = useCache
    ? require('crypto').createHash('sha256').update(JSON.stringify(chainInput)).digest('hex')
    : null;

  if (useCache && cacheKey) {
    const cached = await responseCache.lookup(cacheKey);
    if (cached) {
      return { content: cached, fromCache: true };
    }
  }

  const content = await chain.invoke(chainInput);

  if (useCache && cacheKey) {
    await responseCache.update(cacheKey, content);
  }

  return { content, fromCache: false };
};

const executeStreamingRAG = async ({ question, retrievedChunks, projectInfo, chatHistory = [], onChunk }) => {
  const chain = buildStreamingRAGChain();

  const chainInput = {
    question,
    retrievedChunks,
    projectInfo,
    chatHistory: formatChatHistory(chatHistory),
  };

  const stream = await chain.stream(chainInput);
  let fullContent = '';

  for await (const chunk of stream) {
    fullContent += chunk;
    if (onChunk) onChunk({ content: chunk, accumulated: fullContent });
  }

  return fullContent;
};

const generateFollowUpQuestions = async (question, answer) => {
  try {
    const chain = FOLLOW_UP_PROMPT.pipe(liteModel).pipe(new StringOutputParser());
    const result = await chain.invoke({ question, answer });
    const { extractJSON } = require('./ai.service');
    const parsed = extractJSON(result);
    if (Array.isArray(parsed)) return parsed.slice(0, 3);
    return ['What does this part of the codebase do?', 'Can you show me an example?', 'How is this structured?'];
  } catch {
    return ['What does this part of the codebase do?', 'Can you show me an example?', 'How is this structured?'];
  }
};

// ===== Public API =====

module.exports = {
  chatModel,
  streamingModel,
  liteModel,
  embeddingModel,
  responseCache,
  buildRAGChain,
  buildStreamingRAGChain,
  executeRAG,
  executeStreamingRAG,
  generateFollowUpQuestions,
  formatProjectContext,
  formatCodeContext,
  formatChatHistory,
  RAG_SYSTEM_PROMPT,
  RAG_PROMPT_TEMPLATE,
};
