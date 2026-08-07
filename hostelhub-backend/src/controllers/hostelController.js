const Hostel = require('../models/Hostel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.createHostel = asyncHandler(async (req, res) => {
  const { name, address, contactNumber, latitude, longitude, images, amenities, rules, genderPolicy } = req.body;
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
});

exports.listHostels = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'owner' ? { owner: req.user._id } : req.user.hostel ? { _id: req.user.hostel } : null;
  if (!filter) return res.json({ success: true, hostels: [] });

  const hostels = await Hostel.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, hostels });
});

exports.getHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  res.json({ success: true, hostel });
});

exports.updateHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  if (hostel.owner.toString() !== req.user._id.toString()) throw ApiError.forbidden('You do not own this hostel');

  const editable = ['name', 'address', 'contactNumber', 'images', 'amenities', 'rules', 'genderPolicy', 'isActive'];
  editable.forEach((key) => { if (req.body[key] !== undefined) hostel[key] = req.body[key]; });

  if (req.body.latitude && req.body.longitude) {
    hostel.location = { type: 'Point', coordinates: [req.body.longitude, req.body.latitude] };
  }

  await hostel.save();
  res.json({ success: true, hostel });
});

exports.deleteHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw ApiError.notFound('Hostel not found');
  if (hostel.owner.toString() !== req.user._id.toString()) throw ApiError.forbidden('You do not own this hostel');

  hostel.isActive = false;
  await hostel.save();
  res.json({ success: true, message: 'Hostel deactivated' });
});
