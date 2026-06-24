const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'target',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
  'vendor',
  'bower_components',
  '.idea',
  '.vscode',
  '.vs',
]);

const IGNORED_FILE_PATTERNS = [
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
  /\.min\.js$/,
  /\.bundle\.js$/,
  /\.chunk\.js$/,
  /-lock\.json$/,
  /\.lock$/,
];

const BINARY_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.bmp', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.webm', '.ogg', '.avi', '.mov',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.o', '.obj',
  '.class', '.pyc', '.pyo', '.wasm',
  '.db', '.sqlite', '.sqlite3',
  '.map',
]);

const EXT_TO_LANG = {
  '.js': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.r': 'R',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.json': 'JSON',
  '.xml': 'XML',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.less': 'Less',
  '.md': 'Markdown',
  '.graphql': 'GraphQL',
  '.proto': 'Protobuf',
  '.toml': 'TOML',
  '.env': 'Environment',
  '.dockerfile': 'Dockerfile',
  '.prisma': 'Prisma',
};

const isBinaryByContent = (buffer) => {
  const sample = buffer.subarray(0, Math.min(8192, buffer.length));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
};

const shouldIgnoreFile = (name) => {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(name));
};

const detectLanguage = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];

  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'dockerfile') return 'Dockerfile';
  if (basename === 'makefile') return 'Makefile';
  if (basename === '.gitignore') return 'Git Config';
  if (basename.startsWith('.env')) return 'Environment';

  return 'Unknown';
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

    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('--') ||
      trimmed.startsWith(';') ||
      trimmed.startsWith('%') ||
      trimmed.startsWith('<!--')
    ) {
      continue;
    }

    if (
      trimmed.startsWith('/*') ||
      trimmed.startsWith('/**') ||
      trimmed.startsWith('"""') ||
      trimmed.startsWith("'''")
    ) {
      if (
        !trimmed.endsWith('*/') &&
        !trimmed.endsWith('"""') &&
        !trimmed.endsWith("'''")
      ) {
        inBlockComment = true;
      }
      continue;
    }

    loc++;
  }

  return loc;
};

const buildTree = async (dirPath, relativeTo) => {
  const name = path.basename(dirPath);
  const relativePath = path.relative(relativeTo, dirPath) || '.';
  const node = {
    name,
    type: 'directory',
    path: relativePath,
    children: [],
  };

  let entries;
  try {
    entries = await fsp.readdir(dirPath, { withFileTypes: true });
  } catch {
    return node;
  }

  const dirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((e) => e.isFile()).sort((a, b) => a.name.localeCompare(b.name));

  for (const dirent of files) {
    if (shouldIgnoreFile(dirent.name)) continue;

    const fullPath = path.join(dirPath, dirent.name);
    const relPath = path.relative(relativeTo, fullPath);
    const ext = path.extname(dirent.name).toLowerCase();

    let stat;
    try {
      stat = await fsp.stat(fullPath);
    } catch {
      continue;
    }

    const fileNode = {
      name: dirent.name,
      type: 'file',
      path: relPath,
      sizeKB: Math.round((stat.size / 1024) * 100) / 100,
      language: detectLanguage(dirent.name),
      isBinary: BINARY_EXTENSIONS.has(ext),
    };

    node.children.push(fileNode);
  }

  for (const dirent of dirs) {
    if (IGNORED_DIRS.has(dirent.name)) continue;
    const child = await buildTree(path.join(dirPath, dirent.name), relativeTo);
    node.children.push(child);
  }

  return node;
};

const readAllTextFiles = async (rootPath) => {
  const results = [];

  const walk = async (dirPath) => {
    let entries;
    try {
      entries = await fsp.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (shouldIgnoreFile(entry.name)) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      let content;
      try {
        content = await fsp.readFile(fullPath, 'utf-8');
      } catch {
        continue;
      }

      if (isBinaryByContent(Buffer.from(content, 'utf-8'))) continue;

      const relPath = path.relative(rootPath, fullPath);
      let stat;
      try {
        stat = await fsp.stat(fullPath);
      } catch {
        stat = { size: Buffer.byteLength(content, 'utf-8') };
      }

      results.push({
        filePath: relPath,
        language: detectLanguage(entry.name),
        content,
        sizeKB: Math.round((stat.size / 1024) * 100) / 100,
        loc: countLOC(content),
      });
    }
  };

  await walk(rootPath);
  return results;
};

const extractZip = async (zipBuffer, outputDir) => {
  await fsp.mkdir(outputDir, { recursive: true });

  const zip = new AdmZip(zipBuffer);

  try {
    zip.extractAllTo(outputDir, true);
  } catch (err) {
    throw err;
  }

  const entries = zip.getEntries();
  const extractedFileCount = entries.filter((e) => !e.isDirectory).length;

  const tree = await buildTree(outputDir, outputDir);

  const textFiles = await readAllTextFiles(outputDir);

  const totalSizeKB = textFiles.reduce((sum, f) => sum + f.sizeKB, 0);
  const totalLOC = textFiles.reduce((sum, f) => sum + f.loc, 0);

  return {
    fileCount: extractedFileCount,
    textFileCount: textFiles.length,
    totalSizeKB: Math.round(totalSizeKB * 100) / 100,
    totalLOC,
    tree,
    files: textFiles,
  };
};

const removeDir = async (dirPath) => {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Directory may already be gone — that's fine
  }
};

module.exports = {
  extractZip,
  buildTree,
  readAllTextFiles,
  removeDir,
};
