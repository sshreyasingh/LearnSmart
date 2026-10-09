const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function load(relative, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, __dirname: path.dirname(filename),
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : nativeRequire(name),
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, AbortSignal,
    ...globals,
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return module.exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const project = { _id: 'project', userId: 'user', status: 'completed', fileCount: 1, projectName: 'Example' };

test('real parser preserves source for route and auth detection, including fallback languages', async () => {
  const { parseAllFiles } = require('../src/services/parser.service');
  const { extractAllRoutes } = require('../src/services/executionFlow.service');
  const files = [
    { filePath: 'src/app.js', language: 'JavaScript', content: "const express = require('express');\nconst app = express();\napp.get('/hello', (req, res) => res.json({ ok: true }));" },
    { filePath: 'script.rb', language: 'Ruby', content: 'puts "hello"' },
  ];
  const parsed = await parseAllFiles(files);
  for (const file of files) assert.equal(parsed.find(item => item.filePath === file.filePath).content, file.content);
  assert.ok(extractAllRoutes(parsed).some(route => route.path === '/hello' && route.method === 'GET'));
});

test('background parser produces a real source report from repository files', async () => {
  const fixture = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'learnsmart-analysis-test-'));
  const appPath = path.join(fixture, 'app.js');
  try {
    fs.writeFileSync(appPath, "const express = require('express');\nconst app = express();\napp.get('/health', (req, res) => res.send('ok'));\n");
    const { runStaticAnalysis } = require('../src/services/staticAnalysisRunner.service');
    const result = await runStaticAnalysis(fixture);
    assert.equal(result.metrics.totalFiles, 1);
    assert.ok(result.api.endpoints.some(route => route.path === '/health'));
  } finally {
    fs.unlinkSync(appPath);
    fs.rmdirSync(fixture);
  }
});

test('job lifecycle publishes warnings and releases its lease after work completes', async () => {
  const writes = [];
  let execute;
  let unsubscribed = false;
  let timerCleared = false;
  const jobs = load('src/services/projectJobs.service.js', {
    '../models/Project': { updateOne: async (filter, update) => { assert.equal(filter.jobId, 'owned'); writes.push(update); } },
    './progress.service': { addListener: () => () => { unsubscribed = true; } },
  }, {
    setImmediate: fn => { execute = fn; },
    setInterval: () => ({ unref() {} }), clearInterval: () => { timerCleared = true; },
  });
  jobs.launchJob({ ...project, jobId: 'owned' }, async ({ warn, progress }) => {
    await progress('Source ready', 65);
    await warn('AI', 'AI unavailable');
  });
  await execute();
  const last = writes.at(-1);
  assert.equal(last.$set.status, 'completed_with_warnings');
  assert.equal(last.$set['analysisProgress.current'], 100);
  assert.equal(last.$unset.jobId, 1);
  assert.equal(unsubscribed && timerCleared, true);
});

test('job exceptions produce a failed status and always clean up heartbeats', async () => {
  let execute;
  let last;
  let cleaned = false;
  const jobs = load('src/services/projectJobs.service.js', {
    '../models/Project': { updateOne: async (_, update) => { last = update; } },
    './progress.service': { addListener: () => () => {} },
  }, {
    setImmediate: fn => { execute = fn; },
    setInterval: () => ({ unref() {} }), clearInterval: () => { cleaned = true; },
  });
  jobs.launchJob({ ...project, jobId: 'owned' }, async () => { throw new Error('clone failed'); });
  await execute();
  assert.equal(last.$set.status, 'failed');
  assert.ok(last.$set.errorMessage);
  assert.equal(cleaned, true);
});

test('dashboard difficulty reads never invoke fresh parsing or prediction', async () => {
  const controller = load('src/controllers/staticAnalysis.controller.js', {
    '../models/AnalysisResult': { findOne: () => ({ select: () => ({ lean: async () => null }) }) },
    '../services/projectJobs.service': {},
  });
  let body;
  await controller.getDifficultyAnalysis({ project }, { json: result => { body = result; } }, error => { throw error; });
  assert.equal(body.data.difficulty, null);
});

