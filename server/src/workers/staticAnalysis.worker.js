const { parentPort, workerData } = require('worker_threads');
const { runStaticAnalysis } = require('../services/staticAnalysis.service');

runStaticAnalysis(workerData.extractDir)
  .then(result => parentPort.postMessage({ result }))
  .catch(error => parentPort.postMessage({ error: error.message }));
