const path = require('path');
const { parseAllFiles, resolveDependencies, extractArchitectureSummary, parseConfigFile } = require('./parser.service');
const { detectAll, extractTechStackNames } = require('./techStack.service');
const { extractAllRoutes, extractMongooseModels, generateExecutionFlow, detectEntryPoint, buildDatabaseFlow } = require('./executionFlow.service');
const fileService = require('./file.service');

/**
 * Static Code Analysis — NO AI INVOLVED.
 * Extracts all software engineering metrics purely through regex, parsing, and rules.
 */

const detectEnvironmentVariables = (parsedFiles) => {
  const envVars = [];
  const seen = new Set();

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    // .env files
    if (path.basename(file.filePath).startsWith('.env')) {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const name = trimmed.slice(0, eqIdx).trim();
          if (!seen.has(name)) {
            seen.add(name);
            envVars.push({ name, value: '***masked***', source: file.filePath, detected: 'file' });
          }
        }
      }
    }

    // process.env.X or process.env['X'] or env.X
    const envRefs = [
      ...content.matchAll(/process\.env\.(\w+)/g),
      ...content.matchAll(/process\.env\['(\w+)'\]/g),
      ...content.matchAll(/process\.env\["(\w+)"\]/g),
    ];
    for (const m of envRefs) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        envVars.push({ name: m[1], value: '***referenced***', source: file.filePath, detected: 'reference' });
      }
    }

    // config.get('X') or config.X patterns
    const cfgRefs = [
      ...content.matchAll(/config\.(?:get)\s*\(\s*['"](\w+)['"]/g),
      ...content.matchAll(/env\.(\w+)/g),
    ];
    for (const m of cfgRefs) {
      if (!seen.has(m[1]) && !m[1].startsWith('_')) {
        seen.add(m[1]);
        envVars.push({ name: m[1], value: '***referenced***', source: file.filePath, detected: 'reference' });
      }
    }
  }

  return envVars;
};

const detectMiddleware = (parsedFiles) => {
  const middleware = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    // Express-style middleware
    const appUse = [...content.matchAll(/(?:app|router)\.use\s*\(\s*(?:['"]([^'"]+)['"],\s*)?(\w+)/g)];
    for (const m of appUse) {
      middleware.push({
        type: 'express_middleware',
        name: m[2],
        path: m[1] || '/',
        file: file.filePath,
      });
    }

    // Named middleware functions
    const namedMw = [...content.matchAll(/(?:const|function)\s+(\w+)\s*(?:=|[=(])\s*(?:async\s*)?\([^)]*\)\s*(?:=>\s*)?\{[^}]*?(?:next|res\.(?:send|json|status))/g)];
    for (const m of namedMw) {
      middleware.push({
        type: 'middleware_function',
        name: m[1],
        file: file.filePath,
      });
    }

    // Python decorator middleware
    const flaskMw = [...content.matchAll(/@app\.(?:before_request|after_request|teardown_request)/g)];
    for (const _ of flaskMw) {
      middleware.push({
        type: 'flask_middleware',
        name: _.toString(),
        file: file.filePath,
      });
    }

    // Django middleware
    if (content.includes('MIDDLEWARE') || content.includes('middleware')) {
      const djMw = [...content.matchAll(/['"](\w+\.middleware\.\w+)['"]/g)];
      for (const m of djMw) {
        middleware.push({ type: 'django_middleware', name: m[1].split('.').pop(), file: file.filePath });
      }
    }
  }

  return middleware;
};

const detectAuthImplementation = (parsedFiles) => {
  const auth = {
    mechanisms: [],
    jwt: false,
    oauth: false,
    passport: false,
    bcrypt: false,
    session: false,
    apiKeys: false,
    middleware: [],
    models: [],
    routes: [],
    passwordPolicy: null,
  };

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    if (content.includes('jwt.sign') || content.includes('jwt.verify') || content.includes('jsonwebtoken')) {
      auth.jwt = true;
      const keyMatch = content.match(/expiresIn\s*:\s*['"]([^'"]+)['"]/);
      if (keyMatch && !auth.jwtExpiry) auth.jwtExpiry = keyMatch[1];
      const secretMatch = content.match(/ACCESS_TOKEN_SECRET/i) || content.match(/JWT_SECRET/i);
      if (secretMatch) auth.jwtSecretRef = true;
    }

    if (content.includes('passport') || content.includes('passport.authenticate') || content.includes('passport.use')) {
      auth.passport = true;
      auth.oauth = true;
    }

    if (content.includes('bcrypt.hash') || content.includes('bcrypt.compare')) {
      auth.bcrypt = true;
      const roundsMatch = content.match(/bcrypt\.(?:hash|genSalt)\s*\(\s*(\d+)/);
      if (roundsMatch) auth.bcryptRounds = parseInt(roundsMatch[1]);
    }

    if (content.includes('express-session') || content.includes('session(') || content.includes('cookie-session')) {
      auth.session = true;
    }

    if ((content.includes('apiKey') || content.includes('api_key') || content.includes('X-API-Key')) && !auth.apiKeys) {
      auth.apiKeys = true;
    }

    if (content.includes('authenticate') || content.includes('authorize') || content.includes('isAuthenticated') || content.includes('isAuthorized')) {
      const fnMatch = [...content.matchAll(/(?:const|function)\s+(\w*(?:auth|Auth|verify|Verify|protect|Protect)\w*)/g)];
      for (const m of fnMatch) {
        if (!auth.middleware.includes(m[1])) auth.middleware.push(m[1]);
      }
    }

    if (file.filePath.includes('auth') || file.filePath.includes('passport') || file.filePath.includes('oauth')) {
      auth.models.push(file.filePath);
    }

    if (content.includes('password') && (content.includes('uppercase') || content.includes('lowercase') || content.includes('minLength') || content.includes('minlength'))) {
      const policy = {};
      const minMatch = content.match(/min(?:Length)?\s*[=:>]\s*(\d+)/i);
      if (minMatch) policy.minLength = parseInt(minMatch[1]);
      if (content.includes('uppercase')) policy.requireUppercase = true;
      if (content.includes('lowercase')) policy.requireLowercase = true;
      if (content.includes('digit') || content.includes('number')) policy.requireDigit = true;
      if (content.includes('special') || content.includes('symbol')) policy.requireSpecial = true;
      auth.passwordPolicy = policy;
    }
  }

  const mechs = [];
  if (auth.jwt) mechs.push('JWT');
  if (auth.oauth) mechs.push('OAuth 2.0');
  if (auth.passport) mechs.push('Passport.js');
  if (auth.bcrypt) mechs.push('bcrypt');
  if (auth.session) mechs.push('Session-based');
  if (auth.apiKeys) mechs.push('API Keys');
  auth.mechanisms = mechs;

  return auth;
};

const detectExternalLibraries = (parsedFiles) => {
  const libraries = new Map();

  for (const file of parsedFiles) {
    if (!file.imports) continue;
    for (const imp of file.imports) {
      const source = imp.source;
      if (!source || typeof source !== 'string') continue;
      if (source.startsWith('.') || source.startsWith('/')) continue;
      if (source.startsWith('node:')) continue;

      const key = source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
      if (['node', 'npm', 'yarn', 'pnpm'].includes(key)) continue;

      if (!libraries.has(key)) {
        libraries.set(key, {
          name: key,
          usageCount: 0,
          files: new Set(),
          specifiers: new Set(),
          isDev: false,
        });
      }
      const lib = libraries.get(key);
      lib.usageCount++;
      lib.files.add(file.filePath);
      for (const spec of imp.specifiers) {
        if (spec) lib.specifiers.add(spec);
      }
    }
  }

  // Classify as dev dependency based on common dev tool names
  const DEV_TOOLS = new Set(['vite', 'webpack', 'eslint', 'prettier', 'jest', 'vitest', 'mocha', 'cypress', 'playwright', 'tailwindcss', 'postcss', 'autoprefixer', '@vitejs/plugin-react', 'typescript']);
  const result = [];
  for (const [, lib] of libraries) {
    lib.isDev = DEV_TOOLS.has(lib.name);
    lib.files = [...lib.files];
    lib.specifiers = [...lib.specifiers];
    result.push(lib);
  }
  result.sort((a, b) => b.usageCount - a.usageCount);

  return result;
};

const detectControllers = (parsedFiles) => {
  const controllers = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!file.filePath.includes('controller')) continue;

    const symbols = file.symbols || [];
    const name = path.basename(file.filePath, path.extname(file.filePath));
    const exportedFuncs = symbols.filter(s => s.exported && (s.kind === 'function' || s.kind === 'arrow_function'));

    controllers.push({
      name,
      file: file.filePath,
      functions: exportedFuncs.map(s => ({
        name: s.name,
        async: s.async || false,
        params: s.params ? s.params.map(p => p.name) : [],
        exported: true,
      })),
      totalFunctions: exportedFuncs.length,
    });
  }

  return controllers;
};

const detectServices = (parsedFiles) => {
  const services = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!file.filePath.includes('service')) continue;

    const symbols = file.symbols || [];
    const name = path.basename(file.filePath, path.extname(file.filePath));

    services.push({
      name,
      file: file.filePath,
      functions: symbols.filter(s => s.kind === 'function' || s.kind === 'arrow_function').map(s => ({
        name: s.name,
        async: s.async || false,
        exported: s.exported || false,
      })),
      totalFunctions: symbols.filter(s => s.kind === 'function' || s.kind === 'arrow_function').length,
    });
  }

  return services;
};