test('upload returns 202 before ingestion and starts analysis independently of slow indexing', async () => {
  let background;
  let ingested = false;
  let analyzed = false;
  const index = deferred();
  const controller = load('src/controllers/project.controller.js', {
    '../models/Project': {
      create: async fields => ({ ...fields, _id: 'project', toObject() { return { ...fields, _id: 'project' }; } }),
      updateOne: async () => {},
    },
    '../models/User': { findById: async () => null },
    '../services/git.service': {},
    '../services/techStack.service': { detectAll: () => ({}), extractTechStackNames: () => ['JavaScript'] },
    '../services/parser.service': { parseConfigFile: () => null },
    '../services/pipeline.service': {
      runIngestionPipeline: async () => { ingested = true; return { textFiles: [{ filePath: 'app.js', content: 'code', sizeKB: 1, loc: 1 }] }; },
      runIndexingPipeline: async () => { await index.promise; return {}; },
    },
    '../services/projectJobs.service': { newJobFields: () => ({ jobId: 'owned' }), launchJob: (_, task) => { background = task; } },
    './analysis.controller': { runAnalysisAndSave: async () => { analyzed = true; } },
  });
  let response;
  const res = { status(code) { assert.equal(code, 202); return this; }, json(body) { response = body; } };
  await controller.createProject({ user: { _id: 'user' }, body: { uploadMethod: 'zip' }, file: { buffer: Buffer.from('zip') } }, res, error => { throw error; });
  assert.equal(response.data.project._id, 'project');
  assert.equal(ingested, false, 'upload response must not wait for ingestion');
  let finished = false;
  const running = background({ progress: async () => {}, warn: async () => {} }).then(() => { finished = true; });
  await tick();
  assert.equal(analyzed, true);
  assert.equal(finished, false, 'indexing is still running independently');
  index.resolve();
  await running;
});

function controllerMocks(overrides = {}) {
  return {
    '../models/AnalysisResult': {},
    '../services/staticAnalysisRunner.service': {},
    '../services/difficultyPredictor.service': {},
    '../services/learningResources.service': {},
    '../services/interview.service': {},
    ...overrides,
  };
}

test('static results are saved before slow AI, parsed once, and survive ML failure', async () => {
  const ai = deferred();
  const writes = [];
  const warnings = [];
  let parses = 0;
  const staticAnalysis = { metrics: { totalFiles: 1 }, techStack: {}, knowledgeGraph: {} };
  const controller = load('src/controllers/analysis.controller.js', controllerMocks({
    '../models/AnalysisResult': {
      findOneAndUpdate: async (_, update) => writes.push(update.$set),
      updateOne: async (_, update) => writes.push(update.$set),
    },
    '../services/staticAnalysisRunner.service': { runStaticAnalysis: async () => { parses++; return staticAnalysis; } },
    '../services/learningResources.service': { generateLearningResources: async () => ({ resources: [] }) },
    '../services/interview.service': { autoGenerateQuestions: async () => {} },
    '../services/difficultyPredictor.service': { predictDifficulty: async () => { throw new Error('ML offline'); } },
    '../services/analysis.service': { runProjectWideAnalysis: async (_, __, supplied) => {
      assert.equal(supplied, staticAnalysis);
      await ai.promise;
      return { explanations: { purpose: { whatItDoes: 'Example' } }, aiExplanations: {
        projectPurpose: {}, executiveSummary: 'Summary', authenticationExplanation: {}, databaseExplanation: {},
      } };
    } },
  }));
  const running = controller.runAnalysisAndSave('user', project, { progress: async () => {}, warn: async (...args) => warnings.push(args) });
  await tick();
  assert.equal(writes[0].staticAnalysis, staticAnalysis);
  assert.equal(writes.length, 1, 'AI is still pending but the source report is available');
  ai.resolve();
  await running;
  assert.equal(parses, 1);
  assert.equal(writes[1].executiveSummary, 'Summary');
  assert.equal(warnings[0][0], 'Difficulty prediction');
});

test('polling an active project returns 202 and does not start another analysis', async () => {
  const activeProject = { ...project, status: 'analyzing', analysisProgress: { current: 65 } };
  let started = false;
  const controller = load('src/controllers/analysis.controller.js', controllerMocks({
    '../models/AnalysisResult': { findOne: () => ({ lean: async () => ({ generatedAt: new Date(), metrics: { totalFiles: 1 } }) }) },
    '../services/projectJobs.service': {
      refreshProject: async () => activeProject,
      isProcessing: p => p.status === 'analyzing',
      startAnalysisJob: async () => { started = true; },
    },
  }));
  let response;
  const res = { status(code) { this.code = code; return this; }, json(body) { response = body; } };
  await controller.analyzeProject({ project, query: { force: 'true' } }, res, error => { throw error; });
  assert.equal(started, false);
  assert.equal(res.code, 202);
  assert.equal(response.data.processing, true);
  assert.equal(response.data.metrics.totalFiles, 1);
});

