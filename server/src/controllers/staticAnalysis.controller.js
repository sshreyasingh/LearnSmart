const path = require('path');
const AnalysisResult = require('../models/AnalysisResult');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const { runStaticAnalysis } = require('../services/staticAnalysis.service');
const { predictDifficulty } = require('../services/difficultyPredictor.service');

const getExtractDir = (userId, projectId) =>
  path.join(__dirname, '..', '..', 'uploads', userId.toString(), projectId.toString(), 'extracted');

const normalizeDifficulty = (diff) => {
  if (!diff) return null;
  return {
    score: diff.score,
    level: diff.level,
    color: diff.color,
    levelColor: diff.levelColor || diff.color,
    levelDescription: diff.levelDescription || diff.description || '',
    summary: diff.summary || diff.description || '',
    confidence: diff.confidence,
    probabilities: diff.probabilities,
    estimatedLearningTime: diff.estimatedLearningTime,
    recommendedSkillLevel: diff.recommendedSkillLevel,
    dimensions: diff.dimensions,
  };
};

/**
 * GET /api/static-analysis/:id
 * Runs comprehensive static analysis (NO AI) on a project.
 * Returns metrics, tech stack, folder structure, diagrams, and difficulty prediction.
 */
const getStaticAnalysis = async (req, res, next) => {
  try {
    const project = req.project;
    const userId = req.user._id;
    const extractDir = getExtractDir(userId, project._id);

    // Run static analysis (Feature 4) — pure rule-based, no AI
    const staticAnalysis = await runStaticAnalysis(extractDir);

    // Run XGBoost difficulty prediction (Feature 3)
    let difficultyPrediction = null;
    try {
      difficultyPrediction = await predictDifficulty(staticAnalysis.metrics);
    } catch (err) {
      console.warn('Difficulty prediction failed:', err.message);
    }

    // Save to AnalysisResult
    const update = {
      projectId: project._id,
      userId,
      staticAnalysis,
      difficultyAnalysis: difficultyPrediction,
      generatedAt: new Date(),
    };

    await AnalysisResult.findOneAndUpdate({ projectId: project._id }, { $set: update }, { upsert: true });

    const saved = await AnalysisResult.findOne({ projectId: project._id }).lean();

    res.status(200).json({
      status: 'success',
      data: {
        projectId: project._id,
        projectName: project.projectName,
        metrics: staticAnalysis.metrics,
        techStack: staticAnalysis.techStack,
        architecture: staticAnalysis.architecture,
        api: staticAnalysis.api,
        database: staticAnalysis.database,
        authentication: staticAnalysis.authentication,
        dependencies: staticAnalysis.dependencies,
        externalLibraries: staticAnalysis.externalLibraries,
        controllers: staticAnalysis.controllers,
        services: staticAnalysis.services,
        models: staticAnalysis.models,
        middleware: staticAnalysis.middleware,
        environmentVariables: staticAnalysis.environmentVariables,
        configFiles: staticAnalysis.configFiles,
        folderStructure: staticAnalysis.folderStructure,
        diagrams: staticAnalysis.diagrams,
        difficulty: normalizeDifficulty(difficultyPrediction),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/static-analysis/:id/difficulty
 * Returns only the difficulty prediction (uses cached static analysis or runs fresh).
 */
const getDifficultyAnalysis = async (req, res, next) => {
  try {
    const project = req.project;

    // Check for cached difficulty analysis
    const cached = await AnalysisResult.findOne({ projectId: project._id }).lean();
    if (cached?.difficultyAnalysis) {
      return res.status(200).json({
        status: 'success',
        data: {
          projectId: project._id,
          projectName: project.projectName,
          difficulty: normalizeDifficulty(cached.difficultyAnalysis),
          cached: true,
        },
      });
    }

    // Run fresh if no cache
    const extractDir = getExtractDir(req.user._id, project._id);
    const staticAnalysis = await runStaticAnalysis(extractDir);

    let difficultyPrediction = null;
    try {
      difficultyPrediction = await predictDifficulty(staticAnalysis.metrics);
    } catch (err) {
      console.warn('Difficulty prediction failed:', err.message);
    }

    if (difficultyPrediction) {
      await AnalysisResult.findOneAndUpdate(
        { projectId: project._id },
        { $set: { difficultyAnalysis: difficultyPrediction } },
        { upsert: true }
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        projectId: project._id,
        projectName: project.projectName,
        difficulty: normalizeDifficulty(difficultyPrediction),
        cached: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStaticAnalysis, getDifficultyAnalysis };
