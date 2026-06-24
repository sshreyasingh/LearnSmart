# LearnSmart — Parser Engine Architecture

---

## 1. Overview

The Parser Engine extracts structured code intelligence from source files before they're sent to the AI. Instead of sending raw code and hoping the LLM identifies all classes, functions, and dependencies correctly, we pre-parse every file and provide the AI with a **structured summary** alongside the raw source. This makes AI analysis faster, more accurate, and consistent.

```
                              ┌─────────────────────────┐
                              │    analysis.service.js   │
                              │  (pipeline orchestrator) │
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │   file.service  │   │  PARSER ENGINE   │   │   ai.service    │
          │  (read raw text)│   │  (structured AST)│   │  (DeepSeek)     │
          └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                   │                     │                     │
                   ▼                     ▼                     │
          ┌─────────────────┐   ┌─────────────────┐            │
          │  Raw source     │   │  ParsedFile     │            │
          │  files[]        │   │  { symbols,     │────────────┘
          │                 │   │    imports,      │   AI receives BOTH:
          │                 │   │    deps, config }│   1. Raw source
          │                 │   │                  │   2. Parsed summary
          └─────────────────┘   └──────────────────┘
```

---

## 2. Parser Backend Strategy

Two parsing backends, selected by language:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARSER BACKEND SELECTION                      │
│                                                                   │
│  Language        │ Backend          │ Why                         │
│  ────────────────┼──────────────────┼───────────────────────────  │
│  JavaScript      │ Babel            │ JSX/TSX best support        │
│  TypeScript      │ Babel + TS       │ Type annotations            │
│  JSX/TSX         │ Babel            │ React component detection   │
│  Python          │ tree-sitter      │ Full AST, no babel equiv    │
│  Java            │ tree-sitter      │ Mature grammar              │
│  C++             │ tree-sitter      │ Handles preprocessor        │
│  JSON            │ Built-in         │ JSON.parse                  │
│  YAML            │ yaml             │ npm: yaml                   │
│  TOML            │ toml             │ npm: @iarna/toml            │
│  Markdown        │ Built-in         │ Frontmatter + headings      │
│  SQL             │ tree-sitter      │ Query structure             │
│  All others      │ Regex fallback   │ Import/export patterns only │
│                                                                   │
│  Fallback chain: Babel → tree-sitter → Regex                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Babel Pipeline (JS/TS/JSX/TSX)

```
Source Code
    │
    ▼
┌──────────────┐
│ Babel Parser  │  @babel/parser with plugins:
│               │  - typescript
│               │  - jsx
│               │  - decorators
│               │  - classProperties
│               │  - optionalChaining
│               │  - nullishCoalescing
│               │  - dynamicImport
│               │  - topLevelAwait
│               │  - importAttributes
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AST Traverse  │  @babel/traverse
│ (visitors)    │
└──────┬───────┘
       │
       ├──► ImportCollector     → { imports, requires, dynamicImports }
       ├──► ExportCollector     → { namedExports, defaultExport, reExports }
       ├──► ClassCollector      → { className, extends, implements, methods, properties, decorators }
       ├──► FunctionCollector   → { name, params, async, generator, arrowFn, exported }
       ├──► VariableCollector   → { name, kind (const/let/var), exported, typeAnnotation }
       ├──► JSXCollector        → { componentNames, hooksUsed, propsDestructured }
       ├──► DecoratorCollector  → { decoratorName, target (class/method/property) }
       └──► DependencyCollector → { npm packages, local imports, node builtins }
```

### 2.2 tree-sitter Pipeline (Python/Java/C++/SQL)

```
Source Code
    │
    ▼
┌──────────────────┐
│ tree-sitter       │  Language-specific grammar loaded
│ Parser            │  - tree-sitter-python
│                   │  - tree-sitter-java
│                   │  - tree-sitter-cpp
│                   │  - tree-sitter-sql
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ tree-sitter       │  Query-based extraction using S-expression patterns
│ Query Engine      │  Each language has its own query set
└──────┬───────────┘
       │
       ├──► Python queries    → functions, classes, imports, decorators
       ├──► Java queries      → classes, interfaces, methods, annotations, imports
       ├──► C++ queries       → classes, structs, functions, namespaces, #include, templates
       └──► SQL queries       → tables, views, indexes, foreign keys
```

