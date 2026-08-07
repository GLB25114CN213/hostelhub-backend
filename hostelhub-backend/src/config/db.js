const mongoose = require('mongoose');
const logger = require('../utils/logger');

const formatMongoUri = (uri) =>
  uri?.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/i, (_, srv = '', user, pass) =>
    `mongodb${srv}://${user}:${pass.includes('@') && !pass.includes('%40') ? pass.split('@').join('%40') : pass}@`
  );

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  const uri = formatMongoUri(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelhub');

  try {
    const conn = await mongoose.connect(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 5000 });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    mongoose.connection.on('error', (err) => logger.error(`MongoDB connection error: ${err.message}`));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected. Attempting reconnect...'));
    return conn;
  } catch (err) {
    logger.warn(`Initial connection to ${uri} failed (${err.message}).`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memoryUri = (await MongoMemoryServer.create()).getUri();
      const conn = await mongoose.connect(memoryUri, { maxPoolSize: 20 });
      logger.info(`MongoDB In-Memory Server connected: ${memoryUri}`);
      return conn;
    } catch {
      logger.error(`MongoDB connection failed: ${err.message}. Please check your MONGO_URI in Environment Variables.`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
