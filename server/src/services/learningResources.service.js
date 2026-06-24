/**
 * Learning Resources Service
 *
 * Curated map of technology names → learning resources (docs, GitHub, tutorials).
 * Uses a static lookup table and enriches results via parallel Playwright scraping.
 *
 * The client <LearningResources /> component expects:
 *   { resources: [...], concepts: {...}, totalResources, scrapedCount, scraperErrors }
 */

const { scrapeTechsInParallel } = require('./scraper.service');

const TECH_RESOURCES = {
  // ===== Languages =====
  JavaScript: {
    category: 'language',
    officialDocs: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    mdnDocs: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    githubRepo: 'https://github.com/tc39/proposals',
    youtubeTutorial: 'https://youtube.com/playlist?list=PLyuRouwmQCjmI9h3vB9Qkl5-KH7kmwqQ3',
    keyConcepts: ['closures', 'prototypes', 'async/await', 'promises', 'event loop', 'ES6+'],
  },
  TypeScript: {
    category: 'language',
    officialDocs: 'https://www.typescriptlang.org/docs/',
    githubRepo: 'https://github.com/microsoft/TypeScript',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9gUgr39QfD2qCjbHo6FUBvZ',
    keyConcepts: ['types', 'interfaces', 'generics', 'enums', 'type inference', 'decorators'],
  },
  Python: {
    category: 'language',
    officialDocs: 'https://docs.python.org/3/',
    githubRepo: 'https://github.com/python/cpython',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU',
    keyConcepts: ['list comprehensions', 'generators', 'decorators', 'context managers', 'type hints'],
  },
  Java: {
    category: 'language',
    officialDocs: 'https://docs.oracle.com/en/java/',
    githubRepo: 'https://github.com/openjdk/jdk',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL9ooVrP1hQOHb4Z5T7BivhPKA1CQ3eO2v',
    keyConcepts: ['OOP', 'streams', 'lambda', 'generics', 'collections', 'JVM'],
  },
  Go: {
    category: 'language',
    officialDocs: 'https://go.dev/doc/',
    githubRepo: 'https://github.com/golang/go',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9gC88BEo9czgyS9A3gH4Wcq',
    keyConcepts: ['goroutines', 'channels', 'interfaces', 'structs', 'defer', 'packages'],
  },
  Rust: {
    category: 'language',
    officialDocs: 'https://doc.rust-lang.org/book/',
    githubRepo: 'https://github.com/rust-lang/rust',
    youtubeTutorial: 'https://youtube.com/playlist?list=PLzIwronG4XJ-RhKx3QwqG5-hNYW0A0g9j',
    keyConcepts: ['ownership', 'borrowing', 'lifetimes', 'traits', 'enums', 'pattern matching'],
  },

  // ===== Frontend Frameworks =====
  React: {
    category: 'frontend',
    officialDocs: 'https://react.dev',
    githubRepo: 'https://github.com/facebook/react',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9gZD-TvwMg2cM2P1fZ1vW7y',
    keyConcepts: ['components', 'JSX', 'hooks', 'state management', 'props', 'virtual DOM'],
  },
  'Next.js': {
    category: 'frontend',
    officialDocs: 'https://nextjs.org/docs',
    githubRepo: 'https://github.com/vercel/next.js',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9g9gP2onazU5-2M-AzC4J5n',
    keyConcepts: ['SSR', 'SSG', 'ISR', 'file-based routing', 'API routes', 'middleware'],
  },
  'Vue.js': {
    category: 'frontend',
    officialDocs: 'https://vuejs.org/guide/',
    githubRepo: 'https://github.com/vuejs/core',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9hYYGbV60Vq3IXYNfDk8At1',
    keyConcepts: ['components', 'reactivity', 'composables', 'directives', 'vuex/pinia', 'SFC'],
  },
  Angular: {
    category: 'frontend',
    officialDocs: 'https://angular.dev',
    githubRepo: 'https://github.com/angular/angular',
    youtubeTutorial: 'https://youtube.com/playlist?list=PLIjdNHWULhPSZB7eLW5LJ6hnVqE98qYJj',
    keyConcepts: ['components', 'services', 'dependency injection', 'modules', 'RxJS', 'directives'],
  },
  Svelte: {
    category: 'frontend',
    officialDocs: 'https://svelte.dev/docs',
    githubRepo: 'https://github.com/sveltejs/svelte',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9hlbrVO_2QFVqjkPhmD1w7l',
    keyConcepts: ['reactive declarations', 'stores', 'slots', 'transitions', 'server components'],
  },
  'Tailwind CSS': {
    category: 'frontend',
    officialDocs: 'https://tailwindcss.com/docs',
    githubRepo: 'https://github.com/tailwindlabs/tailwindcss',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9gpXORlEHjc5bgnIi5HEGhw',
    keyConcepts: ['utility classes', 'responsive design', 'custom config', 'dark mode', 'plugins'],
  },
  Redux: {
    category: 'frontend',
    officialDocs: 'https://redux.js.org/',
    githubRepo: 'https://github.com/reduxjs/redux',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9iW4ALGkP4Oj3cMo9cE8nHh',
    keyConcepts: ['actions', 'reducers', 'store', 'middleware', 'selectors', 'RTK'],
  },
  'React Router': {
    category: 'frontend',
    officialDocs: 'https://reactrouter.com/en/main',
    githubRepo: 'https://github.com/remix-run/react-router',
    keyConcepts: ['routes', 'links', 'navigation', 'nested routes', 'route params'],
  },

  // ===== Backend Frameworks =====
  'Node.js': {
    category: 'backend',
    officialDocs: 'https://nodejs.org/en/docs/',
    githubRepo: 'https://github.com/nodejs/node',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9gcy9lrvMJ75z9maRw4byYp',
    keyConcepts: ['event loop', 'streams', 'buffers', 'file system', 'modules', 'npm'],
  },
  Express: {
    category: 'backend',
    officialDocs: 'https://expressjs.com/',
    githubRepo: 'https://github.com/expressjs/express',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9iM_EkCgpkmc_J4MRg3Bp8M',
    keyConcepts: ['middleware', 'routing', 'error handling', 'REST APIs', 'templates'],
  },
  Django: {
    category: 'backend',
    officialDocs: 'https://docs.djangoproject.com/',
    githubRepo: 'https://github.com/django/django',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL-osiE80TeTtoQCKZ03TU5fNfx2UY6U4p',
    keyConcepts: ['MTV pattern', 'ORM', 'admin panel', 'middleware', 'views', 'serializers'],
  },
  Flask: {
    category: 'backend',
    officialDocs: 'https://flask.palletsprojects.com/',
    githubRepo: 'https://github.com/pallets/flask',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL-osiE80TeTs4UjLw5MM6OjgkjFeUxCYH',
    keyConcepts: ['routes', 'blueprints', 'templates', 'request handling', 'extensions'],
  },
  'FastAPI': {
    category: 'backend',
    officialDocs: 'https://fastapi.tiangolo.com/',
    githubRepo: 'https://github.com/fastapi/fastapi',
    youtubeTutorial: 'https://youtube.com/playlist?list=PLqAmigZUYVWKOthsJd_CT9p4M3bI2dZqT',
    keyConcepts: ['path operations', 'dependency injection', 'Pydantic', 'async', 'OpenAPI'],
  },
  'Spring Boot': {
    category: 'backend',
    officialDocs: 'https://spring.io/projects/spring-boot',
    githubRepo: 'https://github.com/spring-projects/spring-boot',
    keyConcepts: ['auto-configuration', 'starter dependencies', 'actuator', 'DI', 'REST controllers'],
  },
  'NestJS': {
    category: 'backend',
    officialDocs: 'https://docs.nestjs.com/',
    githubRepo: 'https://github.com/nestjs/nest',
    keyConcepts: ['modules', 'controllers', 'providers', 'guards', 'interceptors', 'decorators'],
  },

  // ===== Databases =====
  MongoDB: {
    category: 'database',
    officialDocs: 'https://www.mongodb.com/docs/',
    githubRepo: 'https://github.com/mongodb/mongo',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9h77dJ-QJlwGlZlTdKYE20I',
    keyConcepts: ['documents', 'collections', 'aggregation', 'indexes', 'replica sets', 'sharding'],
  },
  PostgreSQL: {
    category: 'database',
    officialDocs: 'https://www.postgresql.org/docs/',
    githubRepo: 'https://github.com/postgres/postgres',
    keyConcepts: ['ACID', 'joins', 'indexes', 'CTEs', 'window functions', 'JSONB'],
  },
  MySQL: {
    category: 'database',
    officialDocs: 'https://dev.mysql.com/doc/',
    githubRepo: 'https://github.com/mysql/mysql-server',
    keyConcepts: ['relational model', 'normalization', 'transactions', 'stored procedures', 'indexing'],
  },
  SQLite: {
    category: 'database',
    officialDocs: 'https://www.sqlite.org/docs.html',
    keyConcepts: ['embedded database', 'zero-configuration', 'transactions', 'single-file storage'],
  },
  Redis: {
    category: 'database',
    officialDocs: 'https://redis.io/docs/',
    githubRepo: 'https://github.com/redis/redis',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9hHwQkKJSMR2D_WYQj2EoYx',
    keyConcepts: ['caching', 'pub/sub', 'data structures', 'persistence', 'clustering'],
  },
  Mongoose: {
    category: 'database',
    officialDocs: 'https://mongoosejs.com/docs/',
    githubRepo: 'https://github.com/Automattic/mongoose',
    keyConcepts: ['schemas', 'models', 'validation', 'middleware', 'population', 'virtuals'],
  },
  Prisma: {
    category: 'database',
    officialDocs: 'https://www.prisma.io/docs/',
    githubRepo: 'https://github.com/prisma/prisma',
    keyConcepts: ['schema', 'migrations', 'CRUD', 'relations', 'Prisma Client'],
  },

  // ===== Auth / Security =====
  JWT: {
    category: 'authentication',
    officialDocs: 'https://jwt.io/introduction',
    githubRepo: 'https://github.com/auth0/node-jsonwebtoken',
    keyConcepts: ['tokens', 'signing', 'verification', 'refresh tokens', 'claims'],
  },
  Passport: {
    category: 'authentication',
    officialDocs: 'https://www.passportjs.org/docs/',
    githubRepo: 'https://github.com/jaredhanson/passport',
    keyConcepts: ['strategies', 'authentication', 'middleware', 'serialization', 'sessions'],
  },
  bcrypt: {
    category: 'authentication',
    officialDocs: 'https://github.com/kelektiv/node.bcrypt.js',
    githubRepo: 'https://github.com/kelektiv/node.bcrypt.js',
    keyConcepts: ['password hashing', 'salt rounds', 'comparison', 'security'],
  },
  OAuth: {
    category: 'authentication',
    officialDocs: 'https://oauth.net/2/',
    keyConcepts: ['authorization code flow', 'access tokens', 'refresh tokens', 'scopes', 'PKCE'],
  },

  // ===== Build Tools =====
  Vite: {
    category: 'build',
    officialDocs: 'https://vitejs.dev/guide/',
    githubRepo: 'https://github.com/vitejs/vite',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9iV6UuK2iIh9rYV8P7q6z6F',
    keyConcepts: ['HMR', 'ESBuild', 'Rollup', 'plugins', 'code splitting'],
  },
  Webpack: {
    category: 'build',
    officialDocs: 'https://webpack.js.org/concepts/',
    githubRepo: 'https://github.com/webpack/webpack',
    keyConcepts: ['loaders', 'plugins', 'chunks', 'tree shaking', 'code splitting'],
  },
  ESBuild: {
    category: 'build',
    officialDocs: 'https://esbuild.github.io/',
    githubRepo: 'https://github.com/evanw/esbuild',
    keyConcepts: ['bundling', 'minification', 'transpilation', 'speed'],
  },
  'esbuild': {
    category: 'build',
    officialDocs: 'https://esbuild.github.io/',
    githubRepo: 'https://github.com/evanw/esbuild',
    keyConcepts: ['bundling', 'minification', 'transpilation', 'speed'],
  },

  // ===== Testing =====
  Jest: {
    category: 'testing',
    officialDocs: 'https://jestjs.io/docs/',
    githubRepo: 'https://github.com/jestjs/jest',
    keyConcepts: ['unit tests', 'mocking', 'snapshots', 'coverage', 'matchers'],
  },
  Vitest: {
    category: 'testing',
    officialDocs: 'https://vitest.dev/guide/',
    githubRepo: 'https://github.com/vitest-dev/vitest',
    keyConcepts: ['Vite-native', 'HMR', 'snapshots', 'coverage', 'mocking'],
  },
  Cypress: {
    category: 'testing',
    officialDocs: 'https://docs.cypress.io/',
    githubRepo: 'https://github.com/cypress-io/cypress',
    keyConcepts: ['E2E testing', 'component testing', 'assertions', 'fixtures', 'Cypress Studio'],
  },
  Playwright: {
    category: 'testing',
    officialDocs: 'https://playwright.dev/docs/intro',
    githubRepo: 'https://github.com/microsoft/playwright',
    keyConcepts: ['E2E testing', 'multi-browser', 'auto-waiting', 'fixtures', 'codegen'],
  },
  Mocha: {
    category: 'testing',
    officialDocs: 'https://mochajs.org/',
    githubRepo: 'https://github.com/mochajs/mocha',
    keyConcepts: ['BDD', 'TDD', 'hooks', 'asynchronous testing', 'reporters'],
  },

  // ===== DevOps / Deployment =====
  Docker: {
    category: 'deployment',
    officialDocs: 'https://docs.docker.com/',
    githubRepo: 'https://github.com/docker/compose',
    youtubeTutorial: 'https://youtube.com/playlist?list=PL4cUxeGkcC9hxjeEpgHF0C3hE6wE9tJqV',
    keyConcepts: ['containers', 'images', 'Dockerfile', 'compose', 'volumes', 'networks'],
  },
  Kubernetes: {
    category: 'deployment',
    officialDocs: 'https://kubernetes.io/docs/',
    githubRepo: 'https://github.com/kubernetes/kubernetes',
    keyConcepts: ['pods', 'deployments', 'services', 'ingress', 'ConfigMap', 'RBAC'],
  },
  AWS: {
    category: 'cloud',
    officialDocs: 'https://docs.aws.amazon.com/',
    keyConcepts: ['EC2', 'S3', 'Lambda', 'RDS', 'ECS/EKS', 'CloudFormation'],
  },
  'GitHub Actions': {
    category: 'deployment',
    officialDocs: 'https://docs.github.com/en/actions',
    keyConcepts: ['workflows', 'jobs', 'actions', 'runners', 'CI/CD pipelines'],
  },

  // ===== CSS / Styling =====
  CSS: {
    category: 'frontend',
    officialDocs: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    mdnDocs: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    keyConcepts: ['flexbox', 'grid', 'selectors', 'animations', 'custom properties', 'media queries'],
  },
  Sass: {
    category: 'frontend',
    officialDocs: 'https://sass-lang.com/documentation/',
    githubRepo: 'https://github.com/sass/sass',
    keyConcepts: ['variables', 'nesting', 'mixins', 'functions', 'partials', 'SCSS syntax'],
  },
  Bootstrap: {
    category: 'frontend',
    officialDocs: 'https://getbootstrap.com/docs/',
    githubRepo: 'https://github.com/twbs/bootstrap',
    keyConcepts: ['grid system', 'components', 'utilities', 'responsive breakpoints'],
  },

  // ===== ORMs / ODMs =====
  Sequelize: {
    category: 'backend',
    officialDocs: 'https://sequelize.org/docs/',
    githubRepo: 'https://github.com/sequelize/sequelize',
    keyConcepts: ['models', 'migrations', 'associations', 'querying', 'transactions'],
  },
  TypeORM: {
    category: 'backend',
    officialDocs: 'https://typeorm.io/',
    githubRepo: 'https://github.com/typeorm/typeorm',
    keyConcepts: ['entities', 'repositories', 'migrations', 'relations', 'decorators'],
  },

  // ===== Real-time =====
  Socket: {
    category: 'backend',
    officialDocs: 'https://socket.io/docs/',
    githubRepo: 'https://github.com/socketio/socket.io',
    keyConcepts: ['WebSocket', 'rooms', 'emitting', 'broadcasting', 'middleware'],
  },
  WebSocket: {
    category: 'backend',
    mdnDocs: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
    keyConcepts: ['full-duplex', 'persistent connection', 'frames', 'protocol upgrade'],
  },

  // ===== GraphQL =====
  GraphQL: {
    category: 'api',
    officialDocs: 'https://graphql.org/learn/',
    githubRepo: 'https://github.com/graphql/graphql-js',
    keyConcepts: ['queries', 'mutations', 'subscriptions', 'resolvers', 'schema', 'Apollo'],
  },
  Apollo: {
    category: 'api',
    officialDocs: 'https://www.apollographql.com/docs/',
    githubRepo: 'https://github.com/apollographql/apollo-client',
    keyConcepts: ['client', 'server', 'caching', 'fragments', 'local state'],
  },

  // ===== Package Managers =====
  npm: {
    category: 'build',
    officialDocs: 'https://docs.npmjs.com/',
    githubRepo: 'https://github.com/npm/cli',
    keyConcepts: ['packages', 'scripts', 'semver', 'workspaces', 'registry'],
  },
  Yarn: {
    category: 'build',
    officialDocs: 'https://yarnpkg.com/getting-started',
    githubRepo: 'https://github.com/yarnpkg/berry',
    keyConcepts: ['workspaces', 'plug-and-play', 'offline cache', 'constraints'],
  },
  pnpm: {
    category: 'build',
    officialDocs: 'https://pnpm.io/motivation',
    githubRepo: 'https://github.com/pnpm/pnpm',
    keyConcepts: ['efficient disk usage', 'strict dependency resolution', 'workspaces'],
  },

  // ===== Miscellaneous =====
  Axios: {
    category: 'utility',
    officialDocs: 'https://axios-http.com/docs/intro',
    githubRepo: 'https://github.com/axios/axios',
    keyConcepts: ['HTTP requests', 'interceptors', 'error handling', 'cancellation'],
  },
  Lodash: {
    category: 'utility',
    officialDocs: 'https://lodash.com/docs/',
    githubRepo: 'https://github.com/lodash/lodash',
    keyConcepts: ['utility functions', 'deep cloning', 'debounce', 'throttle'],
  },
  Helmet: {
    category: 'security',
    officialDocs: 'https://helmetjs.github.io/',
    githubRepo: 'https://github.com/helmetjs/helmet',
    keyConcepts: ['HTTP headers', 'CSP', 'XSS protection', 'security defaults'],
  },
  Multer: {
    category: 'utility',
    officialDocs: 'https://github.com/expressjs/multer',
    githubRepo: 'https://github.com/expressjs/multer',
    keyConcepts: ['file uploads', 'multipart forms', 'storage engines', 'file filtering'],
  },
  Zod: {
    category: 'utility',
    officialDocs: 'https://zod.dev/',
    githubRepo: 'https://github.com/colinhacks/zod',
    keyConcepts: ['schema validation', 'TypeScript inference', 'parsing', 'transforms'],
  },
  'react-router-dom': {
    category: 'frontend',
    officialDocs: 'https://reactrouter.com/en/main',
    githubRepo: 'https://github.com/remix-run/react-router',
    keyConcepts: ['client-side routing', 'nested routes', 'navigation', 'URL params'],
  },
  // Many more aliases & variants
  'react-router': {
    category: 'frontend',
    officialDocs: 'https://reactrouter.com/en/main',
    githubRepo: 'https://github.com/remix-run/react-router',
    keyConcepts: ['routing', 'navigation', 'history', 'links'],
  },
  'express-rate-limit': {
    category: 'security',
    officialDocs: 'https://express-rate-limit.mintlify.app/',
    githubRepo: 'https://github.com/express-rate-limit/express-rate-limit',
    keyConcepts: ['rate limiting', 'DDoS protection', 'middleware'],
  },
  'cors': {
    category: 'security',
    officialDocs: 'https://github.com/expressjs/cors',
    githubRepo: 'https://github.com/expressjs/cors',
    keyConcepts: ['cross-origin', 'CORS headers', 'preflight'],
  },
  'passport-google-oauth20': {
    category: 'authentication',
    officialDocs: 'https://www.passportjs.org/packages/passport-google-oauth20/',
    githubRepo: 'https://github.com/jaredhanson/passport-google-oauth20',
    keyConcepts: ['Google OAuth', 'OAuth 2.0', 'strategy', 'callback'],
  },
  'passport-github2': {
    category: 'authentication',
    officialDocs: 'https://www.passportjs.org/packages/passport-github2/',
    githubRepo: 'https://github.com/cfsghost/passport-github2',
    keyConcepts: ['GitHub OAuth', 'OAuth 2.0', 'strategy', 'callback'],
  },
  'jsonwebtoken': {
    category: 'authentication',
    officialDocs: 'https://github.com/auth0/node-jsonwebtoken',
    githubRepo: 'https://github.com/auth0/node-jsonwebtoken',
    keyConcepts: ['JWT', 'signing', 'verification', 'token expiry'],
  },
  'bcryptjs': {
    category: 'authentication',
    officialDocs: 'https://github.com/dcodeIO/bcrypt.js',
    githubRepo: 'https://github.com/dcodeIO/bcrypt.js',
    keyConcepts: ['password hashing', 'salt', 'comparison', 'security'],
  },
  'node-cron': {
    category: 'utility',
    officialDocs: 'https://github.com/node-cron/node-cron',
    githubRepo: 'https://github.com/node-cron/node-cron',
    keyConcepts: ['scheduling', 'cron jobs', 'automation'],
  },
  'multer': {
    category: 'utility',
    officialDocs: 'https://github.com/expressjs/multer',
    githubRepo: 'https://github.com/expressjs/multer',
    keyConcepts: ['file uploads', 'multipart', 'storage'],
  },
};

