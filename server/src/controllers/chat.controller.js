const { askQuestion, askQuestionStream, listSessions, getSessionMessages, deleteSession } = require('../services/chat.service');
const Project = require('../models/Project');

const ask = async (req, res, next) => {
  try {
    const project = req.project;
    const userId = req.user._id;
    const { question, sessionId } = req.body;

    const projectInfo = {
      name: project.projectName,
      description: project.detectedTechStack?.join(', ') || '',
      totalFiles: project.fileCount,
      totalLOC: project.totalLOC,
    };

    const result = await askQuestion(
      project._id.toString(),
      userId,
      question,
      projectInfo,
      { sessionId }
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const askStream = async (req, res, next) => {
  try {
    const project = req.project;
    const userId = req.user._id;
    const { question, sessionId } = req.body;

    const projectInfo = {
      name: project.projectName,
      description: project.detectedTechStack?.join(', ') || '',
      totalFiles: project.fileCount,
      totalLOC: project.totalLOC,
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await askQuestionStream(
      project._id.toString(),
      userId,
      question,
      projectInfo,
      (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      },
      { sessionId }
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessions = await listSessions(req.params.projectId, req.user._id);
    res.json({ status: 'success', data: { sessions } });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const messages = await getSessionMessages(req.params.sessionId);
    res.json({ status: 'success', data: { messages } });
  } catch (error) {
    next(error);
  }
};

const removeSession = async (req, res, next) => {
  try {
    await deleteSession(req.params.sessionId, req.params.projectId, req.user._id);
    res.json({ status: 'success', data: { message: 'Session deleted' } });
  } catch (error) {
    next(error);
  }
};

module.exports = { ask, askStream, getSessions, getMessages, removeSession };
