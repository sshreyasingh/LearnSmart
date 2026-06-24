# LearnSmart — Complete MERN Architecture Plan

## 1. High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React SPA)                       │
│  Pages: Dashboard | Upload | Analysis | Visualizations |        │
│         Resume | Interview Prep                                 │
│  State: AuthContext | URL params for project navigation         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (REST + JWT Bearer)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Express)                        │
│  Rate Limiter → JWT/OAuth Middleware → Controllers              │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│   MongoDB   │  │  Temp Disk   │  │  OpenRouter  │
│  (Persist)  │  │  (Uploads)   │  │  (DeepSeek)  │
│             │  │              │  │              │
│ Users       │  │ ZIP files    │  │ AI Analysis  │
│ Projects    │  │ Extracted    │  │ Code Explan. │
│ Analysis    │  │ source code  │  │ Diagram Gen  │
│ Skills      │  │ (deleted     │  │ Q&A Gen      │
│ InterviewQs │  │  after       │  │ Skill Extr.  │
│             │  │  analysis)   │  │              │
└─────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow

1. **Register/Login** → JWT issued with refresh token; OAuth flows for Google/GitHub via Passport.js
2. **Upload ZIP** → Multer receives file → extract to `uploads/{userId}/{projectId}/` → count files, detect tech stack from extensions/package files
3. **AI Analysis Pipeline** (async job per project):
   - Read all extracted text files → chunk by size limits
   - Send to DeepSeek via OpenRouter with structured prompts
   - Collect responses: executive summary, architecture breakdown, workflow, beginner explanations, file-by-file explanations
   - Generate structured data for diagrams (dependency graph JSON, API flow steps, entity relationships)
   - Extract skills and generate resume highlights
   - Generate interview questions with answers
4. **Store Results** → Save all analysis output to MongoDB; delete temp files immediately
5. **Serve Visualizations** → Frontend fetches structured diagram data from API, renders with D3.js / Mermaid

### Security Layer

- JWT access tokens (15 min expiry) + refresh tokens (7 day expiry, stored hashed in DB)
- Passport.js strategies for Google OAuth 2.0 and GitHub OAuth
- Rate limiting: 5 uploads/analysis per user per hour
- File size cap: 50 MB ZIP, extracted files ignored beyond 200 MB total
- Temp files deleted within 5 minutes of analysis completion (or failure)
- Cron job sweeps orphaned temp dirs older than 1 hour
- All AI prompts sanitized — no secrets/files leaked outside the model call

### Technology Choices

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 18, React Router v6, Axios    |
| Visualization  | D3.js (graphs), Mermaid.js (flows)  |
| Styling        | Tailwind CSS                        |
| State Mgmt     | React Context + useReducer          |
| Backend        | Node.js, Express 4                  |
| Auth           | jsonwebtoken, passport, passport-google-oauth20, passport-github2 |
| Database       | MongoDB 7, Mongoose 8               |
| File Upload    | Multer, adm-zip (extraction)        |
| AI Integration | openai SDK (OpenRouter-compatible)  |
| Job Scheduling | node-cron (cleanup)                 |
| Validation     | Zod                                 |

---

## 2. Database Schema

### Users

```javascript
{
  _id: ObjectId,
  name: String, required
  email: String, required, unique, indexed
  password: String, // bcrypt hash, nullable for OAuth users
  authProviders: [{
    provider: 'local' | 'google' | 'github',
    providerId: String,                 // Google sub / GitHub id
    accessToken: String,                // encrypted at rest
  }],
  avatar: String,
  role: 'user' | 'admin', default: 'user',
  createdAt: Date, indexed
  updatedAt: Date
}
```

### Projects

```javascript
{
  _id: ObjectId,
  userId: ObjectId, ref: 'User', indexed
  projectName: String, required
  fileCount: Number,
  totalSizeKB: Number,
  detectedTechStack: [String],         // e.g. ["React", "Node.js", "MongoDB"]
  status: 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'failed',
  errorMessage: String,
  createdAt: Date, indexed
  updatedAt: Date
}
```

