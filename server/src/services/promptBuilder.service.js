const { estimateTokens } = require('./ai.service');
const { chunkFile } = require('./chunking.service');

const MAX_CONTEXT_TOKENS = 5000;
const MAX_CHUNK_TOKENS = 3500;

const buildRAGPrompt = ({
  question,
  retrievedChunks = [],
  projectInfo = {},
  conversationHistory = [],
  analysisType = 'chat',
  systemRole = null,
}) => {
  const defaultSystemRoles = {
    chat: 'You are an AI assistant for codebase analysis. Answer using ONLY the provided code context. Reference files and symbols.',
    summary: 'You create project documentation using ONLY the provided context.Infer what the code does. Produce a comprehensive summary.',
    architecture: 'You analyze architecture using ONLY the provided context. Identify patterns, layers, and design decisions.',
    api: 'You catalog API endpoints using ONLY the provided context. Describe the API surface.',
    auth: 'You analyze authentication mechanisms using ONLY the provided context.',
    database: 'You analyze data models using ONLY the provided context.',
    workflow: 'You trace execution flows using ONLY the provided context.',
    tutor: 'You explain code using ONLY the provided context. Be thorough and helpful.',
    interview: 'You generate interview questions using ONLY the provided context.',
  };

  const systemPrompt = systemRole || defaultSystemRoles[analysisType] || defaultSystemRoles.chat;
  let availableTokens = MAX_CONTEXT_TOKENS;
  const systemTokens = estimateTokens(systemPrompt);
  availableTokens -= systemTokens;

  let projectContext = '';
  if (projectInfo) {
    const p = [];
    if (projectInfo.projectName) p.push(`**Project:** ${projectInfo.projectName}`);
    if (projectInfo.techStack?.length > 0) p.push(`**Stack:** ${projectInfo.techStack.join(', ')}`);
    if (projectInfo.fileCount) p.push(`**Files:** ${projectInfo.fileCount}`);
    if (projectInfo.totalLOC) p.push(`**LOC:** ${projectInfo.totalLOC}`);
    projectContext = p.join(' | ');
    availableTokens -= estimateTokens(projectContext);
  }

  let historyText = '';
  if (conversationHistory.length > 0) {
    const historyBudget = Math.floor(MAX_CONTEXT_TOKENS * 0.15);
    const historyLines = [];
    for (const msg of conversationHistory.slice(-4)) {
      const line = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      const lt = estimateTokens(line);
      if (estimateTokens(historyText) + lt > historyBudget) break;
      historyLines.push(line);
    }
    if (historyLines.length > 0) {
      historyText = '## Previous\n' + historyLines.join('\n');
      availableTokens -= estimateTokens(historyText);
    }
  }

  const chunksBudget = Math.min(MAX_CHUNK_TOKENS, Math.floor(availableTokens * 0.60));
  let chunksText = '';
  let chunksTokens = 0;

  if (retrievedChunks.length > 0) {
    const chunkLines = ['## Retrieved Code'];
    for (const chunk of retrievedChunks) {
      const relevance = chunk.score !== undefined ? ` (${Math.round(chunk.score * 100)}%)` : '';
      const header = `\n### ${chunk.filePath || 'unknown'}${relevance}`;
      const body = chunk.content ? chunk.content.substring(0, 1200) : '';
      const block = header + '\n```' + (chunk.language || '') + '\n' + body + '\n```';
      const bt = estimateTokens(block);

      if (chunksTokens + bt > chunksBudget) {
        const short = header + '\n```\n' + body.substring(0, Math.floor((chunksBudget - chunksTokens) * 3.5)) + '\n```';
        chunkLines.push(short);
        break;
      }
      chunkLines.push(block);
      chunksTokens += bt;
    }
    chunksText = chunkLines.join('\n');
    availableTokens -= chunksTokens;
  }

  const fullPrompt = [
    systemPrompt,
    projectContext ? '\n' + projectContext : '',
    historyText,
    chunksText,
    `\n\n## Question\n${question}`,
  ].filter(Boolean).join('\n');

  return {
    messages: [{ role: 'user', content: fullPrompt }],
    tokenBudget: { system: systemTokens, history: estimateTokens(historyText), chunks: chunksTokens, remaining: availableTokens },
  };
};

