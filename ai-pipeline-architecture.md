# LearnSmart — AI Analysis Pipeline Architecture

---

## 1. Overview

The AI Pipeline transforms raw extracted source code into structured, stored analysis through a 7-stage pipeline: chunking → embedding → vector store → RAG retrieval → DeepSeek generation → JSON parsing → MongoDB persistence. RAG ensures the AI always has relevant code context even for large codebases, while embeddings enable semantic search and cross-project learning.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI ANALYSIS PIPELINE                          │
│                                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │ RAW      │   │          │   │ VECTOR   │   │          │          │
│  │ EXTRACTED│──►│ CHUNKER  │──►│ EMBEDDER │──►│  FAISS   │          │
│  │ FILES    │   │          │   │          │   │  STORE   │          │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘          │
│                                                     │                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐        │                 │
│  │          │   │ DEEPSEEK │   │          │   ┌────▼─────┐          │
│  │ MONGODB  │◄──│ (via     │◄──│  RAG     │◄──│ SEMANTIC │          │
│  │ PERSIST  │   │ OpenRtr) │   │ RETRIEVER│   │ SEARCH   │          │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘          │
│                                                                       │
│  12 ANALYSIS TYPES (each runs through this pipeline independently)    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chunking Engine

### 2.1 Purpose

Source code cannot be sent to the AI as one monolithic blob for large projects. The chunker splits code into semantically meaningful units while preserving context, ensuring each chunk fits within DeepSeek's context window (128K tokens).

### 2.2 Chunking Strategies

```
STRATEGY SELECTION (by file type):

  Source code (.js, .ts, .py, .java, .cpp, etc.)
    → Semantic chunker: split by function/class/method boundaries
  
  Markdown / Documentation (.md, .rst)
    → Heading-aware chunker: split by ##/### sections
  
  Configuration files (package.json, .yml, .toml)
    → Whole-file chunker: keep entire file intact (small enough)
  
  Other text files
    → Fixed-size chunker: 2000 token sliding window with 200 token overlap
```

### 2.3 Semantic Chunker Algorithm

```
SEMANTIC CHUNKING (for source code):

Input: sourceCode, filePath, parsedSymbols (from parser engine)

Step 1: Use parsedSymbols to locate function/class/method boundaries
        (line numbers from parser.service.js)

Step 2: Group related symbols into chunks:
        - Class + all its methods → ONE chunk
        - Standalone functions → grouped with imports + module-level code
        - File header (imports, constants, type definitions) → prefix chunk

Step 3: If a class is too large (>6000 tokens):
        - Split by method groups (3-5 methods per chunk)
        - Each sub-chunk includes class header + import context

Step 4: Add overlap context to each chunk:
        - Prepend: file path, package, imports, parent class signature
        - Append: exports summary

Step 5: Merge adjacent small chunks (<200 tokens)

Output: Chunk[] where each chunk:
        {
          id: string,              // unique ID: {fileHash}-{chunkIndex}
          content: string,         // the actual code text
          metadata: {
            filePath: string,
            language: string,
            symbolName?: string,   // primary class/function in this chunk
            symbolKind?: string,
            startLine: number,
            endLine: number,
            chunkType: 'header' | 'class' | 'function' | 'module' | 'config' | 'doc',
          },
          tokenCount: number,      // approximate
        }
```

### 2.4 Token Counting

```
ESTIMATED TOKEN COUNT = Math.ceil(content.length / 3.5)

Accurate enough for chunking decisions without calling an external tokenizer.
3.5 chars-per-token is the approximate ratio for mixed code/English text.
```

### 2.5 Chunking Configuration

```
MAX_CHUNK_TOKENS: 4000          (target chunk size — leaves room for prompt + response)
OVERLAP_TOKENS: 200              (sliding window overlap for fixed-size fallback)
MIN_CHUNK_TOKENS: 100            (merge smaller chunks)
MAX_CHUNKS_PER_FILE: 50          (safety limit for enormous files)
MAX_TOTAL_CHUNKS: 2000           (project-wide safety limit)
```

### 2.6 File Header (Context Prefix)

Every chunk carries a file header for standalone understanding:

