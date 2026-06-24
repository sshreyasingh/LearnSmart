# LearnSmart — AI Chat System Architecture

---

## 1. Overview

The AI Chat system enables users to ask natural-language questions about their analyzed projects. It uses RAG (Retrieval-Augmented Generation) to find relevant code sections, maintains conversation context across follow-ups, and references specific files in answers. The chat persists across sessions — users can return to a project and continue their conversation.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CHAT SYSTEM                              │
│                                                                    │
│  USER INPUT                   RAG PIPELINE         AI RESPONSE     │
│  ─────────                   ────────────         ───────────     │
│                                                                    │
│  "How does auth    ──►  Embed query  ──►  FAISS search            │
│   work in this                                          │          │
│   project?"                                   Top-5 chunks         │
│                                                    │               │
│  ┌──────────────────┐                    ┌─────────▼─────────┐    │
│  │ Conversation     │                    │ Context Assembler   │    │
│  │ Memory (MongoDB) │                    │  - Retrieved chunks │    │
│  │                  │                    │  - Conversation hist│    │
│  │ Last 10 messages │                    │  - File references  │    │
│  │ Current session  │                    │  - Project metadata │    │
│  └────────┬─────────┘                    └─────────┬─────────┘    │
│           │                                       │               │
│           └───────────────────────────┬───────────┘               │
│                                       │                            │
│                                       ▼                            │
│                              ┌──────────────────┐                 │
│                              │    DeepSeek       │                 │
│                              │  (via OpenRouter) │                 │
│                              └────────┬─────────┘                 │
│                                       │                            │
│  USER SEES ANSWER ◄──────────────────┘                            │
│  - Text explanation                                                │
│  - File references                                                 │
│  - Code snippets                                                   │
│  - Follow-up suggestions                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

```
1. User submits question via POST /api/projects/:id/chat

2. Load conversation history from MongoDB (last N messages)

3. Semantic Search:
   - Embed question text (1536-dim vector)
   - Search FAISS index for top-N relevant code chunks
   - If FAISS index not in memory → temporarily rebuild from stored vectors
     (vectors cached in MongoDB for this purpose)

4. Context Assembly:
   - System prompt (role + project info + tech stack)
   - Conversation history (last 10 exchanges)
   - Retrieved code chunks with file references
   - User's current question

5. DeepSeek Call:
   - Temperature 0.3 (slightly higher for conversational tone)
   - Max tokens: 2048 (chat answers shorter than analysis)
   - Stream: enabled (real-time typing effect on frontend)

6. Post-Processing:
   - Extract file references from answer (regex: `file:path`)
   - Generate follow-up question suggestions
   - Save message pair to MongoDB

7. Return:
   - Answer text (or stream)
   - Referenced files list
   - Suggested follow-up questions
   - Message ID (for feedback / threading)
```

---

## 3. Database Schema

### 3.1 ChatSession

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, ref: 'Project', indexed
  userId: ObjectId, ref: 'User', indexed
  sessionName: String,                  // auto-generated from first question
  messageCount: Number,
  createdAt: Date, indexed
  updatedAt: Date
}
```

### 3.2 ChatMessage

```javascript
{
  _id: ObjectId,
  sessionId: ObjectId, ref: 'ChatSession', indexed
  projectId: ObjectId, ref: 'Project', indexed
  userId: ObjectId, ref: 'User', indexed

  role: 'user' | 'assistant' | 'system',
  content: String,                       // message text

  // For assistant messages only:
  referencedFiles: [{                    // files mentioned in answer
    filePath: String,
    snippet: String,                     // relevant code excerpt
    relevance: Number                    // 0-1 relevance score
  }],
  retrievedChunks: [{                    // chunks used for RAG
    chunkId: String,
    filePath: String,
    relevance: Number
  }],
  suggestedFollowUps: [String],          // AI-suggested next questions
  tokenUsage: {
    prompt: Number,
    completion: Number,
    total: Number
  },

  // Metadata
  feedback: {                            // optional user feedback
    rating: Number,                      // 1-5
    comment: String
  },
  parentMessageId: ObjectId,             // for threaded replies (future)

  createdAt: Date, indexed
}
```

### 3.3 ChatVectorCache

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, ref: 'Project', indexed, unique
  vectors: [{
    chunkId: String,
    filePath: String,
    content: String,                      // original chunk text
    vector: [Number],                     // 1536-dim float32 array
    startLine: Number,
    endLine: Number
  }],
  dimension: Number,                      // 1536
  chunkCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

The `ChatVectorCache` collection stores embedding vectors for each project. This enables chat to work AFTER the initial analysis pipeline has completed and temp files are deleted. The FAISS index is ephemeral (in-memory), but vectors are persisted here so the index can be rebuilt on demand.

---

## 4. Conversation Memory

### 4.1 Memory Strategy

```
TYPES OF MEMORY:

1. SHORT-TERM (In-Request):
   - Last 10 messages from current session
   - Included in every AI call as chat history
   - Provides immediate context for follow-ups

2. SESSION MEMORY (MongoDB):
   - Full conversation history for a session
   - User can view past conversations
   - Multiple sessions per project

3. PROJECT CONTEXT (Always Included):
   - Tech stack summary
   - Architecture overview (first 500 chars)
   - Key file paths (top 10)
   - This is "system knowledge" — always available

MEMORY MANAGEMENT:
  - 10 most recent messages → included in prompt
  - Older messages → archived, retrievable via API
  - Max 50 messages per session (auto-create new session)
  - Session name = first question truncated to 80 chars
```

### 4.2 Context Window Budget

```
TOKEN BUDGET (per chat call):

  System prompt:           ~400 tokens    (role + project info)
  Conversation history:    ~1500 tokens   (10 exchanges, trimmed)
  Retrieved code chunks:   ~3000 tokens   (top-5 chunks)
  User question:           ~200 tokens
  Safety margin:           ~900 tokens
  ─────────────────────────────────────────
  Total prompt:            ~6000 tokens
  Available for response:  ~2000 tokens

  TOTAL per call:          ~8000 tokens   (well within 128K limit)

Trimming strategy:
  - Messages truncated to 300 chars each after 5th past exchange
  - Code chunks truncated to 1000 chars each if budget tight
  - Oldest messages dropped first if history exceeds budget
```

---

## 5. Semantic Search for Chat

### 5.1 Search Flow

```
┌────────────────────────────────────────────────────┐
│              CHAT SEMANTIC SEARCH                   │
│                                                     │
│  1. LOAD OR REBUILD FAISS INDEX                     │
│     ├── Check in-memory cache for project's index   │
│     ├── If found and valid → use directly           │
│     └── If not found:                               │
│         ├── Load ChatVectorCache from MongoDB        │
│         ├── Rebuild FAISS index from stored vectors  │
│         ├── Cache in memory (LRU, max 5 projects)    │
│         └── TTL: 30 minutes of inactivity            │
│                                                      │
│  2. ENHANCE QUERY                                    │
│     ├── Extract key terms from question              │
│     ├── If follow-up: merge with previous question   │
│     ├── Add project-specific context terms           │
│     └── Embed enhanced query → queryVector [1536]   │
│                                                      │
│  3. SEARCH                                           │
│     ├── FAISS search(queryVector, k=10)              │
│     ├── Filter: deduplicate same-file chunks         │
│     │            (keep highest-scoring per file)     │
│     └── Return top 5 diverse chunks                  │
│                                                      │
│  4. RE-RANK (optional, for accuracy)                 │
│     ├── Combine: semantic score + keyword score      │
│     └── Boost: exact file name matches               │
└────────────────────────────────────────────────────┘
```

### 5.2 Query Enhancement

```
If user asks: "How does authentication work?"
Previous question: "What tech stack does this use?"

