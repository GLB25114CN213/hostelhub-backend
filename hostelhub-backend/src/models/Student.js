const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },

    photo: { type: String },
    fatherName: String,
    motherName: String,
    guardianName: String,
    emergencyContact: { name: String, phone: String, relation: String },

    college: String,
    course: String,
    year: Number,
    bloodGroup: String,

    // Medical conditions are sensitive; store minimally and restrict read access at the
    // route/controller layer to owner/warden roles only, never returned in list views.
    medicalConditions: { type: String, default: '' },

    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },

    // Store only a masked/reference form; full number should live in an encrypted-at-rest
    // field or a separate vault service in production, never returned in API responses.
    aadhaarLast4: { type: String },

    admissionDate: { type: Date, default: Date.now },
    documents: [
      {
        type: { type: String, enum: ['id_card', 'agreement', 'aadhaar', 'other'] },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    qrCode: { type: String }, // unique attendance QR, generated on creation
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ hostel: 1, room: 1 });
studentSchema.index({ hostel: 1, isActive: 1 });

module.exports = mongoose.model('Student', studentSchema);
