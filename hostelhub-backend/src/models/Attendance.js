const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true }, // stored as YYYY-MM-DD for fast unique-per-day queries
    time: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    method: {
      type: String,
      enum: ['manual', 'qr', 'face', 'gps'],
      default: 'manual',
    },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: String,
    isLateEntry: { type: Boolean, default: false },
    isEarlyExit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One attendance record per student per day — prevents duplicate QR scans.
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hostel: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
