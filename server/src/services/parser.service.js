const path = require('path');

const EXT_TO_LANG = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.jsx': 'JavaScript (React)', '.ts': 'TypeScript', '.tsx': 'TypeScript (React)',
  '.py': 'Python', '.java': 'Java', '.go': 'Go', '.rs': 'Rust',
  '.rb': 'Ruby', '.php': 'PHP', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
  '.h': 'C/C++ Header', '.swift': 'Swift', '.kt': 'Kotlin', '.scala': 'Scala',
  '.r': 'R', '.sql': 'SQL', '.sh': 'Shell', '.bash': 'Shell',
  '.yaml': 'YAML', '.yml': 'YAML', '.json': 'JSON', '.xml': 'XML',
  '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.less': 'Less',
  '.md': 'Markdown', '.graphql': 'GraphQL', '.proto': 'Protobuf',
  '.toml': 'TOML', '.env': 'Environment', '.prisma': 'Prisma',
  '.dart': 'Dart', '.ex': 'Elixir', '.exs': 'Elixir', '.erl': 'Erlang',
  '.lua': 'Lua', '.nim': 'Nim', '.zig': 'Zig',
};

const NODE_BUILTINS = new Set([
  'fs', 'path', 'os', 'http', 'https', 'net', 'dns', 'crypto',
  'stream', 'buffer', 'events', 'util', 'url', 'querystring',
  'assert', 'child_process', 'cluster', 'readline', 'tls', 'zlib',
  'process', 'console', 'timers', 'string_decoder', 'tty', 'dgram',
]);

const PYTHON_STDLIB = new Set([
  'os', 'sys', 'json', 're', 'math', 'datetime', 'collections',
  'itertools', 'functools', 'pathlib', 'tempfile', 'shutil', 'glob',
  'logging', 'unittest', 'argparse', 'csv', 'io', 'hashlib', 'random',
  'subprocess', 'threading', 'asyncio', 'typing', 'dataclasses', 'enum',
]);

const BINARY_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.bmp', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.webm', '.ogg', '.avi', '.mov',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.o', '.obj',
  '.class', '.pyc', '.pyo', '.wasm', '.db', '.sqlite',
]);

const detectLanguage = (filePath) => {
  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'dockerfile') return 'Dockerfile';
  if (basename === 'makefile') return 'Makefile';
  if (basename === '.gitignore') return 'Git Config';
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] || 'Unknown';
};

const getConfigType = (filePath) => {
  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'package.json') return 'package.json';
  if (basename === 'tsconfig.json') return 'tsconfig.json';
  if (basename === 'requirements.txt') return 'requirements.txt';
  if (basename === 'pom.xml') return 'pom.xml';
  if (basename === 'build.gradle' || basename === 'build.gradle.kts') return 'build.gradle';
  if (basename === 'cargo.toml') return 'Cargo.toml';
  if (basename === 'go.mod') return 'go.mod';
  if (basename === 'gemfile') return 'Gemfile';
  if (basename === 'composer.json') return 'composer.json';
  if (basename === 'dockerfile') return 'Dockerfile';
  if (basename === 'docker-compose.yml' || basename === 'docker-compose.yaml') return 'docker-compose.yml';
  if (basename === 'pyproject.toml') return 'pyproject.toml';
  if (basename.startsWith('.env')) return '.env';
  if (basename === 'makefile') return 'Makefile';
  if (basename === '.eslintrc.js' || basename === '.eslintrc.json' || basename === '.eslintrc.yml') return 'eslint';
  if (basename === '.prettierrc' || basename === '.prettierrc.json' || basename === 'prettier.config.js') return 'prettier';
  return null;
};

