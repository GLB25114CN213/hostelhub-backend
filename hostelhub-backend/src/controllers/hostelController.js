const Hostel = require('../models/Hostel');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/v1/hostels
 * Owner only. Creates a hostel and adds it to the owner's ownedHostels list.
 */
exports.createHostel = async (req, res, next) => {
  try {
    const { name, address, contactNumber, latitude, longitude, images, amenities, rules, genderPolicy } =
      req.body;

    const hostel = await Hostel.create({
      name,
      owner: req.user._id,
      address,
      contactNumber,
      location: latitude && longitude ? { type: 'Point', coordinates: [longitude, latitude] } : undefined,
      images,
      amenities,
      rules,
      genderPolicy,
    });

    req.user.ownedHostels.push(hostel._id);
    await req.user.save();

    res.status(201).json({ success: true, hostel });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/hostels
 * Owner: their own hostels. Warden/Accountant/Student: only their assigned hostel.
 */
exports.listHostels = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'owner') {
      filter = { owner: req.user._id };
    } else if (req.user.hostel) {
      filter = { _id: req.user.hostel };
    } else {
      return res.json({ success: true, hostels: [] });
    }

    const hostels = await Hostel.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, hostels });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/hostels/:id
 */
exports.getHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) throw ApiError.notFound('Hostel not found');
    res.json({ success: true, hostel });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/hostels/:id
 * Owner only, and only for hostels they own (checked via ownership, not just role).
 */
exports.updateHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) throw ApiError.notFound('Hostel not found');
    if (hostel.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not own this hostel');
    }

    const editable = ['name', 'address', 'contactNumber', 'images', 'amenities', 'rules', 'genderPolicy', 'isActive'];
    Object.entries(req.body).forEach(([key, value]) => {
      if (editable.includes(key)) hostel[key] = value;
    });

    if (req.body.latitude && req.body.longitude) {
      hostel.location = { type: 'Point', coordinates: [req.body.longitude, req.body.latitude] };
    }

    await hostel.save();
    res.json({ success: true, hostel });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/hostels/:id
 * Owner only. Soft-delete (deactivate) rather than hard delete to preserve history
 * for students/fees/attendance already tied to this hostel.
 */
exports.deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) throw ApiError.notFound('Hostel not found');
    if (hostel.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not own this hostel');
    }
    hostel.isActive = false;
    await hostel.save();
    res.json({ success: true, message: 'Hostel deactivated' });
  } catch (err) {
    next(err);
  }
};
