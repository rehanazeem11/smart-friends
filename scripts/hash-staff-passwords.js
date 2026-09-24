// One-off migration: hash any plain-text passwords in the Staff collection.
// Safe to re-run — values that already look like a bcrypt hash are skipped.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const staff = await Staff.find({ password: { $exists: true, $ne: null } });

    let hashed = 0, skipped = 0;
    for (const s of staff) {
        if (!s.password || BCRYPT_RE.test(s.password)) { skipped++; continue; }
        s.password = await bcrypt.hash(s.password, 10);
        await s.save();
        hashed++;
        console.log(`Hashed password for ${s.email || s.name}`);
    }

    console.log(`\nDone. Hashed ${hashed}, skipped ${skipped} (already hashed) out of ${staff.length} staff records.`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