const detectModels = (parsedFiles) => {
  const models = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!file.filePath.includes('model') && !file.filePath.includes('schema') && !file.filePath.includes('entity')) continue;

    const name = path.basename(file.filePath, path.extname(file.filePath));
    const symbols = file.symbols || [];
    const classes = symbols.filter(s => s.kind === 'class');

    // Mongoose schema detection
    const mongooseMatch = content.match(/(?:const|let|var)\s+(\w+Schema)\s*=\s*(?:new\s+)?(?:mongoose\s*\.\s*)?Schema\s*\(/);
    const modelExport = content.match(/mongoose\.model\s*\(\s*['"](\w+)['"]/);
    const prismaModel = content.match(/model\s+(\w+)\s+\{/);

    models.push({
      name,
      file: file.filePath,
      schemaName: mongooseMatch ? mongooseMatch[1] : null,
      collectionName: modelExport ? modelExport[1] : null,
      prismaModelName: prismaModel ? prismaModel[1] : null,
      classes: classes.map(c => ({ name: c.name, extends: c.extends })),
      hasTimestamps: content.includes('timestamps: true') || content.includes('timestamps:true'),
    });
  }

  return models;
};

const detectFrameworks = (techReport) => {
  const frameworks = [];

  const frontend = techReport.frontend || [];
  const backend = techReport.backend || [];
  const build = techReport.build || [];

  for (const tech of [...frontend, ...backend, ...build]) {
    if (tech.confidence >= 0.5) {
      frameworks.push({ name: tech.name, category: tech.category, confidence: tech.confidence });
    }
  }

  return frameworks;
};

const buildSimplifiedLayerGraph = (parsedFiles, resolvedDeps) => {
  // Classify files into architectural layers
  const layerPatterns = {
    entry:    /^(index|main|app)\./i,
    page:     /pages?\/|views?\/|screens?\//i,
    component: /components?\//i,
    hook:     /hooks?\//i,
    context:  /context\/|providers?\//i,
    service:  /services?\/|api\//i,
    controller: /controllers?\//i,
    route:    /routes?\//i,
    middleware: /middleware\/|middlewares?\//i,
    model:    /models?\/|schemas?\/|entities?\//i,
    util:     /utils?\/|helpers?\/|lib\//i,
    config:   /config\//i,
    test:     /\.(test|spec)\.|__tests__|tests?\//i,
  };

  // Assign each file to a layer
  const layerFiles = {};
  const fileToLayer = {};

  for (const file of parsedFiles) {
    let assigned = false;
    for (const [layer, pattern] of Object.entries(layerPatterns)) {
      if (pattern.test(file.filePath)) {
        if (!layerFiles[layer]) layerFiles[layer] = [];
        layerFiles[layer].push(file);
        fileToLayer[file.filePath] = layer;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!layerFiles.other) layerFiles.other = [];
      layerFiles.other.push(file);
      fileToLayer[file.filePath] = 'other';
    }
  }

  // Build layer nodes
  const nodes = Object.entries(layerFiles).map(([id, files]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    fileCount: files.length,
    totalLOC: files.reduce((s, f) => s + f.loc, 0),
    files: files.map(f => f.filePath),
  }));

  // Build cross-layer dependency edges
  const edgeMap = {};
  for (const dep of resolvedDeps.allDependencies) {
    if (!dep.toFile || dep.kind !== 'local') continue;
    const fromLayer = fileToLayer[dep.fromFile];
    const toLayer = fileToLayer[dep.toFile];
    if (!fromLayer || !toLayer || fromLayer === toLayer) continue;
    const key = `${fromLayer}→${toLayer}`;
    if (!edgeMap[key]) {
      edgeMap[key] = { source: fromLayer, target: toLayer, count: 0, files: new Set() };
    }
    edgeMap[key].count++;
    edgeMap[key].files.add(`${dep.fromFile} → ${dep.toFile}`);
  }

  const edges = Object.values(edgeMap).map(e => ({
    source: e.source,
    target: e.target,
    count: e.count,
  }));

  const connectedNodes = new Set();
  for (const e of edges) {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  }

  return {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      disconnectedCount: nodes.filter(n => !connectedNodes.has(n.id)).length,
    },
  };
};

const buildDependencyGraphData = (resolvedDeps, parsedFiles) => {
  const nodes = [];
  const edges = [];
  const nodeSet = new Set();

  for (const file of parsedFiles) {
    if (!nodeSet.has(file.filePath)) {
      nodeSet.add(file.filePath);
      const layers = file.filePath.split(/[/\\]/);
      nodes.push({
        id: file.filePath,
        label: path.basename(file.filePath),
        path: file.filePath,
        directory: layers.length > 1 ? layers.slice(0, -1).join('/') : '/',
        type: 'file',
        language: file.language || 'Unknown',
        symbolCount: (file.symbols || []).length,
        loc: file.loc || 0,
      });
    }
  }

  for (const dep of resolvedDeps.allDependencies) {
    if (!dep.toFile) continue;
    edges.push({
      source: dep.fromFile,
      target: dep.toFile,
      type: dep.kind,
      label: dep.kind === 'local' ? 'import' : 'external',
      weight: 1,
    });
  }

  return { nodes, edges };
};

const buildAPIFlowData = (routes, executionFlow) => {
  return {
    routes: routes.map(r => ({
      method: r.method,
      path: r.path,
      file: r.file,
      line: r.line,
    })),
    flowSteps: (executionFlow.steps || []).map(s => ({
      step: s.step,
      phase: s.phase,
      description: s.description,
      file: s.file,
      color: s.color,
    })),
    summary: executionFlow.summary || null,
    phases: executionFlow.animation?.metadata?.phases || [],
  };
};

const buildDatabaseDiagramData = (mongooseModels, dbFlow) => {
  const { models, relationships } = mongooseModels;
  const operations = dbFlow.map(s => ({
    step: s.step,
    description: s.description,
    file: s.file,
    line: s.line,
  }));

  return { models, relationships, operations };
};

const buildExecutionFlowData = (executionFlow) => {
  return {
    label: executionFlow.label,
    flowType: executionFlow.flowType,
    steps: executionFlow.steps.map(s => ({
      step: s.step,
      phase: s.phase,
      description: s.description,
      file: s.file,
      depth: s.depth,
      color: s.color,
      metadata: s.metadata || null,
    })),
    phases: executionFlow.animation?.metadata?.phases || [],
    totalSteps: executionFlow.summary?.totalSteps || 0,
    entryPoint: executionFlow.summary?.entryPoint || null,
  };
};

const countAsyncFunctions = (parsedFiles) => {
  let count = 0;
  for (const file of parsedFiles) {
    if (!file.symbols) continue;
    for (const sym of file.symbols) {
      if (sym.async) count++;
    }
  }
  return count;
};

const countErrorHandlers = (parsedFiles) => {
  let count = 0;
  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;
    const matches = content.match(/\.catch\s*\(|try\s*\{|errorHandler|error\.message|next\(err\)|res\.status\(\d{3}\)|throw\s+(?:new\s+)?\w+/g);
    if (matches) count += matches.length;
  }
  return count;
};

const getMaxFolderDepth = (tree) => {
  let maxDepth = 0;
  const walk = (node, depth) => {
    if (depth > maxDepth) maxDepth = depth;
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'directory') walk(child, depth + 1);
      }
    }
  };
  walk(tree, 0);
  return maxDepth;
};

