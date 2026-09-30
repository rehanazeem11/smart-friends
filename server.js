require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const Bill = require('./models/Bill');
const Customer = require('./models/Customer');
const Staff = require('./models/Staff');
const Expense = require('./models/Expense');
const Inventory = require('./models/Inventory');
const Activity = require('./models/Activity');
const Settings = require('./models/Settings');
const Counter = require('./models/Counter');
const Payment = require('./models/Payment');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();

// Render (and most PaaS hosts) sit behind a reverse proxy, so trust its
// X-Forwarded-For to get the real client IP — needed for the login rate
// limiter below to key on the actual caller instead of the proxy.
app.set('trust proxy', 1);

// Same-origin (the desktop app and the website both load the API from its
// own origin) needs no CORS. Only cross-origin callers listed in
// ALLOWED_ORIGINS get access, with credentials so the auth cookie is sent.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
if (allowedOrigins.length) {
    app.use(cors({ origin: allowedOrigins, credentials: true }));
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve frontend files (public/ only — never the server code or models)
app.use(express.static(path.join(__dirname, 'public')));

// Tells the page which hostname counts as "the website" so it can add the
// web-mode class client-side (see the inline detector at the top of
// friends_printing_mobile_new_1.html's <body>). Not under /api — must be
// reachable before login.
app.get('/config.js', (req, res) => {
    res.type('application/javascript').send(`window.SF_WEB_DOMAIN = ${JSON.stringify(process.env.WEB_DOMAIN || '')};`);
});

// Web mode is just the same app HTML with fewer pages shown (CSS + a
// web-mode class), so both routes serve the identical file — no separate
// frontend to maintain. GET /web exists purely so web mode can be reached
// locally without a WEB_DOMAIN hostname match.
const APP_HTML = path.join(__dirname, 'public', 'friends_printing_mobile_new_1.html');
app.get('/', (req, res) => res.sendFile(APP_HTML));
app.get('/web', (req, res) => res.sendFile(APP_HTML));

// ============ AUTH ============
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
        if (adminEmail && email === adminEmail) {
            // ADMIN_PASSWORD_HASH (a bcrypt hash, generated via
            // scripts/hash-admin-password.js) is the documented, secure way to
            // set this. ADMIN_PASSWORD (plain text) is accepted as a fallback
            // so a freshly-configured .env still works before that script has
            // been run — prefer ADMIN_PASSWORD_HASH in any real deployment.
            let match;
            if (process.env.ADMIN_PASSWORD_HASH) {
                match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
            } else if (process.env.ADMIN_PASSWORD) {
                match = password === process.env.ADMIN_PASSWORD;
            } else {
                match = false;
            }
            if (!match) return res.status(401).json({ error: 'Invalid credentials' });
            const user = { id: 'admin', name: 'Admin', email: process.env.ADMIN_EMAIL, role: 'admin' };
            setAuthCookie(res, signToken(user));
            return res.json(user);
        }

        const staff = await Staff.findOne({ email: { $regex: '^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' } });
        if (!staff || staff.active === false || !staff.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let match;
        if (BCRYPT_RE.test(staff.password)) {
            match = await bcrypt.compare(password, staff.password);
        } else {
            // Lazy migration: this account still has its old plain-text password
            // (the hash script hasn't run for it yet, or hasn't run at all).
            // Accept a matching plain-text password once, then hash it in place
            // so every login after this one goes through bcrypt.
            match = password === staff.password;
            if (match) {
                staff.password = await bcrypt.hash(password, 10);
                await staff.save();
            }
        }
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const user = { id: staff._id, name: staff.name, email: staff.email, role: staff.role === 'admin' ? 'admin' : 'staff' };
        setAuthCookie(res, signToken(user));
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', requireAuth, (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.user);
});

// Every other /api route requires a valid session.
app.use('/api', requireAuth);

// ============ INVOICE NUMBERING ============
// Atomically issues the next number in a series ('INV' or 'GST'). $inc under
// upsert is atomic in MongoDB, so two requests arriving at the same instant
// (from the desktop app and the website, say) can never receive the same
// number — unlike the old approach of scanning existing bills client-side.
async function nextInvoiceNumber(series) {
    const counter = await Counter.findByIdAndUpdate(
        series,
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
    return series + '-' + String(counter.seq).padStart(3, '0');
}

const SERIES_PATTERNS = {
    INV: /^INV-(\d+)$/,
    GST: /^GST-(\d+)$/
};

// Re-seeds one series' counter to the highest number currently in use in the
// bills collection. $max only ever raises the stored seq, so this is safe to
// call any time — at boot, or defensively after an unexpected duplicate-key
// error — without ever reissuing (or rewinding past) a number already in use.
async function reseedCounter(series) {
    const re = SERIES_PATTERNS[series];
    const bills = await Bill.find({ inv: { $regex: '^' + series + '-' } }, { inv: 1 }).lean();
    let maxNum = 0;
    bills.forEach(b => {
        const m = re.exec(b.inv || '');
        if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }
    });
    await Counter.findByIdAndUpdate(series, { $max: { seq: maxNum } }, { upsert: true });
}

