const AnalysisResult = require('../models/AnalysisResult');
const { refreshProject, isProcessing, startAnalysisJob } = require('../services/projectJobs.service');

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

// Read the shared report; diagram and dashboard requests must not start duplicate parsers.
const getStaticAnalysis = async (req, res, next) => {
  try {
    let project = await refreshProject(req.project._id);
    const cached = await AnalysisResult.findOne({ projectId: project._id }).lean();
    if (!cached?.staticAnalysis?.metrics && !isProcessing(project) && project.status !== 'failed') {
      project = await startAnalysisJob(project);
    }
    res.status(isProcessing(project) ? 202 : 200).json({ status: 'success', data: {
      ...cached?.staticAnalysis,
      projectId: project._id, projectName: project.projectName,
      difficulty: normalizeDifficulty(cached?.difficultyAnalysis),
      processing: isProcessing(project), errorMessage: project.errorMessage,
      progress: project.analysisProgress,
    } });
  } catch (error) { next(error); }
};

const getDifficultyAnalysis = async (req, res, next) => {
  try {
    const cached = await AnalysisResult.findOne({ projectId: req.project._id }).select('difficultyAnalysis').lean();
    res.json({ status: 'success', data: {
      projectId: req.project._id, projectName: req.project.projectName,
      difficulty: normalizeDifficulty(cached?.difficultyAnalysis), cached: true,
    } });
  } catch (error) { next(error); }
};

module.exports = { getStaticAnalysis, getDifficultyAnalysis };
