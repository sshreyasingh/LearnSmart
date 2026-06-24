const path = require('path');

const PHASE_COLORS = {
  request: '#3b82f6',
  middleware: '#f59e0b',
  authentication: '#ef4444',
  validation: '#f97316',
  controller: '#8b5cf6',
  service: '#10b981',
  model: '#14b8a6',
  database: '#6366f1',
  response: '#22c55e',
  error: '#dc2626',
  redirect: '#ec4899',
  unknown: '#94a3b8',
};

const detectPhase = (description, symbolKind) => {
  const lower = description.toLowerCase();

  if (symbolKind === 'route' || lower.includes('route') || lower.includes('endpoint')) return 'request';
  if (lower.includes('middleware') || lower.includes('interceptor') || lower.includes('filter')) return 'middleware';
  if (lower.includes('auth') || lower.includes('login') || lower.includes('jwt') || lower.includes('token')) return 'authentication';
  if (lower.includes('valid') || lower.includes('schema') || lower.includes('parse') || lower.includes('sanitize')) return 'validation';
  if (symbolKind === 'controller' || lower.includes('controller')) return 'controller';
  if (symbolKind === 'service' || lower.includes('service')) return 'service';
  if (symbolKind === 'model' || lower.includes('model') || lower.includes('schema') || lower.includes('entity')) return 'model';
  if (lower.includes('database') || lower.includes('db') || lower.includes('query') || lower.includes('find') || lower.includes('insert') || lower.includes('update') || lower.includes('delete') || lower.includes('mongo') || lower.includes('sql')) return 'database';
  if (lower.includes('response') || lower.includes('send') || lower.includes('return') || lower.includes('json')) return 'response';
  if (lower.includes('error') || lower.includes('throw') || lower.includes('catch')) return 'error';
  if (lower.includes('redirect') || lower.includes('next(')) return 'redirect';

  return 'unknown';
};

const detectEntryPoint = (parsedFiles) => {
  const entryPatterns = [
    /\/index\.(js|ts|jsx|tsx)$/,
    /\/app\.(js|ts|jsx|tsx)$/,
    /\/server\.(js|ts)$/,
    /\/main\.(js|ts|py|java|cpp)$/,
    /\/App\.(jsx|tsx)$/,
  ];

  let entry = parsedFiles[0];
  let bestScore = -1;

  for (const file of parsedFiles) {
    for (let i = 0; i < entryPatterns.length; i++) {
      if (entryPatterns[i].test(file.filePath)) {
        const score = entryPatterns.length - i;
        if (score > bestScore) {
          bestScore = score;
          entry = file;
        }
      }
    }
  }

  return entry || parsedFiles[0];
};