### AnalysisResults

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, ref: 'Project', indexed, unique
  userId: ObjectId, ref: 'User', indexed

  // Text Explanations (all stored as markdown)
  executiveSummary: String,
  architectureExplanation: String,
  workflowExplanation: String,
  beginnerFriendlyExplanation: String,

  // File-level explanations
  fileExplanations: [{
    filePath: String,
    language: String,
    purpose: String,
    explanation: String,               // markdown
    keyFunctions: [{ name: String, description: String, lineRange: String }]
  }],

  // Visualization Data (structured JSON for client-side rendering)
  dependencyGraph: {
    nodes: [{ id: String, label: String, type: 'module' | 'file' | 'package' | 'external', group: String }],
    edges: [{ from: String, to: String, relationship: 'imports' | 'extends' | 'uses' | 'calls' }]
  },
  apiFlows: [{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: String,
    handler: String,                   // file:function reference
    description: String,
    requestBody: Object,               // JSON schema
    responseBody: Object               // JSON schema
  }],
  databaseModels: [{
    name: String,
    fields: [{ name: String, type: String, required: Boolean, ref: String }],
    indexes: [String]
  }],
  dbRelationships: [{
    from: String, to: String,
    type: 'one-to-one' | 'one-to-many' | 'many-to-many',
    description: String
  }],
  executionFlow: [{
    step: Number,
    phase: String,
    description: String,
    entryPoint: String
  }],

  createdAt: Date
}
```

### Skills

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, ref: 'Project', indexed, unique
  userId: ObjectId, ref: 'User', indexed

  extractedSkills: [{
    name: String,
    category: 'language' | 'framework' | 'library' | 'tool' | 'database' | 'cloud' | 'pattern' | 'concept',
    proficiencyEvidence: String,       // what in the codebase demonstrates this
    yearsEquivalent: String            // AI-estimated experience level
  }],
  projectHighlights: [String],         // 5-7 resume-ready bullet points
  professionalSummary: String,         // 3-sentence AI-generated professional summary
  impactStatements: [String],          // quantified achievements where possible

  createdAt: Date
}
```

