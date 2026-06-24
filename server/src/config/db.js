const mongoose = require('mongoose');
const dns = require('dns');
const { env } = require('./env');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// Override DNS servers to bypass network-level DNS blocking (common on
// college/corporate networks that block mongodb.net SRV lookups).
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Build mongoose connection options based on the URI format.
 * Atlas URIs need larger timeouts and special handling for direct connections.
 */
function buildOptions(uri) {
  const opts = {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
  };

  // When using mongodb:// (non-SRV) with Atlas, the hostname resolves to a
  // cluster shard. directConnection: true tells the driver to connect to that
  // single host instead of attempting replica set discovery.
  if (uri.startsWith('mongodb://') && !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
    opts.directConnection = true;
  }

  return opts;
}

const connectWithRetry = async (retries = MAX_RETRIES) => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, buildOptions(env.MONGO_URI));
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}): ${error.message}`);
    if (retries <= 1) {
      console.error('All MongoDB connection retries exhausted. Server will start without database.');
      return null;
    }
    console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(retries - 1);
  }
};

const connectDB = async () => {
  const conn = await connectWithRetry();

  if (!conn) return false;

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — attempting reconnect...');
    setTimeout(() => connectWithRetry(), RETRY_DELAY_MS);
  });

  return true;
};

module.exports = connectDB;
