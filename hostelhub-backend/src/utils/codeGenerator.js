const { v4: uuidv4 } = require('uuid');

/** Short, human-shareable code e.g. for visitor passes: VP-7F3A9C */
const generateShortCode = (prefix) =>
  `${prefix}-${uuidv4().split('-')[0].toUpperCase()}`;

/** Sequential-looking invoice number scoped by year/month: INV-202608-XXXXX */
const generateInvoiceNumber = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${ym}-${uuidv4().split('-')[0].toUpperCase()}`;
};

module.exports = { generateShortCode, generateInvoiceNumber };