### InterviewQuestions

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, ref: 'Project', indexed, unique
  userId: ObjectId, ref: 'User', indexed

  questions: [{
    category: 'architecture' | 'code-deep-dive' | 'design-pattern' | 'tech-stack' | 'problem-solving' | 'behavioral',
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    question: String,
    suggestedAnswer: String,            // markdown
    relatedFiles: [String],             // paths in the project
    keyConcepts: [String]              // concepts to mention in answer
  }],

  createdAt: Date
}
```

### RefreshTokens

```javascript
{
  _id: ObjectId,
  userId: ObjectId, ref: 'User', indexed
  tokenHash: String, required           // SHA-256 of refresh token
  family: String, indexed              // token family for rotation detection
  expiresAt: Date, indexed, TTL
  createdAt: Date
}
```

---

## 3. Backend Folder Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.js                     # mongoose.connect with retry logic
│   │   ├── passport.js               # Google + GitHub strategies
│   │   ├── openrouter.js             # OpenRouter client config (baseURL + API key)
│   │   └── env.js                    # Zod/env-var validation for all env vars
│   │
│   ├── middleware/
│   │   ├── authenticate.js           # JWT verify — attaches req.user
│   │   ├── upload.js                 # Multer config: 50MB limit, .zip only, temp storage
│   │   ├── rateLimiter.js            # express-rate-limit: per-IP + per-user tiers
│   │   ├── errorHandler.js           # Global error handler, maps Mongoose/JWT errors to HTTP
│   │   ├── validate.js               # Zod validation middleware factory
│   │   └── projectOwnership.js       # Verifies project belongs to req.user
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── AnalysisResult.js
│   │   ├── Skill.js
│   │   ├── InterviewQuestion.js
│   │   └── RefreshToken.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js            # POST /register, /login, /refresh, /logout
│   │   │                             # GET /auth/google, /auth/google/callback
│   │   │                             # GET /auth/github, /auth/github/callback
│   │   ├── project.routes.js         # POST / (upload), GET /, GET /:id, DELETE /:id
│   │   ├── analysis.routes.js        # GET /:projectId, GET /:projectId/status
│   │   │                             # POST /:projectId/regenerate
│   │   ├── skill.routes.js           # GET /:projectId
│   │   └── interview.routes.js       # GET /:projectId, POST /:projectId/custom-question
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── project.controller.js
│   │   ├── analysis.controller.js
│   │   ├── skill.controller.js
│   │   └── interview.controller.js
│   │
│   ├── services/
│   │   ├── ai.service.js             # Calls OpenRouter DeepSeek with retry + backoff
│   │   ├── file.service.js           # adm-zip extraction, file tree traversal,
│   │   │                             # binary detection, .gitignore-aware filtering
│   │   ├── analysis.service.js       # Orchestrates full analysis pipeline:
│   │   │                             #   1. Read all files → chunk
│   │   │                             #   2. Call AI for each analysis type
│   │   │                             #   3. Parse AI JSON responses
│   │   │                             #   4. Save to MongoDB
│   │   │                             #   5. Trigger cleanup
│   │   ├── visualization.service.js  # Structures AI output into graph/diagram JSON
│   │   ├── resume.service.js         # Skill extraction + highlight generation
│   │   ├── interview.service.js      # Interview question generation + custom Q&A
│   │   └── cleanup.service.js        # Deletes temp files, cron job registration
│   │
│   ├── utils/
│   │   ├── prompts.js                # All AI prompt templates (system + user messages)
│   │   ├── fileUtils.js              # getFileTree, filterBinary, chunkFiles
│   │   ├── tokenUtils.js             # generateAccessToken, generateRefreshToken,
│   │   │                             # hashToken, rotateRefreshTokenFamily
│   │   └── AppError.js               # Custom error class with statusCode
│   │
│   ├── validators/
│   │   ├── auth.validator.js         # Zod schemas for register/login bodies
│   │   ├── project.validator.js      # Upload validation schema
│   │   └── interview.validator.js
│   │
│   ├── jobs/
│   │   └── cleanup.job.js            # node-cron: runs every 30 min, deletes orphaned temp dirs
│   │
│   └── app.js                        # Express setup, middleware chain, route mounting, error handler
│
├── uploads/                          # Temp extraction dir (gitignored, Docker volume)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/                     # Small sample ZIPs for testing
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml                # app + mongo
└── package.json
```

### Key Dependencies (server/package.json)

```json
{
  "dependencies": {
    "express": "^4.18",
    "mongoose": "^8",
    "jsonwebtoken": "^9",
    "passport": "^0.7",
    "passport-google-oauth20": "^2",
    "passport-github2": "^0.1",
    "bcryptjs": "^2.4",
    "multer": "^1.4",
    "adm-zip": "^0.5",
    "openai": "^4",
    "zod": "^3.22",
    "express-rate-limit": "^7",
    "node-cron": "^3",
    "cors": "^2.8",
    "helmet": "^7",
    "morgan": "^1.10",
    "dotenv": "^16"
  }
}
```

---

## 4. Frontend Folder Structure

