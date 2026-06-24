# LearnSmart — Upload & Analysis Pipeline Architecture

---

## 1. Overview

The upload module handles ZIP ingestion, extraction, and triggers the AI analysis pipeline. Source code is **never persisted** — the extracted directory lives only long enough for the analysis service to read all files into memory, after which it is immediately deleted.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UPLOAD PIPELINE                             │
│                                                                      │
│   CLIENT          API              DISK               AI / DB        │
│   ──────          ───              ────               ───────        │
│                                                                      │
│   Upload ZIP ──►  Multer ──►  /uploads/{uid}/{pid}.zip              │
│                      │                                               │
│                      ▼                                               │
│                  adm-zip ──►  /uploads/{uid}/{pid}/                  │
│                      │           ├── src/                            │
│                      │           ├── package.json                    │
│                      │           └── ...                             │
│                      │                                               │
│                      ▼                                               │
│              file.service ──►  Read all text files                   │
│                      │         Detect binary files                   │
│                      │         Build file tree                       │
│                      │         Detect tech stack                     │
│                      │         Count files/size                      │
│                      │                                               │
│                      ▼                                               │
│            analysis.service ──►  Chunk files by token limit          │
│                      │           ┌──────────────────────┐            │
│                      │           │   AI CALLS (parallel) │            │
│                      │           │                      │            │
│                      │           │ 1. Executive Summary │            │
│                      │           │ 2. Architecture      │            │
│                      │           │ 3. Workflow          │            │
│                      │           │ 4. Beginner Guide    │            │
│                      │           │ 5. File Explanations │            │
│                      │           │ 6. Dependency Graph  │            │
│                      │           │ 7. API Flows         │            │
│                      │           │ 8. DB Models         │            │
│                      │           │ 9. Execution Flow    │            │
│                      │           │ 10. Skills Extract   │            │
│                      │           │ 11. Resume Highlights│            │
│                      │           │ 12. Interview Qs     │            │
│                      │           └──────────┬───────────┘            │
│                      │                      │                        │
│                      ▼                      ▼                        │
│              cleanup.service      SAVE to MongoDB                    │
│                   │               ┌──────────────────┐               │
│                   │               │ AnalysisResults  │               │
│                   │               │ Skills           │               │
│                   │               │ InterviewQs      │               │
│                   │               │ Project.status   │               │
│                   │               └──────────────────┘               │
│                   │                                                  │
│                   ▼                                                  │
│            rm -rf /uploads/{uid}/{pid}/                              │
│                                                                      │
│            Source code DELETED — only AI output remains              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Lifecycle State Machine

```
                  ┌──────────┐
                  │UPLOADING │   Multer receives ZIP, writing to disk
                  └────┬─────┘
                       │
                       ▼
                  ┌───────────┐
                  │EXTRACTING │   adm-zip extracting to temp directory
                  └─────┬─────┘
                        │
                        ▼
                  ┌───────────┐
                  │ ANALYZING │   AI pipeline running (this is the long step)
                  └─────┬─────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────┐        ┌──────────┐
        │COMPLETED │        │  FAILED  │
        └──────────┘        └──────────┘
```

Status transitions are atomic. At any point if an error occurs, the project is marked `failed` and temp files are cleaned up.

| Status       | Description                                           | Temp files exist |
|--------------|-------------------------------------------------------|:----------------:|
| `uploading`  | Multer receiving the file                             | Partial          |
| `extracting` | ZIP being extracted                                   | Yes              |
| `analyzing`  | AI pipeline in progress                               | Yes              |
| `completed`  | All analysis saved to DB, temp files deleted          | No               |
| `failed`     | Error occurred somewhere in the pipeline              | No               |

---

## 3. File & Directory Architecture

