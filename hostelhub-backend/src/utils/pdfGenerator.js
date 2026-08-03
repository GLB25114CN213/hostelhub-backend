const PDFDocument = require('pdfkit');
const cloudinary = require('../config/cloudinary');

/**
 * Builds a simple fee receipt PDF in memory and uploads it to Cloudinary,
 * returning the hosted URL. Kept intentionally simple — swap in a branded
 * template later without changing the calling code's contract.
 */
async function generateReceiptPdf(fee, studentName, hostelName) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const upload = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${buffer.toString('base64')}`,
          { folder: 'hostelhub/receipts', resource_type: 'raw', format: 'pdf' }
        );
        resolve(upload.secure_url);
      } catch (err) {
        reject(err);
      }
    });

    doc.fontSize(20).text('HostelHub AI — Fee Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Hostel: ${hostelName}`);
    doc.text(`Student: ${studentName}`);
    doc.text(`Invoice Number: ${fee.invoiceNumber}`);
    doc.text(`Billing Period: ${fee.billingPeriod}`);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown();

    doc.fontSize(13).text('Charges', { underline: true });
    fee.items.forEach((item) => {
      doc.fontSize(11).text(`${item.label}: Rs. ${item.amount}`);
    });
    doc.moveDown();
    doc.fontSize(12).text(`Total Amount: Rs. ${fee.totalAmount}`);
    doc.text(`Amount Paid: Rs. ${fee.amountPaid}`);
    doc.text(`Status: ${fee.status.toUpperCase()}`);

    doc.end();
  });
}

module.exports = { generateReceiptPdf };
