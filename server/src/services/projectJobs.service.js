const { randomUUID } = require('crypto');
const Project = require('../models/Project');
const { addListener } = require('./progress.service');

const ACTIVE_STATUSES = ['uploading', 'extracting', 'analyzing'];
const LEASE_MS = 120000;
const isProcessing = project => ACTIVE_STATUSES.includes(project?.status);

// A lease makes a crashed worker visible instead of leaving a permanent spinner.
const refreshProject = async id => {
  await Project.updateOne({
    _id: id, status: { $in: ACTIVE_STATUSES },
    $or: [{ jobLeaseUntil: { $lt: new Date() } }, { jobLeaseUntil: null }],
  }, { $set: {
    status: 'failed', errorMessage: 'Processing was interrupted. Retry analysis, or upload again if source extraction did not finish.',
    'analysisProgress.phase': 'Interrupted', 'analysisProgress.updatedAt': new Date(),
  }, $unset: { jobId: 1, jobLeaseUntil: 1 } });
  const project = await Project.findById(id).lean();
  if (!project) {
    const AppError = require('../utils/AppError');
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }
  return project;
};

const launchJob = (project, task) => {
  const filter = { _id: project._id, jobId: project.jobId };
  const warnings = [];
  const progress = async (phase, current) => Project.updateOne(filter, { $set: {
    'analysisProgress.phase': phase, 'analysisProgress.current': current,
    'analysisProgress.updatedAt': new Date(),
  } });
  const warn = async (type, message) => {
    warnings.push({ type, message, timestamp: new Date() });
    await Project.updateOne(filter, { $push: { analysisErrors: warnings[warnings.length - 1] } });
  };
  setImmediate(async () => {
    const heartbeat = setInterval(() => {
      Project.updateOne(filter, { $set: { jobLeaseUntil: new Date(Date.now() + LEASE_MS) } })
        .catch(error => console.error('Job heartbeat failed:', error.message));
    }, 15000);
    heartbeat.unref();
    const unsubscribe = addListener(project._id, event => {
      // Only ingestion owns the main progress label; enrichment runs concurrently.
      if (['cloning', 'reading_files'].includes(event.phase)) {
        progress(event.message || event.phase, event.phase === 'cloning' ? 10 : 20)
          .catch(error => console.error('Progress update failed:', error.message));
      }
    });
    try {
      await task({ progress, warn });
      await Project.updateOne(filter, { $set: {
        status: warnings.length ? 'completed_with_warnings' : 'completed',
        errorMessage: null, lastAnalyzedAt: new Date(),
        'analysisProgress.current': 100, 'analysisProgress.phase': 'Complete',
        'analysisProgress.updatedAt': new Date(),
      }, $unset: { jobId: 1, jobLeaseUntil: 1 } });
    } catch (error) {
      console.error(`Project job ${project._id} failed:`, error.message);
      await Project.updateOne(filter, { $set: {
        status: 'failed', errorMessage: 'Processing failed. Retry analysis if source files are available, or upload the repository again.',
        'analysisProgress.phase': 'Failed', 'analysisProgress.updatedAt': new Date(),
      }, $unset: { jobId: 1, jobLeaseUntil: 1 } }).catch(err => console.error('Could not save job failure:', err.message));
    } finally {
      clearInterval(heartbeat);
      unsubscribe();
    }
  });
};

const newJobFields = phase => ({
  jobId: randomUUID(), jobLeaseUntil: new Date(Date.now() + LEASE_MS),
  analysisProgress: { current: 0, phase, startedAt: new Date(), updatedAt: new Date() },
  analysisErrors: [], errorMessage: null,
});

const startAnalysisJob = async project => {
  const claimed = await Project.findOneAndUpdate({
    _id: project._id, status: { $nin: ACTIVE_STATUSES },
  }, { $set: { ...newJobFields('Analyzing source files'), status: 'analyzing' } }, { new: true }).lean();
  if (!claimed) return refreshProject(project._id);
  launchJob(claimed, async context => {
    const { runAnalysisAndSave } = require('../controllers/analysis.controller');
    await runAnalysisAndSave(claimed.userId, claimed, context);
    const { loadStore } = require('./vectorStore.service');
    const store = await loadStore(String(claimed._id));
    if (!store.length || store.some(chunk => !chunk.vector?.some(value => value !== 0))) {
      await context.progress('Source report ready; preparing code chat', 90);
      try {
        const path = require('path');
        const { readAllTextFiles } = require('./file.service');
        const { runIndexingPipeline } = require('./pipeline.service');
        const extractDir = path.join(__dirname, '..', '..', 'uploads', String(claimed.userId), String(claimed._id), 'extracted');
        const textFiles = await readAllTextFiles(extractDir);
        const result = await runIndexingPipeline({ projectId: claimed._id, textFiles });
        if (result.warning) await context.warn('Code chat', result.warning);
      } catch (error) {
        console.warn('Code indexing failed:', error.message);
        await context.warn('Code chat', 'Code indexing is unavailable for this run. The source report is still available.');
      }
    }
  });
  return claimed;
};

module.exports = { ACTIVE_STATUSES, isProcessing, refreshProject, launchJob, newJobFields, startAnalysisJob };
