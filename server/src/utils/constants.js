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

const detectLanguage = (filePath) => {
  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'dockerfile') return 'Dockerfile';
  if (basename === 'makefile') return 'Makefile';
  if (basename === '.gitignore') return 'Git Config';
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] || 'Unknown';
};

const path = require('path');

module.exports = { IGNORED_DIRS, IGNORED_FILE_PATTERNS, BINARY_EXTENSIONS, EXT_TO_LANG, detectLanguage };
