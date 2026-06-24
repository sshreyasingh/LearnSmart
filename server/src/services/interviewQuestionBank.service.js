/**
 * Interview Question Bank — Static, predefined questions keyed by technology and category.
 * No AI involved. Questions are selected based on the project's detected tech stack and structure.
 */

// ===== Categories used by the client =====
// architecture, code-deep-dive, design-pattern, tech-stack, problem-solving, behavioral, concept-based

const QUESTION_BANK = {
  // =============== ARCHITECTURE (always relevant) ===============
  architecture: [
    { difficulty: 'beginner', question: 'What is the high-level architecture of this project? Describe the main layers and how they communicate.', suggestedAnswer: 'The project follows a client-server architecture. The client (React SPA) communicates with the Express backend via REST APIs. The server is organized into controllers (handle HTTP), services (business logic), models (database schemas), and middleware (auth, validation, error handling). MongoDB is used as the database, accessed via Mongoose ODM.', keyConcepts: ['client-server', 'REST API', 'layered architecture'] },
    { difficulty: 'intermediate', question: 'How does the project structure its server-side code? Explain the role of controllers, services, models, and middleware.', suggestedAnswer: 'Controllers handle HTTP request/response lifecycle and delegate logic to services. Services contain business logic and orchestrate operations. Models define database schemas using Mongoose. Middleware functions (auth, validation, error handling, rate limiting) run before the controller to preprocess requests. This separation of concerns makes the code testable and maintainable.', keyConcepts: ['separation of concerns', 'MVC pattern', 'middleware chain'] },
    { difficulty: 'advanced', question: 'What architectural improvements would you suggest for this project to handle 10x more traffic? Consider scalability, caching, and database optimization.', suggestedAnswer: '1. Add a caching layer (Redis) for frequently accessed data like analysis results. 2. Implement database indexing on frequently queried fields. 3. Add a message queue for background tasks (analysis, difficulty prediction). 4. Implement API rate limiting more granularly. 5. Add CDN for static assets. 6. Consider horizontal scaling with a load balancer. 7. Use database connection pooling. 8. Implement pagination on all list endpoints.', keyConcepts: ['scalability', 'caching', 'load balancing', 'connection pooling'] },
    { difficulty: 'intermediate', question: 'How does this project handle error handling across the application? Trace the error flow from a failed database query to the client response.', suggestedAnswer: 'Errors propagate through async/await to catch blocks in controllers. Controllers call `next(error)` which passes to the centralized error handler middleware. The error handler checks the error type (AppError, ValidationError, CastError, duplicate key, JWT errors) and returns structured JSON responses with appropriate HTTP status codes. Operational errors get clear messages; programming errors return generic messages in production.', keyConcepts: ['error handling middleware', 'operational vs programmer errors', 'error propagation'] },
    { difficulty: 'beginner', question: 'What is the client-side architecture of this project? How are components organized?', suggestedAnswer: 'The client uses React with React Router v6 for navigation. Components are organized by feature: auth components (login, register, OAuth), analysis components (metrics, architecture, security), dashboard components, and common components (Navbar, ProtectedRoute). State management uses React Context (AuthContext) and local useState for component-specific state. API calls are centralized through an Axios instance with interceptors for auth token injection and automatic refresh.', keyConcepts: ['SPA', 'component hierarchy', 'React Router', 'Axios interceptors'] },
    { difficulty: 'advanced', question: 'How does the project handle authentication architecture? Describe the token flow from login to protected API access.', suggestedAnswer: 'On login, the server returns an access token (JWT, 15min expiry) and a refresh token (random 64-byte hex, 7-day expiry). The access token is sent as a Bearer header on every request. The authenticate middleware verifies the JWT. When the access token expires, the Axios interceptor catches the 401, calls /auth/refresh with the refresh token, gets new tokens, and retries the original request. Failed concurrent requests are queued to avoid multiple refreshes. Refresh tokens use family-based rotation for security.', keyConcepts: ['JWT access token', 'refresh token rotation', 'Axios interceptor', 'token family'] },
  ],

  // =============== TECH STACK ===============
  'tech-stack': [
    { difficulty: 'beginner', question: 'What technologies are used in this project and what role does each play?', suggestedAnswer: 'The project uses: React (frontend UI), Tailwind CSS (styling), Vite (build tool), Express (backend server), MongoDB (database), Mongoose (ODM), Passport.js (OAuth authentication), bcrypt (password hashing), JWT (token-based auth), Multer (file uploads), and Zod (request validation).', keyConcepts: ['full-stack', 'MERN stack', 'technology choices'] },
    { difficulty: 'intermediate', question: 'Why does this project use both JWT and OAuth? How do they complement each other?', suggestedAnswer: 'JWT is used for session-less authentication after login — the server issues a signed token that the client sends with each request. OAuth (Google/GitHub) is used for social login, allowing users to authenticate without creating a password. Both ultimately produce the same JWT access token format. OAuth is handled by Passport.js strategies, while local auth uses bcrypt for password verification.', keyConcepts: ['JWT', 'OAuth 2.0', 'Passport.js strategies', 'social login'] },
    { difficulty: 'intermediate', question: 'Why does this project use Zod for validation instead of JSON Schema or Joi? What are the trade-offs?', suggestedAnswer: 'Zod provides TypeScript-first schema validation with type inference, making it easy to derive TypeScript types from validation schemas. It has a simpler API than Joi, better TypeScript support than JSON Schema, and supports transforms (e.g., email lowercasing). Trade-offs include a smaller ecosystem and fewer integrations compared to Joi.', keyConcepts: ['Zod', 'schema validation', 'TypeScript inference', 'transforms'] },
    { difficulty: 'advanced', question: 'Evaluate the tech stack choices for this project. What would you change for a production deployment?', suggestedAnswer: 'Current stack is solid for a prototype. For production: 1. Use PostgreSQL instead of MongoDB if data has relational dependencies. 2. Add Redis for caching and session management. 3. Use a proper queue (Bull/BullMQ) for background job processing instead of inline analysis. 4. Add a cloud provider (AWS/GCP) for file storage instead of local filesystem. 5. Implement CI/CD with GitHub Actions. 6. Add monitoring (Sentry for errors, DataDog for metrics).', keyConcepts: ['production readiness', 'tech stack evaluation', 'scalability'] },
    { difficulty: 'beginner', question: 'How does the project handle file uploads and what technologies are involved?', suggestedAnswer: 'The project uses Multer, an Express middleware for handling multipart/form-data (file uploads). Uploaded files are stored on the local filesystem in the uploads/ directory, organized by userId/projectId. The Vite proxy forwards upload requests to the Express backend. Files are processed (extracted) for static code analysis.', keyConcepts: ['Multer', 'file uploads', 'multipart form data'] },
    { difficulty: 'intermediate', question: 'How does the build and development workflow work in this project?', suggestedAnswer: 'The client uses Vite as the build tool with React plugin, providing fast HMR during development. The server uses `node --watch` for auto-restart. Vite proxies `/api` requests to the Express server on port 5000. The client and server are in separate directories with their own package.json files. No monorepo tool is used — they run as separate processes.', keyConcepts: ['Vite', 'HMR', 'proxy configuration', 'development workflow'] },
  ],

  // =============== CODE DEEP DIVE ===============
  'code-deep-dive': [
    { difficulty: 'intermediate', question: 'How does the Axios interceptor handle token refresh? Explain the queue mechanism for concurrent requests.', suggestedAnswer: 'When a 401 response is received (and it\'s not from an auth endpoint), the interceptor checks if a refresh is already in progress (`isRefreshing` flag). If so, it queues the failed request\'s resolve/reject callbacks. When the refresh completes, `processQueue` resolves all queued requests with the new token, which then retry their original requests. This prevents multiple simultaneous refresh calls.', keyConcepts: ['Axios interceptors', 'request queuing', 'race conditions', 'token refresh'] },
    { difficulty: 'advanced', question: 'Trace the data flow when a user uploads a project. What happens from file selection to seeing analysis results?', suggestedAnswer: '1. User uploads a zip file via UploadPage. 2. Multer middleware saves the file to uploads/ directory. 3. Project is created in DB with "processing" status. 4. File is extracted via adm-zip. 5. Static analysis runs: parses all files, detects tech stack, extracts metrics, builds dependency graphs. 6. Difficulty prediction runs via Python XGBoost script. 7. AI analysis generates explanations using static context. 8. Learning resources and interview questions are generated from detected tech stack. 9. Results saved to AnalysisResult. 10. Project marked "completed". 11. Client polls or navigates to analysis page.', keyConcepts: ['upload pipeline', 'async processing', 'static analysis', 'data flow'] },
    { difficulty: 'intermediate', question: 'How does the static analysis service extract information from source code without executing it?', suggestedAnswer: 'It reads all text files and uses regex-based pattern matching to detect: imports/requires (dependency resolution), function/class declarations (symbols), Express route definitions (API endpoints), Mongoose schema definitions (database models), middleware patterns (app.use), environment variable references, JWT/bcrypt/passport usage. It builds an AST-like representation using line-by-line parsing rather than a full parser, which is faster but less accurate.', keyConcepts: ['static analysis', 'regex parsing', 'pattern matching', 'dependency resolution'] },
    { difficulty: 'intermediate', question: 'How does the AuthContext manage authentication state across page navigations? Walk through the initialization logic.', suggestedAnswer: 'AuthContext uses useReducer with states: user, loading, error. On mount, it checks localStorage for an existing access token. If found, it decodes the JWT client-side to check expiry. If expired, it tries to refresh using the stored refresh token. If successful, it calls /auth/me to get the user. If anything fails, it clears tokens and sets user to null. Protected routes check the user state and redirect to /login if unauthenticated.', keyConcepts: ['React Context', 'token lifecycle', 'page initialization', 'protected routes'] },
    { difficulty: 'advanced', question: 'How does the execution flow service determine the startup and request lifecycle of the application?', suggestedAnswer: 'The execution flow service scans for entry points (main files, app.listen, server startup), traces the middleware registration order, extracts route definitions grouped by router, maps controller-to-service-to-model calls, and identifies the request flow: request → middleware → router → controller → service → model → response. It builds an animated flow diagram showing the step-by-step execution path for the MERN stack.', keyConcepts: ['execution flow', 'entry point detection', 'request lifecycle', 'middleware chain'] },
    { difficulty: 'beginner', question: 'How does the rate limiter middleware work in this project? Trace how a request gets rate-limited.', suggestedAnswer: 'The rate limiter uses `express-rate-limit` with a windowMs and max config. On each request, the middleware increments a counter for the client\'s IP. If the counter exceeds max within the window, the middleware throws a 429 Too Many Requests error. The error handler catches it and returns a structured response with Retry-After header. Sensitive routes (auth, project creation) have stricter limits than read-only routes.', keyConcepts: ['rate limiting', 'middleware', 'IP tracking', 'error response'] },
    { difficulty: 'intermediate', question: 'Trace the file upload and extraction pipeline from the moment a user submits a zip file.', suggestedAnswer: '1. The UploadPage sends a FormData POST to /api/projects/upload. 2. Multer middleware parses the multipart form, saving the file to uploads/{userId}/{projectId}/ as a .zip. 3. The controller calls project service which creates a Project doc with status "processing". 4. The pipeline service is triggered: it extracts the zip via adm-zip into an extracted/ folder. 5. All text files are read, filtered by extension (.js, .jsx, .ts, .tsx, .py, .json, etc.). 6. Static analysis parses each file. 7. Results are saved to AnalysisResult and project status becomes "completed".', keyConcepts: ['file upload', 'Multer', 'zip extraction', 'processing pipeline'] },
    { difficulty: 'advanced', question: 'How does the project integrate Python XGBoost for difficulty prediction? Walk through the data flow.', suggestedAnswer: '1. Static analysis extracts code metrics: cyclomatic complexity, lines of code, comment ratio, number of routes/components, dependency count, and entropy. 2. These features are written to a temp JSON file matching the training schema. 3. The server spawns a child process: `python predict.py --input temp.json`. 4. predict.py loads the pre-trained XGBoost model (difficulty_model.pkl), scales features using the saved scaler, and predicts difficulty (beginner/intermediate/advanced) with probability scores. 5. stdout contains the JSON prediction result. 6. The server parses the output and stores it in AnalysisResult.difficultyAnalysis. 7. Child process errors are caught and fall back to a rule-based heuristic.', keyConcepts: ['Python-Node.js integration', 'XGBoost', 'child process', 'ML model inference'] },
    { difficulty: 'intermediate', question: 'How are CORS and security headers configured in this project? What attack vectors do they prevent?', suggestedAnswer: 'The app uses the `helmet` middleware which sets security headers: X-Content-Type-Options (prevents MIME sniffing), X-Frame-Options (prevents clickjacking), Strict-Transport-Security (enforces HTTPS), X-XSS-Protection, and Content-Security-Policy. CORS is configured with `cors({ origin: process.env.CLIENT_URL, credentials: true })` allowing only the specified client origin. In development, the Vite proxy avoids CORS entirely. These prevent XSS, clickjacking, MIME confusion, and cross-origin data theft.', keyConcepts: ['CORS', 'helmet', 'security headers', 'XSS prevention'] },
    { difficulty: 'beginner', question: 'How does environment variable configuration and validation work on server startup?', suggestedAnswer: 'The `env.js` file uses dotenv to load .env file variables, then validates them with a Zod schema. Required variables (MONGO_URI, JWT secrets, PORT) throw errors with descriptive messages if missing. Optional vars (OAuth client IDs, API keys) are marked with `.optional()` and features are conditionally disabled if missing. The validation runs synchronously at import time — if it fails, the server won\'t start (fail-fast). This prevents runtime errors from misconfiguration.', keyConcepts: ['environment configuration', 'Zod validation', 'fail-fast', 'conditional features'] },
  ],

  // =============== DESIGN PATTERNS ===============
  'design-pattern': [
    { difficulty: 'beginner', question: 'What design patterns are used in this project? Identify at least three.', suggestedAnswer: '1. MVC (Model-View-Controller): Models define data shape, Controllers handle HTTP, Views are React components. 2. Middleware Chain: Express middleware runs sequentially for preprocessing. 3. Repository Pattern: Services abstract database operations. 4. Observer Pattern: AuthContext notifies components of auth state changes.', keyConcepts: ['MVC', 'middleware chain', 'repository pattern', 'observer pattern'] },
    { difficulty: 'intermediate', question: 'How does the project implement the Factory pattern, if at all? Where would it be useful?', suggestedAnswer: 'The project doesn\'t explicitly use Factory pattern, but it could benefit from it in: 1. Question generation (different question factories for different categories). 2. Analysis result building (buildCachedResponse acts as a simple factory). 3. Error creation (AppError class with different error codes). The static analysis service uses a procedural approach rather than factory-based.', keyConcepts: ['Factory pattern', 'creational patterns', 'abstraction'] },
    { difficulty: 'intermediate', question: 'How does the middleware chain pattern work in Express and how is it used in this project?', suggestedAnswer: 'Express middleware are functions with (req, res, next) signature. They run in registration order. This project uses: helmet (security headers) → cors → morgan (logging) → json parser → urlencoded parser → per-route middleware (rate limiter → authenticate → projectOwnership → controller). Error handlers are registered last. Each middleware can end the request (send response) or call next() to pass to the next middleware.', keyConcepts: ['middleware chain', 'Express', 'error middleware', 'request pipeline'] },
    { difficulty: 'advanced', question: 'How does this project implement the Strategy pattern for authentication? How could it be extended to add a new OAuth provider?', suggestedAnswer: 'Passport.js implements the Strategy pattern. Each provider (Google, GitHub) is a separate strategy registered via passport.use(). To add a new provider: 1. Install the passport strategy package. 2. Add env vars for client ID/secret. 3. Register the strategy in passport.js with a verify callback that calls User.createFromOAuth. 4. Add routes for initiate and callback in auth.routes.js. 5. Add provider button in OAuthButtons.jsx.', keyConcepts: ['Strategy pattern', 'Passport.js', 'OAuth providers', 'extensibility'] },
    { difficulty: 'beginner', question: 'How does React Context provide a global state pattern in this project?', suggestedAnswer: 'AuthContext wraps the entire app in a Provider, giving all components access to auth state (user, loading, error) and actions (login, register, logout). Components call `useAuth()` to access the context. This avoids prop drilling — auth state doesn\'t need to be passed through intermediate components. The useReducer pattern provides predictable state transitions.', keyConcepts: ['React Context', 'Provider pattern', 'prop drilling avoidance', 'useReducer'] },
  ],

  // =============== PROBLEM SOLVING ===============
  'problem-solving': [
    { difficulty: 'beginner', question: 'How would you debug a situation where a user reports they can\'t log in? Walk through your debugging steps.', suggestedAnswer: '1. Check browser devtools Network tab for the login API call and its response. 2. Check server logs for error messages. 3. Verify MongoDB connection is active. 4. Check if the user exists in the database. 5. Verify the password meets validation rules. 6. Check if the JWT secret is correctly configured. 7. Look for CORS errors if the frontend can\'t reach the backend. 8. Check if rate limiting is blocking the request.', keyConcepts: ['debugging', 'troubleshooting', 'network analysis', 'server logs'] },
    { difficulty: 'intermediate', question: 'How would you implement a "forgot password" feature for this project?', suggestedAnswer: '1. Add a POST /auth/forgot-password endpoint that accepts email. 2. Generate a cryptographically secure reset token with expiry (1 hour). 3. Store the hashed token in the User document. 4. Send an email (via nodemailer/SendGrid) with a reset link containing the token. 5. Add a reset-password page on the client. 6. Add a POST /auth/reset-password endpoint that verifies the token and allows password change. 7. Invalidate all refresh tokens for the user after password reset for security.', keyConcepts: ['password reset', 'secure tokens', 'email integration', 'security'] },
    { difficulty: 'intermediate', question: 'How would you implement a search/filter feature for the projects dashboard?', suggestedAnswer: '1. Add query parameters to the GET /api/projects endpoint: ?search=term&status=completed&sort=createdAt. 2. Build a MongoDB query using $regex for text search and $match for filters. 3. Add input fields on the DashboardPage for search and filters. 4. Debounce the search input (300ms) to avoid excessive API calls. 5. Add pagination with limit/offset. 6. Show loading state during fetch. 7. Cache results in React state for instant re-rendering.', keyConcepts: ['search implementation', 'filtering', 'debouncing', 'pagination'] },
    { difficulty: 'advanced', question: 'If the application is running slowly during project analysis, how would you identify and fix the bottleneck?', suggestedAnswer: '1. Profile the analysis pipeline to find the slowest step. Likely candidates: Python XGBoost spawn, AI API calls (OpenRouter), file parsing for large projects. 2. Move heavy processing to background jobs using a queue (Bull/BullMQ). 3. Cache static analysis results so re-analysis isn\'t needed. 4. Implement streaming for AI responses. 5. Add a progress indicator so users know analysis is running. 6. Consider Web Workers for client-side heavy computation. 7. Database query optimization — add indexes, use lean().', keyConcepts: ['performance profiling', 'background jobs', 'caching', 'optimization'] },
    { difficulty: 'beginner', question: 'How would you handle the case where a user uploads a non-zip file or a corrupted zip?', suggestedAnswer: '1. Validate the file extension and MIME type before processing. 2. Wrap the extraction logic in a try/catch. 3. If extraction fails, delete the uploaded file and return a clear error message. 4. Update the project status to "failed" with an error reason. 5. Show the error in the UI with an option to re-upload. 6. Log the error details on the server for debugging.', keyConcepts: ['input validation', 'error handling', 'user feedback', 'graceful degradation'] },
  ],

  // =============== BEHAVIORAL ===============
  behavioral: [
    { difficulty: 'beginner', question: 'How would you explain this project to a non-technical stakeholder? What\'s the elevator pitch?', suggestedAnswer: 'LearnSmart is a platform that automatically analyzes codebases to help developers learn and understand them. You upload your project, and it generates documentation, architecture diagrams, learning resources, and practice interview questions — all tailored to your specific code. It\'s like having a senior developer explain your codebase to you.', keyConcepts: ['communication', 'elevator pitch', 'stakeholder management'] },
    { difficulty: 'beginner', question: 'What was the most interesting technical challenge in building this project?', suggestedAnswer: 'The most interesting challenge was building the static code analysis engine — extracting meaningful information from source code without executing it. We had to use regex patterns, dependency resolution, and symbol extraction to understand the codebase structure, detect the tech stack, and identify architectural patterns, all without running the code. This required deep understanding of multiple programming language conventions and frameworks.', keyConcepts: ['technical challenges', 'problem solving', 'static analysis'] },
    { difficulty: 'intermediate', question: 'How would you prioritize features if you had limited development time? What would you cut?', suggestedAnswer: 'Priority 1: Core analysis pipeline (upload → static analysis → results display). Priority 2: Authentication and user projects (users need to access their own data). Priority 3: AI explanations (core differentiator). Priority 4: Visualizations and diagrams (dependency graph, API flow). Would cut: interview questions (can be generated by users reading code), learning resources (docs links are nice-to-have), OAuth (can start with email/password only).', keyConcepts: ['prioritization', 'MVP', 'resource allocation', 'trade-offs'] },
    { difficulty: 'advanced', question: 'How would you handle a production incident where the analysis service is failing? Walk through your incident response.', suggestedAnswer: '1. Acknowledge: Confirm the issue and notify stakeholders. 2. Assess: Check error logs, monitoring dashboards, and recent deployments. 3. Mitigate: If an AI service is down, switch to static-only mode. If the queue is backlogged, scale workers. If the database is slow, check indexes and connection pool. 4. Fix: Rollback problematic deployment or deploy a hotfix. 5. Communicate: Post-mortem with timeline, root cause, and prevention plan. 6. Prevent: Add better monitoring, circuit breakers, and runbooks.', keyConcepts: ['incident response', 'SRE', 'monitoring', 'post-mortem'] },
    { difficulty: 'beginner', question: 'What testing strategy would you recommend for this project?', suggestedAnswer: '1. Unit tests for services (auth service, static analysis helpers) using Jest. 2. Integration tests for API endpoints (register, login, create project) using supertest. 3. Component tests for React components using Vitest + React Testing Library. 4. E2E tests for critical flows (login → upload → view analysis) using Playwright. 5. Test the Python difficulty prediction script separately. 6. Add CI pipeline to run tests on every PR.', keyConcepts: ['testing strategy', 'unit tests', 'integration tests', 'E2E tests', 'CI/CD'] },
    { difficulty: 'intermediate', question: 'Tell me about a time you had a technical disagreement with a teammate. How did you resolve it?', suggestedAnswer: 'In a previous project, I disagreed with a teammate about whether to use MongoDB or PostgreSQL. I scheduled a meeting where we each presented our case with data: I showed that our data was mostly relational (users, projects with foreign keys), while they argued MongoDB\'s schema flexibility was better for rapid prototyping. We agreed to prototype the core feature in both and compare. MongoDB won for development speed, but we later migrated to PostgreSQL for production to handle complex queries. The key was depersonalizing the debate by focusing on data and trade-offs.', keyConcepts: ['conflict resolution', 'technical decision-making', 'collaboration', 'trade-off analysis'] },
    { difficulty: 'intermediate', question: 'Describe a situation where you had to learn a new technology quickly to ship a feature. What was your approach?', suggestedAnswer: 'I needed to implement OAuth with Google and GitHub for a project but had never used Passport.js before. My approach: 1. Read the official Passport.js docs and the specific strategy docs. 2. Found a well-reviewed tutorial implementing the exact flow. 3. Built a minimal prototype in isolation first — just the auth routes and callback handling. 4. Once the prototype worked, integrated it into the main app with proper error handling. 5. Added tests for both success and failure paths. The focused prototype-first approach let me learn without breaking the existing app.', keyConcepts: ['rapid learning', 'prototyping', 'incremental integration', 'self-education'] },
    { difficulty: 'advanced', question: 'How would you handle scope creep when a stakeholder asks for a major feature mid-sprint?', suggestedAnswer: '1. Acknowledge the request positively — it shows engagement. 2. Ask clarifying questions to define the scope properly. 3. Estimate the impact: how many story points, which existing work it blocks, and what dependencies it introduces. 4. Present options to the stakeholder: (a) swap it for an equally-sized existing ticket, (b) push it to the next sprint, (c) extend the deadline. 5. Never just say "yes" — every addition should come with a visible trade-off. 6. Document the decision and update the backlog.', keyConcepts: ['scope management', 'stakeholder communication', 'prioritization', 'sprint planning'] },
    { difficulty: 'intermediate', question: 'Walk me through how you approach code review. What do you look for and how do you give feedback?', suggestedAnswer: 'I approach code review in layers: 1. High-level: Does the PR solve the right problem? Is the approach sound architecturally? 2. Logic: Are there edge cases, off-by-one errors, or race conditions? 3. Security: Are user inputs validated? Are there injection risks? 4. Performance: Are there N+1 queries, memory leaks, or unnecessary re-renders? 5. Style: Does it follow project conventions? For feedback, I use the "why" format — instead of "use const here", I say "making this const prevents accidental reassignment and signals intent". I praise good patterns too, not just critique.', keyConcepts: ['code review', 'constructive feedback', 'code quality', 'collaboration'] },
  ],

  // =============== CONCEPT BASED ===============
  'concept-based': [
    { difficulty: 'beginner', question: 'Explain the concept of RESTful API design. How does this project follow or deviate from REST principles?', suggestedAnswer: 'REST (Representational State Transfer) uses HTTP methods (GET, POST, PUT, DELETE) as verbs on resources identified by URLs. This project follows REST: GET /api/projects fetches projects, POST creates, DELETE removes. It deviates slightly by using POST for /auth/refresh (token refresh is an action, not a CRUD resource) and by nesting routes (/api/projects/:id/analysis). Statelessness is maintained via JWT — no server-side session. HATEOAS (hypermedia links) is not implemented, which is common for APIs.', keyConcepts: ['REST', 'HTTP methods', 'resource naming', 'statelessness'] },
    { difficulty: 'intermediate', question: 'Compare JWT-based authentication with session-based authentication. Why was JWT chosen for this project?', suggestedAnswer: 'JWT is stateless — the token contains all user info (sub, name, role) signed with a secret. No server-side session storage needed, which makes horizontal scaling trivial (any server can verify a token). Session-based auth stores session IDs in cookies and session data on the server (memory or Redis) — requires sticky sessions or shared session store. JWT trade-offs: tokens can\'t be revoked server-side (until expiry), payload size increases bandwidth, and token theft is harder to detect. This project mitigates this with short-lived access tokens (15min) and refresh token rotation.', keyConcepts: ['JWT vs sessions', 'stateless auth', 'scalability', 'token revocation'] },
    { difficulty: 'advanced', question: 'Explain the CAP theorem and how it applies to the database choices in this project.', suggestedAnswer: 'CAP theorem states a distributed system can only guarantee two of: Consistency (all nodes see same data), Availability (every request gets a response), Partition Tolerance (system works despite network failures). MongoDB (this project\'s DB) is CP by default — it prefers consistency over availability during network partitions (primary election pauses writes). Trade-off: MongoDB is great for flexible schemas and horizontal sharding but doesn\'t support ACID transactions across multiple documents (though MongoDB 4.0+ does support multi-doc ACID). For this project\'s use case (single-server deployment with non-financial data), CP with MongoDB\'s read preference "primary" is appropriate.', keyConcepts: ['CAP theorem', 'consistency', 'availability', 'partition tolerance', 'MongoDB trade-offs'] },
    { difficulty: 'beginner', question: 'What is the difference between SQL injection, XSS, and CSRF attacks? How does this project defend against them?', suggestedAnswer: 'SQL injection: attacker inserts SQL into inputs to manipulate the database. Defense: using MongoDB/Mongoose (NoSQL) and parameterized queries via Mongoose methods (no raw SQL). XSS (Cross-Site Scripting): attacker injects scripts into web pages that execute in other users\' browsers. Defense: React auto-escapes JSX output, CSP headers via helmet. CSRF (Cross-Site Request Forgery): attacker tricks a logged-in user into making unwanted requests. Defense: JWT in Authorization header (not cookies), so CSRF doesn\'t apply — the attacker can\'t set custom headers cross-origin.', keyConcepts: ['SQL injection', 'XSS', 'CSRF', 'web security'] },
    { difficulty: 'intermediate', question: 'How does the JavaScript event loop handle asynchronous operations in the Node.js server? Give a concrete example from this project.', suggestedAnswer: 'Node.js runs a single-threaded event loop. Async operations (DB queries, file I/O, API calls) are delegated to libuv\'s thread pool or OS async APIs. Example: When a user requests project analysis, the controller awaits `analysisService.analyze()`. This function calls Mongoose.find() which returns a Promise. The event loop doesn\'t block — it processes other requests while the DB query runs in libuv. When the query completes, the callback is queued in the microtask queue. The event loop picks it up on the next tick and resumes execution after the await. This is why Node.js handles thousands of concurrent I/O operations despite being single-threaded.', keyConcepts: ['event loop', 'async/await', 'libuv', 'non-blocking I/O'] },
    { difficulty: 'advanced', question: 'What caching strategies would you implement for this project and at which layers?', suggestedAnswer: '1. Browser cache: Set Cache-Control headers on static assets (bundled JS/CSS) with fingerprinting for cache busting. 2. CDN cache: Serve built client assets via CDN with long TTLs. 3. API response cache: Use Redis to cache analysis results keyed by projectId+userId — invalidate on re-analysis. 4. Database query cache: MongoDB\'s WiredTiger cache and query plan cache. 5. Application-level memoization: Memoize expensive static analysis helpers using a simple Map with LRU eviction. 6. React component memo: Use React.memo, useMemo, and useCallback to avoid unnecessary re-renders. 7. Persistent cache: The AiCache model already caches AI responses to avoid redundant API calls.', keyConcepts: ['caching strategies', 'Redis', 'CDN', 'memoization', 'cache invalidation'] },
  ],
};