```
// File: src/components/AnalysisPage.jsx
// Package: client/src/components/analysis
// Language: JavaScript (React)
// Imports: React, useState, ExecutiveSummary, ArchitectureBreakdown, ...
// 
// This file contains:
//   - AnalysisPage (React component) — main tabbed analysis view
//   - tab state management via useState
//
// --- CODE BELOW ---
```

---

## 3. Embedding Generation

### 3.1 Purpose

Convert code chunks into dense vector representations (embeddings) for semantic similarity search. This enables RAG to find the most relevant code sections for any analysis question.

### 3.2 Embedding Model

```
MODEL:      text-embedding-3-small (via OpenRouter)
            OR all-MiniLM-L6-v2 (local, via @xenova/transformers)

STRATEGY:   Primary: OpenRouter embedding API (1536-dim)
            Fallback: Local transformers.js model (384-dim)
            Switch to local if: rate limited, offline, or cost threshold exceeded

DIMENSIONS: 1536 (OpenRouter) or 384 (local)
            Stored in FAISS index — dimension fixed per index
```

### 3.3 Embedding Pipeline

```
For each chunk in chunks[]:

  1. Prepare embedding text:
     - If chunk has code: "[LANGUAGE] [SYMBOL_KIND] [SYMBOL_NAME]\n\n{code}"
     - If chunk is config: "[CONFIG_TYPE]\n\n{content}"
     - If chunk is doc: "[DOC] {filePath}\n\n{content}"

  2. Call embedding API (batch up to 100 chunks per request)

  3. Receive [1536] float32 vector per chunk

  4. Store vector alongside chunk metadata in VectorStore

Retry policy:
  - 429 (rate limit): exponential backoff 1s→2s→4s→8s
  - 5xx: retry up to 3 times
  - Fail: mark chunk as not_embedded, continue with remaining
```

### 3.4 Embedding Cache

```
CACHE KEY: SHA-256(content)
PURPOSE:   Avoid re-embedding identical code chunks across projects
STORAGE:   In-memory Map (per analysis session), cleared after analysis
           Optional: Redis for cross-session caching (production)

Hit rate estimate: 15-25% (imports, utility functions, config files often identical)
Time saved: ~200ms per cached chunk (API call eliminated)
```

---

## 4. Vector Database (FAISS)

### 4.1 Purpose

Store and query embeddings for semantic search during RAG. FAISS (Facebook AI Similarity Search) provides fast approximate nearest-neighbor search over high-dimensional vectors.

### 4.2 Architecture

```
┌─────────────────────────────────────────┐
│            FAISS VECTOR STORE            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         IndexFlatIP (brute force)   │  │  ← Small projects (<500 chunks)
│  │         OR                           │  │
│  │         IndexIVFFlat (clustered)    │  │  ← Large projects (500+ chunks)
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         Metadata Store              │  │
│  │  chunkId → {                        │  │
│  │    content, filePath, language,     │  │
│  │    symbolName, symbolKind,           │  │
│  │    startLine, endLine               │  │
│  │  }                                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  API:                                    │
│    addVectors(vectors[], metadata[])     │
│    search(queryVector, k): results[]     │
│    save(path): persist index to disk     │
│    load(path): restore index from disk   │
│    dispose(): free memory                │
└─────────────────────────────────────────┘
```

### 4.3 Index Selection

```
IF totalChunks <= 500:
  → IndexFlatIP (exact inner product search)
  → Fast enough for small projects, zero accuracy loss

IF totalChunks > 500:
  → IndexIVFFlat (inverted file with flat quantization)
  → Requires training step (done on all vectors before search)
  → nlist = 4 * sqrt(totalChunks)  (number of clusters)
  → nprobe = nlist / 8             (clusters to search per query)

Index type stored in vectorStore for query-time reference.
```

### 4.4 Persistence

```
LIFECYCLE:
  1. Created: during analysis pipeline startup
  2. Populated: as embeddings are generated
  3. Queried: during RAG retrieval (12 analysis types)
  4. NOT persisted to disk (project-specific, ephemeral)
  5. Destroyed: after analysis completes (cleanup service)

RATIONALE: FAISS indexes are project-specific and temporary.
           No need for permanent vector storage — source code
           is never persisted. Embeddings live only during analysis.
```

### 4.5 Multi-Index Strategy (for large projects)

