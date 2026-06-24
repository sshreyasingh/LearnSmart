const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    executiveSummary: { type: String, default: '' },
    explanations: {
      purpose: { type: mongoose.Schema.Types.Mixed },
      architecture: { type: mongoose.Schema.Types.Mixed },
      workflow: { type: mongoose.Schema.Types.Mixed },
      authentication: { type: mongoose.Schema.Types.Mixed },
      api: { type: mongoose.Schema.Types.Mixed },
      database: { type: mongoose.Schema.Types.Mixed },
    },
    visualizations: { type: mongoose.Schema.Types.Mixed },
    simplifiedGraph: { type: mongoose.Schema.Types.Mixed },
    hierarchicalSummary: { type: mongoose.Schema.Types.Mixed },
    dependencyGraph: { type: mongoose.Schema.Types.Mixed },
    metrics: { type: mongoose.Schema.Types.Mixed },
    security: { type: mongoose.Schema.Types.Mixed },
    performance: { type: mongoose.Schema.Types.Mixed },
    knowledgeGraph: { type: mongoose.Schema.Types.Mixed },
    learningResources: { type: mongoose.Schema.Types.Mixed },
    difficulty: { type: mongoose.Schema.Types.Mixed },
    notes: { type: String, default: '' },
    generatedAt: { type: Date },

    // Feature 4: Static Analysis Results (no AI)
    staticAnalysis: {
      metrics: { type: mongoose.Schema.Types.Mixed },
      techStack: { type: mongoose.Schema.Types.Mixed },
      architecture: { type: mongoose.Schema.Types.Mixed },
      api: { type: mongoose.Schema.Types.Mixed },
      database: { type: mongoose.Schema.Types.Mixed },
      authentication: { type: mongoose.Schema.Types.Mixed },
      dependencies: { type: mongoose.Schema.Types.Mixed },
      externalLibraries: { type: mongoose.Schema.Types.Mixed },
      controllers: { type: mongoose.Schema.Types.Mixed },
      services: { type: mongoose.Schema.Types.Mixed },
      models: { type: mongoose.Schema.Types.Mixed },
      middleware: { type: mongoose.Schema.Types.Mixed },
      environmentVariables: { type: mongoose.Schema.Types.Mixed },
      configFiles: { type: mongoose.Schema.Types.Mixed },
      folderStructure: { type: mongoose.Schema.Types.Mixed },
      diagrams: { type: mongoose.Schema.Types.Mixed },

      // === Tree-sitter Parser Metadata (AST-generated, no AI) ===
      parserMetadata: {
        // Per-file symbols: functions, classes, methods, components, hooks
        symbols: [{ type: mongoose.Schema.Types.Mixed }],
        // All imports across all files
        imports: [{ type: mongoose.Schema.Types.Mixed }],
        // All exports across all files
        exports: [{ type: mongoose.Schema.Types.Mixed }],
        // React hooks used across the project
        hooks: [{ type: mongoose.Schema.Types.Mixed }],
        // API routes detected (Express, Flask, Spring, etc.)
        routes: [{ type: mongoose.Schema.Types.Mixed }],
        // Mongoose / ORM models detected
        databaseModels: [{ type: mongoose.Schema.Types.Mixed }],
        // React functional components
        reactComponents: [{ type: mongoose.Schema.Types.Mixed }],
        // HTML tags used (from HTML/CSS files)
        htmlTags: [{ type: String }],
        // CSS selectors
        cssSelectors: [{ type: String }],
        // CSS declarations
        cssDeclarations: [{ type: mongoose.Schema.Types.Mixed }],
        // External resource dependencies (scripts, stylesheets, images)
        externalDependencies: [{ type: mongoose.Schema.Types.Mixed }],
        // Per-file breakdown
        fileMetadata: { type: mongoose.Schema.Types.Mixed },
      },
    },

    // Feature 3: Difficulty Analysis (ML)
    difficultyAnalysis: {
      score: { type: Number },
      level: { type: String },
      color: { type: String },
      description: { type: String },
      confidence: { type: Number },
      probabilities: { type: [Number] },
      estimatedLearningTime: {
        hours: { type: Number },
        range: { type: String },
        label: { type: String },
        dispersion: { type: String },
      },
      recommendedSkillLevel: {
        level: { type: String },
        description: { type: String },
        years: { type: String },
      },
      dimensions: {
        size: { type: Number },
        complexity: { type: Number },
        architecture: { type: Number },
        surface: { type: Number },
        quality: { type: Number },
      },
    },

    // Feature 5: AI Explanations (using static analysis context)
    aiExplanations: {
      projectPurpose: { type: mongoose.Schema.Types.Mixed },
      executiveSummary: { type: String },
      authenticationExplanation: { type: mongoose.Schema.Types.Mixed },
      databaseExplanation: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

const AnalysisResult = mongoose.model('AnalysisResult', analysisResultSchema);

module.exports = AnalysisResult;
