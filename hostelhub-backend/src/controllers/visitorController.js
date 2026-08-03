const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { generateShortCode } = require('../utils/codeGenerator');

/**
 * POST /api/v1/visitors/check-in
 * Warden logs a visitor and generates a pass code.
 */
exports.checkIn = async (req, res, next) => {
  try {
    const { studentId, visitorName, relation, phone, idProof, photo, purpose } = req.body;

    const student = await Student.findById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    const visitor = await Visitor.create({
      hostel: student.hostel,
      student: student._id,
      visitorName,
      relation,
      phone,
      idProof,
      photo,
      purpose,
      passCode: generateShortCode('VP'),
      loggedBy: req.user._id,
    });

    res.status(201).json({ success: true, visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/visitors/:id/check-out
 */
exports.checkOut = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) throw ApiError.notFound('Visitor record not found');
    if (visitor.checkOutTime) throw ApiError.conflict('Visitor has already checked out');

    visitor.checkOutTime = new Date();
    await visitor.save();
    res.json({ success: true, visitor });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/visitors
 * Owner/Warden view, filterable by student or "currently inside" (no checkout time).
 */
exports.listVisitors = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { studentId, active } = req.query;
    const filter = { hostel: hostelId };
    if (studentId) filter.student = studentId;
    if (active === 'true') filter.checkOutTime = null;

    const visitors = await Visitor.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ checkInTime: -1 });

    res.json({ success: true, visitors });
  } catch (err) {
    next(err);
  }
};