### 2.3 Regex Fallback (Unsupported Languages)

For languages without dedicated parsers, a regex-based best-effort extraction runs:

```
Language    Patterns Detected
────────    ──────────────────────────────────────────
Ruby        def/class/module/require/include
PHP         function/class/use/namespace
Go          func/type/import/package
Rust        fn/struct/enum/impl/use/mod/pub
C#          class/interface/using/namespace/async
Swift       func/class/struct/enum/protocol/import
Kotlin      fun/class/interface/object/import/package
Dart        class/Function/import/export
Elixir      def/defmodule/import/alias/use
Shell       function_name()/source/.
```

---

## 3. Core Data Structures

### 3.1 `ParsedFile` — The Universal Output

```typescript
interface ParsedFile {
  filePath: string;                    // relative to project root
  language: string;                    // detected language
  lines: number;                       // total lines
  loc: number;                         // logical lines of code (excl. comments/blank)

  symbols: ParsedSymbol[];             // classes, functions, variables
  imports: ImportStatement[];          // all import/require/include statements
  exports: ExportStatement[];          // all exports (named, default, re-export)
  dependencies: Dependency[];          // resolved dependency graph edges

  react?: ReactInfo;                   // present only for React components
  config?: ConfigInfo;                 // present only for config files
  errors: ParseError[];                // parse failures (non-fatal, recorded)
}
```

### 3.2 `ParsedSymbol`

```typescript
interface ParsedSymbol {
  name: string;
  kind: 'class' | 'function' | 'method' | 'arrow_function' | 'generator' |
        'interface' | 'type_alias' | 'enum' | 'variable' | 'constant' |
        'struct' | 'namespace' | 'module' | 'decorator' | 'annotation';
  line: number;                        // declaration line (1-based)
  column: number;                      // declaration column (0-based)
  endLine?: number;                    // closing line
  exported: boolean;                   // is it accessible outside this module?
  async?: boolean;                     // async function/method
  static?: boolean;                    // static method/property
  visibility?: 'public' | 'private' | 'protected';
  params?: SymbolParam[];              // function/method parameters
  returnType?: string;                 // return type annotation
  extends?: string;                    // parent class/interface
  implements?: string[];               // implemented interfaces
  decorators?: string[];               // decorator/annotation names
  docComment?: string;                 // JSDoc/docstring summary
  complexity?: number;                 // cyclomatic complexity score
}
```

### 3.3 `ImportStatement`

```typescript
interface ImportStatement {
  source: string;                      // './utils', 'react', 'java.util.List'
  kind: 'import' | 'require' | 'include' | 'using' | 'from_import' | 'dynamic_import';
  specifiers: ImportSpecifier[];
  isDefault: boolean;
  isTypeOnly: boolean;
  isDynamic: boolean;                  // import() / require() at runtime
  line: number;
}
```

### 3.4 `ExportStatement`

```typescript
interface ExportStatement {
  kind: 'named' | 'default' | 're_export' | 're_export_all' | 'module_exports';
  names: string[];                     // exported identifiers
  source?: string;                     // for re-exports: source module
  isTypeOnly: boolean;
  line: number;
}
```

### 3.5 `Dependency`

```typescript
interface Dependency {
  fromFile: string;                    // relative path of importing file
  toFile: string;                      // resolved relative path of imported file
  toPackage?: string;                  // if external: npm/PyPI/Maven package name
  kind: 'local' | 'external' | 'builtin' | 'dev';
  specifiers: string[];                // specific imported names
  line: number;
}
```

### 3.6 `ReactInfo`

```typescript
interface ReactInfo {
  componentName: string;
  isDefaultExport: boolean;
  isNamedExport: boolean;
  isClassComponent: boolean;
  isFunctionalComponent: boolean;
  propsInterface?: string;             // Props type/interface name
  propsFields?: { name: string; type: string; required: boolean }[];
  hooksUsed: string[];                 // useState, useEffect, useMemo, etc.
  customHooks: string[];               // hooks defined in this file
  rendersComponents: string[];         // child components rendered
  hasErrorBoundary: boolean;
  hasSuspense: boolean;
}
```

