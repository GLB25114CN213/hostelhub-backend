const Leave = require('../models/Leave');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/v1/leaves
 * Student submits a leave request.
 */
exports.createLeave = async (req, res, next) => {
  try {
    const own = await Student.findOne({ user: req.user._id });
    if (!own) throw ApiError.notFound('Student profile not found');

    const { reason, startDate, endDate, emergencyContact, supportingDocuments } = req.body;
    if (new Date(startDate) > new Date(endDate)) {
      throw ApiError.badRequest('startDate must be before endDate');
    }

    const leave = await Leave.create({
      hostel: own.hostel,
      student: own._id,
      reason,
      startDate,
      endDate,
      emergencyContact,
      supportingDocuments,
    });

    // TODO: fire FCM notification to warden/owner of this hostel — see notificationService.

    res.status(201).json({ success: true, leave });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/leaves
 * Owner/Warden: all requests for their hostel (filterable by status).
 * Student: only their own.
 */
exports.listLeaves = async (req, res, next) => {
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

    const leaves = await Leave.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name phone' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, leaves });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/leaves/:id/review
 * Warden approves/rejects. Owner can also review (per spec: "Owner Can Review").
 */
exports.reviewLeave = async (req, res, next) => {
  try {
    const { decision, remarks } = req.body; // decision: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      throw ApiError.badRequest('decision must be "approved" or "rejected"');
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) throw ApiError.notFound('Leave request not found');
    if (leave.status !== 'pending') throw ApiError.conflict('This leave request has already been reviewed');

    leave.status = decision;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = remarks;
    leave.ownerReviewed = req.user.role === 'owner';
    await leave.save();

    // TODO: fire FCM notification to the student.

    res.json({ success: true, leave });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/leaves/:id/cancel
 * Student cancels their own pending request.
 */
exports.cancelLeave = async (req, res, next) => {
  try {
    const own = await Student.findOne({ user: req.user._id });
    const leave = await Leave.findOne({ _id: req.params.id, student: own?._id });
    if (!leave) throw ApiError.notFound('Leave request not found');
    if (leave.status !== 'pending') throw ApiError.conflict('Only pending requests can be cancelled');

    leave.status = 'cancelled';
    await leave.save();
    res.json({ success: true, leave });
  } catch (err) {
    next(err);
  }
};
