const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  skills: [String],
  proficiency: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);