const countLOC = (content) => {
  const lines = content.split('\n');
  let loc = 0;
  let inBlockComment = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    if (inBlockComment) {
      if (trimmed.includes('*/') || trimmed.includes('"""') || trimmed.includes("'''")) {
        inBlockComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith(';')) continue;
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      if (!trimmed.endsWith('*/') && !trimmed.endsWith('"""') && !trimmed.endsWith("'''")) {
        inBlockComment = true;
      }
      continue;
    }
    loc++;
  }
  return loc;
};

const parseConfigFile = (filePath, content) => {
  const configType = getConfigType(filePath);
  if (!configType) return null;

  const config = { fileType: configType, metadata: {} };

  try {
    switch (configType) {
      case 'package.json': {
        const data = JSON.parse(content);
        config.metadata = {
          name: data.name,
          version: data.version,
          dependencies: data.dependencies || {},
          devDependencies: data.devDependencies || {},
          scripts: data.scripts || {},
          main: data.main,
          type: data.type,
        };
        break;
      }
      case 'tsconfig.json': {
        const data = JSON.parse(content);
        config.metadata = {
          compilerOptions: data.compilerOptions || {},
          include: data.include,
          exclude: data.exclude,
        };
        break;
      }
      case 'composer.json': {
        const data = JSON.parse(content);
        config.metadata = {
          name: data.name,
          require: data.require || {},
          requireDev: data['require-dev'] || {},
        };
        break;
      }
      case 'requirements.txt': {
        const deps = [];
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
          const parts = trimmed.split(/[=<>~!]/);
          deps.push(parts[0].trim().toLowerCase());
        }
        config.metadata = { dependencies: deps };
        break;
      }
      case 'go.mod': {
        const moduleMatch = content.match(/^module\s+(.+)$/m);
        const requires = [];
        const re = /^require\s+(.+)$/gm;
        let match;
        while ((match = re.exec(content)) !== null) {
          requires.push(match[1].trim());
        }
        config.metadata = {
          module: moduleMatch ? moduleMatch[1] : null,
          requires,
        };
        break;
      }
      case 'Gemfile': {
        const gems = [];
        const re = /^\s*gem\s+['"](\S+?)['"]/gm;
        let match;
        while ((match = re.exec(content)) !== null) {
          gems.push(match[1]);
        }
        config.metadata = { gems };
        break;
      }
      case 'Dockerfile': {
        const fromMatch = content.match(/^FROM\s+(.+)$/m);
        const exposeMatch = content.match(/^EXPOSE\s+(.+)$/m);
        config.metadata = {
          baseImage: fromMatch ? fromMatch[1].trim() : null,
          exposedPorts: exposeMatch ? exposeMatch[1].trim().split(/\s+/) : [],
        };
        break;
      }
      case '.env': {
        const vars = {};
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            vars[trimmed.slice(0, eqIdx).trim()] = '***masked***';
          }
        }
        config.metadata = { variables: vars };
        break;
      }
      case 'Makefile': {
        const targets = [];
        const re = /^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*:/gm;
        let match;
        while ((match = re.exec(content)) !== null) {
          if (!match[1]?.startsWith('.')) targets.push(match[1]);
        }
        config.metadata = { targets };
        break;
      }
      default: {
        config.metadata = { raw: content.substring(0, 500) };
      }
    }
  } catch {
    config.metadata = { parseError: 'Could not parse configuration file' };
  }

  return config;
};