```
server/src/
├── middleware/
│   └── upload.js                 # Multer config + file type validation
│
├── services/
│   ├── file.service.js           # Extraction, traversal, tech detection
│   ├── analysis.service.js       # Orchestrates the full AI analysis pipeline
│   ├── ai.service.js             # Raw OpenRouter API calls (retry + backoff)
│   ├── resume.service.js         # Skill extraction formatting
│   ├── interview.service.js      # Question generation + custom Q&A
│   ├── visualization.service.js  # Structures AI output into graph JSON
│   └── cleanup.service.js        # Deletes temp dirs, registers cron job
│
├── controllers/
│   ├── project.controller.js     # upload, list, get, delete
│   ├── analysis.controller.js    # getAnalysis, getStatus, regenerate
│   ├── skill.controller.js       # getSkills
│   └── interview.controller.js   # getQuestions, askCustom
│
├── routes/
│   ├── project.routes.js
│   ├── analysis.routes.js
│   ├── skill.routes.js
│   └── interview.routes.js
│
├── models/
│   ├── Project.js
│   ├── AnalysisResult.js
│   ├── Skill.js
│   └── InterviewQuestion.js
│
├── utils/
│   ├── prompts.js                # All AI prompt templates
│   └── fileUtils.js              # Text file detection, file tree construction
│
├── validators/
│   └── project.validator.js
│
├── jobs/
│   └── cleanup.job.js            # node-cron orphan cleanup
│
└── uploads/                      # Temp extraction root (gitignored)
    └── {userId}/
        └── {projectId}/
            ├── project.zip       # Original upload (deleted after extraction)
            └── extracted/        # Extracted contents (deleted after analysis)
```

---

## 4. Multer Middleware (`middleware/upload.js`)

```
┌─────────────────────────────────────────────────────┐
│                  upload middleware                    │
│                                                      │
│  Storage: Memory (no disk write by Multer itself)    │
│                                                      │
│  Validation:                                         │
│    ├── fileSize: 50 MB max                           │
│    ├── fileFilter: application/zip,                  │
│    │   application/x-zip-compressed,                 │
│    │   application/octet-stream                      │
│    └── Reject if req.file === undefined              │
│         → 400 "ZIP file is required"                 │
│                                                      │
│  Limits:                                             │
│    ├── fileSize: 50 * 1024 * 1024                    │
│    └── files: 1                                      │
│                                                      │
│  Error handling:                                     │
│    ├── MulterError → 400 with details                │
│    └── Unknown → 500                                 │
└─────────────────────────────────────────────────────┘
```

---

## 5. File Service (`services/file.service.js`)

### 5.1 Interface

```
IFileService
├── extractZip(buffer, outputPath): Promise<{ fileCount, totalSizeKB, tree }>
│     Writes buffer to temp .zip → adm-zip extracts → walks tree
│
├── getFileTree(rootPath): Promise<FileNode>
│     Recursive directory walk, returns nested tree
│
├── readAllTextFiles(rootPath): Promise<TextFile[]>
│     Reads every non-binary file, returns [{ path, content, language, sizeKB }]
│
├── filterBinaryFiles(filePaths): Promise<string[]>
│     Reads first 8KB of each file, checks for null bytes → marks binary
│
├── detectTechStack(rootPath): Promise<string[]>
│     Looks at package.json, requirements.txt, pom.xml, etc.
│     Also counts file extensions (.ts, .jsx, .py, etc.)
│
├── shouldIgnore(filePath): boolean
│     Respects .gitignore, ignores node_modules, .git, dist, build, __pycache__
│
└── removeDir(dirPath): Promise<void>
      rimraf/sync removal of temp directory
```

### 5.2 File Node Structure

```typescript
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;           // relative to extract root
  sizeKB?: number;
  language?: string;      // detected from extension
  isBinary?: boolean;
  children?: FileNode[];  // only for directories
}
```

### 5.3 Binary Detection

```
For each file:
  1. Read first 8192 bytes
  2. Check for null byte (0x00) → binary
  3. Check extension against known binary list:
     .jpg .png .gif .ico .svg .woff .woff2 .ttf .eot .mp3 .mp4 .webm .pdf .zip .tar .gz .exe .dll .so .o .class .pyc .wasm
  4. If extension is unknown → scan content for binary patterns
  5. Return filtered list of text files only
```

### 5.4 Tech Stack Detection

