# LearnSmart — RAG AI Pipeline Architecture

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG AI PIPELINE                                    │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │  FILE    │    │ CHUNKING │    │ EMBEDDING│    │  VECTOR  │    │  RAG   │ │
│  │ READER   │───►│ ENGINE   │───►│  ENGINE  │───►│  STORE   │───►│ENGINE  │ │
│  │          │    │          │    │          │    │          │    │        │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └───┬────┘ │
│       │              │               │               │               │      │
│       ▼              ▼               ▼               ▼               ▼      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ Raw text │    │ Semantic │    │ 1536-dim │    │  FAISS   │    │DeepSeek│ │
│  │ per file │    │ chunks   │    │ vectors  │    │  Index   │    │  Call  │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  USER QUERY                           RAG RETRIEVAL                          │
│  ─────────                            ────────────                            │
│  "How does auth    ──►  Embed query ──►  FAISS.search(k=10)                  │
│   middleware work?"                                          │                │
│                                                               ▼                │
│                              ┌────────────────────────────────────┐          │
│                              │        CONTEXT ASSEMBLER            │          │
│                              │  • Top-K chunks (token budget 60%)  │          │
│                              │  • Conversation history (25%)       │          │
│                              │  • Project metadata (10%)           │          │
│                              │  • User question (5%)               │          │
│                              └──────────────┬─────────────────────┘          │
│                                             │                                 │
│                                             ▼                                 │
│                              ┌─────────────────────────────┐                 │
│                              │   DEEPSEEK (via OpenRouter)  │                 │
│                              │   temperature: 0.2           │                 │
│                              │   max_tokens: 4096           │                 │
│                              └──────────────┬──────────────┘                 │
│                                             │                                 │
│                                             ▼                                 │
│                                    STRUCTURED ANSWER                          │
│                                    with file references                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pipeline Stages

### Stage 1 — File Reader

```
INPUT:  Extracted source directory, or ParsedFile[] from parser pipeline

PROCESS:
  1. Walk directory recursively
  2. Skip: node_modules, .git, dist, build, __pycache__, binaries
  3. Read text files as UTF-8
  4. For each file: capture { filePath, language, content, loc }

OUTPUT: TextFile[] → forwarded to Chunker
```

### Stage 2 — Chunking Engine

```
STRATEGY SELECTION TABLE:

FILE TYPE          │ CHUNK METHOD          │ TARGET SIZE  │ OVERLAP
───────────────────┼───────────────────────┼──────────────┼────────
JS/TS/JSX/TSX      │ Semantic (function/   │ 2000 tokens  │ Imports +
                   │  class boundaries)    │              │ exports header
Python             │ Semantic (def/class)  │ 2000 tokens  │ Imports header
Java/C++/Others    │ Fixed-size sliding    │ 2000 tokens  │ 200 tokens
Markdown           │ Heading-aware (#/##)  │ 3000 tokens  │ None
Config files       │ Whole-file            │ Full file    │ None
───────────────────┼───────────────────────┼──────────────┼────────

CHUNK STRUCTURE:
{
  chunkId: "sha256hash-chunkIndex",    // stable ID for caching
  filePath: "src/routes/auth.ts",      // origin file
  language: "TypeScript",
  content: "import jwt from ...",      // actual code text
  symbolName: "authRouter",            // primary class/function name
  symbolKind: "function",
  startLine: 12,
  endLine: 48,
  chunkType: "function",               // function | class | module | config | doc
  tokenCount: 1850,                    // estimated
}

TOKEN ESTIMATION:
  tokens ≈ chars / 3.5    (accurate enough for chunking decisions)

SAFETY LIMITS:
  Max chunk tokens:   4000
  Max chunks per file: 50
  Max total chunks:    2000
```

### Stage 3 — Embedding Engine