// Also register many alternate/spelled-out names
const ALIASES = {
  'express.js': 'Express',
  'node.js': 'Node.js',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'vue': 'Vue.js',
  'vuejs': 'Vue.js',
  'reactjs': 'React',
  'react.js': 'React',
  'nextjs': 'Next.js',
  'mongoose': 'Mongoose',
  'passport.js': 'Passport',
  'socket.io': 'Socket',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'redis': 'Redis',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'graphql': 'GraphQL',
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'python': 'Python',
  'java': 'Java',
  'go': 'Go',
  'rust': 'Rust',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'webpack': 'Webpack',
  'vite': 'Vite',
  'jest': 'Jest',
  'vitest': 'Vitest',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  'mocha': 'Mocha',
  'jwt': 'JWT',
  'oauth': 'OAuth',
  'oauth2': 'OAuth',
  'oauth 2.0': 'OAuth',
};

/**
 * Resolve a tech name to its canonical resource entry.
 */
const lookup = (name) => {
  if (!name) return null;
  const cleaned = name.trim();
  return TECH_RESOURCES[cleaned] || TECH_RESOURCES[ALIASES[cleaned.toLowerCase()]] || null;
};

/**
 * Build learning resources from a detected tech stack.
 * @param {object} techStack - Static analysis tech stack result
 * @param {string[]} techStack.languages - Language names
 * @param {object[]} techStack.frameworks - Framework objects with name
 * @param {object[]} techStack.frontend - Frontend tech objects
 * @param {object[]} techStack.backend - Backend tech objects
 * @param {object[]} techStack.database - Database tech objects
 * @param {object[]} techStack.authentication - Auth tech objects
 * @param {object[]} techStack.testing - Testing tech objects
 * @param {object[]} techStack.build - Build tool objects
 * @param {object[]} techStack.deployment - Deployment tech objects
 * @param {object[]} techStack.cloud - Cloud tech objects
 * @param {object} project - Project object with tech stack
 * @returns {object} Learning resources object for the client
 */
