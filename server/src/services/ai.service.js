const { getOpenRouterClient } = require('../config/openrouter');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

const MODEL_TIER = { EMBEDDING: 'embedding', LITE: 'lite', PRO: 'pro' };

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 1;
const BASE_DELAY_MS = 500;

let circuitState = { failures: 0, openUntil: null, maxFailures: 5, resetAfterMs: 30000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resetCircuitBreaker = () => { circuitState.failures = 0; circuitState.openUntil = null; };

const isCircuitOpen = () => {
  if (circuitState.openUntil && Date.now() < circuitState.openUntil) return true;
  if (circuitState.openUntil && Date.now() >= circuitState.openUntil) { circuitState.failures = 0; circuitState.openUntil = null; }
  return false;
};

const recordFailure = () => { circuitState.failures++; if (circuitState.failures >= circuitState.maxFailures) circuitState.openUntil = Date.now() + circuitState.resetAfterMs; };
const recordSuccess = () => { circuitState.failures = 0; circuitState.openUntil = null; };

const estimateTokens = (text) => text ? Math.ceil(text.length / 3.5) : 0;

const extractStatusFromMessage = (msg) => { const m = (msg || '').match(/\[(\d{3})\s/); return m ? parseInt(m[1], 10) : null; };

const isPermanentError = (error) => {
  if (!error) return false;
  const s = error.status || error.statusCode || extractStatusFromMessage(error.message);
  if (s === 400 || s === 401 || s === 402 || s === 403) return true;
  return /api key|invalid key|auth/i.test((error.message || ''));
};

const isCircuitBreakerError = (error) => {
  if (!error || isPermanentError(error)) return false;
  const s = error.status || error.statusCode || extractStatusFromMessage(error.message);
  if (s === 429) return false;
  if (s && s >= 500) return true;
  return /timeout|econnreset|econnrefused/i.test((error.message || ''));
};

const shouldRetry = (error) => {
  if (isPermanentError(error)) return false;
  const s = error.status || error.statusCode || extractStatusFromMessage(error.message);
  if (s && RETRYABLE_STATUSES.has(s)) return true;
  return /timeout|503|unavailable|internal/i.test((error.message || ''));
};

const getRetryDelay = (a) => BASE_DELAY_MS * Math.pow(2, a - 1) + Math.floor(Math.random() * 500);

const getClient = () => {
  const c = getOpenRouterClient();
  if (!c) throw new AppError('OpenRouter API key not configured', 500, 'AI_NOT_CONFIGURED');
  return c;
};

const callOpenRouter = async (messages, options = {}) => {
  if (isCircuitOpen()) throw new AppError('AI service temporarily unavailable (circuit breaker open)', 503, 'AI_CIRCUIT_OPEN');
  if (!messages.length) throw new AppError('No messages to send', 400, 'AI_NO_MESSAGES');

  const openai = getClient();
  const model = options.model || env.OPENROUTER_MODEL;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.95,
        max_tokens: options.max_tokens ?? 4096,
        stream: false,
      });

      recordSuccess();
      const content = resp.choices?.[0]?.message?.content;

      if (!content) {
        if (attempt < MAX_RETRIES) { await sleep(getRetryDelay(attempt)); continue; }
        throw new AppError('Empty response from AI', 502, 'AI_EMPTY_RESPONSE');
      }

      return { content, usage: resp.usage ? { promptTokens: resp.usage.prompt_tokens, completionTokens: resp.usage.completion_tokens, totalTokens: resp.usage.total_tokens } : null, finishReason: resp.choices?.[0]?.finish_reason };
    } catch (error) {
      lastError = error;
      if (isCircuitBreakerError(error)) recordFailure();
      if (isPermanentError(error)) { recordFailure(); break; }
      if (!shouldRetry(error) || attempt === MAX_RETRIES) break;
      await sleep(getRetryDelay(attempt));
    }
  }

  const msg = (lastError?.message || '').toLowerCase();
  const status = lastError?.status || lastError?.statusCode || extractStatusFromMessage(lastError?.message);

  if (status === 402) throw new AppError('OpenRouter account has no credits — add credits at https://openrouter.ai/settings/credits', 402, 'AI_NO_CREDITS');
  if (status === 400 && /api key/i.test(msg)) throw new AppError('Invalid OpenRouter API key', 502, 'AI_AUTH_FAILED');
  if (status === 401 || status === 403) throw new AppError('OpenRouter authentication failed', 502, 'AI_AUTH_FAILED');
  if (status === 429 || /rate|quota|exceeded/i.test(msg)) throw new AppError('OpenRouter rate limited — try again later', 429, 'AI_RATE_LIMITED');
  if (/safety|blocked/i.test(msg)) throw new AppError('Response blocked by safety filters', 502, 'AI_SAFETY_BLOCKED');
  if (status === 400) throw new AppError(`OpenRouter bad request: ${lastError.message}`, 502, 'AI_BAD_REQUEST');

  throw new AppError(`OpenRouter API error: ${lastError.message}`, 502, 'AI_CALL_FAILED');
};