### 3.7 `ConfigInfo`

```typescript
interface ConfigInfo {
  fileType: 'package.json' | 'tsconfig.json' | 'requirements.txt' | 'pom.xml' |
            'build.gradle' | 'Dockerfile' | 'docker-compose.yml' | 'Cargo.toml' |
            'go.mod' | 'Gemfile' | 'composer.json' | '.env' | 'Makefile' | 'other';
  metadata: Record<string, unknown>;   // parsed key-value pairs specific to file type
}
```

### 3.8 `ParseError`

```typescript
interface ParseError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
  recoverable: boolean;                // true if we could continue parsing
}
```

---

## 4. Language-Specific Extractors

### 4.1 JavaScript / TypeScript / JSX / TSX

```
PARSER: Babel (@babel/parser + @babel/traverse)

EXTRACTED SYMBOLS:
  ├── ClassDeclaration / ClassExpression
  │     └── className, superClass, implements, decorators
  │     └── ClassMethod (constructor, get, set, static, async, generator)
  │     └── ClassProperty (static, typeAnnotation, decorators)
  │
  ├── FunctionDeclaration / FunctionExpression / ArrowFunctionExpression
  │     └── id, params, async, generator, returnType
  │     └── If parent is ExportNamedDeclaration → marked exported
  │
  ├── VariableDeclarator (const/let/var)
  │     └── If init is ArrowFunctionExpression → function
  │     └── If init is CallExpression → potential hook/composition
  │     └── typeAnnotation captured from TypeScript
  │
  ├── TSInterfaceDeclaration
  │     └── interfaceName, extends, typeMembers
  │
  ├── TSTypeAliasDeclaration
  │     └── aliasName, typeAnnotation
  │
  ├── TSEnumDeclaration
  │     └── enumName, members, const
  │
  └── Decorator (experimental + TypeScript)
        └── @Component, @Injectable, @NgModule, etc.

IMPORTS:
  ├── ImportDeclaration → { source, specifiers[ImportDefaultSpecifier | ImportSpecifier | ImportNamespaceSpecifier] }
  ├── CallExpression with callee.name === 'require'
  ├── Import() dynamic import expressions
  └── Type-only imports flagged with isTypeOnly: true

EXPORTS:
  ├── ExportNamedDeclaration → names
  ├── ExportDefaultDeclaration → 'default'
  ├── ExportAllDeclaration → re_export_all from source
  └── module.exports / exports.xxx (CJS pattern)

REACT DETECTION:
  Condition: file has import from 'react' AND exports a function/class with PascalCase name
  
  Hooks detected by pattern matching:
    useXxx() at top level of function component body
  
  Props extraction:
    Parameter named 'props' with type annotation
    Or destructured { x, y }: PropsType in first param

DEPENDENCY RESOLUTION:
  ├── './path' or '../path' → resolve to actual file (try .js, .jsx, .ts, .tsx, /index.*)
  ├── 'package-name' → external npm package
  ├── 'fs', 'path', 'http'... → Node.js builtin
  └── '@scope/package' → scoped npm package
```

### 4.2 Python

```
PARSER: tree-sitter-python

EXTRACTED SYMBOLS:
  ├── function_definition
  │     └── name, parameters (typed + defaults), return_type, async, decorators
  │     └── body: detect yield → generator
  │
  ├── class_definition
  │     └── name, superclasses (bases), decorators
  │     └── body: function_definition → methods
  │     └── body: assignment → class attributes
  │
  ├── decorated_definition
  │     └── decorator: @staticmethod, @classmethod, @property, @abstractmethod
  │     └── decorated: function or class
  │
  └── assignment (module-level)
        └── If target is identifier and value is CallExpression → singleton/config

IMPORTS:
  ├── import_statement → import X, import X as Y
  ├── import_from_statement → from X import Y, from X import *
  ├── future_import_statement → from __future__ import X
  └── Relative imports: from .module import X

CLASSIFICATION:
  ├── 'os', 'sys', 'json', 're', 'math'... → Python stdlib
  ├── 'django', 'flask', 'fastapi'... → Framework
  ├── 'numpy', 'pandas', 'tensorflow'... → Data/ML
  ├── './module', '..package' → Local

DEPENDENCY RESOLUTION:
  ├── Local imports resolve to files (.py)
  ├── Package imports matched against requirements.txt if present
  └── stdlib detected from known list
```

