const Notice = require('../models/Notice');
const ApiError = require('../utils/ApiError');
// const { sendPushToHostel } = require('../services/notificationService'); // wired once FCM is set up

/**
 * POST /api/v1/notices
 * Owner/Warden publishes a notice. In production this triggers an FCM push
 * to every student device token in the hostel — stubbed here as a TODO since
 * it depends on the Firebase Admin credentials being configured.
 */
exports.createNotice = async (req, res, next) => {
  try {
    const hostelId = req.body.hostelId || req.user.hostel;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { title, body, attachments, isPinned, expiresAt } = req.body;
    const notice = await Notice.create({
      hostel: hostelId,
      title,
      body,
      attachments,
      isPinned,
      expiresAt,
      postedBy: req.user._id,
    });

    // TODO: await sendPushToHostel(hostelId, { title, body: notice.body });

    res.status(201).json({ success: true, notice });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/notices
 * Any authenticated user in the hostel. Excludes expired notices by default.
 */
exports.listNotices = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { includeExpired } = req.query;
    const filter = { hostel: hostelId };
    if (includeExpired !== 'true') {
      filter.$or = [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }];
    }

    const notices = await Notice.find(filter).sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, notices });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/notices/:id
 * Owner/Warden.
 */
exports.deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) throw ApiError.notFound('Notice not found');
    res.json({ success: true, message: 'Notice removed' });
  } catch (err) {
    next(err);
  }
};
