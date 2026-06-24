# LearnSmart — Targeted Tech Detection Architecture

## 1. Overview

A focused detection service that recursively scans a codebase for 8 specific technologies: React, Angular, Vue, Express, MongoDB, PostgreSQL, JWT, and Socket.io. Each technology is detected through layered signal types — package manifests, import statements, code patterns, file extensions, and connection strings — producing a confidence score of 0.0–1.0.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TARGETED TECH DETECTION                           │
│                                                                      │
│  INPUT                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Parsed Files[]   │  │ Raw File List[]  │  │ Config Files[]   │   │
│  │ (from parser)    │  │ (all paths/exts) │  │ (pkg/req/pom)    │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           └──────────────────────┼──────────────────────┘           │
│                                  ▼                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    SIGNAL EXTRACTORS                            │  │
│  │                                                                │  │
│  │  PackageManifestScanner   →  package.json, requirements.txt   │  │
│  │  ImportPatternScanner     →  import/require/include statements│  │
│  │  CodePatternScanner      →  API usage, constructors, decorators│ │
│  │  FileExtensionScanner    →  .vue, .jsx, .tsx, .component.ts   │  │
│  │  ConnectionStringScanner →  mongodb://, postgres://            │  │
│  │  ConfigFileScanner       →  angular.json, jwt patterns in .env│  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                  │                                    │
│                                  ▼                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     SCORING ENGINE                              │  │
│  │  For each technology:                                           │  │
│  │    score = Σ(matched_signal_weight) / Σ(all_signal_weights)    │  │
│  │    classification: definite / high / medium / low              │  │
│  │    min threshold: 0.30 to report                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                  │                                    │
│                                  ▼                                    │
│  OUTPUT: DetectedTech[]  (name, confidence, evidence, category)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Signal Types & Weights

| Signal Type              | Weight Range | Description                                    |
|--------------------------|-------------|------------------------------------------------|
| `manifest_direct`        | 1.00        | Exact dependency in package.json/requirements   |
| `manifest_peer`          | 0.70        | Peer/dev dependency                            |
| `import_statement`       | 0.85        | Import/require of core module                  |
| `code_constructor`       | 0.80        | Framework constructor (e.g., `express()`)       |
| `code_pattern`           | 0.65        | API usage pattern (e.g., `app.get()`)          |
| `file_present`           | 0.90        | Specific config file exists (angular.json)      |
| `extension_pattern`      | 0.40        | Multiple files with framework extension (.vue)  |
| `connection_string`      | 0.70        | Database URL in code/env files                  |
| `env_variable`           | 0.50        | Environment variable reference                  |
| `directory_structure`    | 0.55        | Convention-based directory                     |

---

## 3. Technology Detection Rules

### 3.1 React

```
SIGNALS (total possible weight: 6.25)

  1. package.json: "react" in dependencies                   [manifest_direct, 1.00]
  2. package.json: "react-dom" in dependencies               [manifest_direct, 0.90]
  3. import/require 'react' in any source file               [import_statement, 0.85]
  4. import/require 'react-dom' in any source file           [import_statement, 0.75]
  5. hooks pattern: useXxx() found in source                 [code_pattern, 0.50]
  6. useState / useEffect / useRef found                     [code_pattern, 0.55]
  7. JSX syntax detected (<> / </> / className=)             [code_pattern, 0.45]
  8. .jsx or .tsx files present (at least 3)                [extension_pattern, 0.40]
  9. render( / ReactDOM.createRoot( / ReactDOM.render(       [code_pattern, 0.45]
 10. "react" in devDependencies (Next.js pattern)            [manifest_peer, 0.40]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
MUTUALLY EXCLUSIVE WITH: Nothing (coexists with Next.js, Remix)
```

### 3.2 Angular

```
SIGNALS (total possible weight: 5.70)

  1. package.json: "@angular/core" in dependencies           [manifest_direct, 1.00]
  2. angular.json exists                                     [file_present, 0.90]
  3. @Component decorator found                              [code_pattern, 0.85]
  4. @NgModule decorator found                               [code_pattern, 0.75]
  5. @Injectable decorator found                             [code_pattern, 0.65]
  6. *.component.ts files present (at least 2)              [extension_pattern, 0.50]
  7. *.module.ts files present                              [extension_pattern, 0.45]
  8. import { Component } from '@angular/core'              [import_statement, 0.80]
  9. bootstrapModule( / bootstrapApplication(               [code_pattern, 0.55]
 10. platformBrowserDynamic(                                 [code_pattern, 0.45]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
MUTUALLY EXCLUSIVE WITH: Nothing
```

### 3.3 Vue