```
client/
├── public/
│   ├── index.html
│   └── favicon.svg
│
├── src/
│   ├── api/
│   │   ├── client.js                # Axios instance: baseURL, interceptors
│   │   │                            # — request: attach JWT from localStorage
│   │   │                            # — response: 401 → refresh token → retry
│   │   ├── auth.api.js              # login, register, logout, refreshToken,
│   │   │                            # getGoogleAuthUrl, getGithubAuthUrl
│   │   ├── project.api.js           # uploadProject (FormData), getProjects,
│   │   │                            # getProject, deleteProject
│   │   ├── analysis.api.js          # getAnalysis, getAnalysisStatus, regenerateAnalysis
│   │   ├── skill.api.js             # getSkills
│   │   └── interview.api.js         # getQuestions, askCustomQuestion
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx           # Responsive nav, auth-aware (login/avatar)
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx   # Full-page & inline variants
│   │   │   ├── LoadingSkeleton.jsx  # Content placeholder while loading
│   │   │   ├── ErrorBoundary.jsx    # React error boundary
│   │   │   ├── ErrorAlert.jsx       # Dismissible error banner
│   │   │   ├── ProtectedRoute.jsx   # Redirects to login if not authenticated
│   │   │   ├── EmptyState.jsx       # "No projects yet" with CTA
│   │   │   ├── FileUploader.jsx     # Drag-and-drop ZIP uploader with progress
│   │   │   └── StatusBadge.jsx      # processing/completed/failed pill badge
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx        # Email + password form
│   │   │   ├── RegisterForm.jsx     # Name + email + password form
│   │   │   └── OAuthButtons.jsx     # "Continue with Google" / "Continue with GitHub"
│   │   │
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.jsx      # Card: name, tech stack badges, status, date
│   │   │   ├── ProjectList.jsx      # Grid of ProjectCards
│   │   │   ├── StatsOverview.jsx    # Total projects, skills extracted, etc.
│   │   │   └── QuickUpload.jsx      # Inline upload CTA
│   │   │
│   │   ├── analysis/
│   │   │   ├── ExecutiveSummary.jsx     # Markdown rendered summary
│   │   │   ├── ArchitectureBreakdown.jsx # Markdown + key diagram thumbnail
│   │   │   ├── WorkflowExplanation.jsx   # Step-by-step workflow
│   │   │   ├── BeginnerGuide.jsx        # Simplified "Explain Like I'm 5" version
│   │   │   ├── FileExplanations.jsx     # Accordion list of file-by-file explanations
│   │   │   ├── FileExplanationCard.jsx  # Single file explanation with purpose
│   │   │   └── TechStackBadges.jsx      # Colored badges for detected technologies
│   │   │
│   │   ├── visualization/
│   │   │   ├── DependencyGraph.jsx      # D3.js force-directed graph
│   │   │   ├── APIFlowDiagram.jsx       # Mermaid sequence diagram
│   │   │   ├── DatabaseERDiagram.jsx    # Mermaid ER diagram
│   │   │   ├── ExecutionFlow.jsx        # Animated step progression
│   │   │   └── DiagramControls.jsx      # Zoom, pan, export, fullscreen
│   │   │
│   │   ├── resume/
│   │   │   ├── SkillExtractor.jsx       # Categorized skill list with evidence
│   │   │   ├── SkillCard.jsx            # Single skill with proficiency bar
│   │   │   ├── ProjectHighlights.jsx    # Resume bullet points
│   │   │   └── ResumeSummary.jsx        # Professional summary paragraph
│   │   │
│   │   └── interview/
│   │       ├── QuestionList.jsx         # Filterable list of questions
│   │       ├── QuestionCard.jsx         # Question + expandable answer
│   │       ├── CategoryFilter.jsx       # Filter by category/difficulty
│   │       └── CustomQuestion.jsx       # "Ask your own question" input
│   │
│   ├── pages/
│   │   ├── HomePage.jsx             # Landing: hero, features, CTA
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── OAuthCallbackPage.jsx    # Handles Google/GitHub callback redirects
│   │   ├── DashboardPage.jsx        # Project list + stats + quick upload
│   │   ├── UploadPage.jsx           # Full upload flow with progress
│   │   ├── AnalysisPage.jsx         # Tabbed view: Summary | Architecture |
│   │   │                           #   Workflow | Beginner Guide | Files
│   │   ├── VisualizationPage.jsx    # Tabbed view: Dependencies | API Flows |
│   │   │                           #   Database | Execution Flow
│   │   ├── ResumePage.jsx           # Skills + Highlights + Summary
│   │   ├── InterviewPage.jsx        # Question list + custom Q&A
│   │   └── NotFoundPage.jsx         # 404
│   │
│   ├── hooks/
│   │   ├── useAuth.js               # AuthContext consumer hook
│   │   ├── useProject.js            # Project CRUD operations
│   │   ├── useAnalysis.js           # Fetch analysis + polling for status
│   │   ├── useUpload.js             # Upload with progress tracking
│   │   └── useDebounce.js           # Debounced value hook
│   │
│   ├── context/
│   │   └── AuthContext.jsx           # Auth state, login/logout/refresh actions
│   │
│   ├── utils/
│   │   ├── formatters.js            # Date formatting, bytes-to-human, etc.
│   │   ├── markdown.js              # Markdown-to-HTML sanitizer config
│   │   ├── constants.js             # Route paths, API base URL, tech colors
│   │   └── storage.js               # localStorage helpers (token get/set/clear)
│   │
│   ├── styles/
│   │   └── index.css                # Tailwind directives + custom theme vars
│   │
│   ├── App.jsx                      # Router setup, AuthProvider wrap
│   └── index.jsx                    # ReactDOM.createRoot entry
│
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js                   # Vite as bundler (proxy to backend)
├── .env.example                     # VITE_API_BASE_URL
├── .gitignore
└── package.json
```

