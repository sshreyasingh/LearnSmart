const { env } = require('../config/env');

const ML_BASE = () => env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the ML service's XGBoost difficulty predictor.
 * Returns difficulty score, level, learning time, and skill level.
 */
const predictDifficulty = async (metrics) => {
  const featureDict = {
    totalLOC: metrics.totalLOC || 0,
    fileCount: metrics.totalFiles || metrics.fileCount || 0,
    avgCC: metrics.avgCyclomaticComplexity || 0,
    maxCC: metrics.maxCyclomaticComplexity || 0,
    totalFuncs: metrics.functionCount || 0,
    folderDepth: metrics.maxFolderDepth || 0,
    depChainLength: metrics.dependencyChainLength || 0,
    circularDepCount: metrics.circularDependencyCount || 0,
    routeCount: metrics.routeCount || 0,
    asyncCount: metrics.asyncFunctionCount || 0,
    classCount: metrics.classCount || 0,
    errorHandlerCount: metrics.errorHandlerCount || 0,
    maintainability: metrics.maintainabilityIndex || 100,
    commentPercent: metrics.commentPercent || 0,
  };

  const res = await fetch(`${ML_BASE()}/api/v1/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(featureDict),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Prediction failed: ${res.status}`);
  }

  return res.json();
};

module.exports = { predictDifficulty };