const callOpenRouterStreaming = async (messages, options = {}, onChunk) => {
  if (isCircuitOpen()) throw new AppError('AI service temporarily unavailable (circuit breaker open)', 503, 'AI_CIRCUIT_OPEN');
  if (!messages.length) throw new AppError('No messages to send', 400, 'AI_NO_MESSAGES');

  const openai = getClient();
  const model = options.model || env.OPENROUTER_MODEL;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.95,
        max_tokens: options.max_tokens ?? 4096,
        stream: true,
      });

      recordSuccess();
      let fullContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) { fullContent += delta; if (onChunk) onChunk({ content: delta, accumulated: fullContent }); }
      }

      return { content: fullContent, finishReason: 'STOP' };
    } catch (error) {
      lastError = error;
      if (isCircuitBreakerError(error)) recordFailure();
      if (isPermanentError(error) || !shouldRetry(error) || attempt === MAX_RETRIES) break;
      await sleep(getRetryDelay(attempt));
    }
  }

  throw new AppError(`Streaming failed: ${lastError.message}`, 502, 'AI_STREAM_FAILED');
};

const callOpenRouterJSON = async (messages, options = {}) => {
  const jsonMessages = [...messages];
  const hasJson = jsonMessages.some(m => m.content && /Return ONLY valid JSON/i.test(m.content));

  if (!hasJson && jsonMessages.length > 0) {
    const last = jsonMessages[jsonMessages.length - 1];
    if (last.role === 'user') last.content += '\n\nCRITICAL: Return ONLY a valid JSON object or array. No markdown, no explanation. Start with { or [.';
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await callOpenRouter(jsonMessages, { ...options, max_tokens: options.max_tokens ?? 8192, temperature: options.temperature ?? 0 });
      const parsed = extractJSON(result.content);
      if (parsed !== null) { recordSuccess(); return { data: parsed, raw: result.content, usage: result.usage }; }

      if (attempt < 3) {
        jsonMessages.push({ role: 'assistant', content: result.content });
        jsonMessages.push({ role: 'user', content: 'PARSE ERROR. Your response had markdown or extra text. Return ONLY the raw JSON object now.' });
      }
    } catch (error) {
      if (error instanceof AppError && (error.errorCode === 'AI_NOT_CONFIGURED' || error.errorCode === 'AI_AUTH_FAILED' || error.errorCode === 'AI_CIRCUIT_OPEN')) throw error;
      if (!shouldRetry(error) || attempt === 3) throw error;
    }
  }

  throw new AppError('Failed to get valid JSON from OpenRouter', 502, 'AI_JSON_PARSE_FAILED');
};

const extractJSON = (text) => {
  if (!text) return null;
  const t = text.trim();
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) { try { return JSON.parse(t); } catch { try { return JSON.parse(repairJSON(t)); } catch {} } }

  const mb = t.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (mb) { try { return JSON.parse(mb[1].trim()); } catch { try { return JSON.parse(repairJSON(mb[1].trim())); } catch {} } }

  const all = t.match(/```(?:json)?\s*\n?([\s\S]*?)```/g);
  if (all) for (const b of all) { const inner = b.replace(/```(?:json)?\s*\n?/, '').replace(/\n?```$/, '').trim(); try { return JSON.parse(inner); } catch { try { return JSON.parse(repairJSON(inner)); } catch {} } }

  const brace = t.indexOf('{'), bracket = t.indexOf('[');
  let s = -1, e = -1;
  if (brace !== -1 && (brace < bracket || bracket === -1)) { s = brace; e = findClosing(t, s, '{', '}'); }
  else if (bracket !== -1) { s = bracket; e = findClosing(t, s, '[', ']'); }

  if (s !== -1) {
    const ex = e !== -1 ? t.slice(s, e + 1) : completeJSON(t.slice(s));
    try { return JSON.parse(repairJSON(ex)); } catch { try { return JSON.parse(repairJSON(completeJSON(ex))); } catch {} }
  }
  return null;
};

