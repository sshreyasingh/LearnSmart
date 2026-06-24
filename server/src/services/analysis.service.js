const path = require('path');
const { parseAllFiles, resolveDependencies, extractArchitectureSummary } = require('./parser.service');
const { detectAll, extractTechStackNames } = require('./techStack.service');
const { extractAllRoutes, buildRequestFlow, buildDatabaseFlow, detectEntryPoint } = require('./executionFlow.service');
const { runStaticAnalysis } = require('./staticAnalysis.service');
const { callOpenRouter, callOpenRouterJSON } = require('./ai.service');
const fileService = require('./file.service');
const AppError = require('../utils/AppError');

/**
 * Analysis Service v2
 * 
 * Architecture:
 * 1. Static Analysis (Feature 4) — extracts ALL metrics, tech stack, 
 *    dependencies, API routes, DB models, auth detection via pure rules.
 *    NO AI involved.
 * 
 * 2. AI Analysis (Feature 5) — uses static analysis results as context.
 *    AI only EXPLAINS what static analysis found.
 *    AI handles: project purpose, executive summary, 
 *    authentication explanation, database explanation.
 * 
 * 3. Difficulty Prediction (Feature 3) — XGBoost Regressor on static metrics.
 */

const collectProjectContext = async (extractDir) => {
  return await runStaticAnalysis(extractDir);
};