Enhanced query:
  "How does authentication work in this project?
   Project uses: React, Express.js, MongoDB, JWT, Passport.js
   Previous context: Tech stack discussion"

Why: Gives the embedding model more semantic signal for better retrieval.
     "authentication" + "JWT" + "Passport.js" → pulls auth route files.
```

### 5.3 File-Aware Search

```
When user mentions specific file names in question:

  "Explain what src/routes/auth.routes.js does"

  → Extract file path: "src/routes/auth.routes.js"
  → Bypass semantic search for exact file match
  → Return chunk directly from that file
  → Surrounding files also included for context

When user asks about a function:

  "What does the generateAccessToken function do?"

  → Filter FAISS search by chunk.symbolName
  → Boost chunks containing that function name
  → Include callers and callees for context
```

---

## 6. Streaming Architecture

### 6.1 SSE (Server-Sent Events)

```
CLIENT                          SERVER
──────                          ──────

POST /api/projects/:id/chat/stream
Content-Type: application/json
{ "question": "...", "sessionId": "..." }
        ──────────────────────────►
                                    │
                                    ├── Load conversation history
                                    ├── Semantic search
                                    ├── Assemble context
                                    │
                                    ▼
                            DeepSeek Streaming Call
                                    │
          ┌─────────────────────────┘
          │  SSE Event Stream
          │  Content-Type: text/event-stream
          │
          ▼
◄── data: {"type":"chunk","content":"In "}
◄── data: {"type":"chunk","content":"this "}
◄── data: {"type":"chunk","content":"project..."}
◄── data: {"type":"file_ref","file":"src/routes/auth.js","line":42}
◄── data: {"type":"chunk","content":"uses JWT"}
          ...
◄── data: {"type":"done","messageId":"...","suggestedFollowUps":[...]}
          │
          ▼
     Frontend renders:
     - Typing animation
     - Code blocks highlighted
     - File references as clickable links
     - Follow-up question buttons
```

### 6.2 SSE Event Types

```typescript
type ChatSSEEvent =
  | { type: 'start'; messageId: string }
  | { type: 'chunk'; content: string }
  | { type: 'file_ref'; file: string; line?: number; snippet?: string }
  | { type: 'thinking'; message: string }          // "Searching relevant code..."
  | { type: 'error'; message: string }
  | { type: 'done'; messageId: string; suggestedFollowUps: string[]; tokenUsage: TokenUsage }
```

### 6.3 Frontend Streaming Handler

```
ChatStreamHandler:
  1. Open EventSource or fetch() with ReadableStream
  2. On 'start' → set messageId, show loading skeleton
  3. On 'thinking' → update status indicator
  4. On 'chunk' → append to visible answer, animate cursor
  5. On 'file_ref' → insert clickable file badge
  6. On 'done' → finalize message, render follow-up buttons
  7. On 'error' → show error toast, offer retry

  UX:
  - Typing indicator while streaming
  - Code blocks syntax-highlighted as they arrive
  - Scroll follows latest content
  - User can interrupt (stop generation) via AbortController
```

---

## 7. Follow-Up Question Handling

### 7.1 Detection

```
IS_FOLLOW_UP if ANY of:
  - Session exists and has messages
  - Question starts with: "and", "also", "what about", "why", "how about"
  - Question contains pronouns without explicit subject
    ("it", "that", "this", "they", "those")
  - Question is < 20 words and previous exchange was related
  - Question references previous answer implicitly
    ("Can you elaborate?", "Go deeper", "Show me more")

When follow-up detected:
  → Include FULL conversation history (not just last 10)
  → Boost retrieval using previous question as additional context
  → AI instructed to maintain continuity with previous answer
```

### 7.2 Suggested Follow-Ups

```
After each AI response, DeepSeek generates 3 follow-up questions:

PROMPT APPENDIX:
"Based on your answer above, suggest 3 natural follow-up questions
 the user might want to ask. These should be specific to the codebase
 and encourage deeper exploration. Return as JSON array."