const completeJSON = (f) => { let r = f; const ob = (r.match(/(?<!\\){/g) || []).length, cb = (r.match(/(?<!\\)}/g) || []).length; const osb = (r.match(/(?<!\\)\[/g) || []).length, csb = (r.match(/(?<!\\)\]/g) || []).length; for (let i = 0; i < osb - csb; i++) r += ']'; for (let i = 0; i < ob - cb; i++) r += '}'; if (((r.match(/(?<!\\)"/g) || []).length) % 2 !== 0) r += '"'; return r; };

const findClosing = (text, open, oc, cc) => { let d = 0, str = false, esc = false; for (let i = open; i < text.length; i++) { const c = text[i]; if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === '"') { str = !str; continue; } if (str) continue; if (c === oc) d++; else if (c === cc) { d--; if (d === 0) return i; } } return -1; };

const repairJSON = (s) => { let r = s; r = r.replace(/,\s*}/g, '}'); r = r.replace(/,\s*]/g, ']'); r = r.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); r = r.replace(/'/g, '"'); return r; };

const validateJSON = (data, schema) => {
  const errors = [];
  if (schema.requiredFields) for (const f of schema.requiredFields) if (!(f in data)) errors.push(`Missing: ${f}`);
  if (schema.fieldTypes) for (const [f, t] of Object.entries(schema.fieldTypes)) if (f in data) { const a = Array.isArray(data[f]) ? 'array' : typeof data[f]; if (a !== t) errors.push(`${f}: expected ${t}`); }
  return { valid: errors.length === 0, errors };
};

const chunkFileContent = (files, max = 6000) => {
  const chunks = []; let cur = '', ct = 0, cfs = [];
  for (const f of files) {
    const h = `\n// === ${f.filePath} ===\n`, body = f.content || '', ft = h + body, ftk = estimateTokens(ft);
    if (ftk > max) { if (cur) { chunks.push({ content: cur, files: cfs, tokenCount: ct }); cur = ''; ct = 0; cfs = []; } chunks.push({ content: ft, files: [f.filePath], tokenCount: ftk }); continue; }
    if (ct + ftk > max && cur) { chunks.push({ content: cur, files: cfs, tokenCount: ct }); cur = ''; ct = 0; cfs = []; }
    cur += ft; ct += ftk; cfs.push(f.filePath);
  }
  if (cur) chunks.push({ content: cur, files: cfs, tokenCount: ct });
  return chunks;
};

const summarizeCodebase = async (files, techStack, structure) => {
  const chunks = chunkFileContent(files, 5000);
  if (chunks.length <= 1) return chunks[0]?.content || '';
  const summaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    try {
      const r = await callOpenRouter([{ role: 'system', content: 'Summarize code concisely.' }, { role: 'user', content: `Stack: ${techStack.join(', ')}\nChunk ${i + 1}/${chunks.length}:\n${c.content}` }], { max_tokens: 1500 });
      summaries.push({ files: c.files, summary: r.content });
    } catch {
      summaries.push({ files: c.files, summary: `Chunk ${i + 1}: ${c.files.length} files (${c.files.slice(0, 8).join(', ')})` });
    }
  }
  return `=== SUMMARY ===\n${techStack.join(', ')}\n\n${structure}\n\n${summaries.map(cs => `Files: ${cs.files.join(', ')}\n${cs.summary}`).join('\n\n')}`;
};

module.exports = {
  callDeepSeek: callOpenRouter, callDeepSeekStreaming: callOpenRouterStreaming, callDeepSeekJSON: callOpenRouterJSON,
  callGemini: callOpenRouter, callGeminiStreaming: callOpenRouterStreaming, callGeminiJSON: callOpenRouterJSON,
  callOpenRouter, callOpenRouterStreaming, callOpenRouterJSON,
  extractJSON, completeJSON, repairJSON, findClosing, validateJSON, chunkFileContent, summarizeCodebase, estimateTokens, getClient,
  shouldRetry, isPermanentError, isCircuitBreakerError, extractStatusFromMessage, resetCircuitBreaker, MODEL_TIER,
};
