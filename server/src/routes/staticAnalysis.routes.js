const express = require('express');
const staticAnalysisController = require('../controllers/staticAnalysis.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

// Full static analysis (metrics, tech stack, diagrams, difficulty)
router.get('/:id', projectOwnership, staticAnalysisController.getStaticAnalysis);

// Difficulty-only endpoint for dashboard
router.get('/:id/difficulty', projectOwnership, staticAnalysisController.getDifficultyAnalysis);

module.exports = router;