const parseWithRegex = (filePath, content, language) => {
  const symbols = [];
  const imports = [];
  const exports = [];
  const errors = [];
  let react = null;

  const lang = language.toLowerCase();

  if (lang.includes('javascript') || lang.includes('typescript')) {
    const jsxExtensions = lang.includes('react') || /filePath/i.test(path.extname(filePath));

    const funcRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'function',
        line: content.substring(0, match.index).split('\n').length,
        column: match.index - content.lastIndexOf('\n', match.index) - 1,
        async: content.substring(match.index, match.index + 30).includes('async'),
        exported: content.substring(match.index - 10, match.index).includes('export'),
        params: parseParams(match[2]),
      });
    }

    const arrowRe = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'arrow_function',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        async: content.substring(match.index, match.index + 40).includes('async'),
        params: parseParams(match[2]),
      });
    }

    const classRe = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
    while ((match = classRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'class',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        exported: content.substring(match.index - 10, match.index).includes('export'),
        extends: match[2] || undefined,
        implements: match[3] ? match[3].split(',').map((s) => s.trim()) : undefined,
      });
    }

    const importRe = /import\s+(?:type\s+)?(?:(?:\{([^}]+)\})|(\w+)|(?:\*\s+as\s+(\w+)))?\s*(?:,\s*(?:\{([^}]+)\})|(\w+))?\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = importRe.exec(content)) !== null) {
      const source = match[7];
      const specifiers = [];
      if (match[1]) specifiers.push(...match[1].split(',').map((s) => s.trim()).filter(Boolean));
      if (match[2]) specifiers.push(match[2]);
      if (match[3]) specifiers.push(match[3]);
      if (match[4]) specifiers.push(...match[4].split(',').map((s) => s.trim()).filter(Boolean));
      if (match[5]) specifiers.push(match[5]);
      imports.push({
        source,
        kind: 'import',
        specifiers,
        isDefault: !!match[2] || !!match[5],
        isTypeOnly: content.substring(match.index, match.index + 20).includes('import type'),
        isDynamic: false,
        line: content.substring(0, match.index).split('\n').length,
      });
    }

    const requireRe = /(?:const|let|var)\s+(?:\{([^}]+)\})?\s*(\w+)?\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRe.exec(content)) !== null) {
      const specifiers = [];
      if (match[1]) specifiers.push(...match[1].split(',').map((s) => s.trim()).filter(Boolean));
      if (match[2]) specifiers.push(match[2]);
      imports.push({
        source: match[3],
        kind: 'require',
        specifiers,
        isDefault: false,
        isTypeOnly: false,
        isDynamic: false,
        line: content.substring(0, match.index).split('\n').length,
      });
    }

    const exportRe = /export\s+(?:default\s+(?:function|class|const|let|var)?\s*)?(\w+)/g;
    while ((match = exportRe.exec(content)) !== null) {
      exports.push({
        kind: content.substring(match.index).includes('export default') ? 'default' : 'named',
        names: [match[1]],
        line: content.substring(0, match.index).split('\n').length,
      });
    }

    if (jsxExtensions) {
      const hasReactImport = imports.some((i) => i.source === 'react');
      if (hasReactImport) {
        const componentRe = /(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w*)/g;
        const componentNames = [];
        const componentLines = [];
        while ((match = componentRe.exec(content)) !== null) {
          componentNames.push(match[1]);
          componentLines.push(content.substring(0, match.index).split('\n').length);
        }
        const hooksRe = /\b(use[A-Z]\w+)\s*\(/g;
        const hooksUsed = [];
        while ((match = hooksRe.exec(content)) !== null) {
          hooksUsed.push(match[1]);
        }
        if (componentNames.length > 0) {
          react = {
            componentName: componentNames[0],
            isDefaultExport: content.includes('export default'),
            isFunctionalComponent: true,
            hooksUsed: [...new Set(hooksUsed)],
          };
          for (let ci = 0; ci < componentNames.length; ci++) {
            symbols.push({
              name: componentNames[ci],
              kind: 'component',
              line: componentLines[ci],
              column: 0,
              exported: /export/.test(content.substring(Math.max(0, content.indexOf(componentNames[ci]) - 10), content.indexOf(componentNames[ci]) + componentNames[ci].length)),
            });
          }
        }
      }
    }
  }

  if (lang === 'python') {
    const funcRe = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?/g;
    while ((match = funcRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'function',
        line: content.substring(0, match.index).split('\n').length,
        column: content.lastIndexOf('\n', match.index),
        async: content.substring(match.index, match.index + 20).includes('async'),
        params: parseParams(match[2]),
        returnType: match[3],
      });
    }

    const classRe = /class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/g;
    while ((match = classRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'class',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        extends: match[2] ? match[2].trim() : undefined,
      });
    }

    const importRe = /(?:from\s+(\S+)\s+)?import\s+(.+)/g;
    while ((match = importRe.exec(content)) !== null) {
      const specifiers = match[2].split(',').map((s) => s.trim());
      imports.push({
        source: match[1] || specifiers[0],
        kind: match[1] ? 'from_import' : 'import',
        specifiers: match[1] ? specifiers : [specifiers[0]],
        isDefault: false,
        isTypeOnly: false,
        isDynamic: false,
        line: content.substring(0, match.index).split('\n').length,
      });
    }
  }

  if (lang === 'java') {
    const classRe = /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
    while ((match = classRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'class',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        extends: match[2] || undefined,
        implements: match[3] ? match[3].split(',').map((s) => s.trim()) : undefined,
      });
    }

    const methodRe = /(?:public|private|protected)\s+(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(?:synchronized\s+)?(?:<\w+>\s+)?(\w+(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = methodRe.exec(content)) !== null) {
      symbols.push({
        name: match[2],
        kind: 'method',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        returnType: match[1],
        params: parseParams(match[3]),
      });
    }

    const importRe = /import\s+(static\s+)?([^;]+);/g;
    while ((match = importRe.exec(content)) !== null) {
      imports.push({
        source: match[2].trim(),
        kind: 'import',
        specifiers: [],
        isDefault: false,
        isTypeOnly: false,
        isDynamic: false,
        line: content.substring(0, match.index).split('\n').length,
      });
    }
  }

  if (lang === 'c++' || lang.includes('c++')) {
    const classRe = /class\s+(\w+)(?:\s*:\s*(?:public|protected|private)\s+(\w+))?\s*\{/g;
    while ((match = classRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'class',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        extends: match[2] || undefined,
      });
    }

    const funcRe = /(?:virtual\s+|static\s+|inline\s+|const\s+)*(?:[\w:]+\s+)?(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*(?:override)?\s*\{/g;
    while ((match = funcRe.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'function',
        line: content.substring(0, match.index).split('\n').length,
        column: 0,
        params: parseParams(match[2]),
      });
    }

    const includeRe = /#include\s+[<"]([^>"]+)[>"]/g;
    while ((match = includeRe.exec(content)) !== null) {
      imports.push({
        source: match[1],
        kind: 'include',
        specifiers: [],
        isDefault: false,
        isTypeOnly: false,
        isDynamic: false,
        line: content.substring(0, match.index).split('\n').length,
      });
    }
  }

  if (symbols.length === 0 && imports.length === 0) {
    errors.push({
      message: `Regex fallback found no symbols or imports in ${language} file`,
      severity: 'warning',
      recoverable: true,
    });
  }

  return { symbols, imports, exports, errors, react };
};

