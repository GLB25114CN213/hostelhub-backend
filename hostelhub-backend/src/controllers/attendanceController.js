const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

const todayStr = () => new Date().toISOString().slice(0, 10);

// Attendance cutoff times used to flag late entries — adjust per hostel policy later
// (e.g. via Hostel.settings once that's added); hardcoded here as a sane default.
const LATE_ENTRY_CUTOFF_HOUR = 21; // 9 PM

/**
 * POST /api/v1/attendance/mark
 * Manual marking by Warden/Owner.
 */
exports.markAttendance = async (req, res, next) => {
  try {
    const { studentId, status = 'present', remarks } = req.body;

    const student = await Student.findById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    const now = new Date();
    const record = await Attendance.findOneAndUpdate(
      { student: studentId, date: todayStr() },
      {
        hostel: student.hostel,
        student: studentId,
        date: todayStr(),
        time: now,
        status,
        method: 'manual',
        markedBy: req.user._id,
        remarks,
        isLateEntry: now.getHours() >= LATE_ENTRY_CUTOFF_HOUR,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, attendance: record });
  } catch (err) {
    // Duplicate key on the (student, date) unique index means it was already marked today.
    if (err.code === 11000) return next(ApiError.conflict('Attendance already marked for this student today'));
    next(err);
  }
};

/**
 * POST /api/v1/attendance/qr-scan
 * Warden scans a student's QR code. The QR payload is an opaque UUID stored on
 * Student.qrCode at creation time — resolving it here prevents forged/duplicate scans
 * since it must match a real student record, and the (student, date) unique index
 * prevents a second scan from creating a duplicate record.
 */
exports.qrScanAttendance = async (req, res, next) => {
  try {
    const { qrPayload, latitude, longitude } = req.body;
    if (!qrPayload) throw ApiError.badRequest('qrPayload is required');

    const student = await Student.findOne({ qrCode: { $regex: qrPayload, $options: 'i' } });
    if (!student) throw ApiError.notFound('QR code does not match any student — possible forged code');

    const now = new Date();
    const existing = await Attendance.findOne({ student: student._id, date: todayStr() });
    if (existing) throw ApiError.conflict('Attendance already marked for this student today');

    const attendanceData = {
      hostel: student.hostel,
      student: student._id,
      date: todayStr(),
      time: now,
      status: 'present',
      method: 'qr',
      markedBy: req.user._id,
      isLateEntry: now.getHours() >= LATE_ENTRY_CUTOFF_HOUR,
    };

    if (latitude && longitude) {
      attendanceData.location = { type: 'Point', coordinates: [longitude, latitude] };
    }

    const record = await Attendance.create(attendanceData);
    res.status(201).json({ success: true, attendance: record });
  } catch (err) {
    if (err.code === 11000) return next(ApiError.conflict('Attendance already marked for this student today'));
    next(err);
  }
};

/**
 * GET /api/v1/attendance
 * Query by date (defaults to today) and/or student. Owner/Warden/Accountant view;
 * students can only see their own.
 */
exports.listAttendance = async (req, res, next) => {
  try {
    const { date = todayStr(), studentId } = req.query;
    const hostelId = req.user.hostel || req.query.hostelId;

    const filter = { date };
    if (req.user.role === 'student') {
      const own = await Student.findOne({ user: req.user._id });
      if (!own) throw ApiError.notFound('Student profile not found');
      filter.student = own._id;
    } else {
      if (!hostelId) throw ApiError.badRequest('hostelId is required');
      filter.hostel = hostelId;
      if (studentId) filter.student = studentId;
    }

    const records = await Attendance.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
      .sort({ time: -1 });

    res.json({ success: true, attendance: records });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/attendance/report
 * Aggregate attendance percentage per student over a date range.
 * query: hostelId, from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
exports.attendanceReport = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    const { from, to } = req.query;
    if (!hostelId || !from || !to) throw ApiError.badRequest('hostelId, from, and to are required');

    const report = await Attendance.aggregate([
      { $match: { hostel: new (require('mongoose').Types.ObjectId)(hostelId), date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$student',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          lateDays: { $sum: { $cond: ['$isLateEntry', 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'users',
          localField: 'student.user',
          foreignField: '_id',
          as: 'studentUser',
        },
      },
      { $unwind: '$studentUser' },
      {
        $project: {
          studentId: '$_id',
          name: '$studentUser.name',
          totalDays: 1,
          presentDays: 1,
          lateDays: 1,
          attendancePercentage: {
            $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 1],
          },
        },
      },
      { $sort: { attendancePercentage: 1 } }, // lowest first — surfaces at-risk students
    ]);

    res.json({ success: true, from, to, report });
  } catch (err) {
    next(err);
  }
};
