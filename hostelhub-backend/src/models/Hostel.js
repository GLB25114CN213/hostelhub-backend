const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },
    contactNumber: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    images: [{ type: String }],
    amenities: [{ type: String }],
    rules: [{ type: String }],
    genderPolicy: { type: String, enum: ['boys', 'girls', 'co-ed'], default: 'co-ed' },
    isActive: { type: Boolean, default: true },

    // Denormalized counters, kept in sync via hooks/services rather than recomputed on every read
    stats: {
      totalRooms: { type: Number, default: 0 },
      totalBeds: { type: Number, default: 0 },
      occupiedBeds: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

hostelSchema.index({ location: '2dsphere' });
hostelSchema.index({ owner: 1 });

module.exports = mongoose.model('Hostel', hostelSchema);