const extractExpressRoutes = (parsedFiles) => {
  const routes = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    const routeMethods = [
      /\b(app|router)\.get\s*\(\s*['"]([^'"]+)['"]/g,
      /\b(app|router)\.post\s*\(\s*['"]([^'"]+)['"]/g,
      /\b(app|router)\.put\s*\(\s*['"]([^'"]+)['"]/g,
      /\b(app|router)\.delete\s*\(\s*['"]([^'"]+)['"]/g,
      /\b(app|router)\.patch\s*\(\s*['"]([^'"]+)['"]/g,
      /\b(app|router)\.use\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    for (const pattern of routeMethods) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[0].split('.')[1].split('(')[0].toUpperCase();
        routes.push({
          method,
          path: match[2],
          file: file.filePath,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }

  return routes.slice(0, 50);
};

const extractFlaskFastAPIRoutes = (parsedFiles) => {
  const routes = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    const decoratorPatterns = [
      /@app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /@router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /@bp\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /@app\.route\s*\(\s*['"]([^'"]+)['"]\s*,\s*methods\s*=\s*\[([^\]]+)\]/g,
    ];

    for (const pattern of decoratorPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] ? match[1].toUpperCase() : 'ALL';
        const routePath = match[1] ? match[2] : match[1];
        routes.push({
          method: method === 'ALL' ? 'ALL' : method,
          path: routePath,
          file: file.filePath,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }

  return routes.slice(0, 50);
};

const extractSpringRoutes = (parsedFiles) => {
  const routes = [];

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    const annotationPatterns = [
      /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"]([^'"]+)['"]/g,
      /@RequestMapping\s*\(\s*value\s*=\s*['"]([^'"]+)['"]\s*,\s*method\s*=\s*RequestMethod\.(\w+)/g,
      /@RequestMapping\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    const classMapping = content.match(/@RequestMapping\s*\(\s*['"]([^'"]+)['"]/);
    const basePath = classMapping ? classMapping[1] : '';

    for (const pattern of annotationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1] ? match[1].toUpperCase() : 'GET';
        const subPath = match[2] || '';
        routes.push({
          method,
          path: basePath + subPath,
          file: file.filePath,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }

  return routes.slice(0, 50);
};

const extractAllRoutes = (parsedFiles) => {
  const allRoutes = [
    ...extractExpressRoutes(parsedFiles.filter((f) =>
      (f.language || '').includes('JavaScript') || (f.language || '').includes('TypeScript')
    )),
    ...extractFlaskFastAPIRoutes(parsedFiles.filter((f) =>
      (f.language || '') === 'Python'
    )),
    ...extractSpringRoutes(parsedFiles.filter((f) =>
      (f.language || '') === 'Java'
    )),
  ];

  return allRoutes.slice(0, 100);
};

const buildFunctionCallChain = (parsedFiles, entryFile) => {
  const steps = [];
  const visited = new Set();
  let stepCounter = 1;

  const visitFile = (file, depth) => {
    if (!file || visited.has(file.filePath)) return;
    visited.add(file.filePath);

    const exportedSymbols = (file.symbols || []).filter((s) => s.exported);

    for (const symbol of exportedSymbols.slice(0, 10)) {
      const phase = detectPhase(symbol.name + ' ' + file.filePath, symbol.kind);

      steps.push({
        step: stepCounter++,
        phase,
        description: `${symbol.name}() — ${symbol.kind || 'function'} in ${path.basename(file.filePath)}`,
        file: file.filePath,
        symbol: symbol.name,
        kind: symbol.kind || 'function',
        line: symbol.line || 0,
        depth,
        color: PHASE_COLORS[phase] || PHASE_COLORS.unknown,
      });
    }

    for (const imp of (file.imports || []).slice(0, 10)) {
      const source = imp.source;
      if (!source || !source.startsWith('.')) continue;

      const resolved = resolveLocalPath(source, file.filePath);
      const target = parsedFiles.find((f) => f.filePath === resolved);
      if (target && !visited.has(target.filePath)) {
        visitFile(target, depth + 1);
      }
    }
  };

  visitFile(entryFile, 0);

  if (steps.length === 0) {
    for (const file of parsedFiles.slice(0, 30)) {
      const phase = detectPhase(file.filePath, '');
      steps.push({
        step: stepCounter++,
        phase,
        description: `Module: ${path.basename(file.filePath)}`,
        file: file.filePath,
        symbol: path.basename(file.filePath),
        kind: 'module',
        line: 1,
        depth: 0,
        color: PHASE_COLORS[phase] || PHASE_COLORS.unknown,
      });
    }
  }

  return steps;
};

const resolveLocalPath = (importSource, fromFilePath) => {
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) return importSource;
  const fromDir = path.dirname(fromFilePath).replace(/\\/g, '/');
  let resolved = path.posix.join(fromDir, importSource).replace(/\\/g, '/');
  if (resolved.match(/\.\w+$/)) return resolved;
  return resolved + '.js';
};

const buildDatabaseFlow = (parsedFiles) => {
  const steps = [];
  let stepCounter = 1;

  const dbPatterns = [
    { regex: /mongoose\.connect\s*\(/g, desc: 'Connect to MongoDB' },
    { regex: /mongoose\.model\s*\(/g, desc: 'Define Mongoose model', phase: 'model' },
    { regex: /new\s+mongoose\.Schema\s*\(/g, desc: 'Define Mongoose schema', phase: 'model' },
    { regex: /\.find\s*\(/g, desc: 'Database query: find()' },
    { regex: /\.findOne\s*\(/g, desc: 'Database query: findOne()' },
    { regex: /\.findById\s*\(/g, desc: 'Database query: findById()' },
    { regex: /\.create\s*\(/g, desc: 'Database insert: create()' },
    { regex: /\.save\s*\(/g, desc: 'Database save: save()' },
    { regex: /\.updateOne\s*\(/g, desc: 'Database update: updateOne()' },
    { regex: /\.updateMany\s*\(/g, desc: 'Database update: updateMany()' },
    { regex: /\.deleteOne\s*\(/g, desc: 'Database delete: deleteOne()' },
    { regex: /\.deleteMany\s*\(/g, desc: 'Database delete: deleteMany()' },
    { regex: /\.findByIdAndUpdate\s*\(/g, desc: 'Database: findByIdAndUpdate()' },
    { regex: /\.findByIdAndDelete\s*\(/g, desc: 'Database: findByIdAndDelete()' },
    { regex: /\.populate\s*\(/g, desc: 'Populate referenced documents', phase: 'model' },
    { regex: /\.aggregate\s*\(/g, desc: 'MongoDB aggregation pipeline' },
    { regex: /\.exec\s*\(/g, desc: 'Execute Mongoose query' },
    { regex: /\.lean\s*\(/g, desc: 'Return plain JavaScript object', phase: 'model' },
    { regex: /\.select\s*\(/g, desc: 'Select specific fields', phase: 'database' },
    { regex: /\.sort\s*\(/g, desc: 'Sort query results' },
    { regex: /\.limit\s*\(/g, desc: 'Limit query results' },
    { regex: /\.skip\s*\(/g, desc: 'Skip documents (pagination)' },
    { regex: /\.countDocuments\s*\(/g, desc: 'Count documents' },
    { regex: /redis\.(get|set|del|hget|hset|lpush|rpush)\s*\(/g, desc: 'Redis operation' },
    { regex: /\.query\s*\(/g, desc: 'SQL query execution' },
    { regex: /\.execute\s*\(/g, desc: 'Execute query' },
    { regex: /prisma\.\w+\.(findMany|findUnique|create|update|delete|upsert)\s*\(/g, desc: 'Prisma database operation' },
    { regex: /sequelize\.(define|query|sync)\s*\(/g, desc: 'Sequelize database operation' },
  ];

  const seen = new Set();
  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    for (const { regex, desc, phase } of dbPatterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = `${file.filePath}:${desc}:${match.index}`;
        if (seen.has(key)) continue;
        seen.add(key);

        steps.push({
          step: stepCounter++,
          phase: phase || 'database',
          description: desc,
          file: file.filePath,
          symbol: '',
          kind: 'database',
          line: content.substring(0, match.index).split('\n').length,
          depth: 1,
          color: PHASE_COLORS[phase || 'database'] || PHASE_COLORS.database,
        });
      }
    }
  }

  return steps.slice(0, 100);
};

const buildControllerFlow = (parsedFiles, routes) => {
  const steps = [];
  let stepCounter = 1;
  const matchedFiles = new Set();

  for (const route of routes.slice(0, 30)) {
    steps.push({
      step: stepCounter++,
      phase: 'request',
      description: `${route.method} ${route.path}`,
      file: route.file,
      symbol: '',
      kind: 'route',
      line: route.line || 0,
      depth: 0,
      color: PHASE_COLORS.request,
      metadata: { method: route.method, path: route.path },
    });

    const routeFile = parsedFiles.find((f) => f.filePath === route.file);
    if (routeFile && !matchedFiles.has(route.file)) {
      matchedFiles.add(route.file);

      for (const imp of (routeFile.imports || []).slice(0, 10)) {
        const source = imp.source;
        if (!source || !source.startsWith('.')) continue;
        const resolved = resolveLocalPath(source, routeFile.filePath);

        const target = parsedFiles.find(
          (f) => f.filePath === resolved || f.filePath === resolved + '.js'
        );
        if (target && !matchedFiles.has(target.filePath)) {
          const layer = target.filePath.includes('middleware')
            ? 'middleware'
            : target.filePath.includes('service')
            ? 'service'
            : target.filePath.includes('model')
            ? 'model'
            : 'controller';

          matchedFiles.add(target.filePath);
          steps.push({
            step: stepCounter++,
            phase: layer,
            description: `→ ${path.basename(target.filePath)}`,
            file: target.filePath,
            symbol: '',
            kind: 'module',
            line: 1,
            depth: 1,
            color: PHASE_COLORS[layer] || PHASE_COLORS.unknown,
          });

          for (const targetSymbol of (target.symbols || [])
            .filter((s) => s.exported)
            .slice(0, 3)) {
            steps.push({
              step: stepCounter++,
              phase: layer,
              description: `${targetSymbol.name}()`,
              file: target.filePath,
              symbol: targetSymbol.name,
              kind: targetSymbol.kind || 'function',
              line: targetSymbol.line || 0,
              depth: 2,
              color: PHASE_COLORS[layer] || PHASE_COLORS.unknown,
            });
          }
        }
      }
    }

    if (steps.length >= 200) break;
  }

  if (steps.length === 0) {
    const entry = detectEntryPoint(parsedFiles);
    if (entry) {
      steps.push({
        step: 1,
        phase: 'request',
        description: `Application entry: ${path.basename(entry.filePath)}`,
        file: entry.filePath,
        symbol: '',
        kind: 'entry',
        line: 1,
        depth: 0,
        color: PHASE_COLORS.request,
      });
    }
  }

  return steps;
};

const buildRequestFlow = (parsedFiles, routes) => {
  if (routes.length === 0) return buildControllerFlow(parsedFiles, []);

  const mainRoute = routes[0];
  const steps = [
    {
      step: 1,
      phase: 'request',
      description: `Incoming ${mainRoute.method} ${mainRoute.path}`,
      file: mainRoute.file,
      symbol: 'request',
      kind: 'entry',
      line: mainRoute.line,
      depth: 0,
      color: PHASE_COLORS.request,
      metadata: { method: mainRoute.method, path: mainRoute.path },
    },
  ];

  let stepCounter = 2;

  const authFiles = parsedFiles.filter(
    (f) =>
      f.filePath.includes('auth') ||
      f.filePath.includes('passport') ||
      (f.content || '').includes('authenticate') ||
      (f.content || '').includes('verifyToken')
  );

  for (const authFile of authFiles.slice(0, 3)) {
    const authSymbols = (authFile.symbols || [])
      .filter((s) => s.name.includes('auth') || s.name.includes('verify') || s.name.includes('token'))
      .slice(0, 3);

    if (authSymbols.length > 0) {
      for (const sym of authSymbols) {
        steps.push({
          step: stepCounter++,
          phase: 'authentication',
          description: `Auth: ${sym.name}()`,
          file: authFile.filePath,
          symbol: sym.name,
          kind: sym.kind || 'function',
          line: sym.line || 0,
          depth: 1,
          color: PHASE_COLORS.authentication,
        });
      }
    } else {
      steps.push({
        step: stepCounter++,
        phase: 'authentication',
        description: `Auth middleware: ${path.basename(authFile.filePath)}`,
        file: authFile.filePath,
        symbol: '',
        kind: 'middleware',
        line: 1,
        depth: 1,
        color: PHASE_COLORS.authentication,
      });
    }
  }

  const validationFiles = parsedFiles.filter(
    (f) =>
      f.filePath.includes('valid') ||
      f.filePath.includes('schema') ||
      (f.content || '').includes('z.object(') ||
      (f.content || '').includes('validate(')
  );

  if (validationFiles.length > 0) {
    steps.push({
      step: stepCounter++,
      phase: 'validation',
      description: `Validate request: ${path.basename(validationFiles[0].filePath)}`,
      file: validationFiles[0].filePath,
      symbol: '',
      kind: 'validation',
      line: 1,
      depth: 1,
      color: PHASE_COLORS.validation,
    });
  }

  const controllerFiles = parsedFiles.filter(
    (f) =>
      f.filePath.includes('controller') ||
      (f.exports || []).some((e) => (e.names || []).some((n) => n.endsWith('Controller')))
  );

  for (const ctrlFile of controllerFiles.slice(0, 3)) {
    const ctrlSymbols = (ctrlFile.symbols || [])
      .filter((s) => s.exported)
      .slice(0, 3);

    for (const sym of ctrlSymbols) {
      steps.push({
        step: stepCounter++,
        phase: 'controller',
        description: `Controller: ${sym.name}()`,
        file: ctrlFile.filePath,
        symbol: sym.name,
        kind: sym.kind || 'function',
        line: sym.line || 0,
        depth: 1,
        color: PHASE_COLORS.controller,
      });
    }
  }

  const serviceFiles = parsedFiles.filter(
    (f) =>
      f.filePath.includes('service') &&
      !f.filePath.includes('controller')
  );

  for (const svcFile of serviceFiles.slice(0, 3)) {
    const svcSymbols = (svcFile.symbols || [])
      .filter((s) => s.exported)
      .slice(0, 2);

    for (const sym of svcSymbols) {
      steps.push({
        step: stepCounter++,
        phase: 'service',
        description: `Service: ${sym.name}()`,
        file: svcFile.filePath,
        symbol: sym.name,
        kind: sym.kind || 'function',
        line: sym.line || 0,
        depth: 2,
        color: PHASE_COLORS.service,
      });
    }
  }

  const modelFiles = parsedFiles.filter(
    (f) =>
      f.filePath.includes('model') ||
      f.filePath.includes('schema') ||
      (f.content || '').includes('mongoose.model')
  );

  for (const modelFile of modelFiles.slice(0, 2)) {
    steps.push({
      step: stepCounter++,
      phase: 'model',
      description: `Data model: ${path.basename(modelFile.filePath)}`,
      file: modelFile.filePath,
      symbol: '',
      kind: 'model',
      line: 1,
      depth: 2,
      color: PHASE_COLORS.model,
    });

    steps.push({
      step: stepCounter++,
      phase: 'database',
      description: 'Database operation (find/create/update)',
      file: modelFile.filePath,
      symbol: '',
      kind: 'database',
      line: 1,
      depth: 3,
      color: PHASE_COLORS.database,
    });
  }

  steps.push({
    step: stepCounter++,
    phase: 'response',
    description: 'Return JSON response',
    file: mainRoute.file,
    symbol: 'response',
    kind: 'response',
    line: 1,
    depth: 0,
    color: PHASE_COLORS.response,
  });

  return steps;
};

const generateAnimationJSON = (steps, options = {}) => {
  const { animationType = 'sequential', duration = 0 } = options;

  const totalSteps = steps.length;
  const baseDuration = duration || Math.max(4000, totalSteps * 800);
  const stepDuration = baseDuration / totalSteps;

  const animations = steps.map((step, index) => ({
    id: `step-${step.step}`,
    type: 'step',
    data: {
      step: step.step,
      phase: step.phase,
      description: step.description,
      file: step.file,
      symbol: step.symbol || '',
      line: step.line || 0,
      color: step.color,
      metadata: step.metadata || null,
    },
    animation: {
      type: 'fade-in',
      delay: animationType === 'sequential' ? index * stepDuration : 0,
      duration: stepDuration,
      easing: 'ease-out',
    },
    position: {
      x: 0,
      y: index * 80,
    },
  }));

  const phaseGroups = {};
  for (const step of steps) {
    if (!phaseGroups[step.phase]) phaseGroups[step.phase] = [];
    phaseGroups[step.phase].push(step);
  }

  const phases = Object.entries(phaseGroups).map(([phase, phaseSteps]) => ({
    phase,
    label: phase.charAt(0).toUpperCase() + phase.slice(1),
    color: PHASE_COLORS[phase] || PHASE_COLORS.unknown,
    stepCount: phaseSteps.length,
    startStep: phaseSteps[0].step,
    endStep: phaseSteps[phaseSteps.length - 1].step,
    duration: phaseSteps.length * stepDuration,
  }));

  return {
    animations,
    metadata: {
      totalSteps,
      phases,
      animationType,
      totalDuration: baseDuration,
      stepDuration,
    },
  };
};

const generateExecutionFlow = (parsedFiles, options = {}) => {
  const { flowType = 'auto' } = options;

  const routes = extractAllRoutes(parsedFiles);
  const entryFile = detectEntryPoint(parsedFiles);

  let steps = [];
  let label = '';

  switch (flowType) {
    case 'request':
      steps = buildRequestFlow(parsedFiles, routes);
      label = 'HTTP Request Flow';
      break;
    case 'functions':
      steps = buildFunctionCallChain(parsedFiles, entryFile);
      label = 'Function Call Chain';
      break;
    case 'controller':
      steps = buildControllerFlow(parsedFiles, routes);
      label = 'Controller Flow';
      break;
    case 'database':
      steps = buildDatabaseFlow(parsedFiles);
      label = 'Database Operations Flow';
      break;
    default: {
      const hasRoutes = routes.length > 0;
      const hasDbOps = parsedFiles.some((f) => {
        const c = f.content || '';
        return (
          c.includes('.find(') ||
          c.includes('.create(') ||
          c.includes('.save(') ||
          c.includes('mongoose.')
        );
      });

      if (hasRoutes) {
        steps = buildRequestFlow(parsedFiles, routes);
        label = 'HTTP Request Flow';
      } else if (hasDbOps) {
        steps = buildDatabaseFlow(parsedFiles);
        label = 'Database Operations Flow';
      } else {
        steps = buildFunctionCallChain(parsedFiles, entryFile);
        label = 'Function Call Chain';
      }
    }
  }

  const animationJSON = generateAnimationJSON(steps, options);

  return {
    label,
    flowType,
    steps,
    animation: animationJSON,
    summary: {
      entryPoint: entryFile ? entryFile.filePath : null,
      totalSteps: steps.length,
      routesFound: routes.length,
      phases: animationJSON.metadata.phases.map((p) => p.phase),
    },
  };
};

const extractMongooseModels = (parsedFiles) => {
  const models = [];
  const seen = new Set();

  for (const file of parsedFiles) {
    const content = file.content || '';
    if (!content) continue;

    const blockRe = /(?:const|let|var)\s+(\w+Schema)\s*=\s*(?:new\s+(?:mongoose\s*\.\s*)?Schema)\s*\(\s*\{/g;
    let match;

    while ((match = blockRe.exec(content)) !== null) {
      const schemaName = match[1];
      const modelName = schemaName.replace(/Schema$/i, '');
      const schemaStart = match.index + match[0].length;

      if (seen.has(modelName)) continue;
      seen.add(modelName);

      let depth = 1;
      let i = schemaStart;
      for (; i < content.length && depth > 0; i++) {
        const ch = content[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      const fieldsBlock = content.substring(schemaStart, i - 1);

      const fields = [];
      const fieldEntries = splitTopLevelFields(fieldsBlock);

      for (const entry of fieldEntries) {
        const nameMatch = entry.match(/^\s*(\w+)\s*:\s*/);
        if (!nameMatch) continue;
        const fieldName = nameMatch[1];
        const fieldValue = entry.substring(nameMatch[0].length).trim();
        const fieldInfo = { name: fieldName, type: 'Mixed' };

        if (fieldValue.startsWith('{')) {
          const typeM = fieldValue.match(/\btype\s*:\s*([^\n,}]+)/);
          if (typeM) {
            fieldInfo.type = typeM[1].trim()
              .replace(/mongoose\s*\.\s*Schema\s*\.\s*Types\s*\.\s*/g, '')
              .replace(/['"]/g, '');
          }

          const reqM = fieldValue.match(/\brequired\s*:\s*(true|false)/);
          if (reqM && reqM[1] === 'true') fieldInfo.required = true;

          const uniM = fieldValue.match(/\bunique\s*:\s*(true|false)/);
          if (uniM && uniM[1] === 'true') fieldInfo.unique = true;

          const refM = fieldValue.match(/\bref\s*:\s*['"](\w+)['"]/);
          if (refM) fieldInfo.ref = refM[1];
        } else if (fieldValue.startsWith('[') && fieldValue.includes('{')) {
          fieldInfo.type = 'Array<Object>';
          const refM = fieldValue.match(/\bref\s*:\s*['"](\w+)['"]/);
          if (refM) fieldInfo.ref = refM[1];
        } else if (fieldValue.startsWith('[')) {
          fieldInfo.type = 'Array';
        } else if (/^\w[\w.]*$/.test(fieldValue)) {
          fieldInfo.type = fieldValue;
        }

        fields.push(fieldInfo);
      }

      models.push({
        name: modelName,
        collection: modelName.toLowerCase() + 's',
        schemaName,
        filePath: file.filePath,
        fields,
        rawFieldCount: fields.length,
      });
    }

    const modelRe = /(?:const|let|var)\s+(\w+)\s*=\s*mongoose\s*\.\s*model\s*\(\s*['"](\w+)['"]\s*,\s*(\w+)/g;
    while ((match = modelRe.exec(content)) !== null) {
      const modelVar = match[1];
      const collectionName = match[2];
      const schemaVar = match[3];

      const related = models.find((m) => m.schemaName === schemaVar);
      if (related) {
        related.modelVar = modelVar;
        related.collection = collectionName;
      }
    }
  }

  const relationships = [];
  for (const model of models) {
    for (const field of model.fields) {
      if (field.ref) {
        const target = models.find((m) => m.name.toLowerCase() === field.ref.toLowerCase());
        if (target) {
          relationships.push({
            from: model.name,
            to: target.name,
            type: field.type.startsWith('Array') || field.name.endsWith('s') ? 'one-to-many' : 'one-to-one',
            throughField: field.name,
          });
        }
      }
    }
  }

  return { models, relationships, totalModels: models.length };
};

const splitTopLevelFields = (block) => {
  const entries = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];

    if (inString) {
      current += ch;
      if (ch === '\\') { current += block[++i] || ''; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; current += ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed && !/^(timestamps|toJSON|toObject|virtuals|methods|statics|query|indexes?)$/.test(trimmed.split(':')[0]?.trim())) {
        entries.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed && !/^(timestamps|toJSON|toObject|virtuals|methods|statics|query|indexes?)$/.test(trimmed.split(':')[0]?.trim())) {
    entries.push(trimmed);
  }

  return entries;
};

module.exports = {
  generateExecutionFlow,
  generateAnimationJSON,
  buildRequestFlow,
  buildFunctionCallChain,
  buildControllerFlow,
  buildDatabaseFlow,
  extractMongooseModels,
  extractAllRoutes,
  detectEntryPoint,
  PHASE_COLORS,
  detectPhase,
};
