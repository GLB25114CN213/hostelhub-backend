const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    visitorName: { type: String, required: true },
    relation: { type: String, required: true },
    phone: { type: String, required: true },
    idProof: { type: String }, // uploaded document URL
    photo: { type: String },
    purpose: { type: String },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date, default: null },
    passCode: { type: String, unique: true }, // for the generated visitor pass
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

visitorSchema.index({ hostel: 1, checkInTime: -1 });
visitorSchema.index({ student: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