```
Priority order:
  1. package.json      → Node.js, React, Next.js, Express, TypeScript, etc.
  2. tsconfig.json     → TypeScript
  3. requirements.txt  → Python, Flask, Django, FastAPI, etc.
  4. pom.xml           → Java, Spring Boot, Maven
  5. build.gradle      → Java, Kotlin, Gradle
  6. go.mod            → Go
  7. Cargo.toml        → Rust
  8. composer.json     → PHP, Laravel
  9. Gemfile           → Ruby, Rails
  10. Dockerfile       → Docker
  11. .github/         → GitHub Actions

Fallback: Count file extensions
  .js/.jsx → JavaScript/React
  .ts/.tsx → TypeScript
  .py      → Python
  .java    → Java
  .go      → Go
  .rs      → Rust
  ...etc
```

### 5.5 Directory Ignore List (Hardcoded + .gitignore-aware)

```
ALWAYS IGNORE:
  node_modules, .git, .svn, .hg
  dist, build, out, target
  __pycache__, .pytest_cache, .mypy_cache
  .next, .nuxt
  coverage, .nyc_output
  .DS_Store, Thumbs.db
  *.min.js, *.bundle.js, *.chunk.js
  vendor, bower_components
  package-lock.json, yarn.lock, pnpm-lock.yaml
  *.pyc, *.pyo, *.class, *.o, *.so, *.dll
  *.zip, *.tar, *.gz, *.rar, *.7z
  *.jpg, *.png, *.gif, *.ico, *.svg, *.pdf
  *.ttf, *.woff, *.woff2, *.eot
  *.mp3, *.mp4, *.wav, *.webm

ADDITIONAL from .gitignore (parsed if present)
```

---

## 6. Analysis Service (`services/analysis.service.js`)

### 6.1 Interface

```
IAnalysisService
├── runFullAnalysis(projectId, extractPath): Promise<void>
│     Orchestrates the complete pipeline:
│      1. Read all text files
│      2. Chunk by token limit
│      3. Call AI for 12 analysis types
│      4. Parse and validate responses
│      5. Save to MongoDB
│      6. Trigger cleanup
│      7. Update project status
│
├── analyzeProject(projectId): Promise<void>
│     Public entry point called by controller
│     Sets status=analyzing → runs pipeline → updates status
│
├── regenerateAnalysis(projectId): Promise<void>
│     Deletes old AnalysisResult/Skill/InterviewQuestion docs
│     Requires re-upload of ZIP (temp files are gone)
│
└── getAnalysisStatus(projectId): Promise<{status, progress}>
      Returns current status + progress percentage
```

### 6.2 Analysis Execution Order

```
PHASE 1: FILE READING (sequential)
  ├── 1.1 Read all text files from extract dir           ~500ms
  ├── 1.2 Detect tech stack from files                   ~100ms
  └── 1.3 Build combined context string for AI           ~200ms

PHASE 2: CORE ANALYSIS (parallel — max 3 concurrent)
  ├── 2.1 Executive Summary (prompt #1)                  ~3-5s
  ├── 2.2 Architecture Explanation (prompt #2)           ~5-8s
  ├── 2.3 Workflow Explanation (prompt #3)               ~5-8s
  └── 2.4 Beginner-Friendly Explanation (prompt #4)      ~4-6s

PHASE 3: DETAILED ANALYSIS (parallel — max 3 concurrent)
  ├── 3.1 File Explanations (prompt #5)                  ~8-15s
  ├── 3.2 Dependency Graph (prompt #6)                   ~5-10s
  └── 3.3 API Flows (prompt #7)                          ~5-10s

PHASE 4: STRUCTURED DATA (parallel — max 3 concurrent)
  ├── 4.1 Database Models (prompt #8)                    ~4-8s
  ├── 4.2 Execution Flow (prompt #9)                     ~4-8s
  └── 4.3 Skills Extraction (prompt #10)                 ~5-10s

PHASE 5: RESUME & INTERVIEW (parallel)
  ├── 5.1 Resume Highlights (prompt #11)                 ~4-8s
  └── 5.2 Interview Questions (prompt #12)               ~6-12s

PHASE 6: PERSIST & CLEANUP
  ├── 6.1 Save AnalysisResult to MongoDB
  ├── 6.2 Save Skills to MongoDB
  ├── 6.3 Save InterviewQuestions to MongoDB
  ├── 6.4 Update Project.status = 'completed'
  └── 6.5 Delete temp extraction directory

Total estimated time: 30-90 seconds for a medium project
```

