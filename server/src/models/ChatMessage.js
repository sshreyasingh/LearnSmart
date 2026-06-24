const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  referencedFiles: [{ filePath: String }],
  suggestedFollowUps: [String],
  tokenUsage: { promptTokens: Number, completionTokens: Number, totalTokens: Number },
  fromCache: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
