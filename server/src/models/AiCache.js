const mongoose = require('mongoose');

const aiCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AiCache', aiCacheSchema);
