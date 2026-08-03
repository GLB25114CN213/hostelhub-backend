const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null }, // null = common area item
    itemType: {
      type: String,
      enum: ['bed', 'fan', 'light', 'furniture', 'mattress', 'wifi_router', 'ro_machine', 'gas_cylinder', 'other'],
      required: true,
    },
    label: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    condition: {
      type: String,
      enum: ['good', 'needs_repair', 'under_repair', 'damaged', 'retired'],
      default: 'good',
    },
    lastMaintenanceDate: { type: Date, default: null },
    nextMaintenanceDue: { type: Date, default: null },
    notes: { type: String },
  },
  { timestamps: true }
);

inventorySchema.index({ hostel: 1, itemType: 1 });
inventorySchema.index({ hostel: 1, condition: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
