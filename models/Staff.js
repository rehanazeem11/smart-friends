const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: String,
    role: { type: String, default: 'staff' },
    active: { type: Boolean, default: true },
    stats: {
        bills: { type: Number, default: 0 },
        counter: { type: Number, default: 0 },
        normal: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 }
    },
    lastActive: String,
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
