const express = require('express');
const analysisController = require('../controllers/analysis.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id', projectOwnership, analysisController.analyzeProject);
router.get('/:id/notes', projectOwnership, analysisController.getNotes);
router.put('/:id/notes', projectOwnership, analysisController.saveNotes);

module.exports = router;
