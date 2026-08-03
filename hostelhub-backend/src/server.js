require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const registerJobs = require('./jobs');
const logger = require('./utils/logger');

const { seedData } = require('./utils/seed');

const PORT = process.env.PORT || 5000;

let server;

(async () => {
  await connectDB();
  await seedData();
  registerJobs();
  server = app.listen(PORT, () => {
    logger.info(`HostelHub AI API listening on port ${PORT} [${process.env.NODE_ENV}]`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use by another running node process. Please close other terminal windows running the server.`);
      process.exit(1);
    }
  });
})();

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
  process.exit(1);
});
