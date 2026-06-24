const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000;

const cleanupOldUploads = async () => {
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(UPLOADS_DIR, entry.name);
      try {
        const stat = await fs.stat(dirPath);
        if (now - stat.mtimeMs > CLEANUP_AGE_MS) {
          await fs.rm(dirPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
};

const startCleanupJob = () => {
  cron.schedule('0 3 * * *', async () => {
    await cleanupOldUploads();
  });
};

module.exports = { startCleanupJob, cleanupOldUploads };
