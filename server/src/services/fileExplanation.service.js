const fileService = require('./file.service');
const path = require('path');

const getProjectDir = (project) => {
  return path.join(__dirname, '..', '..', 'uploads', project.userId.toString(), project._id.toString(), 'extracted');
};

const listFiles = async (project) => {
  const extractDir = getProjectDir(project);
  const files = await fileService.readAllTextFiles(extractDir);
  return files.map(f => ({ path: f.filePath, language: f.language, loc: f.loc }));
};

const getExplanation = async (project, filePath) => {
  return { filePath, explanation: 'File explanation not available.' };
};

const explainFile = async (project, filePath) => {
  return { filePath, explanation: 'File explanation not available.' };
};

module.exports = { listFiles, getExplanation, explainFile };
