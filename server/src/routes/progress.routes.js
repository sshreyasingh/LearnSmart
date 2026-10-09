const express = require('express');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id', projectOwnership, async (req, res, next) => {
  try {
    const { refreshProject, isProcessing } = require('../services/projectJobs.service');
    const project = await refreshProject(req.project._id);
    res.json({ status: 'success', data: {
      progress: project.analysisProgress?.current || 0,
      phase: project.analysisProgress?.phase || project.status,
      processing: isProcessing(project), status: project.status,
      errors: project.analysisErrors || [], errorMessage: project.errorMessage,
    } });
  } catch (error) { next(error); }
});

module.exports = router;
