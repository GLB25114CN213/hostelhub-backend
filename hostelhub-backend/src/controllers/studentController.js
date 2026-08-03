const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Student = require('../models/Student');
const User = require('../models/User');
const Bed = require('../models/Bed');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');

/**
 * POST /api/v1/students
 * Owner or Warden creates a student profile + linked User account.
 */
exports.createStudent = async (req, res, next) => {
  const session = await Student.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const { name, email, phone, roomId, bedId, ...profileFields } = req.body;

      const user = await User.create(
        [
          {
            name,
            email,
            phone,
            role: 'student',
            status: 'active',
            hostel: req.user.hostel || req.body.hostelId,
          },
        ],
        { session }
      );

      const qrPayload = uuidv4();
      const qrImage = await QRCode.toDataURL(qrPayload);
      const qrUpload = await cloudinary.uploader.upload(qrImage, {
        folder: 'hostelhub/student-qr',
      });

      const student = await Student.create(
        [
          {
            user: user[0]._id,
            hostel: req.user.hostel || req.body.hostelId,
            room: roomId || null,
            bed: bedId || null,
            qrCode: qrUpload.secure_url,
            ...profileFields,
          },
        ],
        { session }
      );

      if (bedId) {
        const bed = await Bed.findById(bedId).session(session);
        if (!bed) throw ApiError.notFound('Bed not found');
        if (bed.status === 'occupied') throw ApiError.conflict('Bed is already occupied');
        bed.status = 'occupied';
        bed.student = student[0]._id;
        bed.assignedAt = new Date();
        await bed.save({ session });
      }

      result = student[0];
    });

    res.status(201).json({ success: true, student: result });
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/v1/students
 * Owner/Warden/Accountant see students in their hostel; scope enforced by middleware
 * upstream. Medical conditions and Aadhaar are stripped for accountant role.
 */
exports.listStudents = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { page = 1, limit = 20, search } = req.query;
    const filter = { hostel: hostelId, isActive: true };

    const query = Student.find(filter)
      .populate('user', 'name email phone profilePicture')
      .populate('room', 'roomNumber floor')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    if (req.user.role === 'accountant') {
      query.select('-medicalConditions -aadhaarLast4 -address');
    }

    const [students, total] = await Promise.all([
      query.exec(),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      students,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/students/:id
 */
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email phone profilePicture status')
      .populate('room', 'roomNumber floor rent')
      .populate('bed', 'bedNumber');

    if (!student) throw ApiError.notFound('Student not found');

    // Students may only fetch their own profile.
    if (req.user.role === 'student' && student.user._id.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden();
    }

    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/students/:id
 * Owner: full edit. Warden: limited fields only. Accountant/Student: no direct edit.
 */
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) throw ApiError.notFound('Student not found');

    const wardenAllowedFields = ['room', 'bed', 'emergencyContact', 'medicalConditions'];
    let updates = req.body;

    if (req.user.role === 'warden') {
      updates = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => wardenAllowedFields.includes(key))
      );
    }

    Object.assign(student, updates);
    await student.save();

    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/students/:id
 * Owner only (spec: wardens cannot delete students — enforced at route level too).
 */
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) throw ApiError.notFound('Student not found');

    student.isActive = false;
    await student.save();

    if (student.bed) {
      await Bed.findByIdAndUpdate(student.bed, {
        status: 'vacant',
        student: null,
        assignedAt: null,
      });
    }

    res.json({ success: true, message: 'Student deactivated' });
  } catch (err) {
    next(err);
  }
};