// =============== TECHNOLOGY-SPECIFIC QUESTIONS ===============

const TECH_QUESTIONS = {
  React: [
    { category: 'tech-stack', difficulty: 'beginner', question: 'How does React handle component state and lifecycle in this project?', suggestedAnswer: 'This project uses functional components with React hooks. useState manages local component state, useEffect handles side effects (data fetching, subscriptions), useCallback memoizes functions, and useReducer manages complex state transitions in AuthContext. Custom hooks like useAnalysis encapsulate reusable data-fetching logic.', keyConcepts: ['React hooks', 'useState', 'useEffect', 'custom hooks'], relatedFiles: ['client/src/context/AuthContext.jsx', 'client/src/hooks/useAnalysis.js'] },
    { category: 'code-deep-dive', difficulty: 'intermediate', question: 'How does this project handle API calls from React components? Trace an API call from component to response.', suggestedAnswer: 'Components call functions from api modules (e.g., getProjects from project.api.js). These use a centralized Axios instance (client.js) that automatically attaches the JWT Bearer token. The request is proxied by Vite to the Express server. On 401 responses, an interceptor attempts token refresh. Successful responses are returned to the calling component, which updates local state or dispatches context actions.', keyConcepts: ['Axios', 'API layer', 'request/response cycle', 'interceptors'], relatedFiles: ['client/src/api/client.js', 'client/src/api/project.api.js'] },
    { category: 'design-pattern', difficulty: 'intermediate', question: 'What React patterns are used for state management and component composition in this project?', suggestedAnswer: '1. Context + useReducer pattern for auth state (AuthContext). 2. Custom hooks for reusable logic (useAnalysis). 3. Composition over inheritance (small components combined in pages). 4. Conditional rendering for loading/error/data states. 5. Controlled components for form inputs. 6. Props drilling avoided via Context. 7. SPA routing with React Router v6 and nested layouts.', keyConcepts: ['React patterns', 'Context API', 'custom hooks', 'composition'], relatedFiles: ['client/src/context/AuthContext.jsx', 'client/src/App.jsx'] },
  ],
  Express: [
    { category: 'code-deep-dive', difficulty: 'intermediate', question: 'How does Express middleware flow work in this project? Trace the request lifecycle for a protected route.', suggestedAnswer: 'Request → helmet (security headers) → cors → morgan (logging) → json parser → router-level middleware → authenticate (JWT verify) → projectOwnership (DB lookup) → controller → service → model → response. If any middleware throws, control passes to the centralized error handler. The rateLimiter runs before sensitive routes to throttle requests.', keyConcepts: ['Express middleware', 'request pipeline', 'error propagation'], relatedFiles: ['server/src/app.js', 'server/src/middleware/authenticate.js'] },
    { category: 'architecture', difficulty: 'advanced', question: 'How could this project be migrated from Express to a more performant framework like Fastify? What would need to change?', suggestedAnswer: '1. Replace Express app creation with Fastify. 2. Rewrite middleware to Fastify\'s plugin system (encapsulation). 3. Update route definitions (Fastify uses schema-based routes with validation). 4. Replace helmet/cors/morgan with Fastify-compatible alternatives. 5. Migrate error handling to Fastify\'s error handler. 6. Update JSON serialization (Fastify uses native JSON with schema). 7. Test all routes for parity. Performance gain: 2-3x throughput on the same hardware.', keyConcepts: ['Express', 'Fastify', 'migration', 'performance'], relatedFiles: ['server/src/app.js', 'server/src/routes/*.js'] },
    { category: 'design-pattern', difficulty: 'beginner', question: 'How does Express routing work in this project? How are routes organized?', suggestedAnswer: 'Routes are organized by feature in separate files under routes/: auth.routes.js, project.routes.js, analysis.routes.js, etc. Each file creates an Express Router, attaches middleware (authenticate, ownership, rate limiter), and maps HTTP methods/paths to controller functions. The main app.js mounts these routers on path prefixes (/api/auth, /api/projects, /api/analysis).', keyConcepts: ['Express Router', 'route organization', 'modular routing'], relatedFiles: ['server/src/routes/', 'server/src/app.js'] },
  ],
  MongoDB: [
    { category: 'tech-stack', difficulty: 'beginner', question: 'How does this project interact with MongoDB? What ODM is used and why?', suggestedAnswer: 'Mongoose is used as the ODM (Object Document Mapper). It provides schema validation, middleware (pre-save hooks), query building, population (joins), and type casting. Schemas define the document structure with field types, validation rules, and default values. Models provide an interface for CRUD operations.', keyConcepts: ['Mongoose', 'ODM', 'schemas', 'models'], relatedFiles: ['server/src/models/'] },
    { category: 'code-deep-dive', difficulty: 'intermediate', question: 'How are database relationships handled in this project? Give examples of referenced vs embedded documents.', suggestedAnswer: 'The project uses referenced documents mostly: Project references User via userId, AnalysisResult references Project via projectId, RefreshToken references User via userId. Embedded subdocuments are used for authProviders (array of provider objects within User). Mongoose .populate() is used sparingly — most lookups use findById or findOne with lean() for performance.', keyConcepts: ['document relationships', 'referencing', 'embedding', 'Mongoose population'], relatedFiles: ['server/src/models/Project.js', 'server/src/models/AnalysisResult.js'] },
    { category: 'architecture', difficulty: 'advanced', question: 'What MongoDB indexing strategy would you recommend for this project? Identify slow queries.', suggestedAnswer: 'Current indexes: User.email (unique), authProviders compound index, RefreshToken.tokenHash, RefreshToken.family, AnalysisResult.projectId (unique). Recommendations: 1. Add compound index on AnalysisResult: { userId: 1, generatedAt: -1 } for dashboard queries. 2. Add index on Project: { userId: 1, createdAt: -1 } for project listing. 3. TTL index on RefreshToken.expiresAt already exists. 4. Consider text index on Project.projectName for search. 5. Use .explain() to verify index usage on slow queries.', keyConcepts: ['MongoDB indexes', 'query optimization', 'compound indexes', 'TTL indexes'], relatedFiles: ['server/src/models/'] },
  ],
  Mongoose: [
    { category: 'code-deep-dive', difficulty: 'intermediate', question: 'How are Mongoose middleware (pre-save hooks) used in this project?', suggestedAnswer: 'The User schema has a pre-save hook that hashes the password using bcrypt before saving. It checks if the password field is modified and is not null (OAuth users don\'t have passwords). This ensures password hashing happens automatically without manual calls in the service layer. The hook uses SALT_ROUNDS=10 for bcrypt.', keyConcepts: ['Mongoose middleware', 'pre-save hooks', 'bcrypt hashing'], relatedFiles: ['server/src/models/User.js'] },
    { category: 'design-pattern', difficulty: 'intermediate', question: 'How does the project use Mongoose static and instance methods?', suggestedAnswer: 'Instance methods: toSafeObject() strips sensitive fields, comparePassword() checks bcrypt hash, hasProvider() checks OAuth providers, addProvider() adds new auth provider. Static methods: findByProvider() finds users by OAuth provider, createFromOAuth() handles OAuth user creation/update. These encapsulate model-specific logic rather than putting it in services.', keyConcepts: ['Mongoose methods', 'static methods', 'instance methods', 'encapsulation'], relatedFiles: ['server/src/models/User.js'] },
  ],
  Passport: [
    { category: 'auth', difficulty: 'intermediate', question: 'How does Passport.js handle OAuth authentication in this project? Walk through the Google OAuth flow.', suggestedAnswer: '1. User clicks "Sign in with Google" → redirected to /api/auth/google. 2. Passport redirects to Google\'s consent screen with client ID, redirect URI, and scopes. 3. User consents → Google redirects back to /api/auth/google/callback with auth code. 4. Passport exchanges code for access token via Google Strategy. 5. Strategy calls verify callback with profile data. 6. User.createFromOAuth upserts the user. 7. Passport attaches user to req and calls the controller. 8. Controller generates JWT + refresh token and redirects to client with tokens in URL params.', keyConcepts: ['OAuth 2.0', 'authorization code flow', 'Passport strategies', 'callback flow'], relatedFiles: ['server/src/config/passport.js', 'server/src/routes/auth.routes.js'] },
    { category: 'architecture', difficulty: 'advanced', question: 'How is Passport integrated with Express in this project? What\'s different from a session-based setup?', suggestedAnswer: 'This project uses stateless OAuth with session: false. Passport strategies are registered globally via passport.use(). Routes call passport.authenticate() as middleware. With session: false, Passport sets req.user directly without creating a session or serializing the user. The app doesn\'t need session middleware (express-session) or passport.session(). This is appropriate for APIs that use JWT for subsequent auth.', keyConcepts: ['stateless OAuth', 'Passport + Express', 'session vs token auth'], relatedFiles: ['server/src/config/passport.js'] },
  ],
  JWT: [
    { category: 'auth', difficulty: 'intermediate', question: 'How are JWT access tokens generated and verified in this project?', suggestedAnswer: 'The generateAccessToken function uses jsonwebtoken\'s sign() with the user\'s _id as the subject (sub claim), plus name, email, and role. It signs with ACCESS_TOKEN_SECRET and expiry from ACCESS_TOKEN_EXPIRY env (default 15m). Verification happens in the authenticate middleware: jwt.verify(token, secret) decodes the payload. If expired, a specific TokenExpiredError is thrown, triggering the refresh flow.', keyConcepts: ['JWT generation', 'JWT verification', 'token claims', 'expiry handling'], relatedFiles: ['server/src/utils/tokenUtils.js', 'server/src/middleware/authenticate.js'] },
    { category: 'architecture', difficulty: 'advanced', question: 'How does refresh token rotation work in this project? What security benefits does it provide?', suggestedAnswer: 'Refresh tokens use a "family" system. Each refresh token belongs to a family. On refresh: the old family\'s tokens are deleted, a new family is generated, and a new refresh token is issued. If an attacker steals a refresh token and uses it, the legitimate user\'s next refresh will fail (old token hash not found), indicating token theft. However, the current implementation doesn\'t revoke all families on suspected theft — it just returns an invalid token error. True replay detection would require revoking ALL families when a used token is replayed.', keyConcepts: ['token rotation', 'token families', 'replay attack prevention', 'security trade-offs'], relatedFiles: ['server/src/services/auth.service.js', 'server/src/utils/tokenUtils.js'] },
  ],
  bcrypt: [
    { category: 'auth', difficulty: 'beginner', question: 'How does bcrypt password hashing work in this project?', suggestedAnswer: 'During registration, the User model\'s pre-save hook hashes the password with bcrypt using 10 salt rounds. During login, the controller uses .select(\'+password\') to include the normally-hidden password field, then calls the comparePassword instance method which uses bcrypt.compare(). This constant-time comparison prevents timing attacks.', keyConcepts: ['bcrypt', 'password hashing', 'salt rounds', 'timing attack prevention'], relatedFiles: ['server/src/models/User.js', 'server/src/services/auth.service.js'] },
  ],
  Tailwind: [
    { category: 'tech-stack', difficulty: 'beginner', question: 'How is Tailwind CSS used for styling in this project?', suggestedAnswer: 'Tailwind CSS provides utility classes for all styling — no custom CSS files. The project uses a custom color scheme with mint green backgrounds (#C9EDDC section cards, #94DBBA page background, #D1F0E1 navbar). Components use utility classes for layout (flex, grid), spacing (p-*, m-*, space-y-*), typography (text-*, font-*), colors (bg-*, text-*, border-*), and responsive design.', keyConcepts: ['Tailwind CSS', 'utility-first CSS', 'custom theme', 'responsive design'] },
  ],
  Vite: [
    { category: 'tech-stack', difficulty: 'beginner', question: 'How is Vite configured to work with the Express backend in development?', suggestedAnswer: 'Vite\'s config sets up a dev server on port 5173 with a proxy rule: /api requests are forwarded to http://localhost:5000 (the Express server). This avoids CORS issues during development. The proxy has a 120s timeout for long-running analysis requests. The React plugin enables JSX transformation and HMR.', keyConcepts: ['Vite proxy', 'development proxy', 'HMR', 'CORS avoidance'], relatedFiles: ['client/vite.config.js'] },
  ],
  Axios: [
    { category: 'code-deep-dive', difficulty: 'intermediate', question: 'How does the Axios instance handle authentication for all API calls?', suggestedAnswer: 'The request interceptor reads the access token from localStorage and sets the Authorization header to `Bearer ${token}`. The response interceptor catches 401 errors: if it\'s a refresh token call, it rejects immediately; otherwise it queues the failed requests, calls /auth/refresh with the stored refresh token, updates tokens in localStorage, and retries the original requests. This makes auth transparent to all API callers.', keyConcepts: ['Axios interceptors', 'auto-attach token', 'auto-refresh', 'transparent auth'], relatedFiles: ['client/src/api/client.js'] },
  ],
  Zod: [
    { category: 'tech-stack', difficulty: 'intermediate', question: 'How does Zod validation work in the request pipeline? Walk through a login request.', suggestedAnswer: 'The login route has validate(loginSchema) middleware. The schema defines body fields with rules: email must be valid format and gets transformed to lowercase/trimmed, password must be >= 1 char. The middleware calls schema.safeParse() with req.body. If validation fails, it returns 400 with structured error messages. If successful, it replaces req.body with the validated (and transformed) data before passing to the controller.', keyConcepts: ['Zod validation', 'schema-based validation', 'request pipeline', 'error messages'], relatedFiles: ['server/src/middleware/validate.js', 'server/src/validators/auth.validator.js'] },
  ],
  Docker: [
    { category: 'deployment', difficulty: 'intermediate', question: 'How would you containerize this project with Docker? What services would you define?', suggestedAnswer: 'Create a docker-compose.yml with: 1. MongoDB service (mongo:7 image with volume for data persistence). 2. Server service (Node.js image, build from server/, expose port 5000, depends on mongo). 3. Client service (Node.js image, build from client/, serve built files via nginx, expose port 80). Use multi-stage builds for smaller images. Environment variables configured via .env or Docker secrets.', keyConcepts: ['Docker', 'containerization', 'docker-compose', 'multi-stage builds'] },
  ],
  'GitHub Actions': [
    { category: 'deployment', difficulty: 'intermediate', question: 'What CI/CD pipeline would you set up for this project?', suggestedAnswer: 'Create a GitHub Actions workflow that: 1. Triggers on push/PR to main. 2. Sets up Node.js and Python. 3. Runs npm install in both client/ and server/. 4. Runs linting (ESLint). 5. Runs server unit tests (Jest). 6. Runs client component tests (Vitest). 7. Builds the client (Vite build). 8. Optionally deploys to a hosting platform (Render, Railway, or VPS) on successful main branch push.', keyConcepts: ['CI/CD', 'GitHub Actions', 'automated testing', 'deployment pipeline'] },
  ],
};