### 4.3 Java

```
PARSER: tree-sitter-java

EXTRACTED SYMBOLS:
  ├── class_declaration
  │     └── name, superclass, interfaces, modifiers (public, abstract, final)
  │     └── body: method_declaration → methods
  │     └── body: field_declaration → fields
  │     └── body: constructor_declaration → constructors
  │
  ├── interface_declaration
  │     └── name, extends_interfaces
  │     └── body: method_signature (abstract methods)
  │     └── body: constant_declaration
  │
  ├── enum_declaration
  │     └── name, implements_interfaces
  │     └── body: enum_constants, methods, fields
  │
  ├── annotation_type_declaration
  │     └── name, elements
  │
  └── method_declaration (with annotations)
        └── @Override, @Deprecated, @SuppressWarnings
        └── @RequestMapping, @GetMapping (Spring)
        └── @Test, @BeforeEach (JUnit)

IMPORTS:
  ├── import_declaration → import java.util.List;
  ├── static import → import static org.junit.Assert.*;
  └── Wildcard imports → import java.util.*;

CLASSIFICATION:
  ├── 'java.*', 'javax.*' → JDK stdlib
  ├── 'org.springframework.*' → Spring Framework
  ├── 'com.fasterxml.*' → Jackson
  ├── 'org.junit.*' → Testing
  └── All others → External dependency

PACKAGE:
  └── package_declaration → project namespace
```

### 4.4 C++

```
PARSER: tree-sitter-cpp

EXTRACTED SYMBOLS:
  ├── class_specifier
  │     └── name, base_class_clause (inheritance), access_specifier (public/protected/private)
  │     └── body: field_declaration → member variables
  │     └── body: function_definition → methods (virtual, override, const, static)
  │     └── body: constructor/destructor
  │
  ├── struct_specifier (same as class but default public)
  │
  ├── function_definition (free functions)
  │     └── name, parameters, return_type, storage_class (static, inline)
  │     └── template_declaration wrapping function → template function
  │
  ├── namespace_definition
  │     └── name, nested content
  │
  ├── template_declaration
  │     └── template_parameter_list
  │     └── wrapped: class/function/alias
  │
  ├── enum_specifier
  │     └── name, enumerators, scoped (enum class) vs unscoped
  │
  └── using_declaration / typedef / type_alias

INCLUDES:
  ├── preproc_include → #include <header> (system) or #include "header" (local)
  ├── preproc_def → #define MACRO
  └── preproc_ifdef / preproc_if → conditional compilation blocks

CLASSIFICATION:
  ├── <iostream>, <vector>, <string>, <memory>... → C++ stdlib
  ├── <boost/...> → Boost
  ├── <Q...> → Qt
  ├── "header.h" → Local project file
  └── Other <...> → System/third-party

HEADER/SOURCE PAIRING:
  For each .cpp file, look for matching .h/.hpp file → paired symbols
```

---

## 5. Configuration File Parsing

### 5.1 Supported Config Files

