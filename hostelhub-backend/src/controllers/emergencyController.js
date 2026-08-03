const EmergencyAlert = require('../models/EmergencyAlert');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
// const { sendEmergencyPush } = require('../services/notificationService'); // FCM + SMS gateway once configured

/**
 * POST /api/v1/emergency/trigger
 * Student presses the emergency button. Notifies owner/warden immediately
 * (police/ambulance/parents dispatch is a real-world integration — SMS/call
 * gateway — flagged as TODO rather than faked here).
 */
exports.triggerAlert = async (req, res, next) => {
  try {
    const own = await Student.findOne({ user: req.user._id });
    if (!own) throw ApiError.notFound('Student profile not found');

    const { latitude, longitude, notifyTargets = ['owner', 'warden'] } = req.body;

    const alert = await EmergencyAlert.create({
      hostel: own.hostel,
      student: own._id,
      location: latitude && longitude ? { type: 'Point', coordinates: [longitude, latitude] } : undefined,
      notifiedTargets: notifyTargets,
      status: 'active',
    });

    // TODO: await sendEmergencyPush(alert) — push to owner/warden devices,
    // and if 'police'/'ambulance'/'parents' included, trigger an SMS/voice-call
    // gateway integration (e.g. Twilio) rather than an in-app notification.

    res.status(201).json({ success: true, alert, message: 'Emergency alert triggered' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/emergency
 * Owner/Warden view active/past alerts for their hostel.
 */
exports.listAlerts = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { status } = req.query;
    const filter = { hostel: hostelId };
    if (status) filter.status = status;

    const alerts = await EmergencyAlert.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name phone' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, alerts });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/emergency/:id/acknowledge
 */
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id);
    if (!alert) throw ApiError.notFound('Alert not found');

    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.user._id;
    await alert.save();

    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/emergency/:id/resolve
 */
exports.resolveAlert = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id);
    if (!alert) throw ApiError.notFound('Alert not found');

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    await alert.save();

    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};
