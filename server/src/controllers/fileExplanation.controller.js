const fileExplanationService = require('../services/fileExplanation.service');

const listExplainableFiles = async (req, res, next) => {
  try {
    const files = await fileExplanationService.listFiles(req.project);
    res.json({ status: 'success', data: { files } });
  } catch (error) { next(error); }
};

const getFileExplanation = async (req, res, next) => {
  try {
    const explanation = await fileExplanationService.getExplanation(req.project, req.params.filePath);
    res.json({ status: 'success', data: { explanation } });
  } catch (error) { next(error); }
};

const explainFile = async (req, res, next) => {
  try {
    const result = await fileExplanationService.explainFile(req.project, req.params.filePath);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

module.exports = { listExplainableFiles, getFileExplanation, explainFile };
