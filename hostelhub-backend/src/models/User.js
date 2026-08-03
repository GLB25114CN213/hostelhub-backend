const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['owner', 'warden', 'accountant', 'student'],
      required: true,
    },
    profilePicture: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'pending_verification',
    },

    // Scoping: a warden/accountant/student belongs to exactly one hostel.
    // An owner can own multiple hostels.
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', default: null },
    ownedHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }],

    // Auth verification state
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null },

    refreshTokens: [
      {
        token: { type: String },
        deviceInfo: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
      },
    ],

    fcmTokens: [{ type: String }], // for push notifications, one per device
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, hostel: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