const parseParams = (paramStr) => {
  if (!paramStr || paramStr.trim() === '') return [];
  const params = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < paramStr.length; i++) {
    const ch = paramStr[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) {
        const parts = trimmed.split(':').map((s) => s.trim());
        params.push({ name: parts[0], type: parts[1] || undefined });
      }
      current = '';
      continue;
    }
    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) {
    const parts = trimmed.split(':').map((s) => s.trim());
    params.push({ name: parts[0], type: parts[1] || undefined });
  }
  return params;
};

const classifyDependency = (source, language) => {
  if (!source || typeof source !== 'string') return 'external';
  if (source.startsWith('.') || source.startsWith('/')) return 'local';

  if (language.includes('JavaScript') || language.includes('TypeScript')) {
    if (NODE_BUILTINS.has(source)) return 'builtin';
    if (source.startsWith('@')) return 'external';
    return /^[a-z]/.test(source) ? 'external' : 'local';
  }

  if (language === 'Python') {
    if (PYTHON_STDLIB.has(source.split('.')[0])) return 'builtin';
    return source.startsWith('.') ? 'local' : 'external';
  }

  if (language === 'Java') {
    return source.startsWith('java.') || source.startsWith('javax.') ? 'builtin' : 'external';
  }

  if (language.includes('C++')) {
    return source.includes('.') ? 'external' : 'builtin';
  }

  return 'external';
};

