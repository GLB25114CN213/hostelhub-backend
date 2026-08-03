const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoMemoryServer = null;

function formatMongoUri(rawUri) {
  if (!rawUri) return rawUri;
  return rawUri.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/i, (match, srv, user, pass) => {
    if (pass.includes('@') && !pass.includes('%40')) {
      const parts = pass.split('@');
      const realPass = parts[0] + '%40' + parts.slice(1).join('@');
      return `mongodb${srv || ''}://${user}:${realPass}@`;
    }
    return match;
  });
}

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  let rawUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelhub';
  let uri = formatMongoUri(rawUri);

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (err) {
    logger.warn(`Initial connection to ${uri} failed (${err.message}).`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(memoryUri, {
        maxPoolSize: 20,
      });
      logger.info(`MongoDB In-Memory Server connected: ${memoryUri}`);
      return conn;
    } catch (memErr) {
      logger.error(`MongoDB connection failed: ${err.message}. Please check your MONGO_URI in Environment Variables.`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
