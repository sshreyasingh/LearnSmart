# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
- Use MVC architecture with reusable services, SOLID principles, and clean architecture for the LearnSmart project. Confidence: 0.85
- Every request must be validated with Zod. Confidence: 0.85
- Do not generate placeholder code — only production-ready code. Confidence: 0.85
- Add comments to explain important logic and architectural decisions, but let straightforward code be self-documenting. Confidence: 0.80
- When a file depends on another not-yet-implemented file, create reusable interfaces instead. Confidence: 0.80

# tech-stack
- LearnSmart uses React 18, React Router v6, Tailwind CSS, React Flow, D3.js, and Mermaid on the frontend. Confidence: 0.85
- Use D3.js for interactive visualizations (dependency graphs, knowledge graphs, module relationships, call graphs) with zoom, pan, drag, and node highlighting, rendering parser-generated JSON. Confidence: 0.70
- LearnSmart uses Node.js, Express 4, MongoDB 7 (Mongoose 8), JWT + Passport.js for auth, Multer for uploads, Zod for validation, and Gemini API for AI. Confidence: 0.85

# ai-pipeline
See [ai-pipeline/taste.md](ai-pipeline/taste.md)
# resource-scraping
- When scraping YouTube tutorials, filter for detailed, informative, high-quality videos rather than returning random/irrelevant results. Confidence: 0.70
- Use Playwright for scraping learning resources. Confidence: 0.50

# code-style
- Use ES Modules (import/export) for all JavaScript/TypeScript files. Confidence: 0.70
- Add comprehensive error handling to all modules with try/catch and descriptive error messages. Confidence: 0.70
- Use async/await for all asynchronous operations. Confidence: 0.65

# styling
- Use #C9EDDC (mint green) for section/card backgrounds in the client UI, and #94DBBA for the page-level/ultimate background. Confidence: 0.70
- Use #D1F0E1 for the navbar background. Confidence: 0.65

# dashboard-layout
- On the dashboard page, show the project difficulty analysis section at the top and the repo analysis section below it. Confidence: 0.65

# difficulty-analysis
See [difficulty-analysis/taste.md](difficulty-analysis/taste.md)
# dev-server
- Keep Vite proxy timeout at 120s or lower to match backend API timeouts — do not set it to 600s (10 min) which can silently hang the frontend. Confidence: 0.70

# workflow
See [workflow/taste.md](workflow/taste.md)
- When asked to fix a specific bug or issue, do NOT make large-scale architectural changes (deleting files, removing features, restructuring pipelines, removing dependencies) without explicit user approval. Fix only the specific issue. Confidence: 0.85

# project-description
- When describing the project's key features and description on the analysis page, mention the services and what the app does (inferred from the code), not the tech stack. The description should be detailed enough to clearly explain what the project does. Confidence: 0.80

# parsing
- Replace all regex-based parsing with Tree-sitter parsers for static code analysis. Parse supported languages (JavaScript, TypeScript, React/JSX, Python, Java, C++, C#, Go, PHP, HTML, CSS) and extract functions, classes, interfaces, components, hooks, imports, exports, variables, routes, models, and dependencies. Walk the AST to extract execution flow, function calls, method calls, inheritance, component hierarchy, API routes, database models, async functions, and dependency relationships. Do not use AI during parsing — use only parser-generated metadata. Confidence: 0.80

# interview-questions
- Generate 3-4 interview questions per category (not just 1-2) to give users more practice material. Confidence: 0.70

# timeout
- Increase backend analysis timeout to prevent premature "analysis failed" errors — the analysis pipeline needs enough time to complete static analysis, AI explanations, and interview generation. Confidence: 0.65

# analysis-display
- Refine all analysis output into clear, human-readable language — do not display raw technical results. The output should be understandable to a non-technical reader. Confidence: 0.65