const detectTechStack = (configFiles) => {
  const stack = [];
  const seen = new Set();

  const add = (tech) => {
    if (tech && !seen.has(tech)) {
      seen.add(tech);
      stack.push(tech);
    }
  };

  for (const file of configFiles) {
    if (!file.config) continue;

    const md = file.config.metadata;

    if (file.config.fileType === 'package.json') {
      const deps = { ...(md.dependencies || {}), ...(md.devDependencies || {}) };
      const depNames = Object.keys(deps);

      if (depNames.includes('react')) add('React');
      if (depNames.includes('next')) add('Next.js');
      if (depNames.includes('vue')) add('Vue.js');
      if (depNames.includes('@angular/core')) add('Angular');
      if (depNames.includes('express')) add('Express.js');
      if (depNames.includes('fastify')) add('Fastify');
      if (depNames.includes('typescript')) add('TypeScript');
      if (depNames.includes('tailwindcss')) add('Tailwind CSS');
      if (depNames.includes('d3')) add('D3.js');
      if (depNames.includes('mermaid')) add('Mermaid');
      if (depNames.includes('mongoose')) add('Mongoose');
      if (depNames.includes('prisma')) add('Prisma');
      if (depNames.includes('jest')) add('Jest');
      if (depNames.includes('vitest')) add('Vitest');
      if (depNames.includes('webpack')) add('Webpack');

      if (md.scripts) {
        const scriptStr = JSON.stringify(md.scripts);
        if (scriptStr.includes('vite')) add('Vite');
        if (scriptStr.includes('next')) add('Next.js');
      }
    }

    if (file.config.fileType === 'requirements.txt') {
      const deps = md.dependencies || [];
      if (deps.includes('django')) add('Django');
      if (deps.includes('flask')) add('Flask');
      if (deps.includes('fastapi')) add('FastAPI');
      if (deps.includes('tensorflow')) add('TensorFlow');
      if (deps.includes('pytorch')) add('PyTorch');
      if (deps.includes('pandas')) add('Pandas');
      if (deps.includes('numpy')) add('NumPy');
    }

    if (file.config.fileType === 'Dockerfile' && md.baseImage) {
      if (md.baseImage.includes('node')) add('Node.js');
      if (md.baseImage.includes('python')) add('Python');
      if (md.baseImage.includes('openjdk')) add('Java');
      if (md.baseImage.includes('nginx')) add('Nginx');
    }

    if (file.config.fileType === 'go.mod') {
      add('Go');
    }

    if (file.config.fileType === 'Cargo.toml') {
      add('Rust');
    }
  }

  return stack;
};

let babelParser = null;
let treeSitterParser = null;

const loadBabelParser = () => {
  if (babelParser) return babelParser;
  try {
    babelParser = require('../parsers/babel.parser');
  } catch {
    babelParser = null;
  }
  return babelParser;
};

/**
 * Load the Tree-sitter parser engine.
 * Returns null if not installed or initialize fails.
 * The parser handles JS, TS, React, Python, Java, C++, C#, Go, PHP, HTML, CSS.
 */
const loadTreeSitterParser = () => {
  if (treeSitterParser) return treeSitterParser;
  try {
    const ts = require('../parsers/treesitter.parser');
    // Init is async — will be called on first parse
    treeSitterParser = ts;
  } catch (err) {
    console.warn('[parser] Tree-sitter not available, falling back to regex:', err.message);
    treeSitterParser = null;
  }
  return treeSitterParser;
};