/**
 * Build a knowledge graph from parsed files showing file-function-class-component relationships.
 * Generates nodes for files, functions, classes, components, routes and edges for
 * imports, containment, route definitions, and class inheritance.
 */
const buildKnowledgeGraph = (parsedFiles, resolvedDeps) => {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeKeys = new Set();

  const addNode = (id, type, data) => {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, type, data });
    }
  };

  const addEdge = (source, target, relationship, label = '') => {
    const key = `${source}|${target}|${relationship}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({ source, target, label, data: { relationship } });
    }
  };

  for (const file of parsedFiles) {
    const fileId = `file::${file.filePath}`;
    const dir = file.filePath.includes('/') ? file.filePath.split('/').slice(0, -1).join('/') : '/';

    // File node
    addNode(fileId, 'file', {
      label: path.basename(file.filePath),
      sublabel: dir === '/' ? 'root' : dir,
      fullPath: file.filePath,
      language: file.language || 'Unknown',
    });

    // Symbol nodes (functions, classes, components)
    for (const sym of (file.symbols || [])) {
      if (!sym.name) continue;

      let symType = 'function';
      if (sym.kind === 'class') symType = 'class';
      else if (sym.kind === 'component') symType = 'component';
      else if (sym.kind === 'arrow_function') symType = 'function';

      const symId = `${symType}::${file.filePath}::${sym.name}`;
      addNode(symId, symType, {
        label: sym.name,
        sublabel: symType,
        fullPath: file.filePath,
        line: sym.line || 0,
      });

      // Container edge: file → symbol
      addEdge(fileId, symId, 'contains');
    }

    // Route nodes
    for (const route of (file.routes || [])) {
      const routeId = `route::${file.filePath}::${route.method || 'ANY'}-${route.path || ''}`;
      addNode(routeId, 'route', {
        label: `${route.method || 'ANY'} ${route.path || ''}`,
        sublabel: 'route',
        fullPath: file.filePath,
      });
      addEdge(fileId, routeId, 'defines');
    }

    // React component nodes
    for (const comp of (file.reactComponents || [])) {
      const compId = `component::${file.filePath}::${comp.name}`;
      addNode(compId, 'component', {
        label: comp.name,
        sublabel: 'React Component',
        fullPath: file.filePath,
      });
      addEdge(fileId, compId, 'contains');
    }

    // Import edges
    for (const imp of (file.imports || [])) {
      if (!imp.source || imp.source.startsWith('.') || imp.source.startsWith('/')) continue;
      // External package node
      const pkgKey = imp.source.startsWith('@')
        ? imp.source.split('/').slice(0, 2).join('/')
        : imp.source.split('/')[0];
      const pkgId = `package::${pkgKey}`;
      addNode(pkgId, 'package', {
        label: pkgKey,
        sublabel: 'external',
        fullPath: pkgKey,
      });
      addEdge(fileId, pkgId, 'imports');
    }
  }

  // File-level dependency edges (local imports between files)
  for (const dep of (resolvedDeps?.allDependencies || [])) {
    if (!dep.toFile || dep.kind !== 'local') continue;
    const fromId = `file::${dep.fromFile}`;
    const toId = `file::${dep.toFile}`;
    addNode(toId, 'file', {
      label: path.basename(dep.toFile),
      sublabel: dep.toFile.includes('/') ? dep.toFile.split('/').slice(0, -1).join('/') : '/',
      fullPath: dep.toFile,
    });
    addEdge(fromId, toId, 'imports');
  }

  return { nodes, edges };
};

const runStaticAnalysis = async (extractDir) => {
  // Phase 1: Read files
  const textFiles = await fileService.readAllTextFiles(extractDir);
  const tree = await fileService.buildTree(extractDir, extractDir);

  const rawFiles = textFiles.map(f => ({
    filePath: f.filePath,
    language: f.language,
    content: f.content,
    loc: f.loc,
    sizeKB: f.sizeKB,
  }));

  // Phase 2: Parse all files
  const parsedFiles = await parseAllFiles(rawFiles);

  // Phase 3: Resolve dependencies
  const resolvedDeps = resolveDependencies(parsedFiles);

  // Phase 4: Architecture summary
  const archSummary = extractArchitectureSummary(parsedFiles);

  // Phase 5: Technology detection
  const techReport = detectAll(parsedFiles);
  const techStackNames = extractTechStackNames(techReport);

  // Phase 6: Route extraction
  const allRoutes = extractAllRoutes(parsedFiles);
  const entryPoint = detectEntryPoint(parsedFiles);

  // Phase 7: Execution flow
  const executionFlow = generateExecutionFlow(parsedFiles);

  // Phase 8: Database models
  const mongooseModels = extractMongooseModels(parsedFiles);
  const dbFlow = buildDatabaseFlow(parsedFiles);

  // ===== COMPREHENSIVE ANALYSIS =====

  const languages = [...new Set(parsedFiles.map(f => f.language))].filter(l => l !== 'Unknown');
  const totalFiles = parsedFiles.length;
  const totalLOC = parsedFiles.reduce((s, f) => s + f.loc, 0);
  const totalLines = parsedFiles.reduce((s, f) => s + f.lines, 0);
  const totalSymbols = parsedFiles.reduce((s, f) => s + (f.symbols || []).length, 0);
  const totalImports = parsedFiles.reduce((s, f) => s + (f.imports || []).length, 0);
  const totalExports = parsedFiles.reduce((s, f) => s + (f.exports || []).length, 0);
  const asyncCount = countAsyncFunctions(parsedFiles);
  const errorHandlerCount = countErrorHandlers(parsedFiles);
  const maxFolderDepth = getMaxFolderDepth(tree);
  const depChainLength = resolvedDeps.allDependencies.filter(d => d.kind === 'local').length;
  const circularDepCount = resolvedDeps.circularDependencies.length;

  // Function/class counts
  const functionCount = parsedFiles.reduce((s, f) => s + (f.symbols || []).filter(sym => sym.kind === 'function' || sym.kind === 'arrow_function').length, 0);
  const classCount = parsedFiles.reduce((s, f) => s + (f.symbols || []).filter(sym => sym.kind === 'class').length, 0);
  const componentCount = parsedFiles.reduce((s, f) => s + (f.symbols || []).filter(sym => sym.kind === 'component').length, 0);

  // Cyclomatic complexity
  const cyclomaticComplexities = parsedFiles.map(f => {
    const cc = (f.symbols || []).length + (f.imports || []).length;
    return { file: f.filePath, loc: f.loc, cc };
  });
  const avgCC = cyclomaticComplexities.length > 0
    ? Math.round((cyclomaticComplexities.reduce((s, c) => s + c.cc, 0) / cyclomaticComplexities.length) * 100) / 100
    : 0;
  const maxCC = cyclomaticComplexities.length > 0 ? Math.max(...cyclomaticComplexities.map(c => c.cc)) : 0;

  // Comment percentage
  const totalComments = totalLines - totalLOC;
  const commentPercent = totalLines > 0 ? Math.round((totalComments / totalLines) * 1000) / 10 : 0;

  // Maintainability index (simple approximation: higher LOC = lower, higher CC = lower, higher comments = higher)
  const rawMI = totalLOC > 0
    ? Math.max(0, Math.min(100, 100 - (avgCC * 3) - (totalLOC / totalFiles / 50) + (commentPercent * 0.3)))
    : 100;
  const maintainabilityIndex = Math.round(rawMI * 100) / 100;

  // ===== BUILD COMPREHENSIVE RESULTS =====

  // Config files
  const configFiles = parsedFiles.filter(f => f.config).map(f => ({
    filePath: f.filePath,
    fileType: f.config.fileType,
    metadata: f.config.metadata,
  }));

  // Env variables
  const environmentVariables = detectEnvironmentVariables(parsedFiles);

  // Middleware
  const middleware = detectMiddleware(parsedFiles);

  // Auth
  const auth = detectAuthImplementation(parsedFiles);

  // External libraries
  const externalLibraries = detectExternalLibraries(parsedFiles);

  // Controllers, services, models
  const controllers = detectControllers(parsedFiles);
  const services = detectServices(parsedFiles);
  const models = detectModels(parsedFiles);

  // Frameworks
  const frameworks = detectFrameworks(techReport);

  // ===== TREE-SITTER PARSER METADATA COLLECTION =====
  // Aggregate rich AST-extracted metadata across all parsed files
  const allHooks = [];
  const allParserRoutes = [];
  const allDbModels = [];
  const allReactComponents = [];
  const allHtmlTags = new Set();
  const allCssSelectors = [];
  const allCssDeclarations = [];
  const allExternalDeps = [];
  const fileMetadataMap = {};

  for (const file of parsedFiles) {
    const fp = file.filePath;
    fileMetadataMap[fp] = {
      symbols: (file.symbols || []).map(s => ({
        name: s.name,
        kind: s.kind,
        line: s.line,
        async: s.async || false,
        exported: s.exported || false,
        params: s.params || [],
        extends: s.extends || null,
        returnType: s.returnType || null,
      })),
      imports: (file.imports || []).map(i => ({
        source: i.source,
        kind: i.kind,
        specifiers: i.specifiers || [],
        line: i.line,
      })),
      exports: (file.exports || []).map(e => ({
        kind: e.kind || 'named',
        names: e.names || [],
        line: e.line,
      })),
      hooks: (file.hooks || []).map(h => ({
        name: h.name,
        args: h.args || [],
        line: h.line,
      })),
      routes: (file.routes || []).map(r => ({
        method: r.method,
        path: r.path,
        handler: r.handler || '',
        line: r.line,
      })),
      databaseModels: (file.databaseModels || []).map(m => ({
        name: m.name,
        schema: m.schema || '',
        line: m.line,
      })),
      reactComponents: (file.reactComponents || []).map(c => ({
        name: c.name,
        line: c.line,
        isDefaultExport: c.isDefaultExport || false,
      })),
      htmlTags: file.htmlTags || [],
      cssSelectors: file.cssSelectors || [],
      cssDeclarations: file.cssDeclarations || [],
      loc: file.loc || 0,
      language: file.language || 'Unknown',
    };

    // Aggregate globals
    for (const h of (file.hooks || [])) allHooks.push({ ...h, file: fp });
    for (const r of (file.routes || [])) allParserRoutes.push({ ...r, file: fp });
    for (const m of (file.databaseModels || [])) allDbModels.push({ ...m, file: fp });
    for (const c of (file.reactComponents || [])) allReactComponents.push({ ...c, file: fp });
    for (const tag of (file.htmlTags || [])) allHtmlTags.add(tag);
    for (const sel of (file.cssSelectors || [])) allCssSelectors.push(sel);
    for (const dec of (file.cssDeclarations || [])) allCssDeclarations.push({ ...dec, file: fp });
    for (const dep of (file.dependencies?.external || [])) allExternalDeps.push({ ...dep, file: fp });
  }

  const parserMetadata = {
    symbols: parsedFiles.reduce((acc, f) => acc.concat(f.symbols || []), []),
    imports: parsedFiles.reduce((acc, f) => acc.concat(f.imports || []), []),
    exports: parsedFiles.reduce((acc, f) => acc.concat(f.exports || []), []),
    hooks: allHooks,
    routes: allParserRoutes,
    databaseModels: allDbModels,
    reactComponents: allReactComponents,
    htmlTags: [...allHtmlTags],
    cssSelectors: allCssSelectors,
    cssDeclarations: allCssDeclarations,
    externalDependencies: allExternalDeps,
    fileMetadata: fileMetadataMap,
  };

  // Folder structure tree text
  const folderStructureLines = [];
  const renderTree = (node, prefix = '', isLast = true) => {
    const connector = isLast ? '└── ' : '├── ';
    const ext = node.type === 'directory' ? '/' : node.language ? ` (${node.language})` : '';
    folderStructureLines.push(prefix + connector + node.name + ext);
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        renderTree(node.children[i], prefix + (isLast ? '    ' : '│   '), i === node.children.length - 1);
      }
    }
  };
  renderTree(tree);

  // Diagram data
  const dependencyGraphData = buildDependencyGraphData(resolvedDeps, parsedFiles);
  const simplifiedLayerData = buildSimplifiedLayerGraph(parsedFiles, resolvedDeps);
  const apiFlowData = buildAPIFlowData(allRoutes, executionFlow);
  const databaseDiagramData = buildDatabaseDiagramData(mongooseModels, dbFlow);
  const executionFlowData = buildExecutionFlowData(executionFlow);

  // Folder count
  const countFolders = (node) => {
    let count = 0;
    if (node.type === 'directory') count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += countFolders(child);
      }
    }
    return count;
  };
  const folderCount = countFolders(tree) - 1; // exclude root

  const results = {
    // Project Metrics
    metrics: {
      totalFiles,
      totalLOC,
      totalLines,
      totalSizeKB: Math.round(rawFiles.reduce((s, f) => s + f.sizeKB, 0) * 100) / 100,
      totalSymbols,
      totalImports,
      totalExports,
      functionCount,
      classCount,
      componentCount,
      folderCount,
      maxFolderDepth,
      avgCyclomaticComplexity: avgCC,
      maxCyclomaticComplexity: maxCC,
      commentPercent,
      maintainabilityIndex,
      asyncFunctionCount: asyncCount,
      errorHandlerCount,
      circularDependencyCount: circularDepCount,
      dependencyChainLength: depChainLength,
      routeCount: allRoutes.length,
      entryPoint: entryPoint?.filePath || null,
    },

    // Tech Stack
    techStack: {
      languages,
      frameworks,
      frontend: techReport.frontend || [],
      backend: techReport.backend || [],
      database: techReport.database || [],
      authentication: techReport.authentication || [],
      deployment: techReport.deployment || [],
      cloud: techReport.cloud || [],
      testing: techReport.testing || [],
      build: techReport.build || [],
      stacks: techReport.stacks || [],
      summary: techReport.summary || null,
    },

    // Architecture
    architecture: {
      entryPoint: archSummary.entryPoint || null,
      layers: Object.fromEntries(
        Object.entries(archSummary.layers || {}).map(([k, v]) => [k, { count: v.length, files: v.slice(0, 20) }])
      ),
      folderDepth: maxFolderDepth,
    },

    // API
    api: {
      endpoints: allRoutes.map(r => ({
        method: r.method,
        path: r.path,
        file: r.file,
        line: r.line,
      })),
      totalEndpoints: allRoutes.length,
    },

    // Database
    database: {
      models: mongooseModels.models,
      relationships: mongooseModels.relationships,
      modelCount: mongooseModels.totalModels,
    },

    // Auth
    authentication: auth,

    // Dependencies
    dependencies: {
      allDependencies: resolvedDeps.allDependencies.map(d => ({
        fromFile: d.fromFile,
        toFile: d.toFile,
        toPackage: d.toPackage,
        kind: d.kind,
        specifiers: d.specifiers,
      })),
      unresolvedImports: resolvedDeps.unresolvedImports,
      circularDependencies: resolvedDeps.circularDependencies.map(c => c.join(' → ')),
    },

    // External Libraries
    externalLibraries,

    // Controllers / Services / Models
    controllers,
    services,
    models,

    // Middleware
    middleware,

    // Environment Variables
    environmentVariables,

    // Config Files
    configFiles,

    // Folder Structure
    folderStructure: {
      tree, // Full tree object for rendering
      text: folderStructureLines.join('\n'), // Text representation
    },

    // Diagrams
    diagrams: {
      dependencyGraph: dependencyGraphData,
      simplifiedGraph: simplifiedLayerData,
      apiFlow: apiFlowData,
      databaseER: databaseDiagramData,
      executionFlow: executionFlowData,
    },

    // Tree-sitter Parser Metadata (AST-generated, no AI)
    parserMetadata,

    // Knowledge Graph: file-function-class-component relationships
    knowledgeGraph: buildKnowledgeGraph(parsedFiles, resolvedDeps),
  };

  return results;
};

module.exports = {
  runStaticAnalysis,
  detectEnvironmentVariables,
  detectMiddleware,
  detectAuthImplementation,
  detectExternalLibraries,
  detectControllers,
  detectServices,
  detectModels,
  detectFrameworks,
  buildKnowledgeGraph,
  buildDependencyGraphData,
  buildSimplifiedLayerGraph,
  buildAPIFlowData,
  buildDatabaseDiagramData,
  buildExecutionFlowData,
  getMaxFolderDepth,
  countAsyncFunctions,
  countErrorHandlers,
};
