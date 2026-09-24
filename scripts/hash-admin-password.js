// Prints a bcrypt hash for a given password, to paste into ADMIN_PASSWORD_HASH.
// Usage: node scripts/hash-admin-password.js "the-admin-password"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
    console.error('Usage: node scripts/hash-admin-password.js "the-admin-password"');
    process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
    console.log(hash);
});