/**
 * Parse a single file — Tree-sitter primary, regex fallback.
 * Tree-sitter handles JS, TS, React/JSX, Python, Java, C++, C#, Go, PHP, HTML, CSS.
 * All other languages fall back to regex.
 */
const parseFile = async (filePath, content, language) => {
  const lang = language || detectLanguage(filePath);
  const lines = content.split('\n').length;
  const loc = countLOC(content);
  const errors = [];

  let result = {
    symbols: [],
    imports: [],
    exports: [],
    errors: [],
  };

  // Try Tree-sitter first for supported languages
  const tsLang = lang.toLowerCase();
  const tsSupported = ['javascript', 'javascript (react)', 'typescript', 'typescript (react)',
    'python', 'java', 'c++', 'c#', 'go', 'php', 'html', 'css'];

  const tsParser = loadTreeSitterParser();
  if (tsParser && tsSupported.includes(tsLang)) {
    try {
      const tsResult = await tsParser.parseFile(filePath, content, lang);
      if (tsResult && tsResult.symbols) {
        result = {
          symbols: tsResult.symbols,
          imports: tsResult.imports,
          exports: tsResult.exports,
          errors: tsResult.errors || [],
          hooks: tsResult.hooks || [],
          routes: tsResult.routes || [],
          databaseModels: tsResult.databaseModels || [],
          reactComponents: tsResult.reactComponents || [],
          htmlTags: tsResult.htmlTags || [],
          cssSelectors: tsResult.cssSelectors || [],
          cssDeclarations: tsResult.cssDeclarations || [],
          cssAtRules: tsResult.cssAtRules || [],
          dependencies: tsResult.dependencies || { components: [], external: [], frameworks: [] },
          namespace: tsResult.namespace || null,
        };

        // Merge react components into symbols
        for (const comp of (result.reactComponents || [])) {
          if (!result.symbols.some(s => s.name === comp.name && s.kind === 'component')) {
            result.symbols.push({
              name: comp.name,
              kind: 'component',
              line: comp.line,
              column: 0,
              exported: comp.isDefaultExport,
            });
          }
        }

        return { ...result, filePath, language: lang, lines, loc, config: parseConfigFile(filePath, content), errors };
      }
    } catch (err) {
      errors.push({
        message: `Tree-sitter parse failed: ${err.message}`,
        severity: 'error',
        recoverable: true,
      });
      // Fall through to regex
    }
  }

  // Regex fallback
  const useBabel = lang.includes('JavaScript') || lang.includes('TypeScript');

  if (useBabel && loadBabelParser()) {
    try {
      result = babelParser.parse(filePath, content, lang);
    } catch (err) {
      errors.push({
        message: `Babel parse failed: ${err.message}`,
        severity: 'error',
        recoverable: true,
      });
      result = parseWithRegex(filePath, content, lang);
    }
  } else {
    result = parseWithRegex(filePath, content, lang);
  }

  const config = parseConfigFile(filePath, content);

  const parsed = {
    filePath,
    language: lang,
    lines,
    loc,
    symbols: result.symbols || [],
    imports: result.imports || [],
    exports: result.exports || [],
    dependencies: [],
    react: result.react || null,
    config: config || undefined,
    errors: [...errors, ...(result.errors || [])],
  };

  return parsed;
};

const parseAllFiles = async (files, concurrency = 10) => {
  const results = [];
  const queue = [...files];

  const worker = async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const parsed = await parseFile(file.filePath, file.content, file.language);
      results.push(parsed);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);

  return results;
};