### Key Dependencies (client/package.json)

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.23",
    "axios": "^1.7",
    "d3": "^7.9",
    "mermaid": "^10.9",
    "react-markdown": "^9",
    "rehype-sanitize": "^6",
    "react-dropzone": "^14",
    "clsx": "^2"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3.4",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## 5. API Endpoint Design

| Method | Path                                 | Auth | Description                          |
|--------|--------------------------------------|------|--------------------------------------|
| POST   | /api/auth/register                   | No   | Email + password registration        |
| POST   | /api/auth/login                      | No   | Email + password login → tokens      |
| POST   | /api/auth/refresh                    | No*  | Refresh access token                 |
| POST   | /api/auth/logout                     | Yes  | Revoke refresh token family          |
| GET    | /api/auth/google                     | No   | Redirect to Google OAuth             |
| GET    | /api/auth/google/callback            | No   | Google OAuth callback                |
| GET    | /api/auth/github                     | No   | Redirect to GitHub OAuth             |
| GET    | /api/auth/github/callback            | No   | GitHub OAuth callback                |
| GET    | /api/auth/me                         | Yes  | Get current user profile             |
| POST   | /api/projects                        | Yes  | Upload ZIP (multipart/form-data)     |
| GET    | /api/projects                        | Yes  | List user's projects (paginated)     |
| GET    | /api/projects/:id                    | Yes  | Get project details + status         |
| DELETE | /api/projects/:id                    | Yes  | Delete project + all related data    |
| GET    | /api/projects/:id/analysis           | Yes  | Get full analysis results            |
| GET    | /api/projects/:id/analysis/status    | Yes  | Poll analysis progress               |
| POST   | /api/projects/:id/analysis/regenerate| Yes  | Re-run analysis (deletes old first)  |
| GET    | /api/projects/:id/skills             | Yes  | Get extracted skills & highlights    |
| GET    | /api/projects/:id/interview          | Yes  | Get generated interview questions    |
| POST   | /api/projects/:id/interview/ask      | Yes  | Ask custom question about project    |

\* Refresh requires a valid refresh token in the request body.

---

## 6. AI Analysis Pipeline (OpenRouter + DeepSeek)

### Prompt Strategy

The AI service sends **structured prompts** to DeepSeek via OpenRouter. Each prompt type has a dedicated template in `utils/prompts.js`:

1. **Executive Summary** — "Summarize this project in 500 words: purpose, key features, target users"
2. **Architecture Explanation** — "Explain the high-level architecture. Identify patterns (MVC, microservices, etc.), component relationships, and data flow"
3. **Workflow Explanation** — "Trace the main user journey / request lifecycle. Step-by-step with entry points and key functions"
4. **Beginner Explanation** — "Explain this project to a junior developer. Avoid jargon. Focus on concepts, not implementation details"
5. **File Explanations** — "For each file: explain its purpose, key functions, and how it connects to other files"
6. **Dependency Graph** — "Return a JSON object with nodes and edges representing file/module dependencies"
7. **API Flows** — "Identify all API endpoints. Return JSON with method, path, handler, request/response schema"
8. **Database Models** — "Identify data models/entities. Return JSON with field names, types, and relationships"
9. **Execution Flow** — "Return an ordered list of execution steps for the main workflow"
10. **Skills Extraction** — "List technologies and skills demonstrated in this codebase. Categorize by type. Estimate proficiency level"
11. **Resume Highlights** — "Generate 5-7 impactful resume bullet points based on this project"
12. **Interview Questions** — "Generate 10 interview questions (varying difficulty) with suggested answers based on this codebase"

### Chunking Strategy (for large codebases)

- Read all text files from extracted project
- If total token count < 100k → send entire codebase in one prompt
- If > 100k → split by directory/module, summarize each chunk, then synthesize
- Always send `package.json`, config files, and entry points in every chunk for context

### Response Parsing

- AI responses that should be JSON include `"Return ONLY valid JSON"` instruction
- Fallback: try/catch JSON.parse → if fails, request regeneration with stricter prompt
- Markdown responses stored as-is in MongoDB

---

## 7. Verification Plan

### Backend Verification

1. **Auth Flow** — Test register, login, token refresh, Google OAuth, GitHub OAuth end-to-end
2. **Upload Flow** — Upload sample ZIP → verify extraction → verify file count → verify cleanup
3. **Analysis Pipeline** — Upload known small project → verify all 5 analysis types stored → verify diagram JSON is valid → verify skills extracted
4. **Error Cases** — No file, wrong file type, oversized file, corrupt ZIP, AI API failure, invalid token
5. **Cleanup Cron** — Create orphaned temp dir → run cron manually → verify deleted
6. **Rate Limiting** — Rapid-fire uploads → verify 429 responses

### Frontend Verification

1. **Auth UI** — Register → login → redirect to dashboard; OAuth button redirects work
2. **Upload UI** — Drag-and-drop ZIP → progress bar → redirect to analysis page
3. **Loading States** — Skeleton loaders appear during API calls; spinner during analysis processing
4. **Analysis Display** — All tabs render correctly; markdown formatted; tech stack badges visible
5. **Visualizations** — D3 graph renders with correct nodes/edges; Mermaid diagrams render; execution flow animates
6. **Resume Page** — Skills categorized; highlights displayed; summary paragraph readable
7. **Interview Page** — Questions filterable by category/difficulty; custom question endpoint works
8. **Responsive** — All pages functional at 320px, 768px, 1440px widths

---

## 8. Key Architectural Decisions

1. **No WebSockets** — Analysis is long-running but the user only needs status after upload. Simple polling (`/analysis/status`) is sufficient and simpler.
2. **ZIP extraction on disk, not memory** — Safer for large projects. adm-zip extracts to temp dir, files read one at a time for AI analysis.
3. **OpenAI SDK for OpenRouter** — OpenRouter is OpenAI-API-compatible. Using `openai` npm package with custom `baseURL` avoids a custom HTTP client.
4. **Multiple OAuth strategies via Passport** — Battle-tested, handles callbacks, session serialization (not needed with JWT, but Passport still manages the OAuth dance).
5. **Token rotation on refresh** — Each refresh invalidates the previous token family. Prevents replay attacks on refresh tokens.
6. **Separate collections for Analysis, Skills, Interview** — Denormalized for read performance. A user views analysis far more often than they upload.
7. **Vite over CRA** — Faster dev server, native ESM, better tree-shaking.
