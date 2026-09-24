// One-off, idempotent migration: copies the single settings.customer_payments
// document (a map of customerName -> array of payment records) into individual
// Payment documents. Safe to re-run — each payment gets a deterministic
// clientRequestId derived from its position, so already-migrated entries are
// skipped instead of duplicated. The original settings document is left in
// place untouched, as a backup.
require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const Payment = require('../models/Payment');

const crypto = require('crypto');
function migrationId(customerName, index) {
    return 'migrate_' + crypto.createHash('sha1').update(customerName).digest('hex') + '_' + index;
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const doc = await Settings.findOne({ key: 'customer_payments' }).lean();
    const map = (doc && doc.value) || {};
    const customerNames = Object.keys(map);

    let migrated = 0, skipped = 0;
    for (const customerName of customerNames) {
        const payments = Array.isArray(map[customerName]) ? map[customerName] : [];
        for (let i = 0; i < payments.length; i++) {
            const p = payments[i] || {};
            const clientRequestId = migrationId(customerName, i);
            const existing = await Payment.findOne({ clientRequestId });
            if (existing) { skipped++; continue; }
            await Payment.create({
                customerName,
                amount: p.amount,
                date: p.date,
                method: p.method,
                notes: p.notes,
                createdBy: p.createdBy,
                createdByRole: p.createdByRole,
                createdByEmail: p.createdByEmail,
                createdAt: p.createdAt,
                clientRequestId
            });
            migrated++;
        }
    }

    console.log(`Done. Migrated ${migrated}, skipped ${skipped} (already migrated), across ${customerNames.length} customers.`);
    console.log('The original settings.customer_payments document was left in place as a backup.');
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
