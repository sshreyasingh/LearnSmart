const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    fileCount: {
      type: Number,
      default: 0,
    },
    totalSizeKB: {
      type: Number,
      default: 0,
    },
    totalLOC: {
      type: Number,
      default: 0,
    },
    detectedTechStack: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['uploading', 'extracting', 'analyzing', 'completed', 'failed', 'completed_with_warnings'],
      default: 'uploading',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    analysisProgress: {
      current: { type: Number, default: 0 },
      phase: { type: String, default: '' },
      startedAt: { type: Date },
      updatedAt: { type: Date },
    },
    analysisErrors: [
      {
        type: { type: String },
        message: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    metrics: {
      componentCount: { type: Number, default: 0 },
      routeCount: { type: Number, default: 0 },
      commentPercent: { type: Number, default: 0 },
      folderCount: { type: Number, default: 0 },
      maintainabilityIndex: { type: Number, default: 100 },
      cyclomaticComplexity: {
        average: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
      },
    },
    lastAnalyzedAt: { type: Date },
  },
  { timestamps: true }
);

projectSchema.index({ userId: 1, createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
