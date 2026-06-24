const express = require('express');
const chatController = require('../controllers/chat.controller');
const authenticate = require('../middleware/authenticate');
const projectOwnership = require('../middleware/projectOwnership');

const router = express.Router();

router.use(authenticate);

router.post('/:id/ask', projectOwnership, chatController.ask);
router.post('/:id/ask-stream', projectOwnership, chatController.askStream);
router.get('/:id/sessions', projectOwnership, chatController.getSessions);
router.get('/:id/sessions/:sessionId/messages', projectOwnership, chatController.getMessages);
router.delete('/:id/sessions/:sessionId', projectOwnership, chatController.removeSession);

module.exports = router;
