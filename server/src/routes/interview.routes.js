const express = require('express');
const interviewController = require('../controllers/interview.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id', projectOwnership, interviewController.getQuestions);
router.post('/:id/regenerate', projectOwnership, interviewController.regenerateQuestions);

module.exports = router;
