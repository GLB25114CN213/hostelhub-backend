const Inventory = require('../models/Inventory');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/v1/inventory
 * Owner/Warden adds an inventory item.
 */
exports.createItem = async (req, res, next) => {
  try {
    const hostelId = req.body.hostelId || req.user.hostel;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const item = await Inventory.create({ ...req.body, hostel: hostelId });
    res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/inventory
 * Filterable by itemType, condition, room.
 */
exports.listItems = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { itemType, condition, roomId } = req.query;
    const filter = { hostel: hostelId };
    if (itemType) filter.itemType = itemType;
    if (condition) filter.condition = condition;
    if (roomId) filter.room = roomId;

    const items = await Inventory.find(filter).populate('room', 'roomNumber').sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/inventory/:id
 * Owner/Warden updates condition, quantity, maintenance dates.
 */
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) throw ApiError.notFound('Inventory item not found');

    const editable = ['quantity', 'condition', 'lastMaintenanceDate', 'nextMaintenanceDue', 'notes'];
    Object.entries(req.body).forEach(([key, value]) => {
      if (editable.includes(key)) item[key] = value;
    });

    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/inventory/:id
 * Owner only.
 */
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) throw ApiError.notFound('Inventory item not found');
    res.json({ success: true, message: 'Item removed' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/inventory/maintenance-due
 * Items whose nextMaintenanceDue has passed or is within the next 7 days.
 */
exports.maintenanceDue = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    const items = await Inventory.find({
      hostel: hostelId,
      nextMaintenanceDue: { $lte: sevenDaysOut, $ne: null },
    }).populate('room', 'roomNumber');

    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};