const resolveDependencies = (parsedFiles) => {
  const fileIndex = new Map();
  for (const file of parsedFiles) {
    fileIndex.set(file.filePath, file);
  }

  const allDeps = [];
  const unresolvedImports = [];
  const circularDependencies = [];

  for (const file of parsedFiles) {
    if (!file.imports) continue;
    for (const imp of file.imports) {
      if (!imp.source || typeof imp.source !== 'string') continue;
      const depKind = classifyDependency(imp.source, file.language);

      let toFile = null;
      let toPackage = null;

      if (depKind === 'local') {
        const resolved = resolveLocalPath(file.filePath, imp.source, fileIndex);
        if (resolved) {
          toFile = resolved;
        } else {
          unresolvedImports.push({
            fromFile: file.filePath,
            source: imp.source,
            line: imp.line,
          });
          continue;
        }
      } else {
        toPackage = imp.source;
      }

      const dep = {
        fromFile: file.filePath,
        toFile,
        toPackage: toFile ? undefined : toPackage,
        kind: depKind,
        specifiers: imp.specifiers,
        line: imp.line,
      };

      allDeps.push(dep);
    }
  }

  for (const file of parsedFiles) {
    file.dependencies = allDeps.filter((d) => d.fromFile === file.filePath);
  }

  const adjacency = new Map();
  for (const dep of allDeps) {
    if (!dep.toFile) continue;
    if (!adjacency.has(dep.fromFile)) adjacency.set(dep.fromFile, []);
    adjacency.get(dep.fromFile).push(dep.toFile);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const file of parsedFiles) {
    color.set(file.filePath, WHITE);
  }

  const dfs = (node, path) => {
    color.set(node, GRAY);
    for (const neighbor of adjacency.get(node) || []) {
      const neighborColor = color.get(neighbor);
      if (neighborColor === GRAY) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          circularDependencies.push([...path.slice(cycleStart), neighbor]);
        }
      } else if (neighborColor === WHITE) {
        dfs(neighbor, [...path, neighbor]);
      }
    }
    color.set(node, BLACK);
  };

  for (const file of parsedFiles) {
    if (color.get(file.filePath) === WHITE) {
      dfs(file.filePath, [file.filePath]);
    }
  }

  return {
    allDependencies: allDeps,
    unresolvedImports,
    circularDependencies,
  };
};

const resolveLocalPath = (fromPath, importSource, fileIndex) => {
  if (!importSource || typeof importSource !== 'string') return null;
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) return null;

  const fromDir = path.dirname(fromPath);
  let resolved = path.join(fromDir, importSource).replace(/\\/g, '/');

  if (fileIndex.has(resolved)) return resolved;

  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.java', '.cpp', '.c', '.h'];
  for (const ext of extensions) {
    if (fileIndex.has(resolved + ext)) return resolved + ext;
  }

  for (const ext of extensions) {
    if (fileIndex.has(resolved + '/index' + ext)) return resolved + '/index' + ext;
  }

  return null;
};

const extractArchitectureSummary = (parsedFiles) => {
  const layerMap = {
    component: /\.(jsx|tsx)$/i,
    hook: /use[A-Z]|hooks/i,
    page: /pages?|views?|routes?|screens?/i,
    service: /services?|api/i,
    util: /utils?|helpers?|lib/i,
    config: /config/i,
    model: /models?|schemas?|entities?|types?/i,
    middleware: /middleware/i,
    controller: /controllers?/i,
    test: /\.(test|spec)\.|__tests__|tests?/i,
  };

  const layers = {};
  for (const file of parsedFiles) {
    for (const [layer, pattern] of Object.entries(layerMap)) {
      if (pattern.test(file.filePath)) {
        if (!layers[layer]) layers[layer] = [];
        layers[layer].push(file.filePath);
        break;
      }
    }
  }

  let entryPoint = null;
  for (const file of parsedFiles) {
    const lower = path.basename(file.filePath).toLowerCase();
    if (
      lower === 'index.js' || lower === 'index.ts' || lower === 'index.jsx' ||
      lower === 'app.js' || lower === 'app.ts' || lower === 'app.jsx' ||
      lower === 'main.js' || lower === 'main.ts' || lower === 'main.py' ||
      lower === 'app.py' || lower === 'main.java' || lower === 'main.cpp'
    ) {
      if (!entryPoint || file.filePath.split('/').length < entryPoint.split('/').length) {
        entryPoint = file.filePath;
      }
    }
  }

  const totalSymbols = parsedFiles.reduce((s, f) => s + (f.symbols || []).length, 0);
  const totalImports = parsedFiles.reduce((s, f) => s + (f.imports || []).length, 0);
  const totalExports = parsedFiles.reduce((s, f) => s + (f.exports || []).length, 0);

  return {
    entryPoint,
    layers,
    totalFiles: parsedFiles.length,
    totalLOC: parsedFiles.reduce((s, f) => s + f.loc, 0),
    totalSymbols,
    totalImports,
    totalExports,
    languages: [...new Set(parsedFiles.map((f) => f.language))],
  };
};