```
For projects with >1000 chunks:

  INDEX 1: "Code Index" — all source code chunks
  INDEX 2: "Config Index" — configuration files only
  INDEX 3: "Doc Index" — documentation/markdown only

  Querying:
    - "Explain the architecture" → searches Code + Config indices
    - "What dependencies are used?" → searches Config index only
    - "How does the auth flow work?" → searches Code index only

  This prevents config files from polluting code-similarity results
  and vice versa.
```

---

## 5. RAG (Retrieval-Augmented Generation)

### 5.1 Purpose

Instead of sending the entire codebase to DeepSeek (which may exceed context limits), RAG retrieves only the **most relevant chunks** for each specific analysis question and includes them in the prompt. This gives the AI focused, high-signal context.

### 5.2 RAG Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                               │
│                                                                    │
│  1. ANALYSIS QUESTION                                              │
│     e.g., "Explain the architecture of this project"              │
│     │                                                              │
│     ▼                                                              │
│  2. QUERY EMBEDDING                                                │
│     Embed the question text → queryVector [1536]                  │
│     │                                                              │
│     ▼                                                              │
│  3. SEMANTIC SEARCH (FAISS)                                        │
│     search(queryVector, k=15) → top 15 most relevant chunks       │
│     │                                                              │
│     ▼                                                              │
│  4. RESULT AUGMENTATION                                            │
│     For each retrieved chunk:                                      │
│       ├── Fetch full content from metadata store                  │
│       ├── Fetch parent file context (imports, class signature)    │
│       └── Fetch related chunks (same file, adjacent lines)        │
│     │                                                              │
│     ▼                                                              │
│  5. RE-RANKING (cross-encoder fallback)                            │
│     Re-sort results by relevance score                             │
│     │                                                              │
│     ▼                                                              │
│  6. CONTEXT ASSEMBLY                                               │
│     Combine: System prompt + retrieved chunks + question           │
│     Ensure total tokens < MAX_CONTEXT_TOKENS (8000)                │
│     │                                                              │
│     ▼                                                              │
│  7. DEEPSEEK CALL                                                  │
│     Send assembled prompt to DeepSeek via OpenRouter               │
│     │                                                              │
│     ▼                                                              │
│  8. RESPONSE                                                       │
│     Parse and validate response → store in MongoDB                │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 RAG Prompt Template

```
SYSTEM:
You are an expert software architect analyzing a codebase.
You have access to the most relevant code sections for your analysis.
Base your answer ONLY on the provided code context.
If the context is insufficient, state what additional information you need.

CODE CONTEXT (most relevant code sections, ordered by relevance):
---
[CHUNK 1 — File: src/index.ts, Symbol: App component]
...code...
---
[CHUNK 2 — File: src/routes/auth.ts, Symbol: authRouter]
...code...
---
[CHUNK 3 — File: package.json]
...code...
---

ADDITIONAL PROJECT INFO:
- Language: TypeScript (React)
- Framework: Express.js backend
- Tech stack: React, Express, MongoDB, JWT, Tailwind CSS
- Total files: 47, Total LOC: 3,241
- Parser summary: 17 components, 5 services, 4 hooks detected

QUESTION:
{analysis question}

INSTRUCTIONS:
{output format instructions}
```

### 5.4 Retrieval Strategies by Analysis Type

```
ANALYSIS TYPE          RETRIEVAL STRATEGY              k    INDICES
──────────────         ──────────────────              ─    ───────
Executive Summary      Broadest search                 25   All
Architecture           Code structure + configs        15   Code + Config
Workflow               Entry points + routes           15   Code
Beginner Guide         High-level + readme             15   Code + Doc
File Explanations      Per-file search                 10   Code (filtered)
Dependency Graph       Import/export patterns          20   Code
API Flows              Route handlers + middleware     15   Code
Database Models        Schema/models + migrations      15   Code + Config
Execution Flow         main/entry + controller         15   Code
Skills Extraction      All code (broad)                20   All
Resume Highlights      Summary-level                   10   Code + Config
Interview Questions    Targeted by difficulty          15   Code
```

### 5.5 Context Window Management

