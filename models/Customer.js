const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: String,
    email: String,
    gst: String,
    archived: { type: Boolean, default: false },
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String,
    lastUpdatedBy: String,
    lastUpdatedByRole: String,
    lastUpdatedAt: String
}, { timestamps: true });

customerSchema.index({ name: 1, phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
