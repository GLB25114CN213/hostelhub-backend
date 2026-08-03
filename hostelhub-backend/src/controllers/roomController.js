const QRCode = require('qrcode');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Hostel = require('../models/Hostel');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');

/**
 * POST /api/v1/rooms
 * Owner only (spec doesn't grant wardens room-creation rights). Auto-generates the
 * room's beds based on capacity and a QR code for the room itself.
 */
exports.createRoom = async (req, res, next) => {
  try {
    const hostelId = req.body.hostelId || req.user.hostel;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { roomNumber, floor, capacity, roomType, attachedWashroom, rent, photos } = req.body;

    const room = await Room.create({
      hostel: hostelId,
      roomNumber,
      floor,
      capacity,
      roomType,
      attachedWashroom,
      rent,
      photos,
    });

    const qrImage = await QRCode.toDataURL(`room:${room._id}`);
    const qrUpload = await cloudinary.uploader.upload(qrImage, { folder: 'hostelhub/room-qr' });
    room.qrCode = qrUpload.secure_url;
    await room.save();

    const bedDocs = Array.from({ length: capacity }, (_, i) => ({
      hostel: hostelId,
      room: room._id,
      bedNumber: String.fromCharCode(65 + i), // A, B, C...
      status: 'vacant',
    }));
    await Bed.insertMany(bedDocs);

    await Hostel.findByIdAndUpdate(hostelId, {
      $inc: { 'stats.totalRooms': 1, 'stats.totalBeds': capacity },
    });

    res.status(201).json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/rooms
 */
exports.listRooms = async (req, res, next) => {
  try {
    const hostelId = req.user.hostel || req.query.hostelId;
    if (!hostelId) throw ApiError.badRequest('hostelId is required');

    const { status, floor } = req.query;
    const filter = { hostel: hostelId };
    if (status) filter.status = status;
    if (floor) filter.floor = Number(floor);

    const rooms = await Room.find(filter).sort({ floor: 1, roomNumber: 1 });

    // Attach live occupancy counts rather than trusting a stored counter.
    const roomIds = rooms.map((r) => r._id);
    const bedCounts = await Bed.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: { room: '$room', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const occupancyMap = {};
    bedCounts.forEach(({ _id, count }) => {
      const key = _id.room.toString();
      occupancyMap[key] = occupancyMap[key] || {};
      occupancyMap[key][_id.status] = count;
    });

    const roomsWithOccupancy = rooms.map((r) => ({
      ...r.toObject(),
      occupancy: occupancyMap[r._id.toString()] || {},
    }));

    res.json({ success: true, rooms: roomsWithOccupancy });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/rooms/:id
 */
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw ApiError.notFound('Room not found');
    const beds = await Bed.find({ room: room._id }).populate('student', 'user');
    res.json({ success: true, room, beds });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/rooms/:id
 * Owner only.
 */
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw ApiError.notFound('Room not found');

    const editable = ['roomType', 'attachedWashroom', 'rent', 'status', 'photos'];
    Object.entries(req.body).forEach(([key, value]) => {
      if (editable.includes(key)) room[key] = value;
    });

    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/rooms/:id
 * Owner only. Blocked if any bed in the room is currently occupied.
 */
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw ApiError.notFound('Room not found');

    const occupiedCount = await Bed.countDocuments({ room: room._id, status: 'occupied' });
    if (occupiedCount > 0) {
      throw ApiError.conflict('Cannot delete a room with occupied beds');
    }

    await Bed.deleteMany({ room: room._id });
    await Room.findByIdAndDelete(room._id);
    await Hostel.findByIdAndUpdate(room.hostel, {
      $inc: { 'stats.totalRooms': -1, 'stats.totalBeds': -room.capacity },
    });

    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/rooms/:roomId/beds/:bedId
 * Update a single bed's status (e.g. mark under maintenance). Owner/Warden.
 */
exports.updateBed = async (req, res, next) => {
  try {
    const bed = await Bed.findOne({ _id: req.params.bedId, room: req.params.roomId });
    if (!bed) throw ApiError.notFound('Bed not found');

    const { status } = req.body;
    if (status === 'occupied' && !bed.student) {
      throw ApiError.badRequest('Cannot mark a bed occupied without assigning a student — use the student assignment endpoint');
    }
    if (['vacant', 'maintenance'].includes(status)) {
      bed.status = status;
      if (status === 'vacant') {
        bed.student = null;
        bed.assignedAt = null;
      }
    }

    await bed.save();
    res.json({ success: true, bed });
  } catch (err) {
    next(err);
  }
};
