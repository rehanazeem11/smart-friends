const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: String,
    role: String,
    action: String,
    details: String,
    timestamp: String,
    dateSort: String
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