const generateLearningResources = async (techStack, project) => {
  const techNames = [];

  // Collect all tech names from the detected stack
  if (techStack?.languages) techNames.push(...techStack.languages.map((n) => ({ name: n, source: 'language' })));
  if (techStack?.frameworks) techNames.push(...techStack.frameworks.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'framework' })));
  if (techStack?.frontend) techNames.push(...techStack.frontend.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'frontend', confidence: n.confidence })));
  if (techStack?.backend) techNames.push(...techStack.backend.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'backend', confidence: n.confidence })));
  if (techStack?.database) techNames.push(...techStack.database.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'database', confidence: n.confidence })));
  if (techStack?.authentication) techNames.push(...techStack.authentication.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'authentication', confidence: n.confidence })));
  if (techStack?.testing) techNames.push(...techStack.testing.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'testing', confidence: n.confidence })));
  if (techStack?.build) techNames.push(...techStack.build.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'build', confidence: n.confidence })));
  if (techStack?.deployment) techNames.push(...techStack.deployment.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'deployment', confidence: n.confidence })));
  if (techStack?.cloud) techNames.push(...techStack.cloud.map((n) => ({ name: typeof n === 'string' ? n : n.name, source: 'cloud', confidence: n.confidence })));

  // Also get from project.detectedTechStack as fallback
  if (project?.detectedTechStack) {
    for (const t of project.detectedTechStack) {
      if (!techNames.some((tn) => tn.name.toLowerCase() === t.toLowerCase())) {
        techNames.push({ name: t, source: 'project', confidence: 0.5 });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const t of techNames) {
    const key = t.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }

  // Build resources
  const resources = [];
  const conceptsMap = {};

  for (const tech of unique) {
    const entry = lookup(tech.name);
    if (!entry) continue;

    const resource = {
      technology: tech.name,
      category: entry.category || tech.source || 'general',
      confidence: tech.confidence || 0.7,
      officialDocs: entry.officialDocs || null,
      mdnDocs: entry.mdnDocs || null,
      githubRepo: entry.githubRepo || null,
      youtubeTutorial: entry.youtubeTutorial || null,
      keyConcepts: entry.keyConcepts || [],
      scraped: false,
      scrapeDetails: {},
    };

    resources.push(resource);

    // Build concepts map
    for (const concept of entry.keyConcepts || []) {
      if (!conceptsMap[concept]) conceptsMap[concept] = [];
      if (!conceptsMap[concept].includes(tech.name)) {
        conceptsMap[concept].push(tech.name);
      }
    }
  }

  // Summarize external libraries (package-level names not already covered)
  if (techStack?.stacks && techStack.stacks.length > 0) {
    for (const stack of techStack.stacks) {
      const stackTechs = stack.technologies || [];
      for (const st of stackTechs) {
        const key = typeof st === 'string' ? st : st.name;
        if (key && !seen.has(key.toLowerCase())) {
          const entry = lookup(key);
          if (entry) {
            seen.add(key.toLowerCase());
            resources.push({
              technology: key,
              category: entry.category || 'general',
              confidence: 0.5,
              officialDocs: entry.officialDocs || null,
              mdnDocs: entry.mdnDocs || null,
              githubRepo: entry.githubRepo || null,
              youtubeTutorial: entry.youtubeTutorial || null,
              keyConcepts: entry.keyConcepts || [],
              scraped: false,
              scrapeDetails: {},
            });
            for (const concept of entry.keyConcepts || []) {
              if (!conceptsMap[concept]) conceptsMap[concept] = [];
              if (!conceptsMap[concept].includes(key)) {
                conceptsMap[concept].push(key);
              }
            }
          }
        }
      }
    }
  }

  // Enrich with parallel web scraping (non-blocking — gracefully degrades)
  const techNamesForScraping = resources.map((r) => r.technology);
  let scrapedCount = 0;
  const scraperErrors = [];

  if (techNamesForScraping.length > 0) {
    try {
      const scrapedResults = await scrapeTechsInParallel(techNamesForScraping);

      for (const sr of scrapedResults) {
        const match = resources.find((r) => r.technology === sr.technology);
        if (!match) continue;

        match.scraped = true;
        match.scrapeDetails = {
          youtubeVideos: sr.youtube || [],
          scrapedAt: new Date().toISOString(),
        };

        // Override static youtubeTutorial with the top scraped result if found
        if (sr.youtube && sr.youtube.length > 0) {
          match.youtubeTutorial = sr.youtube[0].url;
          match.youtubeTitle = sr.youtube[0].title;
        }

        scrapedCount++;
      }
    } catch (err) {
      scraperErrors.push(err.message);
      console.warn('Parallel scraping failed, using static resources only:', err.message);
    }
  }

  return {
    resources,
    concepts: conceptsMap,
    totalResources: resources.length,
    scrapedCount,
    scraperErrors,
  };
};

module.exports = { generateLearningResources, TECH_RESOURCES, lookup };
