const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

const DB = {
    bills: [],
    customers: [],
    staff: [],
    expenses: [],
    inventory: [],
    activity: [],
    settings: { store_settings: {}, customer_payments: {} }
};

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); } catch(e) { resolve({}); }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method.toUpperCase();

    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-name, x-user-role');

        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const parts = pathname.replace('/api/', '').split('/');
        const resource = parts[0];
        const id = parts[1] ? decodeURIComponent(parts[1]) : null;

        if (resource === 'bills') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.bills)); return; }
            if (method === 'POST') {
                const body = await parseBody(req);
                if (!body.inv) body.inv = 'INV-' + Date.now();
                DB.bills.push(body);
                res.writeHead(201); res.end(JSON.stringify(body)); return;
            }
            if (method === 'PUT' && id) {
                const body = await parseBody(req);
                const idx = DB.bills.findIndex(b => b.inv === id || b._id === id || b.id === id);
                if (idx !== -1) { DB.bills[idx] = { ...DB.bills[idx], ...body }; res.writeHead(200); res.end(JSON.stringify(DB.bills[idx])); }
                else { DB.bills.push(body); res.writeHead(200); res.end(JSON.stringify(body)); }
                return;
            }
            if (method === 'DELETE' && id) {
                DB.bills = DB.bills.filter(b => b.inv !== id && b._id !== id && b.id !== id);
                res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
            }
        }

        if (resource === 'customers') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.customers)); return; }
            if (method === 'POST') {
                const body = await parseBody(req);
                if (!body._id && !body.id) body.id = 'cust_' + Date.now();
                DB.customers.push(body);
                res.writeHead(201); res.end(JSON.stringify(body)); return;
            }
            if (method === 'PUT' && id) {
                const body = await parseBody(req);
                const idx = DB.customers.findIndex(c => String(c._id || c.id) === String(id));
                if (idx !== -1) { DB.customers[idx] = { ...DB.customers[idx], ...body }; res.writeHead(200); res.end(JSON.stringify(DB.customers[idx])); }
                else { res.writeHead(200); res.end(JSON.stringify(body)); }
                return;
            }
            if (method === 'DELETE' && id) {
                DB.customers = DB.customers.filter(c => String(c._id || c.id) !== String(id));
                res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
            }
        }

        if (resource === 'staff') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.staff)); return; }
            if (method === 'POST') {
                const body = await parseBody(req);
                if (!body._id && !body.id) body.id = 'staff_' + Date.now();
                DB.staff.push(body);
                res.writeHead(201); res.end(JSON.stringify(body)); return;
            }
            if (method === 'PUT' && id) {
                const body = await parseBody(req);
                const idx = DB.staff.findIndex(s => String(s._id || s.id) === String(id));
                if (idx !== -1) { DB.staff[idx] = { ...DB.staff[idx], ...body }; res.writeHead(200); res.end(JSON.stringify(DB.staff[idx])); }
                else { res.writeHead(200); res.end(JSON.stringify(body)); }
                return;
            }
            if (method === 'DELETE' && id) {
                DB.staff = DB.staff.filter(s => String(s._id || s.id) !== String(id));
                res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
            }
        }

        if (resource === 'expenses') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.expenses)); return; }
            if (method === 'POST') {
                const body = await parseBody(req);
                if (!body._id && !body.id) body.id = 'exp_' + Date.now();
                DB.expenses.push(body);
                res.writeHead(201); res.end(JSON.stringify(body)); return;
            }
            if (method === 'DELETE' && id) {
                DB.expenses = DB.expenses.filter(e => String(e._id || e.id) !== String(id));
                res.writeHead(200); res.end(JSON.stringify({ ok: true })); return;
            }
        }

        if (resource === 'inventory') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.inventory)); return; }
        }
        if (resource === 'activity') {
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.activity)); return; }
        }

        if (resource === 'settings') {
            const key = parts[1] || 'store_settings';
            if (method === 'GET') { res.writeHead(200); res.end(JSON.stringify(DB.settings[key] || {})); return; }
            if (method === 'POST' || method === 'PUT') {
                const body = await parseBody(req);
                DB.settings[key] = body;
                res.writeHead(200); res.end(JSON.stringify(body)); return;
            }
        }

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'friends_printing_mobile_new_1.html' : pathname);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Development Server running with REST API at http://127.0.0.1:${PORT} and http://localhost:${PORT}`);
});
