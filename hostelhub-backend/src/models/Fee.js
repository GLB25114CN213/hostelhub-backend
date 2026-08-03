const mongoose = require('mongoose');

const feeItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Monthly Rent", "Electricity", "Mess Fees"
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const feeSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    billingPeriod: { type: String, required: true }, // e.g. "2026-08"
    items: [feeItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending',
    },
    payments: [
      {
        amount: Number,
        method: { type: String, enum: ['upi', 'card', 'netbanking', 'cash'] },
        transactionRef: String,
        collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        paidAt: { type: Date, default: Date.now },
      },
    ],
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true }
);

feeSchema.index({ hostel: 1, status: 1 });
feeSchema.index({ student: 1, billingPeriod: 1 }, { unique: true });

module.exports = mongoose.model('Fee', feeSchema);
