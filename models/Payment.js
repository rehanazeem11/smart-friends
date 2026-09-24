const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerId: String,
    amount: Number,
    date: String,
    method: String,
    notes: String,
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String,
    // Lets a retried POST (flaky network, offline-outbox replay) return the
    // already-created payment instead of creating a duplicate.
    clientRequestId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