```
File                  Parser           Extracted Metadata
────────────────────  ───────────────  ──────────────────────────────────
package.json          JSON.parse       name, version, dependencies,
                                       devDependencies, scripts,
                                       main, type (module/commonjs),
                                       engines, frameworks (react, next,
                                       express, etc.)

tsconfig.json         JSON.parse       compilerOptions: target, module,
                                       jsx, strict, paths, baseUrl,
                                       include, exclude

requirements.txt      Line parser      package==version, package>=version
                                       categorized: web, data, ml, testing

Pipfile               TOML parser      [packages], [dev-packages]

pyproject.toml        TOML parser      [project] dependencies,
                                       [tool.poetry] dependencies

pom.xml               xml2js           groupId, artifactId, version,
                                       dependencies, plugins, parent

build.gradle          Regex            dependencies block, plugins,
                                       repositories

Cargo.toml            TOML parser      [package] name, version,
                                       [dependencies], [dev-dependencies]

go.mod                Line parser      module path, require directives,
                                       go version

Gemfile               Regex            gem declarations, groups

composer.json         JSON.parse       name, require, require-dev

Dockerfile            Line parser      FROM, RUN, COPY, EXPOSE, ENV, CMD,
                                       WORKDIR → base image, exposed ports

docker-compose.yml    YAML parser      services, volumes, networks, ports,
                                       environment, depends_on

.env                  Line parser      KEY=VALUE pairs (masked values)

Makefile              Regex            targets (.PHONY), variables, recipes

.eslintrc / .prettier JSON/YAML        Config tooling detected
```

### 5.2 Tech Stack Detection from Configs

```
Priority-ordered detection from PARSE, not regex:

1. package.json
   dependencies has 'react'          → React
   dependencies has 'next'           → Next.js
   dependencies has 'express'        → Express.js
   dependencies has 'vue'            → Vue.js
   dependencies has '@angular/core'  → Angular
   dependencies has 'typescript'     → TypeScript
   scripts has 'vite'               → Vite
   scripts has 'webpack'            → Webpack
   dependencies has 'tailwindcss'    → Tailwind CSS

2. requirements.txt / pyproject.toml
   Has 'django'                      → Django
   Has 'flask'/'fastapi'            → Flask/FastAPI
   Has 'tensorflow'/'pytorch'       → ML/AI
   Has 'pandas'/'numpy'            → Data Science

3. pom.xml / build.gradle
   Has spring-boot-starter           → Spring Boot
   Has jackson-databind              → Jackson
   Has junit                         → JUnit

4. Dockerfile
   FROM node                         → Node.js deployment
   FROM python                       → Python deployment
   FROM openjdk                      → Java deployment
   FROM nginx                        → Nginx reverse proxy

5. Combined detection
   package.json + tailwind.config    → Tailwind confirmed
   requirements.txt + Dockerfile     → Python deployment confirmed
```

---

## 6. Parser Engine Service Interface

### 6.1 `services/parser.service.js`

```
IParserService
├── parseFile(filePath, content, language): Promise<ParsedFile>
│     Entry point: picks parser based on language, runs extraction
│
├── parseAllFiles(files: TextFile[]): Promise<ParsedFile[]>
│     Batch parse. Files with parse errors still return partial results
│     Files where parser fails completely → regex fallback
│
├── detectLanguage(filePath): string
│     (already exists in file.service.js — reused)
│
├── resolveDependencies(parsedFiles: ParsedFile[]): Dependency[]
│     Post-processing step: resolve all local imports across files
│     Outputs a complete dependency graph
│
├── buildTechStack(configFiles: ParsedFile[]): string[]
│     Examines all config files → outputs detected tech stack with confidence
│
├── extractArchitecture(parsedFiles: ParsedFile[]): ArchitectureSummary
│     High-level summary: component count, layers, design patterns detected
│
└── generateStructureForAI(parsedFiles: ParsedFile[]): string
      Formats parsed data as a text prompt snippet for inclusion in AI context
```

---

## 7. Integration with Analysis Pipeline

### 7.1 Updated Analysis Flow

```
Upload ZIP
    │
    ▼
file.service.extractZip()
    │
    ▼
┌─────────────────────────────────────────────┐
│ file.service.readAllTextFiles()             │
│ → raw files: [{ filePath, content, ... }]   │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ parser.service.parseAllFiles(files)         │
│ → parsed files with symbols/imports/exports │  ← NEW STEP
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ parser.service.resolveDependencies(parsed)  │
│ → complete dependency graph                 │  ← NEW STEP
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ parser.service.generateStructureForAI()     │
│ → structured code summary (text)            │  ← NEW STEP
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ AI PROMPT =                                │
│   SYSTEM INSTRUCTION                       │
│   + STRUCTURED CODE SUMMARY (from parser)  │
│   + RAW SOURCE FILES (from file.service)   │
│   + SPECIFIC ANALYSIS QUESTION             │
└────────────────────┬────────────────────────┘
                     │
                     ▼
              ai.service.callDeepSeek()
                     │
                     ▼
                SAVE TO DB
```

