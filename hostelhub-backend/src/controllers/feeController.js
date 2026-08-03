const Fee = require('../models/Fee');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { generateInvoiceNumber } = require('../utils/codeGenerator');
const { generateReceiptPdf } = require('../utils/pdfGenerator');

/**
 * POST /api/v1/fees
 * Owner/Accountant generates an invoice for a student for a billing period.
 */
exports.createInvoice = async (req, res, next) => {
  try {
    const { studentId, billingPeriod, items, dueDate } = req.body;

    const student = await Student.findById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const fee = await Fee.create({
      hostel: student.hostel,
      student: studentId,
      invoiceNumber: generateInvoiceNumber(),
      billingPeriod,
      items,
      totalAmount,
      dueDate,
      status: 'pending',
    });

    res.status(201).json({ success: true, fee });
  } catch (err) {
    if (err.code === 11000) return next(ApiError.conflict('An invoice for this student and billing period already exists'));
    next(err);
  }
};

/**
 * POST /api/v1/fees/:id/pay
 * Accountant/Owner records a payment (partial or full) and generates a receipt
 * once the invoice is fully paid.
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, method, transactionRef } = req.body;
    if (!amount || amount <= 0) throw ApiError.badRequest('A positive payment amount is required');

    const fee = await Fee.findById(req.params.id).populate({
      path: 'student',
      populate: [{ path: 'user', select: 'name' }, { path: 'hostel', select: 'name' }],
    });
    if (!fee) throw ApiError.notFound('Invoice not found');
    if (fee.status === 'paid') throw ApiError.conflict('This invoice is already fully paid');

    fee.payments.push({ amount, method, transactionRef, collectedBy: req.user._id });
    fee.amountPaid += amount;

    const outstanding = fee.totalAmount + fee.lateFee - fee.amountPaid;
    fee.status = outstanding <= 0 ? 'paid' : 'partial';

    if (fee.status === 'paid') {
      fee.receiptUrl = await generateReceiptPdf(
        fee,
        fee.student.user.name,
        fee.student.hostel?.name || 'HostelHub'
      );
    }

    await fee.save();
    res.json({ success: true, fee });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/fees
 * Owner/Accountant: all invoices for hostel, filterable by status.
 * Student: only their own.
 */
exports.listFees = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (req.user.role === 'student') {
      const own = await Student.findOne({ user: req.user._id });
      if (!own) throw ApiError.notFound('Student profile not found');
      filter.student = own._id;
    } else {
      const hostelId = req.user.hostel || req.query.hostelId;
      if (!hostelId) throw ApiError.badRequest('hostelId is required');
      filter.hostel = hostelId;
    }
    if (status) filter.status = status;

    const fees = await Fee.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ dueDate: -1 });

    res.json({ success: true, fees });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/fees/summary
 * Owner dashboard figures: total collected, pending, overdue for a hostel.
 */
exports.feeSummary = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const mongoose = require('mongoose');
    const summary = await Fee.aggregate([
      { $match: { hostel: new mongoose.Types.ObjectId(hostelId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
        },
      },
    ]);

    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark overdue invoices — intended to run on a daily cron (see src/jobs/feeReminders.js).
 */
exports.markOverdueInvoices = async () => {
  const today = new Date();
  await Fee.updateMany(
    { status: { $in: ['pending', 'partial'] }, dueDate: { $lt: today } },
    { $set: { status: 'overdue' } }
  );
};
