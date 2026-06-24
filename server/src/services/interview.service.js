const InterviewQuestion = require('../models/InterviewQuestion');
const { generateQuestions } = require('./interviewQuestionBank.service');

const getQuestions = async (project) => {
  const questions = await InterviewQuestion.find({ projectId: project._id }).lean();
  return questions;
};

/**
 * Regenerate interview questions using static analysis results.
 * No AI — uses predefined question banks matched to detected tech stack.
 */
const regenerateQuestions = async (project, staticAnalysis) => {
  await InterviewQuestion.deleteMany({ projectId: project._id });

  const { questions } = generateQuestions(staticAnalysis || {}, project);

  if (questions.length > 0) {
    await InterviewQuestion.insertMany(questions);
  }

  const saved = await InterviewQuestion.find({ projectId: project._id }).lean();
  return saved;
};

/**
 * Auto-generate interview questions during analysis pipeline.
 * Called by analysis.controller.js after static analysis completes.
 */
const autoGenerateQuestions = async (userId, projectId, staticAnalysis) => {
  // Delete old questions for this project
  await InterviewQuestion.deleteMany({ projectId });

  const { questions } = generateQuestions(staticAnalysis, { _id: projectId, userId });

  if (questions.length > 0) {
    await InterviewQuestion.insertMany(questions);
  }

  return questions.length;
};

module.exports = { getQuestions, regenerateQuestions, autoGenerateQuestions };