```
SIGNALS (total possible weight: 5.50)

  1. package.json: "vue" in dependencies                     [manifest_direct, 1.00]
  2. .vue files present (at least 1)                        [extension_pattern, 0.85]
  3. createApp( found in source                              [code_pattern, 0.80]
  4. new Vue({ found in source                               [code_pattern, 0.70]
  5. <template> in .vue files                                [code_pattern, 0.80]
  6. import { createApp } from 'vue'                        [import_statement, 0.75]
  7. import { ref } from 'vue' / import { reactive }         [import_statement, 0.60]
  8. <script setup> pattern in .vue files                    [code_pattern, 0.65]
  9. defineProps / defineEmits found                         [code_pattern, 0.50]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
MUTUALLY EXCLUSIVE WITH: Nothing
```

### 3.4 Express.js

```
SIGNALS (total possible weight: 6.30)

  1. package.json: "express" in dependencies                 [manifest_direct, 1.00]
  2. require('express') or import 'express'                  [import_statement, 0.85]
  3. express() constructor call                              [code_constructor, 0.80]
  4. app.listen( usage                                       [code_pattern, 0.65]
  5. app.get( / app.post( / app.put( / app.delete(          [code_pattern, 0.55]
  6. app.use( middleware pattern                             [code_pattern, 0.45]
  7. router.get( / router.post( routing pattern              [code_pattern, 0.50]
  8. res.json( / res.send( / res.status(                    [code_pattern, 0.45]
  9. express.Router()                                        [code_pattern, 0.50]
 10. next() error handling pattern                           [code_pattern, 0.35]
 11. /routes/ directory with router files                    [directory_structure, 0.40]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
MUTUALLY EXCLUSIVE WITH: Fastify (reports both if both found — conflict flag)
```

### 3.5 MongoDB

```
SIGNALS (total possible weight: 6.10)

  1. package.json: "mongoose" in dependencies                [manifest_direct, 1.00]
  2. package.json: "mongodb" in dependencies                 [manifest_direct, 0.95]
  3. mongoose.connect( call                                  [code_pattern, 0.85]
  4. MongoClient( constructor                                [code_pattern, 0.75]
  5. new Schema( / mongoose.model(                           [code_pattern, 0.70]
  6. db.collection( / collection.find(                      [code_pattern, 0.60]
  7. mongodb:// connection string                            [connection_string, 0.70]
  8. mongodb+srv:// connection string                        [connection_string, 0.75]
  9. /models/ directory with Schema/Model files              [directory_structure, 0.45]
 10. docker-compose with mongo image                         [config_file, 0.50]
 11. mongoose.Types.ObjectId                                 [code_pattern, 0.50]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
```

### 3.6 PostgreSQL

```
SIGNALS (total possible weight: 5.90)

  1. package.json: "pg" in dependencies                      [manifest_direct, 1.00]
  2. package.json: "pg-promise" in dependencies              [manifest_direct, 0.90]
  3. package.json: "postgres" in dependencies                [manifest_direct, 0.90]
  4. requirements.txt: "psycopg2" / "asyncpg"               [manifest_direct, 1.00]
  5. new Pool( / new Client( from pg module                  [code_pattern, 0.70]
  6. postgres:// connection string                           [connection_string, 0.70]
  7. postgresql:// connection string                         [connection_string, 0.70]
  8. DATABASE_URL=postgres in .env                           [env_variable, 0.60]
  9. docker-compose with postgres image                      [config_file, 0.60]
 10. /migrations/ directory                                  [directory_structure, 0.40]
 11. .query( / .execute( SQL patterns                        [code_pattern, 0.40]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
```

### 3.7 JWT

```
SIGNALS (total possible weight: 5.50)

  1. package.json: "jsonwebtoken" in dependencies            [manifest_direct, 1.00]
  2. package.json: "@nestjs/jwt" / "passport-jwt"            [manifest_direct, 0.85]
  3. requirements.txt: "PyJWT" / "python-jose"              [manifest_direct, 0.90]
  4. jwt.sign( call                                          [code_pattern, 0.85]
  5. jwt.verify( call                                        [code_pattern, 0.85]
  6. JWT_SECRET / ACCESS_TOKEN_SECRET in .env                [env_variable, 0.55]
  7. REFRESH_TOKEN_SECRET in .env                            [env_variable, 0.45]
  8. import jwt from 'jsonwebtoken' / require('jsonwebtoken') [import_statement, 0.80]
  9. JWTs used in middleware (authenticate pattern)          [code_pattern, 0.45]
 10. from jose import jwt (Python)                           [import_statement, 0.60]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
```

### 3.8 Socket.io

```
SIGNALS (total possible weight: 5.10)

  1. package.json: "socket.io" in dependencies               [manifest_direct, 1.00]
  2. package.json: "socket.io-client" in dependencies        [manifest_direct, 0.85]
  3. require('socket.io') / import { Server } from 'socket.io' [import_statement, 0.80]
  4. new Server( / io = require(                             [code_constructor, 0.75]
  5. io.on('connection'                                      [code_pattern, 0.80]
  6. socket.on( / socket.emit(                               [code_pattern, 0.65]
  7. io.emit( / io.to(                                       [code_pattern, 0.55]
  8. io.use( middleware attachment                           [code_pattern, 0.40]
  9. ws:// or wss:// connection string                       [connection_string, 0.50]
 10. new WebSocket( / new WebSocketServer(                   [code_pattern, 0.55]

MINIMUM TO DETECT: 1 signal
THRESHOLD: 0.30 to report
```

