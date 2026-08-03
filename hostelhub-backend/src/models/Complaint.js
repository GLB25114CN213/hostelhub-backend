const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    category: {
      type: String,
      enum: ['electricity', 'water', 'internet', 'cleaning', 'furniture', 'food', 'security', 'other'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ hostel: 1, status: 1 });
complaintSchema.index({ student: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
