require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Bill = require('./models/Bill');
const Customer = require('./models/Customer');
const Staff = require('./models/Staff');
const Expense = require('./models/Expense');
const Inventory = require('./models/Inventory');
const Activity = require('./models/Activity');
const Settings = require('./models/Settings');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'friends_printing_mobile_new_1.html'));
});

// ============ BILLS ============
app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find().sort({ createdAt: -1 }).lean();
        res.json(bills);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bills', async (req, res) => {
    try {
        const bill = await Bill.create(req.body);
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

app.delete('/api/bills/:inv', async (req, res) => {
    try {
        await Bill.findOneAndDelete({ inv: req.params.inv });
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

// ============ STAFF ============
app.get('/api/staff', async (req, res) => {
    try {
        const staff = await Staff.find().lean();
        res.json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff', async (req, res) => {
    try {
        const staff = await Staff.create(req.body);
        res.status(201).json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/staff/:id', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        res.json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/staff/:id', async (req, res) => {
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

app.post('/api/expenses', async (req, res) => {
    try {
        const expense = await Expense.create(req.body);
        res.status(201).json(expense);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
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

app.post('/api/inventory', async (req, res) => {
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

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
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
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection failed:', err.message);
        console.error('Check your MONGODB_URI in .env file');
        process.exit(1);
    });
