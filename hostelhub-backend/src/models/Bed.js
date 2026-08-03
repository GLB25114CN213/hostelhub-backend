const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    bedNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['vacant', 'occupied', 'maintenance'],
      default: 'vacant',
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bedSchema.index({ room: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Bed', bedSchema);
