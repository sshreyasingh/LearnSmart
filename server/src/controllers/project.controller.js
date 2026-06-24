const path = require('path');
const fsp = require('fs').promises;
const Project = require('../models/Project');
const User = require('../models/User');
const fileService = require('../services/file.service');
const gitService = require('../services/git.service');
const { runIngestionPipeline, cleanupProject } = require('../services/pipeline.service');
const { indexPipelineOutput } = require('../services/vectorStore.service');
const { extractTechStackNames, detectAll } = require('../services/techStack.service');
const { parseConfigFile } = require('../services/parser.service');
const AppError = require('../utils/AppError');

const detectTechStackFromRawFiles = (textFiles) => {
  const fileList = textFiles.map((f) => f.filePath);
  const parsedFiles = textFiles.map((f) => ({
    filePath: f.filePath,
    content: f.content,
    config: parseConfigFile(f.filePath, f.content),
    imports: [],
  }));
  const techReport = detectAll(parsedFiles, null, null, fileList);
  return extractTechStackNames(techReport);
};

const getUploadDir = (userId, projectId) => {
  return path.join(__dirname, '..', '..', 'uploads', userId.toString(), projectId.toString());
};

const createProject = async (req, res, next) => {
  let project;
  try {
    const userId = req.user._id;
    const projectName = req.body.projectName || 'Untitled Project';
    const uploadMethod = req.body.uploadMethod || 'zip';

    project = await Project.create({
      userId, projectName, status: 'extracting', fileCount: 0, totalSizeKB: 0, totalLOC: 0, detectedTechStack: [],
    });

    const fullUser = await User.findById(req.user._id);
    const githubToken = fullUser ? fullUser.getProviderToken('github') : null;

    const pipelineResult = await runIngestionPipeline({
      userId, projectId: project._id, uploadMethod,
      zipBuffer: req.file ? req.file.buffer : null,
      githubOwner: req.body.owner, githubRepo: req.body.repo,
      githubToken,
      repoUrl: req.body.repoUrl,
    });

    const { textFiles, vectorStore } = pipelineResult;

    if (textFiles.length === 0) {
      project.status = 'failed';
      project.errorMessage = 'No readable source files found';
      await project.save();
      await cleanupProject(userId, project._id);
      return res.status(400).json({ status: 'error', errorCode: 'NO_TEXT_FILES', message: 'No readable source files found' });
    }

    project.fileCount = textFiles.length;
    project.totalSizeKB = Math.round(textFiles.reduce((s, f) => s + f.sizeKB, 0) * 100) / 100;
    project.totalLOC = textFiles.reduce((s, f) => s + f.loc, 0);
    project.detectedTechStack = detectTechStackFromRawFiles(textFiles);
    project.status = 'completed';
    await project.save();

    await indexPipelineOutput(project._id.toString(), vectorStore);

    res.status(201).json({
      status: 'success',
      data: {
        project: {
          _id: project._id, projectName: project.projectName, fileCount: project.fileCount,
          totalSizeKB: project.totalSizeKB, totalLOC: project.totalLOC,
          detectedTechStack: project.detectedTechStack, status: project.status, createdAt: project.createdAt,
        },
        ragIndex: { chunksIndexed: vectorStore.length },
      },
    });
  } catch (error) {
    if (project) {
      project.status = 'failed';
      project.errorMessage = error.message;
      await project.save().catch(() => {});
    }
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const projects = await Project.find(
      { userId: req.user._id },
      '_id projectName status fileCount totalLOC detectedTechStack createdAt lastAnalyzedAt'
    ).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await Project.countDocuments({ userId: req.user._id });
    res.json({ status: 'success', data: { projects }, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getProject = async (req, res, next) => {
  try { res.json({ status: 'success', data: { project: req.project } }); } catch (error) { next(error); }
};

const deleteProject = async (req, res, next) => {
  try {
    const { deleteStore } = require('../services/vectorStore.service');
    const AnalysisResult = require('../models/AnalysisResult');
    const Skill = require('../models/Skill');
    const InterviewQuestion = require('../models/InterviewQuestion');

    await Promise.all([
      AnalysisResult.deleteOne({ projectId: req.project._id }),
      Skill.deleteOne({ projectId: req.project._id }),
      InterviewQuestion.deleteOne({ projectId: req.project._id }),
      deleteStore(req.project._id.toString()),
    ]);

    await Project.findByIdAndDelete(req.project._id);
    await cleanupProject(req.user._id, req.project._id);
    res.json({ status: 'success', data: { message: 'Project deleted' } });
  } catch (error) { next(error); }
};

const getGitHubRepos = async (req, res, next) => {
  try {
    const fullUser = await User.findById(req.user._id);
    const githubToken = fullUser ? fullUser.getProviderToken('github') : null;
    if (!githubToken) {
      return res.json({ status: 'success', data: { repos: [], linked: false } });
    }
    const page = parseInt(req.query.page) || 1;
    const repos = await gitService.fetchGitHubRepos(githubToken, page);
    res.json({ status: 'success', data: { repos, linked: true } });
  } catch (error) {
    next(new AppError('Failed to fetch GitHub repos', 502, 'GITHUB_API_ERROR'));
  }
};

module.exports = { createProject, getProjects, getProject, deleteProject, getGitHubRepos };
