const path = require('path');
const AnalysisResult = require('../models/AnalysisResult');
const { runStaticAnalysis } = require('../services/staticAnalysisRunner.service');
const { predictDifficulty } = require('../services/difficultyPredictor.service');
const { generateLearningResources } = require('../services/learningResources.service');
const { autoGenerateQuestions } = require('../services/interview.service');
const AppError = require('../utils/AppError');

const getExtractDir = (userId, projectId) =>
  path.join(__dirname, '..', '..', 'uploads', userId.toString(), projectId.toString(), 'extracted');

const normalizeDifficulty = (diff) => {
  if (!diff || !Number.isFinite(diff.score)) return null;
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
  processing: require('../services/projectJobs.service').isProcessing(project),
  progress: project.analysisProgress,
  partial: project.status === 'completed_with_warnings' || project.status === 'failed',
  errors: project.analysisErrors || [],
  errorMessage: project.errorMessage,
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

const runAnalysisAndSave = async (userId, project, { progress, warn }) => {
  const extractDir = getExtractDir(userId, project._id);
  await progress('Analyzing source files', 30);
  const staticAnalysis = await runStaticAnalysis(extractDir);
  if (!staticAnalysis.metrics.totalFiles) throw new Error('No source files remain. Upload the repository again.');
  const learningResources = await generateLearningResources(staticAnalysis.techStack, project);
  const metrics = { ...staticAnalysis.metrics, cyclomaticComplexity: {
    average: staticAnalysis.metrics.avgCyclomaticComplexity,
    max: staticAnalysis.metrics.maxCyclomaticComplexity,
  } };
  // Publish useful results before calling any optional external service.
  await AnalysisResult.findOneAndUpdate({ projectId: project._id }, { $set: {
    userId, staticAnalysis, learningResources, metrics,
    knowledgeGraph: staticAnalysis.knowledgeGraph, generatedAt: new Date(),
    explanations: {}, aiExplanations: {}, executiveSummary: '', difficultyAnalysis: null,
  } }, { upsert: true });
  await progress('Source report ready; generating explanations and preparing code chat', 65);

  const optional = async (type, task) => {
    try { await task(); }
    catch (error) {
      console.warn(`${type} failed:`, error.message);
      await warn(type, `${type} is unavailable for this run. The source report is still available.`);
    }
  };
  await Promise.all([
    optional('Interview questions', () => autoGenerateQuestions(userId, project._id, staticAnalysis)),
    optional('Difficulty prediction', async () => {
      const difficultyAnalysis = await predictDifficulty(staticAnalysis.metrics);
      await AnalysisResult.updateOne({ projectId: project._id }, { $set: { difficultyAnalysis } });
    }),
    optional('AI explanations', async () => {
      const { runProjectWideAnalysis } = require('../services/analysis.service');
      const result = await runProjectWideAnalysis(extractDir, project, staticAnalysis);
      await AnalysisResult.updateOne({ projectId: project._id }, { $set: {
        aiExplanations: result.aiExplanations, explanations: result.explanations,
        executiveSummary: result.aiExplanations?.executiveSummary || '',
      } });
      if (Object.values(result.aiExplanations || {}).filter(Boolean).length < 4) {
        await warn('AI explanations', 'Some AI explanations could not be generated. Check the AI provider configuration or retry later.');
      }
    }),
  ]);
};

const analyzeProject = async (req, res, next) => {
  try {
    const jobs = require('../services/projectJobs.service');
    let project = await jobs.refreshProject(req.project._id);
    const cached = await AnalysisResult.findOne({ projectId: project._id }).lean();
    const force = req.query.force === 'true';
    if (!jobs.isProcessing(project) && (force || (!cached?.generatedAt && project.status !== 'failed'))) {
      if (project.status === 'failed' && !project.sourceReady && !project.fileCount) {
        throw new AppError('Source extraction did not finish. Please upload the repository again.', 409, 'SOURCE_NOT_READY');
      }
      project = await jobs.startAnalysisJob(project);
    }
    res.status(jobs.isProcessing(project) ? 202 : 200).json({
      status: 'success', data: { ...buildCachedResponse(project, cached), cached: !!cached?.generatedAt },
    });
  } catch (error) { next(error); }
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
      { $set: { notes, userId: req.user._id } },
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

module.exports = { analyzeProject, getNotes, saveNotes, runAnalysisAndSave };
