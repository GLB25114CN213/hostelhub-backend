const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    triggeredAt: { type: Date, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    notifiedTargets: [{ type: String, enum: ['owner', 'warden', 'police', 'ambulance', 'parents'] }],
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

emergencyAlertSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
