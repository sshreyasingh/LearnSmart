const express = require('express');
const skillController = require('../controllers/skill.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id', projectOwnership, skillController.getSkills);
router.post('/:id', projectOwnership, skillController.updateSkills);

module.exports = router;