test('failed jobs stop polling and expose the error without automatically retrying', async () => {
  const controller = load('src/controllers/analysis.controller.js', controllerMocks({
    '../models/AnalysisResult': { findOne: () => ({ lean: async () => null }) },
    '../services/projectJobs.service': {
      refreshProject: async () => ({ ...project, status: 'failed', errorMessage: 'Interrupted' }),
      isProcessing: () => false,
      startAnalysisJob: () => assert.fail('must not auto-retry failures'),
    },
  }));
  let data;
  const res = { status(code) { assert.equal(code, 200); return this; }, json(body) { data = body.data; } };
  await controller.analyzeProject({ project, query: {} }, res, error => { throw error; });
  assert.equal(data.processing, false);
  assert.equal(data.errorMessage, 'Interrupted');
});

test('MongoDB claim prevents duplicate jobs from simultaneous force requests', async () => {
  let row = { ...project };
  const scheduled = [];
  const jobs = load('src/services/projectJobs.service.js', {
    '../models/Project': {
      findOneAndUpdate(filter, update) {
        const match = !filter.status.$nin.includes(row.status);
        if (match) row = { ...row, ...update.$set };
        const result = match ? { ...row } : null;
        return { lean: async () => result };
      },
      updateOne: async () => {},
      findById: () => ({ lean: async () => row }),
    },
    './progress.service': { addListener: () => () => {} },
  }, { setImmediate: callback => scheduled.push(callback) });
  const results = await Promise.all([jobs.startAnalysisJob(project), jobs.startAnalysisJob(project)]);
  assert.equal(scheduled.length, 1);
  assert.equal(results[0].jobId, results[1].jobId);
});

test('expired worker lease becomes a visible failure', async () => {
  let row = { ...project, status: 'analyzing', jobId: 'old-worker', jobLeaseUntil: new Date(0) };
  const jobs = load('src/services/projectJobs.service.js', {
    '../models/Project': {
      updateOne: async (filter, update) => {
        assert.ok(filter.$or[0].jobLeaseUntil.$lt > row.jobLeaseUntil);
        row = { ...row, ...update.$set };
      },
      findById: () => ({ lean: async () => row }),
    },
    './progress.service': {},
  });
  const result = await jobs.refreshProject('project');
  assert.equal(result.status, 'failed');
  assert.match(result.errorMessage, /interrupted/);
  assert.equal(jobs.isProcessing(result), false);
});

test('embedding provider errors stop the batch instead of trying every remaining chunk', async () => {
  let calls = 0;
  const embeddings = load('src/services/embedding.service.js', {
    '../config/openrouter': { getEmbeddingModel: () => ({ create: async () => {
      calls++;
      const error = new Error('Unauthorized'); error.status = 401; throw error;
    } }) },
    fs: { promises: { mkdir: async () => {}, readdir: async () => [] } },
  });
  const result = await embeddings.embedBatch(Array.from({ length: 100 }, (_, i) => `chunk ${i}`));
  assert.equal(calls, 5, 'only already-running workers should contact the failed provider');
  assert.equal(result.length, 100);
  assert.ok(result.every(vector => vector.every(value => value === 0)));
});

test('keyword retrieval works without an embedding API and sees updated indexes from other workers', async () => {
  let version = 1;
  let disk = [{ filePath: 'auth.js', content: 'function login() {}', vector: [] }];
  const store = load('src/services/vectorStore.service.js', {
    fs: { promises: { stat: async () => ({ mtimeMs: version }), readFile: async () => JSON.stringify(disk) } },
    './embedding.service': {
      EMBEDDING_DIMENSION: 2, cosineSimilarity: () => 0,
      embedQuery: () => assert.fail('no vector provider call needed for keyword-only index'),
    },
  });
  assert.equal((await store.search('project', 'login'))[0].filePath, 'auth.js');
  disk = [{ filePath: 'payments.js', content: 'function payment() {}', vector: [] }];
  version++;
  assert.equal((await store.search('project', 'payment'))[0].filePath, 'payments.js');
});