// Seeds each series' counter at startup, so a fresh/redeployed server never
// reissues a number that's already on a bill.
async function seedCounters() {
    for (const series of Object.keys(SERIES_PATTERNS)) {
        await reseedCounter(series);
    }
}

// After deleting a bill, rolls its series' counter back by one — but only if
// this was the latest number issued (seq still equals this bill's number).
// That equality check makes it safe under concurrency: if another bill was
// created in that series since, seq has already moved on and this simply
// matches nothing, leaving the counter alone. Deleting several bills
// newest-first rolls each one back in turn; deleting from the middle never
// touches the counter.
async function maybeRollbackCounter(inv) {
    for (const series of Object.keys(SERIES_PATTERNS)) {
        const m = SERIES_PATTERNS[series].exec(inv || '');
        if (!m) continue;
        const num = parseInt(m[1], 10);
        if (isNaN(num)) return;
        await Counter.findOneAndUpdate({ _id: series, seq: num }, { $inc: { seq: -1 } });
        return;
    }
}

// ============ BILLS ============
app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find().sort({ createdAt: -1 }).lean();
        res.json(bills);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bills', async (req, res) => {
    try {
        const clientRequestId = req.body.clientRequestId;
        if (clientRequestId) {
            const existing = await Bill.findOne({ clientRequestId });
            if (existing) return res.json(existing);
        }

        const series = req.body.type === 'GST' ? 'GST' : 'INV';
        let inv = await nextInvoiceNumber(series);
        let data = { ...req.body, inv };

        let bill;
        try {
            bill = await Bill.create(data);
        } catch (err) {
            // A retried POST with the same clientRequestId lands here on the
            // sparse unique index instead of creating a duplicate bill.
            if (err.code === 11000 && err.keyPattern && err.keyPattern.clientRequestId && clientRequestId) {
                const existing = await Bill.findOne({ clientRequestId });
                if (existing) return res.json(existing);
            }
            // The counter shouldn't be able to hand out a number that's
            // already on a bill, but if it somehow does (a bill inserted
            // outside this path, the counter never having been seeded, etc.),
            // re-sync it to the collection's actual current max and retry once.
            if (err.code === 11000 && err.keyPattern && err.keyPattern.inv) {
                await reseedCounter(series);
                inv = await nextInvoiceNumber(series);
                data = { ...req.body, inv };
                bill = await Bill.create(data);
            } else {
                throw err;
            }
        }
        res.status(201).json(bill);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/bills/:inv', async (req, res) => {
    try {
        const bill = await Bill.findOneAndUpdate({ inv: req.params.inv }, req.body, { returnDocument: 'after' });
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        res.json(bill);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/bills/:inv', requireAdmin, async (req, res) => {
    try {
        const deleted = await Bill.findOneAndDelete({ inv: req.params.inv });
        if (deleted) await maybeRollbackCounter(deleted.inv);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ CUSTOMERS ============
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 }).lean();
        res.json(customers);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
    try {
        const existing = await Customer.findOne({
            name: { $regex: new RegExp('^' + (req.body.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
            ...(req.body.phone ? { phone: req.body.phone } : {})
        });
        if (existing) return res.json(existing);
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(customer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (mongoose.Types.ObjectId.isValid(id)) {
            await Customer.findByIdAndDelete(id);
        } else {
            await Customer.findOneAndDelete({
                $or: [
                    { name: id },
                    { phone: id }
                ]
            });
        }
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ V2 API (website: paginated / filtered / list-shaped) ============
// Additive only — GET /api/bills and GET /api/customers above still return
// full unpaginated arrays exactly as before, because the desktop app depends
// on that shape.
const BILL_LIST_FIELDS = 'inv date customer phone type total paid status createdBy updatedAt';

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/v2/bills', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const filter = {};
        const q = (req.query.q || '').trim();
        if (q) {
            const escaped = escapeRegex(q);
            filter.$or = [
                { inv: { $regex: escaped, $options: 'i' } },
                { customer: { $regex: escaped, $options: 'i' } }
            ];
        }
        if (req.query.type) filter.type = req.query.type;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.from || req.query.to) {
            filter.date = {};
            if (req.query.from) filter.date.$gte = req.query.from;
            if (req.query.to) filter.date.$lte = req.query.to;
        }

        // createdAt is a display string ("24 Sep · 07:12 PM"), not sortable —
        // _id encodes insertion order (and time) reliably instead.
        const [items, total] = await Promise.all([
            Bill.find(filter, BILL_LIST_FIELDS).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Bill.countDocuments(filter)
        ]);
        res.json({ items, total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v2/bills/:inv', async (req, res) => {
    try {
        const bill = await Bill.findOne({ inv: req.params.inv }).lean();
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        res.json(bill);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v2/customers', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const filter = {};
        const q = (req.query.q || '').trim();
        if (q) {
            const escaped = escapeRegex(q);
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { phone: { $regex: escaped, $options: 'i' } }
            ];
        }

        const [items, total] = await Promise.all([
            Customer.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            Customer.countDocuments(filter)
        ]);
        res.json({ items, total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v2/customers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let customer = mongoose.Types.ObjectId.isValid(id) ? await Customer.findById(id).lean() : null;
        if (!customer) {
            customer = await Customer.findOne({ $or: [{ name: id }, { phone: id }] }).lean();
        }
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const [bills, payments] = await Promise.all([
            Bill.find({ customer: customer.name }, BILL_LIST_FIELDS).sort({ _id: -1 }).lean(),
            Payment.find({ customerName: customer.name }).sort({ date: 1, createdAt: 1 }).lean()
        ]);
        res.json({ ...customer, bills, payments });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ STAFF ============
app.get('/api/staff', requireAdmin, async (req, res) => {
    try {
        const staff = await Staff.find().select('-password').lean();
        res.json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff', requireAdmin, async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.password) data.password = await bcrypt.hash(data.password, 10);
        const staff = await Staff.create(data);
        const obj = staff.toObject();
        delete obj.password;
        res.status(201).json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/staff/:id', requireAdmin, async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.password) data.password = await bcrypt.hash(data.password, 10);
        else delete data.password;
        const staff = await Staff.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' }).select('-password');
        res.json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/staff/:id', requireAdmin, async (req, res) => {
    try {
        await Staff.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ EXPENSES ============
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 }).lean();
        res.json(expenses);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/expenses', requireAdmin, async (req, res) => {
    try {
        const expense = await Expense.create(req.body);
        res.status(201).json(expense);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', requireAdmin, async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ INVENTORY ============
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await Inventory.find().lean();
        items.forEach(i => { i.id = i._id; });
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', requireAdmin, async (req, res) => {
    try {
        const item = await Inventory.create(req.body);
        const obj = item.toObject();
        obj.id = obj._id;
        res.status(201).json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventory/:id', async (req, res) => {
    try {
        const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        if (!item) return res.status(404).json({ error: 'Not found' });
        const obj = item.toObject();
        obj.id = obj._id;
        res.json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventory/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (mongoose.Types.ObjectId.isValid(id)) {
            await Inventory.findByIdAndDelete(id);
        } else {
            await Inventory.findOneAndDelete({ name: id });
        }
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ ACTIVITY LOG ============
app.get('/api/activity', async (req, res) => {
    try {
        const logs = await Activity.find().sort({ createdAt: -1 }).limit(200).lean();
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/activity', async (req, res) => {
    try {
        const log = await Activity.create(req.body);
        res.status(201).json(log);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ PAYMENTS ============
app.get('/api/payments', async (req, res) => {
    try {
        const filter = {};
        if (req.query.customer) filter.customerName = req.query.customer;
        const payments = await Payment.find(filter).sort({ date: 1, createdAt: 1 }).lean();
        res.json(payments);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payments', async (req, res) => {
    try {
        let payment;
        try {
            payment = await Payment.create(req.body);
        } catch (err) {
            // A retried POST with the same clientRequestId lands here on the
            // sparse unique index instead of creating a duplicate payment.
            if (err.code === 11000 && err.keyPattern && err.keyPattern.clientRequestId && req.body.clientRequestId) {
                const existing = await Payment.findOne({ clientRequestId: req.body.clientRequestId });
                if (existing) return res.json(existing);
            }
            throw err;
        }
        res.status(201).json(payment);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/payments/:id', async (req, res) => {
    try {
        const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/payments/:id', async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ SETTINGS (dropdown settings, shortcut items) ============
app.get('/api/settings/:key', async (req, res) => {
    try {
        const doc = await Settings.findOne({ key: req.params.key }).lean();
        res.json(doc ? doc.value : null);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings/:key', async (req, res) => {
    try {
        const doc = await Settings.findOneAndUpdate(
            { key: req.params.key },
            { key: req.params.key, value: req.body.value },
            { upsert: true, returnDocument: 'after' }
        );
        res.json(doc.value);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ CONNECT & START ============
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB Atlas');
        await seedCounters();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection failed:', err.message);
        console.error('Check your MONGODB_URI in .env file');
        process.exit(1);
    });