### 7.2 What the AI Gets (Example Structured Summary)

```
=== STRUCTURED CODE ANALYSIS (pre-parsed) ===

Project: my-app
Language: TypeScript (React)
Total Files: 47    Total LOC: 3,241

ARCHITECTURE:
  Layers detected: components (17), services (5), utils (8), hooks (3), pages (6), config (2)
  Entry point: src/index.tsx → src/App.tsx
  Router: React Router v6 (detected in 3 files)

SYMBOLS:
  Components: App, Dashboard, LoginForm, RegisterForm, Navbar, Sidebar,
              ProjectCard, ProjectList, FileUploader, AnalysisPage,
              VisualizationPage, ResumePage, InterviewPage, NotFoundPage
  Custom Hooks: useAuth (AuthContext), useProject, useAnalysis, useUpload
  Services: authService, projectService, analysisService
  Classes: ApiClient (singleton pattern)

DEPENDENCIES:
  External: react, react-dom, react-router-dom, axios, d3, mermaid, tailwindcss
  Internal: Dashboard → ProjectCard, ProjectList, StatsOverview
            AnalysisPage → ExecutiveSummary, ArchitectureBreakdown, ...
            App → Navbar, Footer, ProtectedRoute

REACT COMPONENTS (17 total):
  ├── App.tsx (root): renders Navbar, Outlet, Footer; wraps with AuthProvider
  ├── DashboardPage.tsx: uses useAuth, useProject; renders ProjectList, StatsOverview
  ├── LoginPage.tsx: uses LoginForm, OAuthButtons
  ├── AnalysisPage.tsx (tabs): Summary, Architecture, Workflow, Beginner, Files
  └── ...

CONFIG FILES:
  package.json: vite, react 18, typescript 5, tailwindcss
  tailwind.config.js: custom theme, content paths
  vite.config.js: proxy to localhost:5000
  tsconfig.json: strict=true, jsx=react-jsx, paths aliases
```

---

## 8. Dependency Resolution Algorithm

```
resolveDependencies(parsedFiles):
  1. Build file index:
     Map<relativePath, ParsedFile>

  2. For each file's imports:
     a. If source starts with '.' or '..':
        - Try resolved path + [.js, .jsx, .ts, .tsx, .mjs, .cjs]
        - Try resolved path + /index + extensions
        - If found in file index → local dependency
        - If not found → unresolved (record as warning)

     b. If source is bare specifier (no path prefix):
        - Check if it's a Node.js builtin → builtin
        - Otherwise → external package

     c. If source is @scope/package:
        - External scoped package

  3. Check for circular dependencies:
     - Build adjacency list
     - DFS from each node
     - Report cycles with file paths

  4. Check for unused imports:
     - Import specifier not found in file body → warning

  5. Output:
     {
       dependencies: Dependency[],       // all resolved edges
       unresolvedImports: string[],      // imports that couldn't be resolved
       circularDependencies: string[][], // cycle paths
       unusedImports: { file, specifier }[], // unused import warnings
     }
```

---

## 9. Cyclomatic Complexity Calculation

For each function/method, calculate complexity score:

```
Base: 1

Add 1 for each:
  - if / else if / else
  - ? : (ternary)
  - && / || (in condition position)
  - for / for...in / for...of
  - while / do...while
  - case (in switch)
  - catch
  - throw (standalone)
  - return within conditional (early return patterns)
  - arrow function / callback nested inside
  - && / || short-circuit expressions

Classification:
  1-5   → Simple
  6-10  → Moderate
  11-20 → Complex
  21-50 → Very Complex (consider refactoring)
  50+   → Extremely Complex (unmaintainable)
```

---

## 10. Error Resilience Strategy

