const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    reason: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    emergencyContact: { name: String, phone: String },
    supportingDocuments: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewRemarks: { type: String },
    ownerReviewed: { type: Boolean, default: false }, // owner can additionally review per spec
  },
  { timestamps: true }
);

leaveSchema.index({ hostel: 1, status: 1 });
leaveSchema.index({ student: 1, startDate: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
