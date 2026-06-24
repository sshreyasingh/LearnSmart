const express = require('express');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.get('/:id', projectOwnership, (req, res) => {
  res.json({ status: 'success', data: { progress: 100, phase: 'done' } });
});

module.exports = router;