### 6.3 Progress Calculation

```
const PROGRESS_WEIGHTS = {
  fileReading:   10,  // Phase 1
  coreAnalysis:  25,  // Phase 2 (4 prompts × 6.25%)
  detailedAnalysis: 25,  // Phase 3 (3 prompts × 8.33%)
  structuredData: 25,  // Phase 4 (3 prompts × 8.33%)
  resumeInterview: 10,  // Phase 5 (2 prompts × 5%)
  persist:        5,  // Phase 6
};

Progress stored on Project document:
  project.analysisProgress = 0-100 (updated in real-time)
```

---

## 7. AI Service (`services/ai.service.js`)

### 7.1 Interface

```
IAIService
├── callDeepSeek(prompt: string, options?: CallOptions): Promise<string>
│     Sends prompt to OpenRouter, returns raw text response
│
├── callDeepSeekJSON(prompt: string): Promise<object>
│     Calls callDeepSeek with "Return ONLY valid JSON" instruction
│     Attempts JSON.parse, retries once on failure
│
├── summarizeCodebase(codebaseContext, promptType): Promise<string>
│     Prepares full prompt by combining codebase context + prompt template
│
└── getTokenCount(text): number
      Rough estimate: chars / 4 (used for chunking decisions)
```

### 7.2 Call Options & Retry Policy

```
CallOptions:
  temperature: 0.2 (low — we want deterministic analysis)
  maxTokens: 4096 (for most calls)
  maxTokens: 8192 (for file explanations, interview questions)
  timeout: 60000ms (60 seconds per call)

Retry Policy:
  Max attempts: 3
  Backoff: exponential (1s → 2s → 4s)
  Retry on: 429 (rate limit), 5xx (server errors)
  Do NOT retry on: 400, 401, 402, 403

Rate Limit Handling:
  If 429 response:
    1. Read Retry-After header
    2. Wait that duration + 500ms jitter
    3. Retry
```

### 7.3 OpenRouter Client Configuration

```javascript
const openai = new OpenAI({
  baseURL: env.OPENROUTER_BASE_URL,        // https://openrouter.ai/api/v1
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': env.CLIENT_URL,
    'X-Title': 'LearnSmart',
  },
  maxRetries: 3,
  timeout: 60000,
});
```

---

## 8. Prompt Strategy (`utils/prompts.js`)

### 8.1 Prompt Structure

Each prompt has three parts:

```
┌────────────────────────────────────┐
│ SYSTEM MESSAGE                     │
│ "You are a senior software         │
│  architect analyzing codebases..." │
│ + Role definition                  │
│ + Output format instructions       │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ CODEBASE CONTEXT                   │
│ "Here is the project to analyze:"  │
│                                    │
│ [File tree structure]              │
│                                    │
│ --- src/index.js ---               │
│ [file content]                     │
│ --- src/utils.js ---               │
│ [file content]                     │
│ ...all text files...               │
│                                    │
│ Detected tech stack: [...]         │
│ Total files: N                     │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ SPECIFIC PROMPT                    │
│ Varies by analysis type            │
└────────────────────────────────────┘
```

### 8.2 Prompt Catalog