```
MAX_CONTEXT_TOKENS = 8000  (leaves ~4000 for DeepSeek response)

ASSEMBLY ALGORITHM:
  1. Calculate system prompt tokens (~500)
  2. Calculate additional project info tokens (~200)
  3. Calculate question + output instructions tokens (~300)
  4. Remaining budget = 8000 - 500 - 200 - 300 = 7000 tokens

  5. For each retrieved chunk (in relevance order):
     a. Calculate chunk tokens
     b. If budget - chunk tokens >= 0:
        → Include chunk, subtract from budget
     c. Else:
        → Truncate chunk to fit remaining budget (with "[...]" marker)
        → Include truncated version, break loop

  6. If fewer than 3 chunks fit:
     → Increase MAX_CONTEXT_TOKENS to 10000 (reduces response buffer)
     → Still not enough → warn but proceed with available context
```

---

## 6. DeepSeek Integration

### 6.1 OpenRouter Client

```
CONFIGURATION:
  Base URL:  https://openrouter.ai/api/v1
  Model:     deepseek/deepseek-chat (128K context)
  Auth:      Bearer token from OPENROUTER_API_KEY env var
  Headers:   HTTP-Referer: CLIENT_URL
             X-Title: LearnSmart

PARAMETERS (per call):
  temperature:    0.2    (low — factual analysis, not creative writing)
  top_p:          0.95
  max_tokens:     4096   (for most analyses)
  max_tokens:     8192   (for file explanations, interview questions)
  frequency_penalty: 0
  presence_penalty:  0
  stream:         false  (we wait for complete response)
```

### 6.2 Retry & Resilience

```
RETRY POLICY:
  Max attempts:    4
  Backoff:         1s → 2s → 4s → 8s (exponential)
  Jitter:          ±500ms random

  Retry on:
    429 (Rate Limited)   → honor Retry-After header if present
    502 (Bad Gateway)
    503 (Service Unavailable)
    504 (Gateway Timeout)
    ECONNRESET
    ETIMEDOUT
  
  Do NOT retry on:
    400 (Bad Request)    → prompt too large, fix chunking
    401 (Unauthorized)   → API key issue, fail fast
    402 (Payment Required)
    403 (Forbidden)

TIMEOUT:
  Per-request: 120 seconds (analysis can be slow on large contexts)
  
CIRCUIT BREAKER:
  If 5 consecutive failures:
    → Open circuit for 30 seconds
    → All subsequent calls immediately fail
    → After 30s, try one request (half-open)
    → If succeeds, close circuit
    → If fails, reset timer
```

### 6.3 Response Validation

```
FOR MARKDOWN RESPONSES:
  1. Check response is non-empty
  2. Check response length > 100 chars (reasonable minimum)
  3. If empty or too short → retry with stricter prompt
  4. Log warning but accept (don't block pipeline for minor issues)

FOR JSON RESPONSES:
  1. Extract JSON from response (handle markdown code blocks):
     a. Try parsing raw response as JSON
     b. Try extracting from ```json ... ``` block
     c. Try extracting from ``` ... ``` block (generic code block)
     d. Try extracting first { or [ to last } or ] (greedy)
  
  2. Parse JSON
     a. If succeeds → validate against expected schema
     b. If fails → attempt repair (fix trailing commas, unquoted keys)
     c. If still fails → retry AI call with "YOU RETURNED INVALID JSON" correction
  
  3. Schema validation (simplified):
     a. Check expected top-level keys exist
     b. Check array fields are actually arrays
     c. Check required string fields are non-empty
     d. Report validation warnings but don't block (partial results)
  
  4. Fallback: if 3 retries all fail → store raw response with parse_error flag

MAX JSON RETRIES: 2 (after initial call, total 3 attempts)
```

---

## 7. Analysis Orchestrator

### 7.1 Pipeline Phases

