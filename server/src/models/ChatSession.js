const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionName: { type: String, default: 'Chat' },
  messageCount: { type: Number, default: 0 },
}, { timestamps: true });

chatSessionSchema.index({ projectId: 1, userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
