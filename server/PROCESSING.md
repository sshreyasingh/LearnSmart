# Project processing

Uploads now return HTTP 202 with `data.project._id` after the request body is
received and the project record is created. Cloning, extraction, analysis, and
indexing continue in the server process. The upload page opens the analysis page
immediately; it polls `GET /api/analysis/:id` every five seconds while
`data.processing` is true.

The source report is saved before AI explanations, difficulty prediction, or
semantic indexing finish. These optional services may produce warnings without
discarding the report. Learning resources use the curated catalog; web scraping
is opt-in through `generateLearningResources(..., { scrape: true })`.

- Source parsing runs in a worker thread with a two-minute timeout and a 256 MB
  old-generation heap limit.
- AI calls time out after 45 seconds with no SDK retries. JSON generation permits
  at most two attempts.
- Embedding requests time out after 15 seconds. Each batch has a 90-second budget
  and stops scheduling work after an exhausted/permanent provider failure.
- Source chunks are indexed before embeddings. Keyword retrieval remains
  available if the embedding provider is unavailable. Chat answers still require
  a working AI provider.
- Diagram and dashboard endpoints read saved results instead of re-running
  analysis. Re-analyze explicitly starts a new run and retries missing indexing.

MongoDB stores job progress, warnings, and an atomic per-project claim. Workers
renew a two-minute lease every 15 seconds. An expired lease becomes an explicit
failure when status is read, with retry/re-upload guidance. Jobs are not a durable
queue: a server restart interrupts running work; completed reports remain saved.
Uploaded source and vector indexes use local storage. Cluster workers must share
that storage, and deployments need a persistent disk to retain source files.

`OPENROUTER_API_KEY` and the configured chat/embedding model IDs must be usable
for AI features. The service at `ML_SERVICE_URL` supplies difficulty prediction.
Failures are shown as partial-result warnings rather than an endless spinner.

Run regression tests with `npm.cmd test` in `server` on Windows (`npm test` on
other platforms), and build the frontend with `npm.cmd run build` in `client`.
Tests use isolated mocks for external providers/MongoDB and include real source
parsing in a worker thread; they do not spend API credits.