```
TWO-MODEL STRATEGY:

  PRIMARY:   text-embedding-3-small  (via OpenRouter API)
             • Dimension: 1536
             • Batch size: 100 texts per API call
             • Latency: ~200ms per batch

  FALLBACK:  all-MiniLM-L6-v2       (local, via @xenova/transformers)
             • Dimension: 384
             • Batch size: 32 texts
             • No API cost, always available
             • Triggered when: API rate limited, offline, or cost threshold exceeded

EMBEDDING PIPELINE:
  1. Prepare embedding text per chunk:
     [LANGUAGE] [SYMBOL_KIND] [SYMBOL_NAME]
     {code content}

  2. Batch chunks (100 per API request)

  3. Send to embedding API with retry:
     • 429 → exponential backoff 1s→2s→4s→8s
     • 5xx → retry up to 3 times

  4. Receive float32 vectors

  5. Cache by SHA-256(content) → avoid re-embedding identical code

OUTPUT:  Vector[] (1536-dim) + ChunkMetadata → forwarded to Vector Store
```

### Stage 4 — Vector Store (FAISS)

```
INDEX SELECTION:

  Total chunks ≤ 500   →  IndexFlatIP
    • Exact inner product search
    • Fast enough for small projects
    • Zero accuracy loss

  Total chunks > 500   →  IndexIVFFlat
    • Inverted file with flat quantization
    • nlist = 4 × √(totalChunks)     clusters
    • nprobe = nlist / 8              searched per query
    • Requires training step before use

MULTI-INDEX STRATEGY (1000+ chunks):

  Index 1: "Code Index"     — all source code chunks
  Index 2: "Config Index"   — package.json, tsconfig, .env, etc.
  Index 3: "Doc Index"      — README.md, CONTRIBUTING.md, etc.

  Query routing:
    • "Explain architecture" → Code + Config indices
    • "What dependencies?"   → Config index only
    • "How does auth work?"  → Code index only

LIFECYCLE:
  Created during analysis startup
  Populated as embeddings are generated
  Queried during all 12 RAG analysis calls
  Destroyed after analysis completes (ephemeral)
  Vectors persisted to ChatVectorCache (MongoDB) for chat feature

PERSISTENCE (for Chat):
  ChatVectorCache {
    projectId,
    vectors: [{ chunkId, filePath, content, vector[], startLine, endLine }],
    dimension: 1536,
    chunkCount: N
  }
  → Loaded on-demand for chat, cached in LRU (5 projects, 30-min TTL)
```

### Stage 5 — Semantic Search

```
SEARCH FLOW:

  Query text: "How does JWT authentication work?"

  1. EMBED QUERY
     └── embedQuery(queryText) → queryVector [1536]

  2. ENHANCE QUERY (if follow-up)
     └── Merge with previous question context
     └── Add project tech stack keywords

  3. FAISS SEARCH
     └── index.search(queryVector, k=10) → top-10 results

  4. POST-PROCESSING
     ├── Deduplicate: keep only highest-scoring per filePath
     ├── Re-rank: combine semantic score + keyword overlap score
     └── Filter: remove chunks below similarity threshold (<0.3)

  5. RETURN TOP-K (k=5 default)

SEARCH RESULT:
{
  filePath: "src/routes/auth.ts",
  content: "router.post('/login'...",
  score: 0.87,
  symbolName: "authRouter",
  startLine: 12,
  endLine: 48
}
```

### Stage 6 — RAG Generation

```
┌──────────────────────────────────────────────────────────────┐
│                     RAG CONTEXT ASSEMBLY                      │
│                                                               │
│  TOKEN BUDGET: 8000 total                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ SYSTEM PROMPT           ~500 tokens  (6%)            │     │
│  │ "You are an expert software architect..."            │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ PROJECT METADATA        ~300 tokens  (4%)            │     │
│  │ Tech stack, file count, LOC, architecture summary    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ RETRIEVED CHUNKS        ~4800 tokens  (60%)          │     │
│  │ Top-5 relevant code sections with file headers       │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ CONVERSATION HISTORY    ~1600 tokens  (20%)          │     │
│  │ Last 10 exchanges (if chat mode)                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ USER QUESTION           ~300 tokens  (4%)            │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ RESERVE                 ~500 tokens  (6%)            │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘

RAG PROMPT TEMPLATE:

SYSTEM:
You are an expert software architect analyzing a codebase.
Answer based ONLY on the provided code context.
If context is insufficient, state what you need.
Be specific — reference file paths and function names.

CODE CONTEXT (most relevant sections):
---
[Chunk 1] File: src/routes/auth.ts | Function: authRouter | Score: 0.92
{code}
---
[Chunk 2] File: src/middleware/authenticate.ts | Score: 0.85
{code}
---

USER QUESTION:
How does authentication work in this project?
```