```
PHASE 0: SETUP
  ├── Create Project document (status='analyzing')
  └── Initialize FAISS vector store

PHASE 1: CHUNKING (~500ms)
  ├── Receive parsedFiles[] + raw text from earlier pipeline stages
  ├── Run chunker on all files
  └── Output: chunks[] (500-2000 typical)

PHASE 2: EMBEDDING (~5-30s, parallel batches of 100)
  ├── Prepare embedding texts for all chunks
  ├── Call embedding API in batches
  ├── Populate FAISS index
  └── Output: vectorStore ready for querying

PHASE 3: RAG + GENERATION (~30-90s, parallel by analysis type)
  │
  ├── GROUP A (parallel, 3 concurrent):
  │   ├── Executive Summary
  │   ├── Architecture Explanation
  │   ├── Workflow Explanation
  │   └── Beginner Explanation
  │
  ├── GROUP B (parallel, 3 concurrent):
  │   ├── File Explanations
  │   ├── Dependency Graph
  │   └── API Flows
  │
  ├── GROUP C (parallel, 3 concurrent):
  │   ├── Database Models
  │   ├── Execution Flow
  │   └── Skills Extraction
  │
  └── GROUP D (parallel, 2 concurrent):
      ├── Resume Highlights
      └── Interview Questions

PHASE 4: PERSIST & CLEANUP (~500ms)
  ├── Save AnalysisResult to MongoDB
  ├── Save Skills to MongoDB
  ├── Save InterviewQuestions to MongoDB
  ├── Update Project status = 'completed'
  ├── Dispose FAISS vector store (free memory)
  └── Delete temp extraction directory
```

### 7.2 Parallel Execution

```
CONCURRENCY MODEL:

  Each analysis type is an independent RAG → Generate → Parse task.
  
  const runAnalysisType = async (type, promptTemplate) => {
    1. const queryVector = await embedText(type.queryText);
    2. const relevantChunks = await vectorStore.search(queryVector, type.k);
    3. const context = assembleContext(relevantChunks, projectInfo);
    4. const rawResponse = await callDeepSeek(type.systemPrompt, context, type.question);
    5. return parseResponse(rawResponse, type.outputFormat);
  };

  // Groups executed sequentially, items within groups in parallel:
  for (const group of [GROUP_A, GROUP_B, GROUP_C, GROUP_D]) {
    await Promise.allSettled(group.map(type => runAnalysisType(type, prompts[type])));
    updateProgress(projectId);  // after each group completes
  }

FAILURE HANDLING:
  - If one analysis type in a group fails → others in group continue
  - Failed types are recorded in project.analysisErrors[]
  - Project status only set to 'completed' if ALL types succeed
  - Partial failure: status='completed_with_warnings' if >=80% types succeed
  - Catastrophic failure: status='failed' if <50% types succeed
```

### 7.3 Progress Tracking

```
const PROGRESS_WEIGHTS = {
  setup:        5,
  chunking:     5,
  embedding:   15,
  groupA:      20,   // 4 analyses × 5% each
  groupB:      20,   // 3 analyses × 6.67% each
  groupC:      20,   // 3 analyses × 6.67% each
  groupD:      10,   // 2 analyses × 5% each
  persist:      5,
};

Progress stored on Project document:
  project.analysisProgress = { current: 0-100, phase: 'embedding', startedAt, updatedAt }
  
  Polling endpoint: GET /api/projects/:id/analysis/status
  Response: { status, progress: { current, phase, estimatedSecondsRemaining } }
```

---

## 8. Prompt Catalog (Detailed)

### 8.1 System Prompts

| # | Type | System Prompt Summary |
|---|------|----------------------|
| 1 | Executive Summary | "You are a technical writer. Write a 500-word executive summary of this project covering its purpose, key features, architecture style, and target users." |
| 2 | Architecture | "You are a senior software architect. Analyze the codebase architecture. Identify patterns (MVC, microservices, event-driven, etc.), layer responsibilities, component relationships, and data flow." |
| 3 | Workflow | "You are a systems analyst. Trace the primary user journey or request lifecycle through the codebase. Identify entry points, middleware chain, handler flow, and response path." |
| 4 | Beginner Guide | "You are a coding mentor. Explain this project to someone learning to code. Avoid jargon. Use analogies. Focus on what the project does and the big ideas, not implementation details." |
| 5 | File Explanations | "Explain each file in the codebase concisely. For each file include: its primary purpose, what problem it solves, key functions/classes it exports, and which other files it depends on." |
| 6 | Dependency Graph | "Return a JSON dependency graph of this project. Include all files as nodes and imports/requires as edges. Categorize nodes by type (component, service, util, config, etc.)." |
| 7 | API Flows | "Identify all API endpoints in this project. For each endpoint include: HTTP method, URL path, the handler function, a brief description, request body structure, and response structure." |
| 8 | Database Models | "Identify all data models/entities/schemas in this project. Include field names, types, whether they're required, and relationships between models." |
| 9 | Execution Flow | "Trace the execution flow of the main entry point(s). Return an ordered list of steps showing what happens when the application starts or handles its primary use case." |
| 10 | Skills | "Analyze the codebase and identify all technologies, frameworks, patterns, and skills demonstrated. Categorize by type. Estimate proficiency level based on usage depth and complexity." |
| 11 | Resume Highlights | "Generate 5-7 impactful resume bullet points based on this project. Include a 3-sentence professional summary. Focus on achievements, scale, and technical decisions." |
| 12 | Interview Questions | "Generate 10 interview questions about this project. Vary difficulty (beginner, intermediate, advanced) and category (architecture, code, design patterns, tech stack, behavioral). Include suggested answers." |

