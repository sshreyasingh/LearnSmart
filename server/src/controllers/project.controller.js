const Project = require('../models/Project');
const User = require('../models/User');
const gitService = require('../services/git.service');
const { runIngestionPipeline, cleanupProject } = require('../services/pipeline.service');
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

const createProject = async (req, res, next) => {
  try {
    const { launchJob, newJobFields } = require('../services/projectJobs.service');
    const { runIndexingPipeline } = require('../services/pipeline.service');
    const { runAnalysisAndSave } = require('./analysis.controller');
    const userId = req.user._id;
    const uploadMethod = req.body.uploadMethod || 'zip';
    if (!['zip', 'github', 'url'].includes(uploadMethod) ||
        (uploadMethod === 'zip' && !req.file) ||
        (uploadMethod === 'github' && (!req.body.owner || !req.body.repo)) ||
        (uploadMethod === 'url' && !req.body.repoUrl)) {
      throw new AppError('Provide a ZIP file or repository source.', 400, 'NO_SOURCE_CODE');
    }
    const fullUser = await User.findById(userId);
    const githubToken = fullUser ? fullUser.getProviderToken('github') : null;
    const project = await Project.create({
      userId, projectName: req.body.projectName || 'Untitled Project', status: 'extracting',
      ...newJobFields(uploadMethod === 'zip' ? 'Extracting ZIP archive' : 'Cloning repository'),
    });
    // Copy inputs; the background task does not retain the request/response objects.
    const inputs = {
      userId, projectId: project._id, uploadMethod, githubToken,
      zipBuffer: req.file?.buffer, githubOwner: req.body.owner,
      githubRepo: req.body.repo, repoUrl: req.body.repoUrl,
    };
    launchJob(project, async context => {
      const { textFiles } = await runIngestionPipeline(inputs);
      inputs.zipBuffer = null;
      const metadata = {
        fileCount: textFiles.length,
        totalSizeKB: Math.round(textFiles.reduce((sum, f) => sum + f.sizeKB, 0) * 100) / 100,
        totalLOC: textFiles.reduce((sum, f) => sum + f.loc, 0),
        detectedTechStack: detectTechStackFromRawFiles(textFiles),
        sourceReady: true, status: 'analyzing',
      };
      await Project.updateOne({ _id: project._id, jobId: project.jobId }, { $set: metadata });
      const current = { ...project.toObject(), ...metadata };
      // Wait for both branches to settle before releasing the job's lease.
      const results = await Promise.allSettled([
        runAnalysisAndSave(userId, current, context),
        (async () => {
          try {
            const result = await runIndexingPipeline({ projectId: project._id, textFiles });
            if (result.warning) await context.warn('Code chat', result.warning);
          } catch (error) {
            console.warn('Code indexing failed:', error.message);
            await context.warn('Code chat', 'Code indexing failed. The analysis report is still available.');
          }
        })(),
      ]);
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    });
    res.status(202).json({ status: 'success', data: { project, processing: true } });
  } catch (error) { next(error); }
};

const getProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const projects = await Project.find(
      { userId: req.user._id },
      '_id projectName status fileCount totalLOC detectedTechStack createdAt lastAnalyzedAt jobLeaseUntil'
    ).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const { refreshProject, isProcessing } = require('../services/projectJobs.service');
    await Promise.all(projects.map(async project => {
      if (isProcessing(project) && (!project.jobLeaseUntil || new Date(project.jobLeaseUntil) < new Date())) {
        const current = await refreshProject(project._id);
        project.status = current.status;
      }
      delete project.jobLeaseUntil;
    }));
    const total = await Project.countDocuments({ userId: req.user._id });
    res.json({ status: 'success', data: { projects }, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getProject = async (req, res, next) => {
  try {
    const { refreshProject } = require('../services/projectJobs.service');
    const project = await refreshProject(req.project._id);
    res.json({ status: 'success', data: { project } });
  } catch (error) { next(error); }
};

const deleteProject = async (req, res, next) => {
  try {
    const { ACTIVE_STATUSES, refreshProject } = require('../services/projectJobs.service');
    await refreshProject(req.project._id);
    const deleted = await Project.findOneAndDelete({ _id: req.project._id, status: { $nin: ACTIVE_STATUSES } });
    if (!deleted) throw new AppError('Processing is still running. Delete the project after it finishes.', 409, 'PROJECT_BUSY');
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