```
PARSER FAILURE MODES:

Level 1: Language has dedicated parser (Babel/tree-sitter)
  ├── Parse succeeds → full structured output
  ├── Parse partially fails (some syntax errors) →
  │     ├── Record errors in parsedFile.errors[]
  │     └── Return partial symbols (whatever was successfully parsed)
  └── Parse completely fails (unparseable file) →
        └── Fall through to Level 2

Level 2: Regex fallback
  ├── Try regex-based import/export/function detection
  ├── Return basic ParsedFile with limited symbols
  └── Record regex_fallback in parsedFile.errors[]

Level 3: Utterly unparseable
  ├── Return ParsedFile with:
  │     filePath, language, lines, loc (from raw content)
  │     symbols: []
  │     errors: [{ message: "Could not parse", severity: "warning" }]
  └── File is STILL included in AI prompt as raw text

KEY PRINCIPLE: A parse failure on one file NEVER blocks analysis
               of the rest of the project. Degrade gracefully.
```

---

## 11. Performance Considerations

```
Phase              Strategy
─────              ────────
File parsing        Parallel: up to 10 files concurrently
                    (I/O-bound, not CPU-bound for most files)

Tree-sitter         Grammar loaded once per language, reused
                    Parser instances pooled (max 5 per language)

Large files         Skip parsing files > 500KB (send raw to AI only)
                    Mark with skip_reason in errors[]

Babel               Cache AST for reused traverse passes
                    (one parse, multiple collectors extract from same AST)

Memory              Stream large files if possible, but most source files
                    are well under memory limits

Caching             During regenerate: parsed files could be cached
                    against a hash of file content (future optimization)
```

---

## 12. Dependencies

```json
{
  "@babel/parser": "^7.24",
  "@babel/traverse": "^7.24",
  "tree-sitter": "^0.21",
  "tree-sitter-javascript": "^0.21",
  "tree-sitter-typescript": "^0.21",
  "tree-sitter-python": "^0.21",
  "tree-sitter-java": "^0.21",
  "tree-sitter-cpp": "^0.21",
  "tree-sitter-sql": "^0.3",
  "yaml": "^2.4",
  "@iarna/toml": "^2.2",
  "xml2js": "^0.6"
}
```

---

## 13. File Structure

```
server/src/
├── services/
│   └── parser.service.js              # Main orchestrator: parseFile, parseAllFiles
│
├── parsers/
│   ├── babel.parser.js                # Babel-based JS/TS/JSX/TSX parser
│   ├── treesitter.parser.js           # tree-sitter based Python/Java/C++/SQL parser
│   ├── regex.parser.js                # Regex fallback for all other languages
│   ├── config.parser.js               # Dedicated config file parsers
│   │
│   ├── collectors/                    # AST visitors (shared across backends)
│   │   ├── import.collector.js        # Extracts imports/requires/includes
│   │   ├── export.collector.js        # Extracts exports
│   │   ├── class.collector.js         # Extracts class/struct/interface definitions
│   │   ├── function.collector.js      # Extracts function/method definitions
│   │   ├── variable.collector.js      # Extracts variables/constants
│   │   ├── react.collector.js         # React-specific: components, hooks, props
│   │   ├── decorator.collector.js     # Decorators/annotations
│   │   └── complexity.collector.js    # Cyclomatic complexity calculation
│   │
│   ├── resolvers/
│   │   ├── dependency.resolver.js     # Cross-file dependency resolution
│   │   └── import.resolver.js         # Local file path resolution
│   │
│   └── queries/                       # tree-sitter query files (.scm)
│       ├── python-queries.scm
│       ├── java-queries.scm
│       ├── cpp-queries.scm
│       └── sql-queries.scm
│
└── utils/
    └── fileUtils.js                   # (existing: language detection, binary filter)
```

### Build Sequence (Parser Module)

```
 1. parsers/collectors/*.collector.js    (no deps — pure functions)
 2. parsers/resolvers/import.resolver.js (no deps)
 3. parsers/resolvers/dependency.resolver.js (depends on import.resolver)
 4. parsers/babel.parser.js             (depends on collectors)
 5. parsers/treesitter.parser.js        (depends on queries/*.scm)
 6. parsers/regex.parser.js             (no deps)
 7. parsers/config.parser.js            (no deps)
 8. services/parser.service.js          (depends on all parsers, resolvers)
```