test('ZIP and repository ingestion return source files without waiting for embedding', async () => {
  const calls = [];
  const pipeline = load('src/services/pipeline.service.js', {
    fs: { promises: { mkdir: async () => {} } },
    './file.service': { extractZip: async () => { calls.push('zip'); return { textFileCount: 1 }; }, readAllTextFiles: async () => [{ filePath: 'app.js', content: 'code', loc: 1 }] },
    './git.service': { cloneRepo: async () => calls.push('url'), cloneFromGitHub: async () => calls.push('github') },
    './chunking.service': { chunkAllFiles: () => assert.fail('ingestion must not wait for indexing') },
    './embedding.service': {}, './promptBuilder.service': {}, './ai.service': {},
    './chromaStore.service': {}, './vectorStore.service': {}, './progress.service': { sendProgress() {} },
  });
  for (const uploadMethod of ['zip', 'url', 'github']) {
    const result = await pipeline.runIngestionPipeline({
      userId: 'user', projectId: 'project', uploadMethod, zipBuffer: Buffer.from('zip'),
      repoUrl: 'https://example.test/repo', githubOwner: 'owner', githubRepo: 'repo',
    });
    assert.equal(result.textFiles.length, 1);
  }
  assert.deepEqual(calls, ['zip', 'url', 'github']);
});

test('indexing publishes source chunks before a failing embedding provider', async () => {
  let indexed;
  const chunks = [{ filePath: 'auth.js', content: 'function login() {}', startLine: 0, endLine: 1 }];
  const pipeline = load('src/services/pipeline.service.js', {
    './file.service': {}, './git.service': {},
    './chunking.service': { chunkAllFiles: async () => chunks },
    './embedding.service': { embedBatch: async () => {
      assert.ok(indexed, 'lexical index must already be available');
      throw new Error('API unavailable');
    } },
    './chromaStore.service': {},
    './vectorStore.service': { indexPipelineOutput: async (_, store) => { indexed = store; } },
    './progress.service': { sendProgress() {} },
  });
  const result = await pipeline.runIndexingPipeline({ projectId: 'project', textFiles: [] });
  assert.equal(indexed[0].content, chunks[0].content);
  assert.match(result.warning, /keyword search/);
});

test('initial forced request failure populates the visible error state', async () => {
  const filename = path.resolve(__dirname, '../../client/src/hooks/useAnalysis.js');
  const source = fs.readFileSync(filename, 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function useAnalysis', 'function useAnalysis');
  const state = [];
  const cleanups = [];
  vm.runInNewContext(source + '\nuseAnalysis("project", true);', {
    useState(initial) { const i = state.length; state.push(initial); return [initial, value => { state[i] = value; }]; },
    useCallback: fn => fn, useEffect: fn => { cleanups.push(fn()); },
    AbortController, setTimeout, clearTimeout,
    api: { get: async () => { throw new Error('timeout'); } },
  });
  await tick();
  assert.equal(state[0], null);
  assert.equal(state[1], false);
  assert.match(state[2], /Retry to reconnect/);
  cleanups.forEach(fn => fn?.());
});

test('frontend polls without force and stops once the job completes', async () => {
  const filename = path.resolve(__dirname, '../../client/src/hooks/useAnalysis.js');
  const source = fs.readFileSync(filename, 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function useAnalysis', 'function useAnalysis');
  const state = [];
  const cleanups = [];
  const timers = [];
  const calls = [];
  vm.runInNewContext(source + '\nuseAnalysis("project", true);', {
    useState(initial) { const i = state.length; state.push(initial); return [initial, value => { state[i] = value; }]; },
    useCallback: fn => fn, useEffect: fn => { cleanups.push(fn()); },
    AbortController, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    api: { get: async (_, options) => {
      calls.push(options);
      return { data: { data: { processing: calls.length === 1 } } };
    } },
  });
  await tick();
  assert.equal(state[0].processing, true);
  assert.equal(calls[0].params.force, true);
  await timers[0]();
  assert.equal(calls[1].params.force, undefined);
  assert.equal(state[0].processing, false);
  assert.equal(timers.length, 1, 'completed jobs must not schedule another poll');
  cleanups.forEach(fn => fn?.());
});