---

## 3. Folder Structure

```
server/src/
│
├── services/
│   ├── ai.service.js                    # DeepSeek client + raw API calls
│   ├── embedding.service.js             # Embedding generation (API + local fallback)
│   ├── chunker.service.js               # Semantic code chunking engine
│   ├── vector-store.service.js          # FAISS index create/search/dispose
│   ├── rag.service.js                   # RAG orchestrator (main entry point)
│   └── analysis-orchestrator.service.js # Full pipeline: file → chunk → embed → store → RAG → save
│
├── ai/
│   ├── prompts.js                       # 12 system prompts (one per analysis type)
│   ├── retry.js                         # Exponential backoff + circuit breaker
│   ├── json-parser.js                   # JSON extraction + repair from AI responses
│   ├── context-assembler.js             # Token budget management + prompt assembly
│   └── query-enhancer.js                # Follow-up detection + query rewriting
│
├── chunkers/
│   ├── semantic-chunker.js              # Function/class boundary-based splitting
│   ├── fixed-chunker.js                 # Fixed-size sliding window (fallback)
│   ├── heading-chunker.js               # Markdown heading-aware splitting
│   └── chunker-router.js                # Selects chunker by file type
│
├── embedders/
│   ├── openrouter-embedder.js           # OpenRouter text-embedding-3-small
│   ├── local-embedder.js                # @xenova/transformers (all-MiniLM-L6-v2)
│   └── embedder-factory.js              # Primary/Fallback selection logic
│
├── vector-store/
│   ├── faiss-store.js                   # FAISS IndexFlatIP + IndexIVFFlat
│   ├── store-manager.js                 # Multi-index management (code/config/doc)
│   └── cache-store.js                   # ChatVectorCache MongoDB persistence
│
├── models/
│   └── ChatVectorCache.js               # Persistent vector storage for chat
│
└── utils/
    ├── token-counter.js                 # chars/3.5 estimation
    └── fileUtils.js                     # Binary detection, ext-to-lang mapping
```

---

## 4. Dependencies

```json
{
  "faiss-node": "^0.5.0",
  "@xenova/transformers": "^2.17.0"
}
```

---

## 5. Information Flow Summary

```
UPLOAD PROJECT
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ file.service.extractZip()                                    │
│   → raw files extracted to temp directory                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ chunker-router.js                                           │
│   → Routes each file to correct chunker by language          │
│   → semantic-chunker.js    (JS/TS/Python)                   │
│   → fixed-chunker.js       (fallback for all others)        │
│   → heading-chunker.js     (markdown only)                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ embedder-factory.js                                         │
│   → Tries openrouter-embedder.js first                      │
│   → Falls back to local-embedder.js on failure              │
│   → Returns 1536-dim (API) or 384-dim (local) vectors       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ store-manager.js                                            │
│   → Creates 1-3 FAISS indices depending on chunk count      │
│   → Populates with vectors + metadata                       │
│   → Persists vectors to ChatVectorCache (MongoDB)           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ rag.service.js                                              │
│   → For each analysis type (12 total):                      │
│       1. Embed analysis question                            │
│       2. Search FAISS (k=5-25 depending on type)            │
│       3. Assemble context (token budget 8000)               │
│       4. Call DeepSeek                                      │
│       5. Parse response (JSON or markdown)                  │
│   → Groups: A(4) → B(3) → C(3) → D(2)                      │
│   → Within-group: parallel (Promise.allSettled)              │
│   → Between-group: sequential                               │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ SAVE TO MONGODB                                             │
│   → AnalysisResult (summary, architecture, workflow, etc.)  │
│   → Skill (extracted skills + highlights)                   │
│   → InterviewQuestion (questions + answers)                 │
│   → ChatVectorCache (vectors for future chat sessions)      │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ CLEANUP                                                     │
│   → Dispose FAISS indices (free RAM)                        │
│   → Delete temp extraction directory (source code gone)     │
│   → Only analysis results + vectors remain in MongoDB       │
└─────────────────────────────────────────────────────────────┘
```
