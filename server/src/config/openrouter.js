const OpenAI = require('openai');
const { env } = require('./env');

let client = null;
let embeddingClient = null;

const getOpenRouterClient = () => {
  if (client) return client;

  if (!env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set — AI features will be unavailable');
    return null;
  }

  client = new OpenAI({
    baseURL: env.OPENROUTER_BASE_URL,
    apiKey: env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'LearnSmart',
      'Connection': 'keep-alive',
    },
    timeout: 300000,
    maxRetries: 2,
  });

  return client;
};

const getChatModel = (options = {}) => {
  const openai = getOpenRouterClient();
  if (!openai) return null;

  return {
    create: async (messages, opts = {}) => {
      return openai.chat.completions.create({
        model: options.model || env.OPENROUTER_MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        top_p: opts.top_p ?? 0.95,
        max_tokens: opts.max_tokens ?? 4096,
        stream: opts.stream ?? false,
      });
    },
  };
};

const getLiteModel = (options = {}) => {
  return getChatModel({
    model: options.model || env.OPENROUTER_MODEL,
  });
};

const getProModel = (options = {}) => {
  return getChatModel({
    model: options.model || env.OPENROUTER_MODEL,
  });
};

const getEmbeddingModel = () => {
  if (embeddingClient) return embeddingClient;

  const openai = getOpenRouterClient();
  if (!openai) return null;

  embeddingClient = {
    create: async (text) => {
      const resp = await openai.embeddings.create({
        model: env.OPENROUTER_EMBEDDING_MODEL,
        input: text,
      });
      return resp;
    },
  };

  return embeddingClient;
};

module.exports = { getOpenRouterClient, getLiteModel, getProModel, getChatModel, getEmbeddingModel };