| # | Prompt Key           | Return Type | Description |
|---|---------------------|-------------|-------------|
| 1 | `executiveSummary`  | Markdown    | 500-word summary: purpose, features, target users |
| 2 | `architecture`      | Markdown    | High-level architecture, patterns, component relationships |
| 3 | `workflow`          | Markdown    | Step-by-step user journey / request lifecycle |
| 4 | `beginnerGuide`     | Markdown    | ELI5 explanation, no jargon, focus on concepts |
| 5 | `fileExplanations`  | JSON        | Array of {filePath, language, purpose, explanation, keyFunctions} |
| 6 | `dependencyGraph`   | JSON        | {nodes: [...], edges: [...]} — D3 ready |
| 7 | `apiFlows`          | JSON        | Array of {method, path, handler, description, requestBody, responseBody} |
| 8 | `databaseModels`    | JSON        | Array of {name, fields, indexes} |
| 9 | `executionFlow`     | JSON        | Array of {step, phase, description, entryPoint} |
| 10 | `skills`            | JSON        | Array of {name, category, proficiencyEvidence, yearsEquivalent} |
| 11 | `resumeHighlights`  | JSON        | {projectHighlights: [...], professionalSummary: "...", impactStatements: [...]} |
| 12 | `interviewQuestions`| JSON        | Array of {category, difficulty, question, suggestedAnswer, relatedFiles, keyConcepts} |

### 8.3 Chunking Strategy

```
TOKEN ESTIMATE: characters / 4

IF totalTokens <= 80000:
  → Send ALL files in a single prompt

IF totalTokens > 80000:
  → STRATEGY: Chunk by directory, merge results
  
  Phase A — Per-directory analysis:
    1. Group files by top-level directory
    2. For each directory: send ALL files in that dir + package.json + configs
    3. Collect per-directory summaries from AI
  
  Phase B — Synthesis:
    1. Combine all per-directory summaries
    2. Send synthesis prompt to AI
    3. Generate final cross-cutting analysis
    
  NOTE: This increases AI calls by ~30% but keeps within token limits
```

---

## 9. Cleanup Service (`services/cleanup.service.js`)

### 9.1 Interface

```
ICleanupService
├── deleteProjectFiles(userId, projectId): Promise<void>
│     Removes /uploads/{userId}/{projectId}/ and .zip
│     Called immediately after analysis completes or fails
│
├── cleanupOrphanedDirs(): Promise<{ removed, errors }>
│     Scans /uploads/ for directories older than 1 hour
│     Called by cron job every 30 minutes
│     Returns count of removed dirs and any errors
│
└── registerCronJob(): void
      Sets up node-cron: '*/30 * * * *' → cleanupOrphanedDirs
```

### 9.2 Cleanup Triggers

```
TRIGGER 1: After successful analysis
  analysis.service.js → save to DB → cleanupService.deleteProjectFiles()

TRIGGER 2: After failed analysis
  analysis.service.js → catch block → project.status='failed' → cleanupService.deleteProjectFiles()

TRIGGER 3: User deletes project
  project.controller.js → delete → cleanupService.deleteProjectFiles() → Project.remove()

TRIGGER 4: Cron sweep (safety net)
  cleanup.job.js → every 30 min → cleanupOrphanedDirs()
  Handles edge cases: server crash during analysis, unhandled exceptions, etc.
```

---

## 10. Controller Design

### 10.1 Project Controller (`controllers/project.controller.js`)

```
createProject (POST /api/projects)
  1. Multer middleware receives file
  2. Create Project doc with status='uploading'
  3. Write buffer to /uploads/{userId}/{projectId}/project.zip
  4. Update status='extracting'
  5. Call fileService.extractZip()
  6. Count files, detect tech stack
  7. Update Project doc with fileCount, totalSizeKB, detectedTechStack
  8. Return { project } to client immediately
  9. Fire-and-forget: analysisService.analyzeProject(projectId)
     (runs asynchronously, client polls for status)

getProjects (GET /api/projects)
  1. Query Project.find({ userId: req.user._id })
  2. Sort by createdAt desc
  3. Paginate: page, limit query params (default limit=10)
  4. Return { projects, pagination }

getProject (GET /api/projects/:id)
  1. Find project by id (projectOwnership middleware already verified)
  2. Populate nothing (analysis is separate endpoint)
  3. Return { project }

deleteProject (DELETE /api/projects/:id)
  1. Cleanup temp files (if any exist)
  2. Delete AnalysisResult, Skills, InterviewQuestions for this project
  3. Delete Project document
  4. Return { message: 'Project deleted' }
```

### 10.2 Analysis Controller (`controllers/analysis.controller.js`)

