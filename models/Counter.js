const mongoose = require('mongoose');

// _id is the series key ('INV' or 'GST'); seq is the last number issued.
const counterSchema = new mongoose.Schema({
    _id: { type: String },
    seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
