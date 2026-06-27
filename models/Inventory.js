const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: String,
    type: String,
    unit: String,
    qty: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String,
    lastUpdatedBy: String,
    lastUpdatedByRole: String,
    lastUpdatedAt: String
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
