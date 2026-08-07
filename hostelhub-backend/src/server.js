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

  server = app
    .listen(PORT, () => logger.info(`HostelHub AI API listening on port ${PORT} [${process.env.NODE_ENV}]`))
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use by another running node process.`);
        process.exit(1);
      }
    });
})();

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server ? server.close(() => process.exit(0)) : process.exit(0);
};

['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
  process.exit(1);
});
