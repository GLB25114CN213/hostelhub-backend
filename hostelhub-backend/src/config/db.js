const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoMemoryServer = null;

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelhub';

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 3000,
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
    logger.warn(`Initial connection to ${uri} failed (${err.message}). Attempting in-memory MongoDB fallback...`);
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
      logger.error(`MongoDB memory server connection failed: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
