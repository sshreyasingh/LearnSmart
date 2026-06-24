const interviewService = require('../services/interview.service');
const AnalysisResult = require('../models/AnalysisResult');

const getQuestions = async (req, res, next) => {
  try {
    const questions = await interviewService.getQuestions(req.project);
    res.json({ status: 'success', data: { questions } });
  } catch (error) { next(error); }
};

const regenerateQuestions = async (req, res, next) => {
  try {
    // Load static analysis data to regenerate tech-specific questions
    const analysis = await AnalysisResult.findOne({ projectId: req.project._id })
      .select('staticAnalysis')
      .lean();

    const questions = await interviewService.regenerateQuestions(
      req.project,
      analysis?.staticAnalysis || null
    );
    res.json({ status: 'success', data: { questions } });
  } catch (error) { next(error); }
};

module.exports = { getQuestions, regenerateQuestions };