```
getAnalysis (GET /api/projects/:projectId/analysis)
  1. Find AnalysisResult by projectId
  2. If not found and project.status='analyzing' → 202 "Analysis in progress"
  3. If not found and project.status='completed' → 404 "Analysis not found"
  4. Return { analysis }

getAnalysisStatus (GET /api/projects/:projectId/analysis/status)
  1. Find Project by projectId
  2. Return { status, progress, estimatedTimeRemaining }

regenerateAnalysis (POST /api/projects/:projectId/analysis/regenerate)
  1. Verify project status='completed' (can't regenerate mid-analysis)
  2. Delete old AnalysisResult, Skills, InterviewQuestions
  3. Return 400 "Re-upload ZIP file first" (since temp files are gone)
  4. Client must re-upload → new project created
```

### 10.3 Skill Controller (`controllers/skill.controller.js`)

```
getSkills (GET /api/projects/:projectId/skills)
  1. Find Skills by projectId
  2. If not found → 404
  3. Return { skills }
```

### 10.4 Interview Controller (`controllers/interview.controller.js`)

```
getQuestions (GET /api/projects/:projectId/interview)
  1. Find InterviewQuestions by projectId
  2. If not found → 404
  3. Return { questions }

askCustomQuestion (POST /api/projects/:projectId/interview/ask)
  1. Validate body: { question: string }
  2. Find Project (need tech stack + context — but temp files are gone)
  3. Call aiService.callDeepSeek() with project context + user question
  4. Return { question, answer }
  5. Note: Custom Q&A requires stored project summary, not source files
```

---

## 11. Validation (`validators/project.validator.js`)

```
uploadSchema (applied to file, not body):
  file: required, mime must be zip
  body: { projectName: string optional (extracted from filename if missing) }

interviewAskSchema:
  body: {
    question: string, min 10, max 500, required
  }
```

---

## 12. Route Definitions

```
ROUTER: /api/projects

POST   /                     → authenticate, uploadLimiter, upload middleware,
                                validate(uploadSchema), projectController.createProject
GET    /                     → authenticate, projectController.getProjects
GET    /:id                  → authenticate, projectOwnership, projectController.getProject
DELETE /:id                  → authenticate, projectOwnership, projectController.deleteProject


ROUTER: /api/projects/:projectId/analysis

GET    /                     → authenticate, projectOwnership, analysisController.getAnalysis
GET    /status               → authenticate, projectOwnership, analysisController.getAnalysisStatus
POST   /regenerate           → authenticate, projectOwnership, analysisController.regenerateAnalysis


ROUTER: /api/projects/:projectId

GET    /skills               → authenticate, projectOwnership, skillController.getSkills
GET    /interview            → authenticate, projectOwnership, interviewController.getQuestions
POST   /interview/ask        → authenticate, projectOwnership, validate(interviewAskSchema),
                                interviewController.askCustomQuestion
```

---

## 13. Error Handling

| Scenario                           | HTTP | Error Code                | Message |
|------------------------------------|------|---------------------------|---------|
| No file uploaded                   | 400  | `FILE_REQUIRED`           | "A ZIP file is required" |
| Wrong file type                    | 400  | `INVALID_FILE_TYPE`       | "Only .zip files are accepted" |
| File too large (>50MB)             | 413  | `FILE_TOO_LARGE`          | "File exceeds 50MB limit" |
| Corrupt ZIP                        | 400  | `CORRUPT_ZIP`             | "Unable to extract ZIP file" |
| Empty ZIP                          | 400  | `EMPTY_PROJECT`           | "ZIP file contains no source files" |
| No text files found                | 400  | `NO_TEXT_FILES`           | "No readable source files found" |
| OpenRouter API failure             | 502  | `AI_SERVICE_ERROR`        | "AI analysis service unavailable" |
| AI response invalid JSON           | 502  | `AI_PARSE_ERROR`          | "Analysis result could not be parsed" |
| Project not found                  | 404  | `PROJECT_NOT_FOUND`       | "Project not found" |
| Analysis not ready                 | 202  | `ANALYSIS_IN_PROGRESS`    | "Analysis is still running" |
| Analysis failed                    | 500  | `ANALYSIS_FAILED`         | Project.errorMessage |
| Upload rate limit                  | 429  | `RATE_LIMITED`            | "Upload limit reached" |
| Cannot regenerate (no source)       | 400  | `SOURCE_DELETED`          | "Source files deleted. Upload again." |