const buildStaticContextForAI = (staticAnalysis) => {
  const { metrics, techStack, architecture, api, database, authentication,
    dependencies, externalLibraries, controllers, services,
    middleware, environmentVariables, folderStructure } = staticAnalysis;

  const lines = [];
  lines.push('# PROJECT STATIC ANALYSIS REPORT');
  lines.push('# All data below was extracted by rule-based parsers — no AI was used.');
  lines.push('');

  // Project Metrics
  lines.push('## Project Metrics');
  lines.push(`- Total Files: ${metrics.totalFiles}`);
  lines.push(`- Total LOC: ${metrics.totalLOC}`);
  lines.push(`- Total Lines: ${metrics.totalLines}`);
  lines.push(`- Total Size: ${metrics.totalSizeKB} KB`);
  lines.push(`- Functions: ${metrics.functionCount}`);
  lines.push(`- Classes: ${metrics.classCount}`);
  lines.push(`- Components (React): ${metrics.componentCount}`);
  lines.push(`- Average Cyclomatic Complexity: ${metrics.avgCyclomaticComplexity}`);
  lines.push(`- Max Cyclomatic Complexity: ${metrics.maxCyclomaticComplexity}`);
  lines.push(`- Comment Percentage: ${metrics.commentPercent}%`);
  lines.push(`- Maintainability Index: ${metrics.maintainabilityIndex}`);
  lines.push(`- Async Functions: ${metrics.asyncFunctionCount}`);
  lines.push(`- Error Handlers: ${metrics.errorHandlerCount}`);
  lines.push(`- Route Count: ${metrics.routeCount}`);
  lines.push(`- Folder Depth: ${metrics.maxFolderDepth}`);
  lines.push(`- Circular Dependencies: ${metrics.circularDependencyCount}`);
  lines.push(`- Entry Point: ${metrics.entryPoint || 'Not detected'}`);
  lines.push('');

  // Tech Stack
  lines.push('## Detected Technology Stack');
  lines.push(`- Languages: ${techStack.languages.join(', ')}`);
  if (techStack.frameworks.length > 0) {
    lines.push(`- Frameworks:`);
    for (const fw of techStack.frameworks) {
      lines.push(`  - ${fw.name} (${fw.category}, confidence: ${Math.round(fw.confidence * 100)}%)`);
    }
  }
  if (techStack.frontend.length > 0) {
    lines.push(`- Frontend: ${techStack.frontend.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.backend.length > 0) {
    lines.push(`- Backend: ${techStack.backend.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.database.length > 0) {
    lines.push(`- Database: ${techStack.database.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.authentication.length > 0) {
    lines.push(`- Auth: ${techStack.authentication.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.deployment.length > 0) {
    lines.push(`- Deployment: ${techStack.deployment.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.testing.length > 0) {
    lines.push(`- Testing: ${techStack.testing.map(t => `${t.name}(${Math.round(t.confidence * 100)}%)`).join(', ')}`);
  }
  if (techStack.stacks && techStack.stacks.length > 0) {
    lines.push(`- Detected Stacks: ${techStack.stacks.map(s => s.name).join(', ')}`);
  }
  lines.push('');

  // Architecture
  lines.push('## Architecture Layers');
  if (architecture.layers) {
    for (const [layer, info] of Object.entries(architecture.layers)) {
      lines.push(`- ${layer}: ${info.count} files`);
    }
  }
  lines.push(`- Max Folder Depth: ${architecture.folderDepth}`);
  if (architecture.entryPoint) {
    lines.push(`- Entry Point: ${architecture.entryPoint}`);
  }
  lines.push('');

  // API
  if (api && api.endpoints && api.endpoints.length > 0) {
    lines.push('## API Endpoints');
    for (const ep of api.endpoints.slice(0, 50)) {
      lines.push(`- ${ep.method} ${ep.path} (${path.basename(ep.file)})`);
    }
    if (api.endpoints.length > 50) lines.push(`  +${api.endpoints.length - 50} more endpoints`);
    lines.push('');
  }

  // Database
  if (database && database.models && database.models.length > 0) {
    lines.push('## Database Models');
    for (const model of database.models) {
      lines.push(`- ${model.name} (${model.fields.length} fields)`);
      for (const field of model.fields.slice(0, 15)) {
        const ref = field.ref ? ` → ref: ${field.ref}` : '';
        const req = field.required ? ' [required]' : '';
        lines.push(`  - ${field.name}: ${field.type}${ref}${req}`);
      }
    }
    lines.push('');
    if (database.relationships && database.relationships.length > 0) {
      lines.push('## Database Relationships');
      for (const rel of database.relationships) {
        lines.push(`- ${rel.from} ${rel.type} → ${rel.to} (via ${rel.throughField})`);
      }
      lines.push('');
    }
  }

  // Authentication
  lines.push('## Authentication Detection');
  lines.push(`- Mechanisms: ${authentication.mechanisms.join(', ') || 'None detected'}`);
  lines.push(`- JWT: ${authentication.jwt ? 'Yes' : 'No'}`);
  lines.push(`- OAuth: ${authentication.oauth ? 'Yes' : 'No'}`);
  lines.push(`- Passport.js: ${authentication.passport ? 'Yes' : 'No'}`);
  lines.push(`- bcrypt: ${authentication.bcrypt ? 'Yes' : 'No'}`);
  if (authentication.jwtExpiry) lines.push(`- JWT Expiry: ${authentication.jwtExpiry}`);
  if (authentication.bcryptRounds) lines.push(`- bcrypt Rounds: ${authentication.bcryptRounds}`);
  if (authentication.passwordPolicy) {
    lines.push(`- Password Policy: ${JSON.stringify(authentication.passwordPolicy)}`);
  }
  if (authentication.middleware.length > 0) {
    lines.push(`- Auth Middleware: ${authentication.middleware.join(', ')}`);
  }
  lines.push('');

  // Dependencies
  lines.push('## Dependencies');
  lines.push(`- Total Dependencies: ${dependencies.allDependencies.length}`);
  lines.push(`- Unresolved Imports: ${dependencies.unresolvedImports.length}`);
  lines.push(`- Circular Dependency Chains: ${dependencies.circularDependencies.length}`);
  if (dependencies.circularDependencies.length > 0) {
    lines.push('- Circular Chains:');
    for (const chain of dependencies.circularDependencies.slice(0, 10)) {
      lines.push(`  - ${chain}`);
    }
  }
  lines.push('');

  // External Libraries
  if (externalLibraries && externalLibraries.length > 0) {
    lines.push('## External Libraries');
    for (const lib of externalLibraries.slice(0, 30)) {
      const key = lib.isDev ? ' [dev]' : '';
      const specInfo = lib.specifiers.length > 0 ? ` (${lib.specifiers.slice(0, 5).join(', ')})` : '';
      lines.push(`- ${lib.name}${key}: used ${lib.usageCount} times in ${lib.files.length} files${specInfo}`);
    }
    lines.push('');
  }

  // Controllers
  if (controllers && controllers.length > 0) {
    lines.push('## Controllers');
    for (const ctrl of controllers) {
      lines.push(`- ${ctrl.name}: ${ctrl.totalFunctions} exported functions`);
      for (const fn of ctrl.functions.slice(0, 8)) {
        lines.push(`  - ${fn.name}(${fn.params.join(', ')}${fn.async ? ' async' : ''})`);
      }
    }
    lines.push('');
  }

  // Services
  if (services && services.length > 0) {
    lines.push('## Services');
    for (const svc of services) {
      lines.push(`- ${svc.name}: ${svc.totalFunctions} functions`);
      for (const fn of svc.functions.slice(0, 5)) {
        lines.push(`  - ${fn.name}()${fn.exported ? ' [exported]' : ''}`);
      }
    }
    lines.push('');
  }

  // Middleware
  if (middleware && middleware.length > 0) {
    lines.push('## Middleware');
    for (const mw of middleware.slice(0, 15)) {
      lines.push(`- ${mw.name} (${mw.type}) in ${path.basename(mw.file)}`);
    }
    lines.push('');
  }

  // Environmental Variables
  if (environmentVariables && environmentVariables.length > 0) {
    lines.push('## Environment Variables');
    for (const ev of environmentVariables.slice(0, 20)) {
      lines.push(`- ${ev.name}${ev.detected === 'file' ? '' : ' [referenced]'}`);
    }
    lines.push('');
  }

  // Folder structure (truncated)
  if (folderStructure && folderStructure.text) {
    lines.push('## Folder Structure');
    const treeLines = folderStructure.text.split('\n').slice(0, 40);
    for (const tl of treeLines) {
      lines.push(`  ${tl}`);
    }
    if (treeLines.length < folderStructure.text.split('\n').length) {
      lines.push('  ... (truncated)');
    }
    lines.push('');
  }

  return lines.join('\n');
};

// ============================================================
// FEATURE 5: AI Analysis Prompts (AI only explains static data)
// ============================================================

const AI_PROMPTS = {
  projectPurpose: {
    system: 'You are a technical product analyst. Based ONLY on the static analysis data below, determine the project purpose. The tech stack, architecture, models, and routes have already been extracted by parsers — you only need to synthesize and explain them. Be evidence-based and specific.',
    user: (staticContext, projectName) =>
      `Using ONLY the static analysis data below, determine the purpose and value of "${projectName}".

=== STATIC ANALYSIS DATA (no AI used to extract) ===
${staticContext}

Based on the parsed data above, answer:
1. What does this project do? Be specific — look at the code structure, modules, API routes, and database models to describe the actual functionality offered. (2-3 sentences)
2. What problem does it solve and how does it solve it? (2-3 sentences)
3. Who is the target audience? (1-2 sentences)
4. What are the key features? Infer from the code what services the app provides to end users. Describe each feature in terms of what the user can do with it or what value it delivers — do not mention the technologies used or where code is located.
5. What makes it unique?

Return ONLY valid JSON: {"title":"string","whatItDoes":"string","problemSolved":"string","targetAudience":"string","primaryUseCase":"string","keyFeatures":["string"],"uniqueValue":"string","confidence":"high|medium|low"}`,
  },

  executiveSummary: {
    system: 'You write concise executive summaries for technical projects. Based ONLY on the provided static analysis data, write a clear non-technical executive summary.',
    user: (staticContext, projectName) =>
      `Write a concise executive summary for "${projectName}".

=== STATIC ANALYSIS DATA ===
${staticContext}

Based ONLY on the static analysis data above, write an executive summary covering:
1. What this project is (1-2 sentences)
2. Technical approach and architecture (2-3 sentences)
3. Key features and capabilities (3-4 bullet points)
4. Target users (1 sentence)
5. Technical sophistication level

Return as plain text, 150-250 words. No JSON.`,
  },

  authenticationExplanation: {
    system: 'You are a security architect. Based ONLY on the detected authentication mechanisms below, explain how auth works in this project. Do NOT detect new auth mechanisms — the static analysis has already done that.',
    user: (staticContext, projectName) =>
      `Using ONLY the detected authentication data below, explain the authentication system of "${projectName}".

=== STATIC ANALYSIS AUTH DATA ===
${staticContext}

The static analysis detected these auth mechanisms (DO NOT add new ones):
- If JWT is detected, explain the JWT flow (token generation, verification, expiry, refresh)
- If OAuth is detected, explain which providers and the OAuth flow
- If bcrypt is detected, explain password hashing and security
- Explain the login process flow
- Explain the authorization model (roles, middleware, guards)
- Describe the complete authentication workflow from request to response

Return ONLY valid JSON: {
  "overview":"string",
  "authenticationWorkflow":[{"step":1,"action":"string","description":"string"}],
  "jwtFlow":{"enabled":true|false,"description":"string","accessTokenExpiry":"string","refreshTokenRotation":true|false,"tokenStorage":"string"},
  "oauthFlow":{"enabled":true|false,"providers":["string"],"description":"string"},
  "loginProcess":[{"step":1,"action":"string","description":"string"}],
  "authorizationFlow":{"model":"string","description":"string","middleware":["string"],"roles":["string"]},
  "passwordPolicy":{"description":"string"},
  "securityConsiderations":["string"]
}`,
  },

  databaseExplanation: {
    system: 'You are a database architect. Based ONLY on the detected database models and relationships below, explain the database layer. Do NOT detect new models — the static analysis has already extracted them.',
    user: (staticContext, projectName) =>
      `Using ONLY the detected database data below, explain the database layer of "${projectName}".

=== STATIC ANALYSIS DATABASE DATA ===
${staticContext}

The static analysis detected these models and relationships (DO NOT add new ones):
- Explain the database schema and technology used
- Explain the relationships between models
- Explain the data flow through the application
- Explain CRUD operations and how they map to API endpoints
- Explain if an ORM is used (Mongoose, Prisma, Sequelize, etc.)
- Describe any timestamps, soft deletes, or advanced features

Return ONLY valid JSON: {
  "databaseTechnology":"string",
  "ormUsed":{"name":"string","description":"string"},
  "schema":[{"modelName":"string","fields":[{"name":"string","type":"string","required":true|false,"unique":true|false,"ref":"string"}],"description":"string"}],
  "relationships":[{"from":"string","to":"string","type":"one-to-one|one-to-many|many-to-many","description":"string"}],
  "dataFlow":"string",
  "crudOperations":{"create":"string","read":"string","update":"string","delete":"string"},
  "advancedFeatures":["string"]
}`,
  },
};

const runAIExplanation = async (category, staticContext, projectMeta) => {
  const prompt = AI_PROMPTS[category];
  if (!prompt) throw new Error(`Unknown AI category: ${category}`);

  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user(staticContext, projectMeta.projectName) + '\n\nCRITICAL: Return ONLY valid JSON. No markdown, no explanation.' },
  ];

  try {
    const result = await callOpenRouterJSON(messages, { max_tokens: 4096, temperature: 0.1 });
    return result.data;
  } catch (error) {
    console.warn(`AI explanation for ${category} failed:`, error.message);
    return null;
  }
};

const runAIExecutiveSummary = async (staticContext, projectMeta) => {
  const prompt = AI_PROMPTS.executiveSummary;
  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user(staticContext, projectMeta.projectName) },
  ];

  try {
    const result = await callOpenRouter(messages, { max_tokens: 1024, temperature: 0.3 });
    return result.content;
  } catch (error) {
    console.warn('Executive summary generation failed:', error.message);
    return '';
  }
};

// ============================================================
// Main entry point
// ============================================================

/**
 * Build a lightweight context focused only on what the AI needs to understand
 * the project's purpose and features — no noisy implementation details.
 */
const buildLightContextForPurpose = (staticAnalysis, projectMeta) => {
  const { metrics, techStack, architecture, api, database, authentication, folderStructure } = staticAnalysis;

  const lines = [];
  lines.push(`# Project: "${projectMeta?.projectName || 'Untitled'}"`);
  lines.push('');

  // High-level scope
  lines.push('## Scope');
  lines.push(`- Files: ${metrics.totalFiles} | Lines of Code: ${metrics.totalLOC}`);
  lines.push('');

  // Tech stack — this is the biggest signal for what the project does
  lines.push('## Tech Stack');
  const allTechs = [];
  if (techStack.languages?.length) allTechs.push(`Languages: ${techStack.languages.join(', ')}`);
  if (techStack.frontend?.length) allTechs.push(`Frontend: ${techStack.frontend.map(t => t.name).join(', ')}`);
  if (techStack.backend?.length) allTechs.push(`Backend: ${techStack.backend.map(t => t.name).join(', ')}`);
  if (techStack.database?.length) allTechs.push(`Database: ${techStack.database.map(t => t.name).join(', ')}`);
  if (techStack.authentication?.length) allTechs.push(`Auth: ${techStack.authentication.map(t => t.name).join(', ')}`);
  if (techStack.deployment?.length) allTechs.push(`Deployment: ${techStack.deployment.map(t => t.name).join(', ')}`);
  if (techStack.testing?.length) allTechs.push(`Testing: ${techStack.testing.map(t => t.name).join(', ')}`);
  if (techStack.stacks?.length) allTechs.push(`Detected Stack: ${techStack.stacks.map(s => s.name).join(', ')}`);
  for (const t of allTechs) lines.push(`- ${t}`);
  lines.push('');

  // Architecture layers (high-level only)
  lines.push('## Architecture Layers');
  if (architecture?.layers) {
    for (const [layer, info] of Object.entries(architecture.layers)) {
      lines.push(`- ${layer}: ${info.count} files`);
    }
  }
  if (architecture?.entryPoint) lines.push(`- Entry Point: ${architecture.entryPoint}`);
  lines.push('');

  // API routes (just count + sample, not all)
  if (api?.endpoints?.length > 0) {
    lines.push(`## API Endpoints (${api.endpoints.length} total)`);
    const methods = new Set(api.endpoints.map(e => e.method));
    lines.push(`- HTTP Methods: ${[...methods].join(', ')}`);
    // Sample up to 8 representative routes
    const sample = api.endpoints.filter(e => e.path && !e.path.includes(':')).slice(0, 8);
    if (sample.length > 0) {
      lines.push(`- Key routes:`);
      for (const ep of sample) lines.push(`  - ${ep.method} ${ep.path}`);
    }
    lines.push('');
  }

  // Database (just model names, not all fields)
  if (database?.models?.length > 0) {
    lines.push(`## Database Models (${database.models.length} total)`);
    for (const m of database.models) {
      lines.push(`- ${m.name}: ${m.fields?.length || 0} fields`);
    }
    if (database.relationships?.length > 0) {
      lines.push(`- Relationships:`);
      for (const rel of database.relationships.slice(0, 5)) {
        lines.push(`  - ${rel.from} → ${rel.to}`);
      }
    }
    lines.push('');
  }

  // Auth mechanisms (summary only)
  lines.push('## Authentication');
  lines.push(`- Mechanisms: ${authentication?.mechanisms?.join(', ') || 'None detected'}`);
  if (authentication?.jwt) lines.push(`- JWT: Yes`);
  if (authentication?.oauth) lines.push(`- OAuth: Yes`);
  if (authentication?.passport) lines.push(`- Passport.js: Yes`);
  if (authentication?.bcrypt) lines.push(`- Password Hashing: Yes`);
  lines.push('');

  // Folder structure (truncated to first 20 lines for high-level view)
  if (folderStructure?.text) {
    lines.push('## Folder Structure');
    const treeLines = folderStructure.text.split('\n').slice(0, 20);
    for (const tl of treeLines) lines.push(`  ${tl}`);
    if (treeLines.length < folderStructure.text.split('\n').length) lines.push('  ... (truncated)');
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Build a focused context for authentication analysis — only auth-related data.
 */
const buildAuthContext = (staticAnalysis) => {
  const { authentication, metrics, techStack, api } = staticAnalysis;

  const lines = [];
  lines.push(`## Project Tech Stack (relevant to auth)`);
  if (techStack?.languages?.length) lines.push(`- Languages: ${techStack.languages.join(', ')}`);
  if (techStack?.frameworks?.length) lines.push(`- Frameworks: ${techStack.frameworks.map(f => f.name).join(', ')}`);
  if (techStack?.authentication?.length) lines.push(`- Auth libraries: ${techStack.authentication.map(t => t.name).join(', ')}`);
  lines.push('');

  lines.push('## Authentication Detection');
  lines.push(`- Mechanisms: ${authentication?.mechanisms?.join(', ') || 'None detected'}`);
  lines.push(`- JWT: ${authentication?.jwt ? 'Yes' : 'No'}`);
  lines.push(`- OAuth: ${authentication?.oauth ? 'Yes' : 'No'}`);
  lines.push(`- Passport.js: ${authentication?.passport ? 'Yes' : 'No'}`);
  lines.push(`- bcrypt: ${authentication?.bcrypt ? 'Yes' : 'No'}`);
  if (authentication?.jwtExpiry) lines.push(`- JWT Expiry: ${authentication.jwtExpiry}`);
  if (authentication?.bcryptRounds) lines.push(`- bcrypt Rounds: ${authentication.bcryptRounds}`);
  if (authentication?.passwordPolicy) lines.push(`- Password Policy: ${JSON.stringify(authentication.passwordPolicy)}`);
  if (authentication?.session) lines.push(`- Sessions: Yes`);
  if (authentication?.middleware?.length > 0) lines.push(`- Auth Middleware: ${authentication.middleware.join(', ')}`);
  lines.push('');

  // Auth-related files (from models and routes that contain auth)
  lines.push('## Auth Files');
  if (authentication?.models?.length > 0) {
    for (const m of authentication.models) lines.push(`- ${m}`);
  }
  lines.push('');

  // Login/register routes if available
  if (api?.endpoints?.length > 0) {
    const authEndpoints = api.endpoints.filter(e =>
      e.path.toLowerCase().includes('auth') || e.path.toLowerCase().includes('login') ||
      e.path.toLowerCase().includes('register') || e.path.toLowerCase().includes('oauth')
    );
    if (authEndpoints.length > 0) {
      lines.push('## Auth Endpoints');
      for (const ep of authEndpoints) lines.push(`- ${ep.method} ${ep.path}`);
      lines.push('');
    }
  }

  return lines.join('\n');
};

/**
 * Build a focused context for database analysis — only database-related data.
 */
const buildDatabaseContext = (staticAnalysis) => {
  const { database, metrics, techStack, api } = staticAnalysis;

  const lines = [];
  lines.push(`## Project Tech Stack (DB relevant)`);
  if (techStack?.database?.length) lines.push(`- Database: ${techStack.database.map(t => t.name).join(', ')}`);
  if (techStack?.languages?.length) lines.push(`- Languages: ${techStack.languages.join(', ')}`);
  lines.push('');

  // Database models with fields and relationships
  if (database?.models?.length > 0) {
    lines.push(`## Database Models (${database.models.length} total)`);
    for (const model of database.models) {
      lines.push(`- ${model.name} (${model.fields.length} fields)`);
      for (const field of model.fields.slice(0, 15)) {
        const ref = field.ref ? ` → ref: ${field.ref}` : '';
        const req = field.required ? ' [required]' : '';
        lines.push(`  - ${field.name}: ${field.type}${ref}${req}`);
      }
    }
    lines.push('');

    if (database.relationships?.length > 0) {
      lines.push('## Database Relationships');
      for (const rel of database.relationships) {
        lines.push(`- ${rel.from} ${rel.type} → ${rel.to} (via ${rel.throughField})`);
      }
      lines.push('');
    }
  }

  // CRUD routes for the models
  if (api?.endpoints?.length > 0) {
    lines.push('## API Endpoints (CRUD operations)');
    const crudMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const crudEndpoints = api.endpoints.filter(e => crudMethods.includes(e.method)).slice(0, 20);
    for (const ep of crudEndpoints) lines.push(`- ${ep.method} ${ep.path}`);
    lines.push('');
  }

  return lines.join('\n');
};

const runProjectAnalysis = async (extractDir, projectMeta) => {
  // Step 1: Static Analysis (Feature 4) — pure rules, NO AI
  const staticAnalysis = await runStaticAnalysis(extractDir);

  // Step 2: Build focused contexts — each AI call gets only what it needs
  const lightContext = buildLightContextForPurpose(staticAnalysis, projectMeta);
  const authContext = buildAuthContext(staticAnalysis);
  const dbContext = buildDatabaseContext(staticAnalysis);

  // Step 3: AI Analysis (Feature 5) — AI only explains static data
  const aiResults = {};

  // Run in parallel — each gets a focused context relevant to its domain
  const [purposeResult, authResult, dbResult, execSummary] = await Promise.allSettled([
    runAIExplanation('projectPurpose', lightContext, projectMeta),
    runAIExplanation('authenticationExplanation', authContext, projectMeta),
    runAIExplanation('databaseExplanation', dbContext, projectMeta),
    runAIExecutiveSummary(lightContext, projectMeta),
  ]);

  aiResults.projectPurpose = purposeResult.status === 'fulfilled' ? purposeResult.value : null;
  aiResults.authenticationExplanation = authResult.status === 'fulfilled' ? authResult.value : null;
  aiResults.databaseExplanation = dbResult.status === 'fulfilled' ? dbResult.value : null;
  aiResults.executiveSummary = execSummary.status === 'fulfilled' ? execSummary.value : '';

  // Step 4: Compile results
  return {
    projectMeta: {
      projectName: projectMeta.projectName,
      fileCount: projectMeta.fileCount,
      totalLOC: projectMeta.totalLOC,
      detectedTechStack: projectMeta.detectedTechStack,
    },
    staticAnalysis,  // Feature 4
    aiExplanations: aiResults,  // Feature 5
    generatedAt: new Date().toISOString(),
  };
};

// ============================================================
// Legacy support — wraps new analysis in old shape
// ============================================================

const runProjectWideAnalysis = async (extractDir, projectMeta) => {
  const result = await runProjectAnalysis(extractDir, projectMeta);

  // Map new AI explanations back to old format for backward compatibility
  const purpose = result.aiExplanations.projectPurpose;
  const auth = result.aiExplanations.authenticationExplanation;
  const db = result.aiExplanations.databaseExplanation;

  return {
    projectMeta: result.projectMeta,
    explanations: {
      purpose: purpose ? {
        title: purpose.title,
        whatItDoes: purpose.whatItDoes,
        problemSolved: purpose.problemSolved,
        targetAudience: purpose.targetAudience,
        primaryUseCase: purpose.primaryUseCase,
        keyFeatures: purpose.keyFeatures,
        uniqueValue: purpose.uniqueValue,
        confidence: purpose.confidence,
      } : null,
      architecture: null,
      workflow: null,
      authentication: auth ? {
        authMechanisms: auth.overview ? [auth.overview] : [],
        registration: null,
        login: auth.loginProcess ? { flow: auth.loginProcess.map(s => `${s.action}: ${s.description}`) } : null,
        tokenStrategy: auth.jwtFlow?.enabled ? {
          accessToken: { format: 'JWT', expiry: auth.jwtFlow.accessTokenExpiry },
          refreshToken: { enabled: auth.jwtFlow.refreshTokenRotation, rotation: auth.jwtFlow.refreshTokenRotation },
        } : null,
        requestAuthentication: auth.jwtFlow?.enabled ? { mechanism: 'JWT Bearer', middleware: auth.authorizationFlow?.middleware || [] } : null,
        authorization: auth.authorizationFlow ? { model: auth.authorizationFlow.model, roles: auth.authorizationFlow.roles } : null,
        logout: null,
        securityAnalysis: auth.securityConsiderations ? { strengths: auth.securityConsiderations.filter(s => !s.includes('concern') && !s.includes('risk')), concerns: auth.securityConsiderations.filter(s => s.includes('concern') || s.includes('risk') || s.includes('should')) } : null,
        authNotDetected: false,
      } : null,
      api: null,
      database: db ? {
        databaseTechnology: db.databaseTechnology,
        models: (db.schema || []).map(m => ({
          name: m.modelName,
          fields: m.fields.map(f => ({ name: f.name, type: f.type })),
        })),
        relationships: db.relationships,
        crudPatterns: db.crudOperations,
        dataFlow: db.dataFlow,
        databaseNotDetected: false,
      } : null,
    },
    metrics: {
      componentCount: result.staticAnalysis?.metrics?.componentCount || 0,
      routeCount: result.staticAnalysis?.metrics?.routeCount || 0,
      commentPercent: result.staticAnalysis?.metrics?.commentPercent || 0,
      folderCount: result.staticAnalysis?.metrics?.folderCount || 0,
      maintainabilityIndex: result.staticAnalysis?.metrics?.maintainabilityIndex || 100,
      cyclomaticComplexity: {
        average: result.staticAnalysis?.metrics?.avgCyclomaticComplexity || 0,
        max: result.staticAnalysis?.metrics?.maxCyclomaticComplexity || 0,
      },
    },
    partial: false,
    errors: [],
    generatedAt: result.generatedAt,
  };
};

module.exports = {
  runProjectWideAnalysis,
  runProjectAnalysis,
  collectProjectContext,
  buildStaticContextForAI,
  AI_PROMPTS,
};
