const mongoose = require('mongoose');

const chatVectorCacheSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
  query: { type: String, required: true },
  results: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now, expires: 3600 },
});

module.exports = mongoose.model('ChatVectorCache', chatVectorCacheSchema);
