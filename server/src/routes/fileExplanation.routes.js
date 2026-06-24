const express = require('express');
const fileExplanationController = require('../controllers/fileExplanation.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id/files', projectOwnership, fileExplanationController.listExplainableFiles);
router.get('/:id/files/:filePath(*)', projectOwnership, fileExplanationController.getFileExplanation);
router.post('/:id/files/:filePath(*)/explain', projectOwnership, fileExplanationController.explainFile);

module.exports = router;
