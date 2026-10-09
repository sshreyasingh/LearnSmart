const path = require('path');
const { Worker } = require('worker_threads');

// Parsing is CPU-heavy. Keep it off the HTTP server's event loop so status,
// heartbeats, and other users' requests remain responsive on larger projects.
const runStaticAnalysis = extractDir => new Promise((resolve, reject) => {
  const worker = new Worker(path.join(__dirname, '..', 'workers', 'staticAnalysis.worker.js'), {
    workerData: { extractDir }, resourceLimits: { maxOldGenerationSizeMb: 256 },
  });
  let settled = false;
  const finish = (error, result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    worker.terminate().catch(() => {});
    if (error) reject(error); else resolve(result);
  };
  const timer = setTimeout(() => finish(new Error('Source analysis exceeded the two-minute processing limit.')), 120000);
  worker.once('message', message => finish(message.error ? new Error(message.error) : null, message.result));
  worker.once('error', error => finish(error));
  worker.once('exit', code => {
    if (!settled) finish(new Error(`Source analysis worker exited before returning a report (code ${code}).`));
  });
});

module.exports = { runStaticAnalysis };
