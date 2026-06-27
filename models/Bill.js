const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    inv: { type: String, required: true, unique: true },
    date: String,
    customer: String,
    phone: String,
    shipTo: String,
    billTo: String,
    items: [{ name: String, qty: Number, price: Number, unit: String, amount: Number }],
    subtotal: Number,
    gst: Number,
    gstPercent: Number,
    total: Number,
    paid: Number,
    status: String,
    type: String,
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String,
    lastUpdatedBy: String,
    lastUpdatedByRole: String,
    lastUpdatedAt: String
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
