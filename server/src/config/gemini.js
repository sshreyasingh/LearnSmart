const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('./env');

let genAI = null;
let liteModel = null;
let proModel = null;
let embeddingModel = null;

const getGeminiClient = () => {
  if (genAI) return genAI;
  if (!env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — AI features will be unavailable');
    return null;
  }
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI;
};

const getLiteModel = () => {
  if (liteModel) return liteModel;
  const client = getGeminiClient();
  if (!client) return null;

  liteModel = client.getGenerativeModel({
    model: env.GEMINI_LITE_MODEL,
    generationConfig: {
      temperature: 0,
      topP: 0.95,
      topK: 32,
      maxOutputTokens: 300,
    },
  });

  return liteModel;
};

const getProModel = () => {
  if (proModel) return proModel;
  const client = getGeminiClient();
  if (!client) return null;

  proModel = client.getGenerativeModel({
    model: env.GEMINI_PRO_MODEL,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });

  return proModel;
};

const getChatModel = () => getProModel();

const getEmbeddingModel = () => {
  if (embeddingModel) return embeddingModel;
  const client = getGeminiClient();
  if (!client) return null;

  embeddingModel = client.getGenerativeModel({
    model: env.GEMINI_EMBEDDING_MODEL,
  });

  return embeddingModel;
};

module.exports = { getGeminiClient, getLiteModel, getProModel, getChatModel, getEmbeddingModel };
