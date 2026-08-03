const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    attachments: [{ type: String }],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noticeSchema.index({ hostel: 1, createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