### 8.2 Output Format Instructions

For JSON responses, every prompt ends with:

```
Return ONLY valid JSON. Do not include markdown code blocks, explanations, or any text outside the JSON object/array. The response must be parseable by JSON.parse().

Expected format:
{
  "key": "value",
  ...
}
```

---

## 9. Embedding Service Interface

```
IEmbeddingService
├── initialize(): Promise<void>
│     Load model (API key check or local model download)
│
├── embedTexts(texts: string[]): Promise<number[][]>
│     Batch embed multiple texts → array of vectors
│
├── embedText(text: string): Promise<number[]>
│     Single text → single vector (caches internally)
│
├── getEmbedding(text: string): Promise<number[]>
│     High-level: checks cache → calls API/local → caches result
│
├── getCacheKey(text: string): string
│     SHA-256 hash for cache lookup
│
└── dispose(): Promise<void>
      Free local model memory
```

---

## 10. Vector Store Interface

```
IVectorStore
├── initialize(dimension: number, indexType?: 'flat' | 'ivf'): Promise<void>
│     Create FAISS index of specified dimension
│
├── addVectors(vectors: number[][], metadatas: ChunkMetadata[]): Promise<void>
│     Add vectors + metadata to index
│
├── search(queryVector: number[], k: number, filter?: Filter): Promise<SearchResult[]>
│     Search for k nearest neighbors, optionally filtered by metadata
│
├── save(filePath: string): Promise<void>
│     Serialize index + metadata to disk
│
├── load(filePath: string): Promise<void>
│     Restore index + metadata from disk
│
├── size(): number
│     Number of vectors in store
│
└── dispose(): Promise<void>
      Free memory, delete temp files
```

---

## 11. AI Service Interface

```
IAIService
├── initialize(): Promise<void>
│     Validate API key, test connection
│
├── callDeepSeek(messages: Message[], options?: CallOptions): Promise<string>
│     Raw OpenRouter chat completion call
│
├── callDeepSeekJSON(messages: Message[], options?: CallOptions): Promise<object>
│     Call + JSON.parse with retry
│
├── analyzeWithRAG(
│     analysisType: string,
│     queryText: string,
│     systemPrompt: string,
│     vectorStore: IVectorStore,
│     k: number,
│     projectInfo: ProjectInfo
│   ): Promise<AnalysisResult>
│     Full RAG pipeline for one analysis type
│
├── runAnalysisPipeline(
│     projectId: string,
│     chunks: Chunk[],
│     projectInfo: ProjectInfo
│   ): Promise<AnalysisReport>
│     Orchestrates complete pipeline: embed → store → 12 RAG calls → persist
│
└── estimateTokens(text: string): number
      chars / 3.5 approximation
```

---

## 12. Data Flow Diagram (End-to-End)

```
upload.service.js
    │
    ├──► file.service.extractZip()
    │       └──► raw files + file tree
    │
    ├──► parser.service.parseAllFiles()
    │       └──► parsedFiles[] with symbols/imports/exports
    │
    ├──► techStack.service.detectAll()
    │       └──► DetectionReport (categorized tech stacks)
    │
    └──► ai.service.runAnalysisPipeline()
            │
            ├──► CHUNKER: parsedFiles → chunks[] (500-2000)
            │       └──► Semantic chunking by function/class boundaries
            │
            ├──► EMBEDDER: chunks[] → embeddings[] (1536-dim vectors)
            │       └──► OpenRouter text-embedding-3-small (with local fallback)
            │
            ├──► VECTOR STORE: embeddings[] → FAISS index
            │       └──► IndexFlatIP (<500) or IndexIVFFlat (500+)
            │
            ├──► RAG (12 parallel analyses):
            │   │
            │   │  For each analysis type:
            │   │    1. Embed analysis question → queryVector
            │   │    2. FAISS search(queryVector, k) → top-k chunks
            │   │    3. Assemble context from retrieved chunks
            │   │    4. DeepSeek(system_prompt + context + question)
            │   │    5. Parse response (markdown or JSON)
            │   │
            │   │  Groups: A(4) → B(3) → C(3) → D(2)
            │   │  Within-group: parallel
            │   └── Between-group: sequential
            │
            └──► PERSIST: AnalysisResult + Skills + InterviewQuestions → MongoDB

CLEANUP:
    ├──► FAISS store dispose()
    ├──► Chunk cache clear
    ├──► Embedding cache clear
    └──► Temp directory deletion
```

