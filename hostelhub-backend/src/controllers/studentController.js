const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Student = require('../models/Student');
const User = require('../models/User');
const Bed = require('../models/Bed');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../config/cloudinary');

exports.createStudent = async (req, res, next) => {
  const session = await Student.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const { name, email, phone, roomId, bedId, ...profileFields } = req.body;
      const user = await User.create([{ name, email, phone, role: 'student', status: 'active', hostel: req.user.hostel || req.body.hostelId }], { session });

      const qrImage = await QRCode.toDataURL(uuidv4());
      let qrUrl = qrImage;
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          qrUrl = (await cloudinary.uploader.upload(qrImage, { folder: 'hostelhub/student-qr' })).secure_url;
        }
      } catch {}

      const student = await Student.create([{ user: user[0]._id, hostel: req.user.hostel || req.body.hostelId, room: roomId || null, bed: bedId || null, qrCode: qrUrl, ...profileFields }], { session });

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

exports.listStudents = asyncHandler(async (req, res) => {
  const hostelId = req.user.hostel || req.query.hostelId;
  if (!hostelId) throw ApiError.badRequest('hostelId is required');

  const { page = 1, limit = 20 } = req.query;
  const filter = { hostel: hostelId, isActive: true };

  const query = Student.find(filter)
    .populate('user', 'name email phone profilePicture')
    .populate('room', 'roomNumber floor')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  if (req.user.role === 'accountant') query.select('-medicalConditions -aadhaarLast4 -address');

  const [students, total] = await Promise.all([query.exec(), Student.countDocuments(filter)]);
  res.json({ success: true, students, pagination: { page: Number(page), limit: Number(limit), total } });
});

exports.getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('user', 'name email phone profilePicture status')
    .populate('room', 'roomNumber floor rent')
    .populate('bed', 'bedNumber');

  if (!student) throw ApiError.notFound('Student not found');
  if (req.user.role === 'student' && student.user._id.toString() !== req.user._id.toString()) throw ApiError.forbidden();

  res.json({ success: true, student });
});

exports.updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const wardenAllowed = ['room', 'bed', 'emergencyContact', 'medicalConditions'];
  const updates = req.user.role === 'warden'
    ? Object.fromEntries(Object.entries(req.body).filter(([key]) => wardenAllowed.includes(key)))
    : req.body;

  Object.assign(student, updates);
  await student.save();
  res.json({ success: true, student });
});

exports.deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  student.isActive = false;
  await student.save();

  if (student.bed) {
    await Bed.findByIdAndUpdate(student.bed, { status: 'vacant', student: null, assignedAt: null });
  }

  res.json({ success: true, message: 'Student deactivated' });
});
