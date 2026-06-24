# LearnSmart Architecture — AI-Powered Code Analysis Platform

## Table of Contents
1. [System Overview](#system-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Module Inventory](#module-inventory)
4. [Parser-Based Modules (No AI)](#parser-based-modules)
5. [AI-Based Modules (AI Allowed)](#ai-based-modules)
6. [RAG Pipeline](#rag-pipeline)
7. [Token Optimization Strategy](#token-optimization)
8. [Storage Architecture](#storage-architecture)
9. [API Surface](#api-surface)

---

## System Overview

LearnSmart has two distinct execution domains:

| Domain | What it does | AI used? | Token cost |
|--------|-------------|----------|------------|
| **Deterministic Analysis** | Parsing, metrics, graphs, dependency maps, routes, security scanning | **No** | 0 tokens |
| **AI Reasoning** | Explanations, summaries, chat, tutoring, interview questions | **Yes** | Minimal (RAG + caching) |

The deterministic domain runs first and produces structured data. The AI domain ONLY reads that structured data — never raw source code — and only when natural language output is required.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                          │
│  ZIP Upload  │  GitHub URL  │  GitHub OAuth                  │
│       └──────────┼─────────┘                                │
│                  ▼                                           │
│         Extract to temp/ directory                           │
│         Remove: node_modules, .git, dist, build, vendor      │
│         Remove: binary files, images, fonts, media           │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              DETERMINISTIC ANALYSIS LAYER (0 AI tokens)      │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Parser      │  │ Structure    │  │ Dependency       │   │
│  │ Engine      │  │ Analyzer     │  │ Analyzer          │   │
│  │             │  │              │  │                  │   │
│  │ Functions   │  │ MVC/Layered  │  │ Import graph     │   │
│  │ Classes     │  │ Feature-based│  │ Internal deps    │   │
│  │ Imports     │  │ Microservice │  │ External deps    │   │
│  │ Exports    │  │ Clean Arch   │  │ Circular deps    │   │
│  │ Hooks      │  │ Monolith     │  │ Unused imports   │   │
│  │ Components │  │ Directory    │  │                  │   │
│  │ Interfaces │  │ depth        │  │                  │   │
│  │ Decorators │  │              │  │                  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                   │              │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌───────┴─────────┐   │
│  │ API         │  │ Database     │  │ Execution       │   │
│  │ Detector    │  │ Detector     │  │ Flow Analyzer   │   │
│  │             │  │              │  │                  │   │
│  │ Express     │  │ Mongoose     │  │ Entry points    │   │
│  │ Next.js     │  │ Prisma       │  │ Middleware      │   │
│  │ FastAPI     │  │ Sequelize    │  │ Controllers     │   │
│  │ Flask       │  │ SQL          │  │ Services        │   │
│  │ Spring      │  │ Relations    │  │ DB flow         │   │
│  │ Methods     │  │ Indexes      │  │ Response flow   │   │
│  │ Validators  │  │              │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Tech Stack  │  │ Metrics      │  │ Knowledge        │   │
│  │ Detector    │  │ Engine       │  │ Graph Builder    │   │
│  │             │  │              │  │                  │   │
│  │ package.json│  │ LOC          │  │ Nodes: files     │   │
│  │ requirements│  │ Comment %    │  │ functions        │   │
│  │ pom.xml     │  │ Cyclomatic   │  │ classes          │   │
│  │ go.mod      │  │ Complexity   │  │ models           │   │
│  │ Dockerfile  │  │ Func count   │  │ routes           │   │
│  │ Confidence  │  │ Class count  │  │                  │   │
│  │             │  │ Maintain.    │  │ Edges: imports   │   │
│  │             │  │ Index        │  │ calls            │   │
│  │             │  │              │  │ extends          │   │
│  │             │  │              │  │ depends-on       │   │
│  └─────────────┘  └──────────────┘  └────────┬─────────┘   │
│                                              │              │
│  ┌─────────────┐  ┌──────────────┐           │              │
│  │ Security    │  │ Performance  │           │              │
│  │ Scanner     │  │ Analyzer     │           │              │
│  │             │  │              │           │              │
│  │ API keys    │  │ Nested loops │           │              │
│  │ Secrets     │  │ Large funcs  │           │              │
│  │ unsafe eval │  │ Duplicate    │           │              │
│  │ SQL inj.    │  │ Repeated API │           │              │
│  │ XSS/CSRF    │  │ Unused vars  │           │              │
│  │ Open routes │  │ Memory leaks │           │              │
│  │ Weak hash   │  │ Blocking ops │           │              │
│  └─────────────┘  └──────────────┘           │              │
└───────────────────────────────────────────────┼──────────────┘
                                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    RAG INDEXING LAYER                         │
│                                                               │
│  ┌──────────────────────┐    ┌──────────────────────┐        │
│  │ Chunking Engine      │    │ Embedding Engine     │        │
│  │                      │    │                      │        │
│  │ Split by:            │    │ Generate embeddings  │        │
│  │  - Function boundary │    │ for every chunk      │        │
│  │  - Class boundary    │    │                      │        │
│  │  - File              │    │ Model: text-embed-   │        │
│  │  - 300-500 tokens    │    │ ding-004 or NVIDIA   │        │
│  │  - 75 token overlap  │    │ embed (free tier)    │        │
│  │                      │    │                      │        │
│  │ Metadata per chunk:  │    │ Batch: 20 chunks     │        │
│  │  - filePath          │    │ Cache by SHA-256     │        │
│  │  - startLine         │    │ Deduplicate ident.   │        │
│  │  - endLine           │    │ chunks               │        │
│  │  - functionName      │    │                      │        │
│  │  - className         │    │ Dimension: 1024      │        │
│  │  - language          │    │                      │        │
│  │  - dependencies      │    │                      │        │
│  └──────────┬───────────┘    └──────────┬───────────┘       │
│             │                           │                    │
│             └───────────┬───────────────┘                    │
│                         ▼                                    │
│              ┌──────────────────────┐                        │
│              │ Vector Store          │                        │
│              │                      │                        │
│              │ Local: JSON + memory │                        │
│              │ Production: FAISS    │                        │
│              │            ChromaDB  │                        │
│              │                      │                        │
│              │ Each record:         │                        │
│              │  - chunk text        │                        │
│              │  - embedding vector  │                        │
│              │  - projectId         │                        │
│              │  - filePath          │                        │
│              │  - metadata          │                        │
│              └──────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI REASONING LAYER                         │
│                 (ONLY natural language tasks)                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ RAG Prompt   │  │ AI Cache      │  │ Model Router     │   │
│  │ Builder      │  │ Service       │  │                  │   │
│  │              │  │               │  │ Tier 1: LITE     │   │
│  │ Constructs   │  │ MongoDB cache │  │  (summaries,     │   │
│  │ prompt from: │  │ by SHA-256    │  │   simple tasks)  │   │
│  │  - Retrievd  │  │ content hash  │  │                  │   │
│  │    chunks    │  │               │  │ Tier 2: PRO      │   │
│  │  - Metadata  │  │ In-memory LRU │  │  (explanations,  │   │
│  │  - Graphs    │  │ for sub-ms    │  │   analysis,      │   │
│  │  - Flow data │  │   hits        │  │   chat)          │   │
│  │              │  │               │  │                  │   │
│  │ NEVER sends  │  │ Zero tokens   │  │ OpenRouter       │   │
│  │ raw source   │  │ on cache hit  │  │ NVIDIA free      │   │
│  │ code         │  │               │  │ models           │   │
│  └──────────────┘  └───────────────┘  └──────────────────┘   │
│                                                               │
│  AI tasks on demand:                                          │
│    - Executive summary → reads project summary, NOT code     │
│    - Architecture review → reads layer map + dep graph       │
│    - Code tutor → reads retrieved chunks + symbol list       │
│    - Interview Qs → reads parsed functions + classes         │
│    - File explain → reads single file's parsed symbols       │
│    - Bug explain → reads security scan output                │
│    - Resume skills → reads tech stack + metrics              │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Inventory

### PARSER-BASED (0 AI tokens — deterministic regex/AST)

| # | Module | Input | Output | Technique |
|---|--------|-------|--------|-----------|
| 1 | **Language Detector** | File extensions, shebangs | Language enum per file | Extension map + content heuristics |
| 2 | **File Filter** | All files in temp dir | Text source files only | Extension whitelist, binary detection, ignore list |
| 3 | **Folder Structure Analyzer** | Directory tree | Architecture style, layers, depth | Path pattern matching |
| 4 | **Parser Engine** | Source file content | Symbols, imports, exports, components | Tree-sitter + Babel + regex fallback |
| 5 | **Dependency Analyzer** | Parsed imports | Dependency graph (JSON), circular deps | Graph traversal, local path resolution |
| 6 | **API Detector** | Route files, decorators | Endpoints (method, path, handler, middleware) | Framework-specific regex per language |
| 7 | **Database Detector** | Model files, schema files | Models, fields, indexes, relationships | ORM/ODM pattern matching |
| 8 | **Execution Flow Analyzer** | Entry points, routes, imports | Step-by-step flow (entry→middleware→controller→service→DB) | DFS from entry, import tracing |
| 9 | **Tech Stack Detector** | Config files (package.json, etc.) | Languages, frameworks, libraries with confidence | Manifest parsing + import matching |
| 10 | **Metrics Engine** | Parsed files, parsed symbols | LOC, comment%, cyclomatic, maintainability, counts | Algorithmic — no ML |
| 11 | **Security Scanner** | Source code content | Vulnerabilities (severity, file, line, fix) | AST-aware pattern matching |
| 12 | **Performance Analyzer** | Source code, dependency graph | Bottlenecks, large functions, duplicates | Heuristic rules on parsed symbols |
| 13 | **Knowledge Graph Builder** | All parsed symbols + dependencies | Graph: files↔functions↔classes↔imports↔calls | Adjacency list from parser output |

### CHUNKING + EMBEDDING (AI used for embedding generation only)

| # | Module | AI? | Purpose |
|---|--------|-----|---------|
| 14 | **Chunking Engine** | No | Split files at function/class boundaries, 300-500 tokens, 75 overlap |
| 15 | **Embedding Generator** | Yes* | Generate vector embeddings per chunk (model: text-embedding-004 or NVIDIA free) |
| 16 | **Vector Store** | No | Store vectors + metadata, cosine similarity search |
| 17 | **Embedding Cache** | No | SHA-256 hash dedup — identical content never re-embedded |

*Embedding is the ONLY pre-AI step that calls an API. It's a fixed-cost operation: one call per unique chunk, cached forever.

### AI-BASED (AI used for natural language generation)

| # | Module | Tokens per call | Uses |
|---|--------|-----------------|------|
| 18 | **RAG Prompt Builder** | 0 | Assembles context from retrieved chunks + metadata |
| 19 | **AI Cache** | 0 (dedup) | MongoDB by SHA-256 content hash + in-memory LRU |
| 20 | **Model Router** | Varies | Routes to LITE (summaries) or PRO (explanations) model |
| 21 | **Executive Summarizer** | ~200 output | Reads hierarchical summaries, not raw code |
| 22 | **Architecture Explainer** | ~300 output | Reads layer map + dependency graph |
| 23 | **Workflow Explainer** | ~300 output | Reads parsed execution flow steps |
| 24 | **Code Tutor** | ~500 output | Reads retrieved chunks for specific question |
| 25 | **Interview Generator** | ~300 output | Reads parsed symbol list + tech stack |
| 26 | **Chat Service** | ~500 output | Full RAG: embed question → search → build prompt → generate |
| 27 | **Hierarchical Summarizer** | ~1000 total | Function→File→Folder→Project summaries, tiered by model |

---

## Parser-Based Modules — Deep Dive

### 1. Language Detector

**Purpose:** Identify the programming language of every source file.

**How it works (no AI):**
- Extension-to-language map: `.js` → JavaScript, `.tsx` → TypeScript React, `.py` → Python, etc.
- Shebang detection for scripts without extensions
- Config file detection by basename: `Dockerfile`, `Makefile`, `.gitignore`
- Fallback: "Unknown" for unrecognized extensions

**Output:** `{ filePath: "src/app.ts", language: "TypeScript", isConfig: false }`

---

### 2. File Filter

**Purpose:** Exclude non-source files before any processing begins.

**How it works (no AI):**
- **Directory blacklist:** `node_modules`, `.git`, `dist`, `build`, `out`, `target`, `__pycache__`, `.next`, `.nuxt`, `coverage`, `vendor`, `.idea`, `.vscode`, `bower_components`, `.cache`
- **Binary extensions:** image, font, audio, video, archive, executable, compiled bytecode
- **Generated file patterns:** `*.min.js`, `*.bundle.js`, `*.chunk.js`, `*-lock.json`
- **Binary content detection:** Read first 8KB — check for null bytes (indicates binary)

**Output:** Filtered list of text source files only.

---

### 3. Folder Structure Analyzer

**Purpose:** Detect architectural patterns from directory layout without reading file contents.

**How it works (no AI):**
- Walk directory tree (after file filter)
- Match directory names against known patterns:

| Pattern | Detection |
|---------|-----------|
| `src/controllers/`, `src/models/`, `src/views/` | MVC |
| `src/components/`, `src/services/`, `src/hooks/` | Feature-based / Layered |
| `packages/*/src/` | Monorepo |
| `client/` + `server/` | Client-Server |
| `src/domain/`, `src/application/`, `src/infrastructure/` | Clean Architecture |
| Single flat `src/` | Monolith |
| Multiple `service-name/` dirs with Dockerfiles | Microservices |

- Calculate directory depth (max, average)
- Count files per directory
- Detect entry points: `index.js`, `app.js`, `main.py`, `server.js` etc.

**Output:** 
```json
{
  "architecturalStyle": "Client-Server MVC",
  "confidence": 0.85,
  "layers": {
    "controllers": ["src/controllers/auth.controller.js"],
    "services": ["src/services/auth.service.js"],
    "models": ["src/models/User.js"]
  },
  "entryPoint": "src/app.js",
  "maxDepth": 4,
  "totalDirectories": 12
}
```

---

### 4. Parser Engine

**Purpose:** Extract every structural element from source code using ASTs where available, regex where not.

**Parser selection by language:**

| Language | Primary Parser | Fallback |
|----------|---------------|----------|
| JavaScript | Babel (acorn) | Regex |
| TypeScript | TypeScript Compiler API | Babel with TS plugin → Regex |
| JSX/TSX | Babel + React plugin | Regex |
| Python | Tree-sitter (Python grammar) | Regex |
| Java | Tree-sitter (Java grammar) | Regex |
| C++ | Tree-sitter (C++ grammar) | Regex |
| Go | Tree-sitter (Go grammar) | Regex |
| PHP | Tree-sitter (PHP grammar) | Regex |
| C# | Tree-sitter (C# grammar) | Regex |
| HTML/CSS | Regex | N/A |
| Config files | JSON/YAML/TOML parsers | Regex |

**What gets extracted per file:**

| Element | For JS/TS | For Python | For Java | For C++ |
|---------|-----------|------------|----------|---------|
| Functions | `function`, `=>` | `def` | methods | functions |
| Classes | `class` | `class` | `class` | `class` |
| Interfaces | `interface` | ABC | `interface` | pure virtual |
| Variables | `const/let/var` | assignments | fields | variables |
| Imports | `import/require` | `import/from` | `import` | `#include` |
| Exports | `export/module.exports` | `__all__` | `public` | headers |
| Enums | `enum` | `Enum` | `enum` | `enum` |
| Hooks | `use[A-Z]\w+` | N/A | N/A | N/A |
| Components | PascalCase fn returning JSX | N/A | N/A | N/A |
| Decorators | `@decorator` | `@decorator` | `@Annotation` | `__attribute__` |
| Async | `async/await/Promise` | `async def` | `CompletableFuture` | `std::async` |
| Inheritance | `extends/implements` | `(BaseClass)` | `extends/implements` | `: public Base` |
| Method calls | `obj.method()` | `obj.method()` | `obj.method()` | `obj->method()` |

**Output per file:**
```json
{
  "filePath": "src/services/auth.service.js",
  "language": "JavaScript",
  "symbols": [
    { "name": "login", "kind": "function", "line": 12, "async": true, "exported": true, "params": [{ "name": "email", "type": "string" }, { "name": "password", "type": "string" }] },
    { "name": "register", "kind": "function", "line": 28, "async": true, "exported": true },
    { "name": "AuthService", "kind": "class", "line": 3, "exported": true }
  ],
  "imports": [
    { "source": "bcrypt", "kind": "external", "specifiers": ["hash"] },
    { "source": "../models/User", "kind": "local", "specifiers": ["User"] }
  ],
  "exports": [
    { "kind": "named", "names": ["login", "register"] }
  ]
}
```

---

### 5. Dependency Analyzer

**Purpose:** Build a complete dependency graph showing which files depend on which.

**How it works (no AI):**
1. Collect all imports from every parsed file
2. Classify each import:
   - **Local:** starts with `.` or `/` → resolve to actual file path
   - **External:** npm package, PyPI package, Maven dependency
   - **Builtin:** Node.js stdlib (`fs`, `path`), Python stdlib (`os`, `sys`)
3. Resolve local imports:
   - Try extensions: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`
   - Try `/index.*` variants
   - Track unresolved imports
4. Build adjacency list: `Map<fromFile, toFile[]>`
5. Run DFS with coloring (WHITE/GRAY/BLACK) to detect circular dependencies
6. Classify external dependencies into categories: frontend, backend, database, auth, dev

**Output:**
```json
{
  "graph": { "src/app.js": ["src/routes/auth.js"], "src/routes/auth.js": ["src/controllers/auth.js", "src/middleware/auth.js"] },
  "externalDependencies": { "express": { "usedBy": ["src/app.js"], "category": "backend" } },
  "circularDependencies": [["src/a.js", "src/b.js", "src/a.js"]],
  "unresolvedImports": [{ "fromFile": "src/utils.js", "source": "./helpers", "reason": "File not found" }]
}
```

---

### 6. API Detector

**Purpose:** Catalog every API endpoint without calling any LLM.

**How it works (no AI) — framework-specific regex patterns:**

| Framework | Detection Pattern |
|-----------|------------------|
| Express.js | `app.get/post/put/delete/patch/use('path', handler)` — extract method, path, handler |
| Next.js App Router | `app/api/**/route.ts` — extract folder name as path, exported GET/POST/PUT/DELETE |
| Next.js Pages Router | `pages/api/**/*.ts` — default export, path from file location |
| FastAPI | `@app.get/post/put/delete('path')` — decorator pattern |
| Flask | `@app.route('path', methods=['GET', 'POST'])` — decorator |
| Spring Boot | `@GetMapping/PostMapping/PutMapping/DeleteMapping('path')` — annotation |
| Django | `urlpatterns` in `urls.py` |
| Go (Gin/Echo) | `router.GET/POST('path', handler)` |

**What gets extracted per endpoint:**
- HTTP method
- URL path
- Handler function name
- File location + line number
- Middleware chain (from `router.use()` or parameter inspection)
- Authentication requirement (presence of `auth` middleware in chain)
- Validation (presence of `validate` middleware or schema parsing)

**Output:**
```json
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/auth/login",
      "handler": "authController.login",
      "file": "src/controllers/auth.controller.js",
      "line": 15,
      "middleware": ["authenticate", "authLimiter", "validate(loginSchema)"],
      "auth": "optional",
      "validation": "loginSchema"
    }
  ],
  "totalEndpoints": 12,
  "basePrefix": "/api",
  "apiStyle": "REST"
}
```

---

### 7. Database Detector

**Purpose:** Extract data models, fields, relationships without LLM.

**How it works (no AI):**

| ORM/ODM | Detection | Extraction |
|---------|-----------|------------|
| Mongoose | `mongoose.model('Name', schema)` / `new mongoose.Schema({...})` | Model name, field names + types, required, unique, default, ref |
| Prisma | `prisma/schema.prisma` | Parse the Prisma schema DSL: models, fields, types, relations, indexes |
| Sequelize | `sequelize.define('Model', {...})` | Model name, field definitions |
| TypeORM | `@Entity()` decorators + `@Column()` | Class name, column types, relations |
| SQLAlchemy | `class Model(Base):` + `Column(...)` | Model name, column types, keys |
| Django ORM | `class Model(models.Model):` | Model name, fields, ForeignKey |

**Output:**
```json
{
  "databaseTechnology": "MongoDB with Mongoose",
  "models": [
    {
      "name": "User",
      "collection": "users",
      "fields": [
        { "name": "email", "type": "String", "required": true, "unique": true },
        { "name": "password", "type": "String", "required": true, "select": false },
        { "name": "projects", "type": "[ObjectId]", "ref": "Project" }
      ],
      "indexes": ["email_1"],
      "timestamps": true
    }
  ],
  "relationships": [
    { "from": "User", "to": "Project", "type": "one-to-many", "throughField": "userId" }
  ]
}
```

---

### 8. Execution Flow Analyzer

**Purpose:** Trace the complete request lifecycle from entry to response, deterministically.

**How it works (no AI):**

1. **Find entry point:** Files named `app.js`, `server.js`, `index.js`, `main.py`
2. **Trace imports** from entry point through route files → controllers → services → models
3. **Map middleware chain:** Parse `app.use()` calls in order; parse route-specific middleware from router definitions
4. **Build request flow:**
   - Incoming request → Route matching → Authentication middleware → Validation → Controller → Service → Database → Response
5. **Build function call chain:** DFS from exported route handlers through local imports, tracking which functions call which
6. **Detect background jobs:** Look for `setInterval`, `node-cron`, `@Scheduled`, Celery tasks, etc.

**Output:**
```json
{
  "flowType": "HTTP Request Flow",
  "entryPoints": [
    { "file": "src/app.js", "function": "app.listen", "description": "Server entry point" }
  ],
  "steps": [
    { "step": 1, "phase": "request", "description": "POST /api/auth/login", "file": "src/routes/auth.routes.js" },
    { "step": 2, "phase": "middleware", "description": "rateLimiter", "file": "src/middleware/rateLimiter.js" },
    { "step": 3, "phase": "authentication", "description": "authenticate — verify JWT", "file": "src/middleware/authenticate.js" },
    { "step": 4, "phase": "validation", "description": "validate(loginSchema)", "file": "src/validators/auth.validator.js" },
    { "step": 5, "phase": "controller", "description": "authController.login()", "file": "src/controllers/auth.controller.js" },
    { "step": 6, "phase": "service", "description": "authService.login()", "file": "src/services/auth.service.js" },
    { "step": 7, "phase": "database", "description": "User.findOne({ email })", "file": "src/models/User.js" },
    { "step": 8, "phase": "response", "description": "Return JWT + user object", "file": "src/controllers/auth.controller.js" }
  ],
  "databaseOperations": [
    { "operation": "findOne", "model": "User", "file": "src/services/auth.service.js", "line": 42 }
  ]
}
```

---

### 9. Tech Stack Detector

**Purpose:** Identify every technology used in the project — deterministic, no AI.

**How it works (no AI):**

**Phase 1 — Manifest parsing:**
- `package.json` → parse `dependencies` + `devDependencies` → match against known tech names
- `requirements.txt` → parse package names
- `pom.xml` → parse dependencies
- `Cargo.toml` → parse dependencies
- `composer.json` → parse requirements
- `go.mod` → parse requires
- `Gemfile` → parse gems

**Phase 2 — Import analysis:**
- Match imports against known package→technology mappings (e.g., `import React` → React, `from fastapi import` → FastAPI)

**Phase 3 — File presence:**
- `tailwind.config.js` → Tailwind CSS
- `next.config.js` → Next.js
- `Dockerfile` → Docker
- `docker-compose.yml` → Docker Compose
- `.github/workflows/*.yml` → GitHub Actions

**Phase 4 — Content patterns:**
- `app.use(helmet())` → Helmet
- `mongoose.connect(` → Mongoose
- `new PrismaClient()` → Prisma

**Phase 5 — Named stack detection:**
- MERN: MongoDB + Express + React + Node.js (min 3 of 4)
- T3: Next.js + TypeScript + tRPC/Prisma + Tailwind (min 3 of 4)
- MEAN: MongoDB + Express + Angular + Node.js
- JAMstack: JS + APIs + Markup (Gatsby/Next/Nuxt + headless CMS)
- Django stack: Django + PostgreSQL + Redis + Celery

**Confidence calculation:** Each signal has a weight. Sum all signal weights per technology, normalized to 0.0–1.0.

---

### 10. Metrics Engine

**Purpose:** Calculate code quality metrics algorithmically — no AI needed.

**Metrics calculated:**

| Metric | Formula |
|--------|---------|
| Lines of Code (LOC) | Total non-blank, non-comment lines |
| Comment Percentage | Comment lines / Total lines × 100 |
| Cyclomatic Complexity | 1 + number of decision points (if, for, while, case, &&, \|\|, ?:) |
| Function Count | Count of `function` + `=>` + `def` symbols |
| Class Count | Count of `class` symbols |
| Component Count | Count of React/Vue/Svelte component files |
| Route Count | Count of detected API routes |
| API Count | Count of detected API endpoints |
| Average Function Size | Total LOC / Function Count |
| Average File Size | Total LOC / File Count |
| Directory Depth | Max directory nesting level |
| Maintainability Index | 171 − 5.2 × log(averageHalsteadVolume) − 0.23 × cyclomaticComplexity − 16.2 × log(LOC) |

---

### 11. Static Security Scanner

**Purpose:** Detect common security issues using pattern matching — no AI.

**Vulnerability checks (all deterministic):**

| Category | Pattern | Severity |
|----------|---------|----------|
| Hardcoded secrets | `const API_KEY = "sk-..."` | Critical |
| Hardcoded passwords | `password = "plaintext"` | Critical |
| Unsafe eval | `eval(userInput)` | Critical |
| Shell injection | `child_process.exec(userInput)` | Critical |
| SQL injection | string concatenation in SQL queries | High |
| NoSQL injection | `{ $where: userInput }` | High |
| XSS | `innerHTML = userInput` | High |
| CSRF | Missing CSRF token in forms | Medium |
| Open routes | Route without authentication middleware | High |
| Missing validation | Route without validation middleware | Medium |
| Unsafe file upload | File upload without type checking | High |
| Weak hash | `md5()` or `sha1()` for passwords | High |
| Missing helmet | No `helmet()` middleware | Medium |
| Missing rate limit | No rate limiter on auth routes | Medium |
| Dangerous dependency | Known vulnerable package version | Variable |
| Env var misuse | `.env` in git, secrets in code | Critical |

**Output:**
```json
{
  "vulnerabilities": [
    {
      "type": "Hardcoded API Key",
      "severity": "critical",
      "file": "src/config.js",
      "line": 12,
      "snippet": "const OPENAI_KEY = 'sk-...';",
      "recommendation": "Move to environment variable: process.env.OPENAI_KEY"
    }
  ],
  "summary": { "critical": 1, "high": 0, "medium": 2, "low": 3 }
}
```

---

### 12. Static Performance Analyzer

**Purpose:** Identify performance bottlenecks through code structure analysis — no AI.

**Checks (all deterministic):**

| Issue | Detection | Severity |
|-------|-----------|----------|
| Nested loops | 3+ levels of nested for/while | Warning |
| Large functions | > 50 lines or cyclomatic complexity > 20 | Warning |
| Large components | > 300 lines in component file | Warning |
| Duplicate logic | Function bodies with > 80% similarity | Info |
| Repeated API calls | Same endpoint called in multiple places without caching | Warning |
| Unused imports | Imported but never referenced | Info |
| Unused variables | Declared but never referenced | Info |
| Blocking operations | `readFileSync`, `execSync` in route handlers | Warning |
| Expensive DB queries | `find({})` without limit or index | Warning |
| Circular dependencies | A imports B, B imports A | Warning |
| Large bundles | Many unused imports from heavy packages | Info |

---

### 13. Knowledge Graph Builder

**Purpose:** Build a semantic graph connecting all code entities — powers RAG retrieval context.

**How it works (no AI):**
- **Nodes:** Files, functions, classes, components, models, routes, packages
- **Edges:** imports, calls, extends, implements, uses, depends-on, references
- **Node metadata:** file path, language, LOC, exported, symbol list, layer type
- **Edge metadata:** relationship type, specifiers, line number

**Graph structure:**
```
src/app.js
  └─imports→ express (external, "backend")
  └─imports→ src/routes/auth.routes.js (local)
      └─imports→ src/controllers/auth.controller.js
          └─imports→ src/services/auth.service.js
              └─imports→ src/models/User.js
              └─calls→ bcrypt.hash()
              └─calls→ jwt.sign()
```

This graph is stored in MongoDB as a JSON adjacency structure and is used during RAG to enrich retrieved chunks with dependency context.

---

## Chunking + Embedding

### 14. Chunking Engine

**Purpose:** Split source files into semantic chunks at function/class boundaries.

**Algorithm (no AI):**
1. Parse file to find function/class boundaries using regex per language
2. For each boundary: extract lines from boundary start to next boundary
3. If chunk > 500 tokens: split with 75-token overlap at sentence boundaries
4. Attach metadata: filePath, startLine, endLine, functionName, className, symbolType, language, dependencies

**Chunk size:** 300–500 tokens (target: ~400)
**Overlap:** 75 tokens (ensures context across splits)

---

### 15. Embedding Generator

**Purpose:** Convert chunks to vector embeddings for semantic search.

**Uses AI here:** Calls embedding API — but each unique chunk is embedded ONCE and cached forever.

**Model:** `text-embedding-004` (Gemini) or `nvidia/llama-nemotron-embed-vl-1b-v2:free` (OpenRouter)
**Batch size:** 20 chunks per API call
**Cache:** SHA-256 hash of chunk content → embedding vector. Identical chunks = 0 API calls.
**Dimension:** 1024

---

### 16. Vector Store

**Purpose:** Store embeddings and retrieve by similarity.

**Implementation:**
- **Development:** Local JSON file + in-memory LRU cache
- **Production:** FAISS (local) or ChromaDB (self-hosted)
- **Operations:** `insert(vector, metadata)`, `search(queryVector, k)`, `delete(projectId)`

---

### 17. Embedding Cache

**Purpose:** Never embed the same content twice.

**How:** SHA-256 hash of chunk content → check MongoDB `embedding_cache` collection → return cached vector if exists. Saves 100% of embedding API costs for re-analyzed or duplicate code.

---

## AI-Based Modules

### Principle: AI receives ONLY structured data, NEVER raw source code

Every AI task follows this pattern:

```
Structured parser output OR retrieved chunks + metadata
                    ↓
           RAG Prompt Builder → constructs context-aware prompt
                    ↓
           AI Cache → check if identical prompt was already answered
                    ↓
           Model Router → pick LITE or PRO model based on task complexity
                    ↓
           AI Response → natural language output
```

### AI Task Catalog

| Task | Input to AI | Max output tokens | Model tier |
|------|------------|-------------------|------------|
| Executive Summary | Hierarchical project summary + tech stack | 500 | PRO |
| Architecture Explanation | Layer map + dependency graph + symbol inventory | 500 | PRO |
| Workflow Explanation | Parsed execution flow steps + routes | 500 | PRO |
| File Explanation | Single file's parsed symbols + chunk content | 300 | LITE |
| Code Tutor | Retrieved relevant chunks for question | 500 | PRO |
| Interview Questions | Parsed symbol names + tech stack | 300 | LITE |
| Resume Skills | Tech stack + metrics + parsed symbol inventory | 300 | LITE |
| Chat Answer | Retrieved chunks + dependency context + history | 500 | PRO |
| Bug Explanation | Retrieved code chunk + security scan output | 500 | PRO |

---

### 18. RAG Prompt Builder

**Purpose:** Construct AI-optimized prompts from parsed data and retrieved chunks.

**Prompt structure:**
```
SYSTEM: You're analyzing a {language} project called "{projectName}".
        Tech stack: {stack}. {fileCount} files, {totalLOC} LOC.

CONTEXT FROM PARSERS:
- Architectural style: {archStyle}
- Entry point: {entryPoint}
- Layers: controllers ({count}), services ({count}), models ({count})
- Key symbols: {top symbols by kind}

RETRIEVED CHUNKS:
### src/auth/login.js (relevance: 94%)
[code chunk content]

QUESTION: {user question}

INSTRUCTIONS: Answer using ONLY the provided context.
              Reference specific files and functions.
```

**Token budgeting:**
- System prompt + instructions: ~10%
- Parser-generated metadata: ~20%
- Retrieved code chunks: ~60%
- User question: ~10%

---

### 19. AI Cache

**Purpose:** Never call AI for the same prompt twice.

**Key:** SHA-256 hash of (projectId + taskType + prompt content)
**Storage:** MongoDB `ai_cache` collection + in-memory LRU
**TTL:** 30 days
**On hit:** Returns cached response instantly, increments hit counter
**Token savings:** 100% on cache hits (identical questions, re-visits to same project)

---

### 20. Model Router

**Purpose:** Use cheaper/faster models for simple tasks, better models for complex ones.

| Tier | Model (OpenRouter) | Max tokens | Used for |
|------|-------------------|------------|----------|
| LITE | `nvidia/nemotron-3-super-120b-a12b:free` (low temp, low output) | 300 | Function summaries, file summaries, folder summaries, tech stack description |
| PRO | `nvidia/nemotron-3-super-120b-a12b:free` (higher temp) | 8192 | Executive summary, architecture review, code tutor, chat, interview questions |

Note: Both tiers currently use the same free NVIDIA model but with different generation configs. When budget allows, PRO can be upgraded to a paid model.

---

## Token Optimization Strategy

### Where tokens are saved (vs naive "send everything" approach)

| Optimization | Token savings |
|-------------|---------------|
| Parsers extract structure, no AI calls for metadata | **100%** (no tokens used) |
| Hierarchical summarization: function→file→folder→project | **85-90%** (summaries are 1/10th size of code) |
| RAG retrieval: send only top-5 relevant chunks | **90-99%** (vs sending entire repo) |
| AI cache: deduplicate identical prompts | **100% per cache hit** |
| Embedding cache: never re-embed same code | **100% per cache hit** |
| Knowledge graph context: send graph edges instead of files | **80%** (graph is symbolic, code is verbose) |
| Tiered models: LITE for simple, PRO for complex | **50%** (lower token limits on LITE) |

### Example: Answering "How does login work?"

| Approach | Tokens sent to AI |
|----------|-------------------|
| Naive: Send all 100 project files | ~95,000 tokens |
| RAG: Retrieve top-5 relevant chunks (login.js, auth.js, User.js, passport.js, tokenUtils.js) | ~2,000 tokens |
| Cached: Same question asked before | **0 tokens** |

---

## Storage Architecture

### MongoDB Collections

| Collection | What it stores | Size per project |
|------------|---------------|------------------|
| `projects` | Project metadata (name, files, LOC, tech stack, status) | ~1 KB |
| `analysisresults` | Full analysis output: explanations, visualizations, graphs, metrics, security report, cached AI responses reference | ~50-200 KB |
| `aicaches` | All AI responses keyed by SHA-256 hash | ~5-50 KB |
| `chatmessages` | Chat history per session | Variable |
| `chatsessions` | Chat session metadata | ~1 KB |

### File System

| Path | What it stores | Lifecycle |
|------|---------------|-----------|
| `uploads/{userId}/{projectId}/extracted/` | Cloned/extracted source code | **Deleted after indexing** |
| `uploads/vector_stores/{projectId}/vectors.json` | Embedding vectors + chunk metadata | Persisted |
| `uploads/embedding_cache/*.json` | Cached embeddings by SHA-256 hash | Persisted (dedup) |

### Disk cleanup on project deletion:
```
rm -rf uploads/{userId}/{projectId}/
MongoDB: project, analysisresult, aicaches where projectId=..., chat messages + sessions
```

---

## API Surface

### Project Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/projects` | Yes | Upload ZIP / GitHub repo / URL |
| GET | `/api/projects` | Yes | List user's projects |
| GET | `/api/projects/:id` | Yes | Get single project |
| DELETE | `/api/projects/:id` | Yes | Delete project + all data |
| GET | `/api/projects/github-repos` | Yes | List linked GitHub repos |

### Analysis Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analysis/:projectId` | Yes | Get analysis (cached if exists) |
| GET | `/api/analysis/:projectId?force=true` | Yes | Force re-analysis |

### Chat Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/:projectId` | Yes | Ask question (RAG-powered) |
| GET | `/api/chat/:projectId/sessions` | Yes | List chat sessions |
| GET | `/api/chat/:projectId/sessions/:sessionId` | Yes | Get session messages |
| DELETE | `/api/chat/:projectId/sessions/:sessionId` | Yes | Delete session |

### Progress Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/progress/:projectId` | Yes | SSE stream for pipeline progress |

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login (return JWT) |
| POST | `/api/auth/refresh` | No | Refresh access token |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/auth/google` | No | Google OAuth |
| GET | `/api/auth/github` | No | GitHub OAuth |

---

## Summary: Parser vs AI Boundary

```
═══════════════════════════════════════════════════════════════
                    PARSER-BASED (0 AI tokens)
═══════════════════════════════════════════════════════════════
• Language detection
• File filtering
• Folder structure analysis
• Symbol extraction (functions, classes, variables, imports, exports)
• Dependency graph
• API route detection
• Database model extraction
• Execution flow tracing
• Tech stack detection
• Metrics calculation (LOC, complexity, maintainability)
• Static security scanning
• Static performance analysis
• Knowledge graph construction
• Code chunking
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
                    AI-BASED (minimal tokens)
═══════════════════════════════════════════════════════════════
• Embedding generation (fixed cost, cached forever)
• Executive summary (reads hierarchical summaries only)
• Architecture explanation (reads layer map + dependency graph)
• Workflow explanation (reads execution flow steps)
• File explanation (reads single file's parsed symbols)
• Code tutor answers (reads retrieved chunks via RAG)
• Interview question generation (reads symbol inventory)
• Resume skill extraction (reads tech stack + metrics)
• Chat (full RAG pipeline: embed → search → prompt → generate)
═══════════════════════════════════════════════════════════════

TOKEN SAVINGS: ~85-95% vs sending raw source code to AI
CACHE SAVINGS: ~100% on repeated queries, re-visits, re-analysis
```