---

## 13. File Structure

```
server/src/
├── services/
│   ├── ai.service.js              # DeepSeek client + RAG orchestrator
│   ├── embedding.service.js       # Embedding generation (OpenRouter + local fallback)
│   ├── chunker.service.js         # Semantic code chunking
│   └── vector-store.service.js    # FAISS index management
│
├── ai/
│   ├── prompts.js                 # All 12 system prompts + output format instructions
│   ├── retry.js                   # Retry policy + circuit breaker
│   ├── json-parser.js             # JSON extraction + repair + validation
│   └── context-assembler.js       # RAG context assembly + token budget management
│
├── models/
│   ├── AnalysisResult.js          # (already exists — may need minor updates)
│   ├── Skill.js
│   └── InterviewQuestion.js
│
└── utils/
    └── token-counter.js           # Token estimation utilities
```

### Build Sequence

```
 1. utils/token-counter.js           (no deps)
 2. ai/retry.js                      (no deps)
 3. ai/json-parser.js                (no deps)
 4. ai/prompts.js                    (no deps — pure data)
 5. config/openrouter.js             (already exists, may need update)
 6. services/embedding.service.js    (depends on openrouter config)
 7. services/vector-store.service.js (depends on FAISS — npm: faiss-node)
 8. services/chunker.service.js      (depends on parser.service for symbols)
 9. ai/context-assembler.js          (depends on chunker, token-counter)
10. services/ai.service.js           (depends on ALL above)
11. services/analysis.service.js     (already planned, now calls ai.service)
```

### New npm Dependencies

```json
{
  "faiss-node": "^0.5",
  "@xenova/transformers": "^2.17"
}
```

---

## 14. Performance Estimates

```
PROJECT SIZE    FILES   CHUNKS    EMBED    FAISS    12 RAG CALLS    TOTAL
────────────    ─────   ──────    ─────    ─────    ────────────    ─────
Tiny            10      50        1s       0.1s     20s              ~25s
Small           50      200       4s       0.5s     35s              ~45s
Medium          200     600       12s      2s       55s              ~75s
Large           500     1500      30s      5s       90s              ~130s
Very Large      1000+   2000+     45s      10s      120s             ~180s

Assumptions:
  - Embedding: 100 chunks/batch, ~200ms per batch (OpenRouter)
  - FAISS search: <10ms per query (flat), <5ms (IVF)
  - DeepSeek: 2-8s per call (varies by output length)
  - Parallel execution: 3 concurrent within groups

Large project bottleneck: embedding generation (mitigated by batching)
```

---

## 15. Error Recovery Scenarios

```
SCENARIO                            HANDLING
────────                            ────────
Embedding API down                  Switch to local transformers.js model
                                   (smaller dim, switch FAISS index dimension)

One DeepSeek call fails             Retry 4× with backoff
                                   If all fail → mark analysis type as failed
                                   Other types continue

All DeepSeek calls fail             Project status = 'failed'
                                   Store error details in project.errorMessage
                                   Cleanup temp files

FAISS memory exhausted              Switch to disk-based index (IndexIVFFlat)
                                   Or reduce k (fewer chunks retrieved per query)

Chunking produces 0 chunks          400 error "No readable source files found"
                                   (only binary files / empty ZIP)

Context window overflow             Truncate retrieved chunks to fit budget
                                   Log warning about incomplete context

Partial analysis success            status = 'completed_with_warnings'
                                   Store which types failed in analysisErrors[]
```
