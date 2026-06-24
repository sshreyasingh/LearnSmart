const { spawn } = require('child_process');
const path = require('path');

const PREDICT_SCRIPT = path.join(__dirname, 'predict.py');

/**
 * Calls the Python XGBoost predictor with extracted metrics.
 * Returns difficulty score, level, learning time, and skill level.
 */
const predictDifficulty = (metrics) => {
  return new Promise((resolve, reject) => {
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

    const input = JSON.stringify(featureDict);

    const python = spawn('python', [PREDICT_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..', '..'),
    });

    const timeoutMs = 30000;
    const timer = setTimeout(() => {
      python.kill('SIGTERM');
      reject(new Error(`Difficulty predictor timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });

    python.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`Predict script exited with code ${code}: ${stderr}`));
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse prediction output: ${err.message}`));
      }
    });

    python.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    python.stdin.write(input);
    python.stdin.end();
  });
};

module.exports = { predictDifficulty };
