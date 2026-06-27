const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    category: String,
    date: String,
    description: String,
    amount: Number,
    notes: String,
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
