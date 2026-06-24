const path = require('path');
const AnalysisResult = require('../models/AnalysisResult');
const Project = require('../models/Project');
const { runStaticAnalysis } = require('../services/staticAnalysis.service');
const { predictDifficulty } = require('../services/difficultyPredictor.service');
const { generateLearningResources } = require('../services/learningResources.service');
const { autoGenerateQuestions } = require('../services/interview.service');
const AppError = require('../utils/AppError');

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

const buildCachedResponse = (project, cached) => ({
  project: {
    _id: project._id, projectName: project.projectName, fileCount: project.fileCount,
    totalSizeKB: project.totalSizeKB, totalLOC: project.totalLOC,
    detectedTechStack: project.detectedTechStack, status: project.status, createdAt: project.createdAt,
  },
  executiveSummary: cached?.executiveSummary || '',
  explanations: {
    purpose: cached?.explanations?.purpose || null,
    architecture: cached?.explanations?.architecture || null,
    workflow: cached?.explanations?.workflow || null,
    authentication: cached?.explanations?.authentication || null,
    api: cached?.explanations?.api || null,
    database: cached?.explanations?.database || null,
  },
  visualizations: cached?.visualizations || {},
  // Map from staticAnalysis diagrams (new structure), fall back to legacy fields
  dependencyGraph: cached?.dependencyGraph || cached?.staticAnalysis?.diagrams?.dependencyGraph || null,
  simplifiedGraph: cached?.simplifiedGraph || cached?.staticAnalysis?.diagrams?.simplifiedGraph || null,
  hierarchicalSummary: cached?.hierarchicalSummary || {},
  metrics: cached?.metrics || cached?.staticAnalysis?.metrics || null,
  knowledgeGraph: cached?.knowledgeGraph || null,
  security: cached?.security || null,
  learningResources: cached?.learningResources || null,
  // Map from difficultyAnalysis (new structure), fall back to legacy difficulty field
  difficulty: normalizeDifficulty(cached?.difficultyAnalysis) || normalizeDifficulty(cached?.difficulty) || null,
  notes: cached?.notes || '',
  generatedAt: cached?.generatedAt || null,
  // Feature 4 & 5: Raw analysis data
  staticAnalysis: cached?.staticAnalysis || null,
  difficultyAnalysis: cached?.difficultyAnalysis || null,
  aiExplanations: cached?.aiExplanations || null,
});

const runAnalysisAndSave = async (userId, project) => {
  const extractDir = getExtractDir(userId, project._id);

  // Step 1: Run static analysis (Feature 4) — pure rules, no AI
  const staticAnalysis = await runStaticAnalysis(extractDir);

  // Step 2: Generate learning resources from detected tech stack
  const learningResources = await generateLearningResources(staticAnalysis.techStack, {
    detectedTechStack: project.detectedTechStack,
  });

  // Step 3: Auto-generate interview questions from static analysis (no AI)
  try {
    await autoGenerateQuestions(userId, project._id, staticAnalysis);
  } catch (err) {
    console.warn('Interview question generation failed:', err.message);
  }

  // Step 4: Run difficulty prediction (Feature 3) — XGBoost
  let difficultyAnalysis = null;
  try {
    difficultyAnalysis = await predictDifficulty(staticAnalysis.metrics);
  } catch (err) {
    console.warn('Difficulty prediction failed:', err.message);
  }

  // Step 5: Run AI analysis (Feature 5) — AI explains static results
  // Gracefully handle AI failure so static analysis + questions + resources still load
  let aiResult = null;
  try {
    const { runProjectWideAnalysis } = require('../services/analysis.service');
    aiResult = await runProjectWideAnalysis(extractDir, {
      projectName: project.projectName,
      fileCount: project.fileCount,
      totalLOC: project.totalLOC,
      detectedTechStack: project.detectedTechStack,
    });
  } catch (err) {
    console.warn('AI analysis failed, returning partial results:', err.message);
  }

  // Step 6: Save everything to AnalysisResult
  const update = {
    projectId: project._id,
    userId,
    staticAnalysis,
    learningResources,
    difficultyAnalysis,
    aiExplanations: aiResult?.aiExplanations || {},
    explanations: aiResult?.explanations || {},
    metrics: aiResult?.metrics || staticAnalysis?.metrics || null,
    executiveSummary: aiResult?.aiExplanations?.executiveSummary || aiResult?.explanations?.purpose?.whatItDoes || '',
    knowledgeGraph: staticAnalysis?.knowledgeGraph || null,
    generatedAt: new Date(),
  };

  await AnalysisResult.findOneAndUpdate({ projectId: project._id }, update, { upsert: true });
  await Project.findByIdAndUpdate(project._id, { lastAnalyzedAt: new Date() });

  const saved = await AnalysisResult.findOne({ projectId: project._id }).lean();
  return { ...buildCachedResponse(project, saved), cached: false };
};

const analyzeProject = async (req, res, next) => {
  try {
    const project = req.project;
    const userId = req.user._id;
    const force = req.query.force === 'true';

    const cached = await AnalysisResult.findOne({ projectId: project._id }).lean();

    // Normal request with cache: return cached data immediately
    if (!force && cached) {
      return res.status(200).json({
        status: 'success',
        data: { ...buildCachedResponse(project, cached), cached: true },
      });
    }

    // Force re-analysis: run full analysis and save results
    if (force || !cached) {
      const data = await runAnalysisAndSave(userId, project);
      return res.status(200).json({ status: 'success', data });
    }

    res.status(200).json({
      status: 'success',
      data: {
        project: {
          _id: project._id, projectName: project.projectName, fileCount: project.fileCount,
          totalSizeKB: project.totalSizeKB, totalLOC: project.totalLOC,
          detectedTechStack: project.detectedTechStack, status: project.status, createdAt: project.createdAt,
        },
        processing: false,
        explanations: {},
        staticAnalysis: null,
        difficultyAnalysis: null,
        aiExplanations: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getNotes = async (req, res, next) => {
  try {
    const result = await AnalysisResult.findOne({ projectId: req.project._id }).select('notes').lean();
    res.status(200).json({
      status: 'success',
      data: { notes: result?.notes || '' },
    });
  } catch (error) {
    next(error);
  }
};

const saveNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    await AnalysisResult.findOneAndUpdate(
      { projectId: req.project._id },
      { notes },
      { upsert: true }
    );
    res.status(200).json({
      status: 'success',
      data: { notes },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzeProject, getNotes, saveNotes };