---

## 4. Recursive File Traversal Strategy

```
TRAVERSAL ALGORITHM:

  walkDirs(rootPath):
    1. Start at rootPath
    2. For each entry:
       a. If directory → check IGNORED_DIRS → recurse if not ignored
       b. If file → check IGNORED_PATTERNS → skip minified/binary/lock files
       c. Read file content (UTF-8, skip if binary)
    3. Return { filePath, content, language, sizeKB, extension }[]

  IGNORED_DIRS:
    node_modules, .git, .svn, dist, build, out, target,
    __pycache__, .pytest_cache, .mypy_cache, .next, .nuxt,
    coverage, .nyc_output, vendor, bower_components, .idea, .vscode

  IGNORED_PATTERNS:
    *.min.js, *.bundle.js, *.chunk.js, package-lock.json,
    yarn.lock, pnpm-lock.yaml, *.map, .DS_Store, Thumbs.db

  MAX_FILE_SIZE: 500 KB (skip parsing, still check extension)
  MAX_TOTAL_FILES: 10,000
```

---

## 5. Scoring Algorithm

```
For each technology T with signals S₁...Sₙ:

  1. matched_total = 0
  2. possible_total = sum(sᵢ.weight for all sᵢ in S)
  
  3. For each signal sᵢ:
     a. Run extraction function for signal type
     b. If any match found → matched_total += sᵢ.weight
     c. Record evidence: { signal, file, matchedValue }
  
  4. base_confidence = matched_total / possible_total
  
  5. Apply modifiers:
     a. If ALL strong signals (weight ≥ 0.80) matched → +0.05 confidence boost
     b. If only weak signals (weight < 0.60) matched → ×0.80 penalty
  
  6. final_confidence = clamp(result, 0.0, 1.0)
  
  7. Classification:
     0.90–1.00 → definite
     0.70–0.89 → high
     0.50–0.69 → medium
     0.30–0.49 → low
     0.00–0.29 → speculative (not reported)

  A technology with confidence ≥ 0.30 is considered "detected".
```

---

## 6. Output Structure

```typescript
interface DetectedTech {
  name: string;                              // "React", "MongoDB", "JWT", etc.
  confidence: number;                        // 0.0 – 1.0
  classification: 'definite' | 'high' | 'medium' | 'low';
  category: 'frontend' | 'backend' | 'database' | 'authentication' | 'realtime';
  evidence: {
    signal: string;                          // e.g., "package.json dependency"
    file: string;                            // e.g., "package.json"
    value: string;                           // e.g., "react": "^18.2.0"
    weight: number;                          // signal weight contributed
  }[];
}

interface TechDetectionReport {
  detected: DetectedTech[];                  // Only techs with confidence ≥ 0.30
  notDetected: string[];                     // Techs below threshold
  summary: {
    frontend?: string;                       // Best frontend match
    backend?: string;                        // Best backend match
    database?: string;                       // Best database match
    authentication?: string;                 // Best auth match
    realtime?: string;                       // Best realtime match
  };
  metadata: {
    totalFilesScanned: number;
    filesWithMatches: number;
    scanDurationMs: number;
  };
}
```

---

## 7. File Structure

```
server/src/
├── services/
│   └── targeted-tech-detect.service.js    ← THIS FILE
│       • detectTechnologies(parsedFiles[], fileList[])
│       • scanPackageJson(content)
│       • scanRequirementsTxt(content)
│       • scanImports(parsedFile)
│       • scanCodePatterns(content, fileName)
│       • scanFileExtensions(fileList[])
│       • scanConnectionStrings(content)
│       • calculateConfidence(tech, matchedSignals)
│       • generateReport(results)
│
└── detection/
    └── rules.js                            ← (optional) tech rule definitions
```

---

## 8. Integration

```
Called from:
  └── services/techStack.service.js
      └── or standalone: targetedTechDetect.detectTechnologies(parsedFiles, fileList)

Returns: TechDetectionReport → used by summary.service.js for highlights
                                → fed into AI prompts as structured context
```

---

## 9. Edge Cases

```
SCENARIO                              HANDLING
────────                              ────────
No package.json / manifest files      Only code patterns + extensions used
                                     Lower max possible weight → can still detect
Monorepo with multiple frameworks     Both detected — no mutual exclusivity for
                                     frontend frameworks (possible polyglot)
Next.js project (React wrapper)       React detected via import + JSX signals
                                     Next.js not in target list — not detected
Minified/compiled code present        Auto-skipped by IGNORED_PATTERNS
Binary files in source tree           Detected by null-byte scan, skipped
Empty project / no source files       Returns empty detected[] with metadata
```
