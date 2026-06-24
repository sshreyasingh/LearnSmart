const express = require('express');
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');
const { handleUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(authenticate);

const conditionalUpload = (req, res, next) => {
  const method = req.body.uploadMethod || 'zip';
  if (method === 'zip') {
    return handleUpload(req, res, next);
  }
  next();
};

router.post('/', uploadLimiter, conditionalUpload, projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/github-repos', projectController.getGitHubRepos);
router.get('/:id', projectOwnership, projectController.getProject);
router.delete('/:id', projectOwnership, projectController.deleteProject);

module.exports = router;