// Fallback questions when no tech-specific questions match
const FALLBACK_TECH_QUESTIONS = {
  'code-deep-dive': [
    { difficulty: 'beginner', question: 'How does error handling work in this project? Describe the pattern used.', suggestedAnswer: 'The project uses a centralized error handling approach. Services throw AppError instances with status codes and error codes. Controllers catch these in try/catch blocks and pass them to the next() function. The errorHandler middleware checks the error type (AppError, Mongoose ValidationError, CastError, etc.) and returns appropriate structured JSON responses.', keyConcepts: ['error handling', 'AppError', 'centralized error handler', 'error middleware'] },
    { difficulty: 'intermediate', question: 'How are environment variables managed in this project? What happens if a required variable is missing?', suggestedAnswer: 'Environment variables are loaded from .env files using dotenv. A Zod schema validates all required variables on startup — if ACCESS_TOKEN_SECRET, MONGO_URI, or others are missing, the application logs detailed errors and exits immediately (fail-fast). Optional variables like OAuth credentials are marked with .optional() and conditionally enable features.', keyConcepts: ['environment variables', 'validation', 'fail-fast', 'configuration management'] },
    { difficulty: 'intermediate', question: 'How does the project handle file uploads and extraction? What happens to extracted files?', suggestedAnswer: 'Multer receives the uploaded zip file and saves it to uploads/{userId}/{projectId}/. The file is then extracted using adm-zip library into an extracted/ subdirectory. All text files in the extracted directory are read and parsed for static analysis. The uploaded zip and extracted files remain on the filesystem for future re-analysis.', keyConcepts: ['file uploads', 'zip extraction', 'adm-zip', 'file storage'] },
  ],
  architecture: [
    { difficulty: 'beginner', question: 'How is the project organized? What are the main directories and their purposes?', suggestedAnswer: 'Root has client/ (React frontend) and server/ (Express backend). Server: src/config/ (env, DB, Passport), src/controllers/ (HTTP handlers), src/services/ (business logic), src/models/ (Mongoose schemas), src/middleware/ (auth, validation, error handling), src/routes/ (route definitions), src/utils/ (helpers), src/validators/ (Zod schemas), src/jobs/ (scheduled tasks). Client: src/components/ (React components by feature), src/pages/ (route-level pages), src/context/ (React contexts), src/hooks/ (custom hooks), src/api/ (Axios API modules).', keyConcepts: ['project structure', 'code organization', 'separation of concerns'] },
  ],
  'tech-stack': [
    { difficulty: 'beginner', question: 'What is the tech stack of this project and why were these technologies chosen?', suggestedAnswer: 'MERN stack (MongoDB, Express, React, Node.js) with TypeScript-like patterns via Zod validation. Chosen for: 1. JavaScript throughout (full-stack language consistency). 2. React\'s component model for complex UIs. 3. MongoDB\'s flexibility for unstructured analysis data. 4. Express\'s simplicity and middleware ecosystem. 5. Node.js for async I/O performance. Additional tools: Vite (fast dev builds), Tailwind CSS (rapid styling), Passport.js (OAuth), Multer (uploads).', keyConcepts: ['MERN stack', 'technology choices', 'full-stack JavaScript'] },
  ],
};