const generateStructureForAI = (parsedFiles, techStack) => {
  const arch = extractArchitectureSummary(parsedFiles);

  const lines = [];
  lines.push('=== STRUCTURED CODE ANALYSIS (pre-parsed) ===');
  lines.push('');
  lines.push(`Total Files: ${arch.totalFiles}    Total LOC: ${arch.totalLOC}`);
  lines.push(`Languages: ${arch.languages.join(', ')}`);
  if (techStack && techStack.length > 0) {
    lines.push(`Detected Tech Stack: ${techStack.join(', ')}`);
  }
  lines.push('');

  if (arch.entryPoint) {
    lines.push(`Entry point: ${arch.entryPoint}`);
    lines.push('');
  }

  lines.push('ARCHITECTURE:');
  for (const [layer, fileList] of Object.entries(arch.layers)) {
    lines.push(`  ${layer} (${fileList.length} files): ${fileList.slice(0, 5).join(', ')}${fileList.length > 5 ? ` +${fileList.length - 5} more` : ''}`);
  }
  lines.push('');

  lines.push(`SYMBOLS (${arch.totalSymbols} total):`);
  const allSymbols = [];
  for (const file of parsedFiles) {
    if (!file.symbols) continue;
    for (const symbol of file.symbols) {
      allSymbols.push({ ...symbol, file: file.filePath });
    }
  }

  const byKind = {};
  for (const sym of allSymbols) {
    if (!byKind[sym.kind]) byKind[sym.kind] = [];
    byKind[sym.kind].push(sym);
  }

  for (const [kind, syms] of Object.entries(byKind)) {
    const displayNames = syms.slice(0, 20).map((s) => s.name);
    lines.push(`  ${kind} (${syms.length}): ${displayNames.join(', ')}${syms.length > 20 ? ` +${syms.length - 20} more` : ''}`);
  }
  lines.push('');

  lines.push(`IMPORTS/EXPORTS: ${arch.totalImports} imports, ${arch.totalExports} exports`);
  lines.push('');

  const configFiles = parsedFiles.filter((f) => f.config);
  if (configFiles.length > 0) {
    lines.push('CONFIG FILES:');
    for (const file of configFiles) {
      const md = file.config.metadata;
      let summary = '';
      if (file.config.fileType === 'package.json') {
        const deps = { ...(md.dependencies || {}), ...(md.devDependencies || {}) };
        summary = `deps: ${Object.keys(deps).slice(0, 10).join(', ')}${Object.keys(deps).length > 10 ? ` +${Object.keys(deps).length - 10} more` : ''}`;
      } else if (file.config.fileType === 'requirements.txt') {
        summary = `deps: ${(md.dependencies || []).slice(0, 10).join(', ')}`;
      } else if (file.config.fileType === 'Dockerfile') {
        summary = `base: ${md.baseImage || 'unknown'}`;
      }
      lines.push(`  ${file.filePath}: ${summary}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};

module.exports = {
  parseFile,
  parseAllFiles,
  parseConfigFile,
  resolveDependencies,
  detectTechStack,
  extractArchitectureSummary,
  generateStructureForAI,
};
