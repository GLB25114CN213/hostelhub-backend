const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/v1/complaints
 * Student raises a complaint.
 */
exports.createComplaint = async (req, res, next) => {
  try {
    const own = await Student.findOne({ user: req.user._id });
    if (!own) throw ApiError.notFound('Student profile not found');

    const { category, title, description, images, priority } = req.body;
    const complaint = await Complaint.create({
      hostel: own.hostel,
      student: own._id,
      category,
      title,
      description,
      images,
      priority,
    });

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/complaints
 * Owner/Warden: all for hostel, filterable by status/category/priority.
 * Student: only their own.
 */
exports.listComplaints = async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
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
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name phone' } })
      .populate('assignedTo', 'name role')
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/complaints/:id/assign
 * Owner/Warden assigns the complaint to a staff member and moves status forward.
 */
exports.assignComplaint = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    complaint.assignedTo = assignedTo;
    complaint.status = 'assigned';
    await complaint.save();

    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/complaints/:id/status
 * Owner/Warden updates status (in_progress, resolved, closed).
 */
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) throw ApiError.badRequest('Invalid status');

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    complaint.status = status;
    if (status === 'resolved') complaint.resolvedAt = new Date();
    await complaint.save();

    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/complaints/:id/comments
 * Any involved party (student who filed it, or owner/warden/assignee) can comment.
 */
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) throw ApiError.badRequest('Comment text is required');

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    if (req.user.role === 'student') {
      const own = await Student.findOne({ user: req.user._id });
      if (!own || complaint.student.toString() !== own._id.toString()) {
        throw ApiError.forbidden('You can only comment on your own complaints');
      }
    }

    complaint.comments.push({ author: req.user._id, text });
    await complaint.save();

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};