---

## 14. File Dependency Graph (Upload Module)

```
                                    ┌──────────────┐
                                    │   config/    │
                                    │   env.js     │
                                    │   db.js      │
                                    └──────┬───────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
   ┌──────────▼──────────┐    ┌───────────▼──────────┐    ┌───────────▼──────────┐
   │    utils/           │    │      models/         │    │   middleware/        │
   │  AppError.js        │    │   Project.js         │    │  authenticate.js     │
   │  prompts.js         │    │   AnalysisResult.js  │    │  upload.js           │
   │  fileUtils.js       │    │   Skill.js           │    │  validate.js         │
   └──────────┬──────────┘    │   InterviewQuestion.js│   │  projectOwnership.js │
              │               └───────────┬──────────┘    └───────────┬──────────┘
              │                           │                           │
   ┌──────────▼───────────────────────────▼───────────────────────────▼──────────┐
   │                              services/                                       │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
   │  │ file.service │  │ ai.service   │  │ analysis.    │  │ cleanup.     │     │
   │  │              │  │              │  │ service      │  │ service      │     │
   │  └──────────────┘  └──┬───────────┘  └──────┬───────┘  └──────────────┘     │
   │                      │                      │                               │
   │                      │  ┌───────────────────┤                               │
   │                      │  │                   │                               │
   │                 ┌────▼──▼────┐  ┌───────────▼──────────┐                    │
   │                 │ resume.    │  │ interview.service    │                    │
   │                 │ service    │  │                      │                    │
   │                 └────────────┘  └──────────────────────┘                    │
   │                                                                             │
   │                 ┌────────────────────────────┐                               │
   │                 │ visualization.service      │                               │
   │                 └────────────────────────────┘                               │
   └─────────────────────────────────────────────────────────────────────────────┘
                                           │
   ┌───────────────────────────────────────▼─────────────────────────────────────┐
   │                              controllers/                                    │
   │  project.controller.js                                                      │
   │  analysis.controller.js                                                     │
   │  skill.controller.js                                                        │
   │  interview.controller.js                                                    │
   └─────────────────────────────────────────────────────────────────────────────┘
                                           │
   ┌───────────────────────────────────────▼─────────────────────────────────────┐
   │                              routes/                                         │
   │  project.routes.js                                                          │
   │  analysis.routes.js                                                         │
   │  skill.routes.js                                                            │
   │  interview.routes.js                                                        │
   └──────────────────────────────────────────────────────────────────────────────┘
```

### Build Sequence

```
 1. config/env.js                    (already exists)
 2. utils/AppError.js                (already exists)
 3. middleware/upload.js             (multer config, no model deps)
 4. models/Project.js               (schema)
 5. models/AnalysisResult.js        (schema)
 6. models/Skill.js                 (schema)
 7. models/InterviewQuestion.js     (schema)
 8. utils/fileUtils.js              (binary detection, tech detection helpers)
 9. utils/prompts.js                (all 12 AI prompt templates)
10. config/openrouter.js            (OpenAI client with OpenRouter baseURL)
11. services/ai.service.js          (raw AI calls)
12. services/file.service.js        (extraction, traversal, tech stack)
13. services/visualization.service.js (structuring AI output)
14. services/resume.service.js      (skill formatting)
15. services/interview.service.js   (question generation)
16. services/analysis.service.js    (pipeline orchestrator)
17. services/cleanup.service.js     (file deletion + cron)
18. validators/project.validator.js (upload + interview schemas)
19. controllers/project.controller.js
20. controllers/analysis.controller.js
21. controllers/skill.controller.js
22. controllers/interview.controller.js
23. routes/project.routes.js
24. routes/analysis.routes.js
25. routes/skill.routes.js
26. routes/interview.routes.js
27. jobs/cleanup.job.js
28. app.js                          (mount all routers)
```
