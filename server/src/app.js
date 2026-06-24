require('dotenv').config();
const mongoose = require('mongoose');

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack);
  // Give logger time to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const { env } = require('./config/env');

const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const chromaStore = require('./services/chromaStore.service');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const fileExplanationRoutes = require('./routes/fileExplanation.routes');
const analysisRoutes = require('./routes/analysis.routes');
const progressRoutes = require('./routes/progress.routes');
const chatRoutes = require('./routes/chat.routes');
const interviewRoutes = require('./routes/interview.routes');
const staticAnalysisRoutes = require('./routes/staticAnalysis.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/api/auth', authRoutes);
// Auth routes have their own authLimiter — general limiter starts after them
app.use('/api/projects', generalLimiter, projectRoutes);
app.use('/api/explanations', generalLimiter, fileExplanationRoutes);
app.use('/api/analysis', generalLimiter, analysisRoutes);
app.use('/api/progress', generalLimiter, progressRoutes);
app.use('/api/chat', generalLimiter, chatRoutes);
app.use('/api/interview', generalLimiter, interviewRoutes);
app.use('/api/static-analysis', generalLimiter, staticAnalysisRoutes);

app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const healthy = dbState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database: dbStates[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use(errorHandler);

const start = async () => {
  const dbConnected = await connectDB();

  // Initialize ChromaDB (non-blocking — falls back to JSON store if unavailable)
  const chromaReady = await chromaStore.heartbeat();
  if (chromaReady) {
    console.log('ChromaDB connected');
  } else {
    console.warn('ChromaDB not available — using JSON vector store fallback');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`LearnSmart server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  server.timeout = 300000;
  server.headersTimeout = 301000;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use. Kill the existing process and try again.`);
    }
    process.exit(1);
  });

  // Close the server if DB is not available — no point running without it
  if (!dbConnected) {
    console.error('Server started without database connection. Shutting down.');
    server.close(() => process.exit(1));
  }
};

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\nMongoDB disconnected. Server shutting down.');
  process.exit(0);
});

start();

module.exports = app;