AI returns:
[
  "How is token refresh handled in the auth flow?",
  "What happens if the JWT secret is compromised?",
  "Can you show me the middleware chain for protected routes?"
]

These are rendered as clickable buttons below the answer.
Clicking one submits it as a new chat message.
```

---

## 8. File Reference System

### 8.1 Automatic File Detection

```
In AI responses, file references are detected via:

1. EXPLICIT MARKDOWN LINKS (AI can use these):
   [src/routes/auth.js](file://src/routes/auth.js)

2. AUTO-DETECTION via regex:
   /\b(src\/[\w\/.-]+\.(js|ts|jsx|tsx|py|java))\b/g

3. CHUNK METADATA:
   When a retrieved chunk contributes to the answer,
   its filePath is automatically included as a reference.

Frontend rendering:
  - Detected file paths → clickable links
  - Click → scroll to file in "Project Files" panel
  - Hover → show mini code preview (first 5 lines)
  - File not found → grayed out with "deleted" badge
```

### 8.2 Code Snippet Display

```
When the AI includes code in the answer:

\`\`\`javascript
app.use(passport.initialize());
app.use(passport.session());
\`\`\`

Frontend:
  - Syntax highlighting via Prism.js or highlight.js
  - Copy button on hover (top-right corner)
  - "Open in file" button if file reference exists
  - Line numbers
```

---

## 9. API Endpoints

```
ROUTER: /api/projects/:projectId/chat

POST   /                           → authenticate, projectOwnership
                                     chatController.askQuestion
                                     Body: { question, sessionId? }
                                     Response: { message, sessionId, suggestedFollowUps, fileRefs }

POST   /stream                     → authenticate, projectOwnership
                                     chatController.askQuestionStream
                                     Body: { question, sessionId? }
                                     Response: SSE stream

GET    /sessions                   → authenticate, projectOwnership
                                     chatController.listSessions
                                     Response: { sessions[] }

GET    /sessions/:sessionId        → authenticate, projectOwnership
                                     chatController.getSession
                                     Response: { session, messages[] }

DELETE /sessions/:sessionId        → authenticate, projectOwnership
                                     chatController.deleteSession
                                     Response: { message }

POST   /messages/:messageId/feedback → authenticate, projectOwnership
                                     chatController.submitFeedback
                                     Body: { rating, comment? }
                                     Response: { message }
```

---

## 10. Controller Design

```
chatController

├── askQuestion(req, res)
│     1. Find or create ChatSession
│     2. Load last 10 messages from session
│     3. Perform semantic search → top-5 chunks
│     4. Assemble context (system + history + chunks + question)
│     5. Call DeepSeek (non-streaming)
│     6. Parse response for file references
│     7. Save user message + AI response to MongoDB
│     8. Generate follow-up suggestions
│     9. Return: { message, sessionId, suggestedFollowUps, fileRefs }

├── askQuestionStream(req, res)
│     Same as above but step 5 uses SSE streaming
│     Step 6-8 done after stream completes

├── listSessions(req, res)
│     ChatSession.find({ projectId, userId })
│     Sort by updatedAt desc

├── getSession(req, res)
│     ChatMessage.find({ sessionId }).sort({ createdAt: 1 })

├── deleteSession(req, res)
│     ChatMessage.deleteMany({ sessionId })
│     ChatSession.findByIdAndDelete(sessionId)

└── submitFeedback(req, res)
      ChatMessage.findByIdAndUpdate(messageId, { feedback })
```

---

## 11. File Structure

```
server/src/
├── models/
│   ├── ChatSession.js               # NEW
│   ├── ChatMessage.js               # NEW
│   └── ChatVectorCache.js           # NEW
│
├── services/
│   ├── chat.service.js              # NEW — main orchestrator
│   ├── vector-store.service.js      # (extended) — rebuild from cache
│   └── ai.service.js                # (existing) — streaming calls
│
├── controllers/
│   └── chat.controller.js           # NEW
│
├── routes/
│   └── chat.routes.js               # NEW
│
├── middleware/
│   ├── authenticate.js              # (existing)
│   └── projectOwnership.js          # (existing)
│
└── chat/
    ├── context-assembler.js          # NEW — prompt assembly + token budget
    ├── query-enhancer.js             # NEW — follow-up detection + query rewriting
    └── file-reference.js             # NEW — file path extraction + matching
```

### Build Sequence

```
 1. models/ChatSession.js            (no deps)
 2. models/ChatMessage.js            (no deps)
 3. models/ChatVectorCache.js        (no deps)
 4. chat/query-enhancer.js           (no deps)
 5. chat/file-reference.js           (no deps)
 6. chat/context-assembler.js        (depends on query-enhancer, file-reference)
 7. services/chat.service.js         (depends on all above + ai.service, vector-store)
 8. controllers/chat.controller.js   (depends on chat.service)
 9. routes/chat.routes.js            (depends on controller + middleware)
```

---

## 12. Edge Cases & Error Handling

```
SCENARIO                          HANDLING
────────                          ────────
No FAISS index in memory          Rebuild from ChatVectorCache (MongoDB)
                                  Show "preparing context..." thinking event
                                  Cache index for 30 minutes

ChatVectorCache not found         Analysis never completed or vectors lost
                                  Fallback: construct prompt from AnalysisResult
                                  schema (executiveSummary + fileExplanations)
                                  Warn user: "Limited context — re-upload for full search"

User sends empty question         400 "Question is required"

User sends very long question     Truncate to 1000 chars, warn in response
                                  "Question truncated to focus on key points"

Session has 50+ messages          Create new session, link via
                                  previousSessionId field

DeepSeek stream dies mid-response Return partial answer with:
                                  "Response interrupted. Showing partial answer.
                                   You can ask me to continue."

User references deleted file      "This file was part of the uploaded project
                                  but is no longer available for preview"

Rate limiting                     20 chat messages per minute per user
                                  (separate from upload rate limiter)

Circuit breaker open              Return cached-like response:
                                  "AI service temporarily unavailable.
                                   Try again in a moment."
```

---

## 13. Performance Considerations

```
OPERATION              TIME      CACHE?    MITIGATION
─────────              ────      ─────     ──────────
Load chat history      10ms      No         Indexed by sessionId
Rebuild FAISS index    100-500ms No        Only on first message after server restart
Embed query            200ms     No         Single embedding API call
FAISS search           5ms       No         In-memory, very fast
DeepSeek call          2-8s      No         Streaming hides latency
Save to MongoDB        10ms      No         Async after response sent
────────────────────────────────────────────────────────
Total (non-streaming): 3-9 seconds per chat message
Perceived (streaming): <1 second (first token appears quickly)
```

---

## 14. Frontend Component Architecture

```
client/src/
├── components/
│   └── chat/
│       ├── ChatWindow.jsx           # Main container: input + message list
│       ├── ChatMessageList.jsx      # Scrollable message history
│       ├── ChatMessage.jsx          # Single message bubble (user or AI)
│       ├── ChatInput.jsx            # Text input + send button + file mention autocomplete
│       ├── ChatTypingIndicator.jsx  # Animated dots while AI is thinking
│       ├── FollowUpSuggestions.jsx  # Clickable follow-up question buttons
│       ├── FileReferenceBadge.jsx   # Inline clickable file reference
│       ├── CodeBlock.jsx            # Syntax-highlighted code with copy button
│       ├── ChatSessionList.jsx      # Sidebar: list of past chat sessions
│       └── ChatFeedback.jsx         # Thumbs up/down + optional comment
│
├── hooks/
│   └── useChat.js                   # Chat state management + SSE streaming
│
└── pages/
    └── ChatPage.jsx                 # Full chat page layout
```
