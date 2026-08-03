const cron = require('node-cron');
const { markOverdueInvoices } = require('../controllers/feeController');
const logger = require('../utils/logger');

/**
 * Registers all scheduled background jobs. Call once from server.js after DB connects.
 */
function registerJobs() {
  // Every day at 06:00 IST-ish server time — mark invoices past due date as 'overdue'.
  // In production pin the timezone explicitly (node-cron supports a timezone option)
  // rather than relying on the host machine's clock.
  cron.schedule('0 6 * * *', async () => {
    try {
      await markOverdueInvoices();
      logger.info('Cron: overdue invoices updated');
    } catch (err) {
      logger.error(`Cron: failed to mark overdue invoices — ${err.message}`);
    }
  });
}

module.exports = registerJobs;