const buildJSONPrompt = ({ question, jsonShape, retrievedChunks = [], projectInfo = {}, systemRole = null }) => {
  const result = buildRAGPrompt({ question, retrievedChunks, projectInfo, systemRole });
  const last = result.messages[result.messages.length - 1];
  last.content += `\n\nReturn ONLY valid JSON matching:\n\`\`\`json\n${jsonShape}\n\`\`\`\nNo markdown, no explanation.`;
  return result;
};

const buildAnalysisContextFromParsers = (ctx, category) => {
  const { parsedFiles, resolvedDeps, archSummary, allRoutes, dbFlow, techReport, techSummary, entryPoint } = ctx;

  let out = `## Project Overview\n`;
  out += `Files: ${archSummary.totalFiles} | LOC: ${archSummary.totalLOC} | Languages: ${archSummary.languages.join(', ')}\n`;
  out += `Entry: ${archSummary.entryPoint || 'unknown'}\n`;
  if (techSummary.summary?.primaryLanguage) out += `Primary: ${techSummary.summary.primaryLanguage}\n`;

  const stacks = [];
  if (techReport.frontend?.length) stacks.push(`Frontend: ${techReport.frontend.map(t => t.name).join(', ')}`);
  if (techReport.backend?.length) stacks.push(`Backend: ${techReport.backend.map(t => t.name).join(', ')}`);
  if (techReport.database?.length) stacks.push(`Database: ${techReport.database.map(t => t.name).join(', ')}`);
  if (stacks.length) out += `\n### Stack\n${stacks.join('\n')}\n`;

  out += `\n## Layers\n`;
  for (const [layer, files] of Object.entries(archSummary.layers)) {
    out += `- ${layer}: ${files.length} files — ${files.slice(0, 8).join(', ')}${files.length > 8 ? ` +${files.length - 8}` : ''}\n`;
  }

  out += `\n## Dependencies\n`;
  out += `Total: ${resolvedDeps.allDependencies.length} | Unresolved: ${resolvedDeps.unresolvedImports.length} | Circular: ${resolvedDeps.circularDependencies.length}\n`;

  const symbolsByKind = {};
  for (const file of parsedFiles) {
    for (const sym of file.symbols || []) {
      if (!symbolsByKind[sym.kind]) symbolsByKind[sym.kind] = [];
      symbolsByKind[sym.kind].push(sym.name);
    }
  }
  out += `\n## Symbols\n`;
  for (const [kind, names] of Object.entries(symbolsByKind)) {
    const unique = [...new Set(names)].slice(0, 25);
    out += `- ${kind} (${unique.length}): ${unique.join(', ')}\n`;
  }

  if (allRoutes?.length > 0) {
    out += `\n## Routes (${allRoutes.length})\n`;
    for (const r of allRoutes.slice(0, 30)) out += `- ${r.method} ${r.path} → ${r.file}\n`;
  }

  if (dbFlow?.length > 0) {
    out += `\n## DB Ops (${dbFlow.length})\n`;
    for (const s of dbFlow.slice(0, 20)) out += `- ${s.description} (${s.file})\n`;
  }

  const configs = parsedFiles.filter(f => f.config);
  if (configs.length) out += `\n## Configs: ${configs.map(c => `${c.filePath}(${c.config.fileType})`).join(', ')}\n`;

  return out;
};

const selectFilesForCategory = (parsedFiles, category) => {
  const selectors = {
    purpose: f => /.json$|readme|index\.|main\.|app\.|server\./.test(f.filePath.toLowerCase()),
    architecture: f => /model|schema|entity|controller|route|handler|middleware|service|component|config/.test(f.filePath.toLowerCase()),
    workflow: f => /index|main|app|server|bootstrap|setup|entry|route|controller|middleware/.test(f.filePath.toLowerCase()),
    auth: f => /auth|login|token|jwt|oauth|passport|guard|protect|session/.test(f.filePath.toLowerCase()),
    api: f => /route|router|controller|handler|endpoint|api|middleware/.test(f.filePath.toLowerCase()),
    database: f => /model|schema|entity|migration|seed|repository|dao|query|database/.test(f.filePath.toLowerCase()),
  };
  const sel = selectors[category];
  if (!sel) return parsedFiles;
  const selected = parsedFiles.filter(sel);
  return selected.length > 0 ? selected : parsedFiles;
};

module.exports = {
  buildRAGPrompt,
  buildJSONPrompt,
  buildAnalysisContextFromParsers,
  selectFilesForCategory,
};