/**
 * Generate interview questions based on static analysis results.
 * No AI — uses predefined question banks keyed by detected technologies.
 */
const generateQuestions = (staticAnalysis, project) => {
  const questions = [];
  const userId = project.userId || project._id;
  const seenPhrases = new Set();

  const addQuestion = (q, category) => {
    const phrase = q.question.substring(0, 40).toLowerCase();
    if (seenPhrases.has(phrase)) return;
    seenPhrases.add(phrase);

    questions.push({
      projectId: project._id,
      userId: project.userId,
      question: q.question,
      category: q.category || category,
      difficulty: q.difficulty || 'intermediate',
      suggestedAnswer: q.suggestedAnswer || '',
      keyConcepts: q.keyConcepts || [],
      relatedFiles: q.relatedFiles || [],
    });
  };

  // 1. Add category-based questions (up to 4 per category)
  const categoryOrder = ['architecture', 'tech-stack', 'code-deep-dive', 'design-pattern', 'problem-solving', 'behavioral', 'concept-based'];
  for (const cat of categoryOrder) {
    const pool = QUESTION_BANK[cat] || [];
    // Shuffle and pick up to 4
    // Fisher-Yates shuffle (avoids inconsistent comparator bugs with Array.sort)
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (const q of shuffled) {
      addQuestion(q, cat);
    }
  }

  // 2. Add tech-specific questions for detected technologies
  const detectedTechs = new Set();

  // Collect from tech stack
  if (staticAnalysis?.techStack) {
    const ts = staticAnalysis.techStack;
    const collect = (items) => {
      if (!items) return;
      for (const item of items) {
        detectedTechs.add(typeof item === 'string' ? item : item.name);
      }
    };
    collect(ts.languages);
    collect(ts.frameworks);
    collect(ts.frontend);
    collect(ts.backend);
    collect(ts.database);
    collect(ts.authentication);
    collect(ts.testing);
    collect(ts.build);
    collect(ts.deployment);
  }

  // Also from project's detectedTechStack
  if (project?.detectedTechStack) {
    for (const t of project.detectedTechStack) {
      detectedTechs.add(t);
    }
  }

  // Add external library names
  if (staticAnalysis?.externalLibraries) {
    for (const lib of staticAnalysis.externalLibraries) {
      detectedTechs.add(lib.name);
    }
  }

  // Map tech names to question pools
  const techQuestionSources = [
    ['React', 'React', 'React Router', 'react-router-dom', 'react-router'],
    ['Express', 'Express', 'express.js'],
    ['MongoDB', 'MongoDB', 'mongodb'],
    ['Mongoose', 'Mongoose', 'mongoose'],
    ['Passport', 'Passport', 'Passport.js', 'passport', 'passport-google-oauth20', 'passport-github2'],
    ['JWT', 'JWT', 'jsonwebtoken'],
    ['bcrypt', 'bcrypt', 'bcryptjs'],
    ['Tailwind', 'Tailwind CSS', 'Tailwind', 'tailwindcss'],
    ['Vite', 'Vite', 'vite'],
    ['Axios', 'Axios', 'axios'],
    ['Zod', 'Zod', 'zod'],
    ['Docker'],
    ['GitHub Actions'],
  ];

  for (const [canonicalName, ...aliases] of techQuestionSources) {
    const matched = aliases.some((a) =>
      [...detectedTechs].some((d) => d.toLowerCase() === a.toLowerCase())
    );
    if (!matched) continue;

    const pool = TECH_QUESTIONS[canonicalName];
    if (!pool) continue;

    for (const q of pool) {
      addQuestion(q, q.category);
    }
  }

  // 3. Add fallback tech questions for any detected tech not already covered
  // Find technologies that didn't get any specific questions
  const totalAdded = questions.length;

  // If we have very few questions (< 12), add fallback category questions
  if (totalAdded < 12) {
    const fallbackPools = ['code-deep-dive', 'architecture', 'tech-stack'];
    for (const cat of fallbackPools) {
      const pool = FALLBACK_TECH_QUESTIONS[cat] || [];
      for (const q of pool) {
        addQuestion(q, cat);
      }
    }
  }

  // Return with metadata
  const categoryCounts = {};
  for (const q of questions) {
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  }

  return {
    questions,
    stats: {
      total: questions.length,
      categories: categoryCounts,
      byDifficulty: {
        beginner: questions.filter((q) => q.difficulty === 'beginner').length,
        intermediate: questions.filter((q) => q.difficulty === 'intermediate').length,
        advanced: questions.filter((q) => q.difficulty === 'advanced').length,
      },
    },
  };
};

module.exports = { generateQuestions };
;
