const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true },
    capacity: { type: Number, required: true, min: 1 },
    roomType: { type: String, enum: ['AC', 'Non-AC'], default: 'Non-AC' },
    attachedWashroom: { type: Boolean, default: false },
    rent: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['available', 'full', 'maintenance', 'inactive'],
      default: 'available',
    },
    photos: [{ type: String }],
    qrCode: { type: String }, // Cloudinary URL of the generated QR image
  },
  { timestamps: true }
);

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hostel: 1, status: 1 });

// Virtual: occupied/available bed counts are derived from the Bed collection,
// not stored here, to avoid drift. See bedService.getRoomOccupancy().

module.exports = mongoose.model('Room', roomSchema);
