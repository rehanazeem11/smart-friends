    /* ============================================================
       UTILITY
    ============================================================ */
    function toggleSidebar() {
        var sb = document.querySelector('.sidebar');
        if (sb) sb.classList.toggle('collapsed');
    }

    function toast(msg, icon='check-circle') {
        const t = document.getElementById('toast');
        t.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4" style="flex-shrink:0"></i> ${msg}`;
        t.style.display = 'flex';
        t.style.opacity = '1';
        lucide.createIcons({ nodes: [t] });
        clearTimeout(t._tid);
        t._tid = setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.style.display='none',300); }, 2600);
    }

    function openModal(html) {
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').style.display = 'flex';
        lucide.createIcons({ nodes: [document.getElementById('modalBox')] });
    }

    function closeModal(e) {
        if (e && e.target !== document.getElementById('modalOverlay')) return;
        document.getElementById('modalOverlay').style.display = 'none';
    }
    document.addEventListener('keydown', e => { if (e.key==='Escape') document.getElementById('modalOverlay').style.display='none'; });

    function showLoginError(message) {
        const banner = document.getElementById('errorBanner');
        const msg = document.getElementById('errorMsg');
        if (msg) msg.textContent = message || 'Invalid credentials';
        if (banner) banner.classList.add('show');
        const success = document.getElementById('successBanner');
        if (success) success.classList.remove('show');
    }

    function clearLoginAlerts() {
        document.getElementById('errorBanner')?.classList.remove('show');
        document.getElementById('successBanner')?.classList.remove('show');
    }

    function setLoginBusy(isBusy) {
        const btn = document.getElementById('loginBtn');
        const spinner = document.getElementById('loginSpinner');
        if (btn) btn.disabled = isBusy;
        if (spinner) spinner.style.display = isBusy ? 'inline-block' : 'none';
    }

    function showForgotPassword() {
        document.getElementById('fpOverlay')?.classList.add('show');
    }

    function closeFP() {
        document.getElementById('fpOverlay')?.classList.remove('show');
    }

    function sendReset() {
        const email = document.getElementById('fpEmail')?.value.trim();
        if (!email) {
            toast('Enter your email address', 'alert-circle');
            return;
        }
        toast(`Password reset link sent to ${email}`);
        closeFP();
    }

    function togglePasswordVisibility() {
        const input = document.getElementById('passwordInput');
        const icon = document.getElementById('eyeIcon');
        if (!input || !icon) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        if (input.type === 'text') {
            icon.innerHTML = '<path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.02-2.2 2.66-4.11 4.73-5.44"/><path d="M1 1l22 22"/>';
        } else {
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
    }

    function fillDemo(email, password) {
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        if (emailInput) emailInput.value = email;
        if (passwordInput) passwordInput.value = password;
        clearLoginAlerts();
    }

    function loginSuccess(role, staffData) {
        clearLoginAlerts();
        CURRENT_USER = {
            name: (staffData && staffData.name) ? staffData.name : 'Admin',
            email: (staffData && staffData.email) ? staffData.email : 'admin@printshop.com',
            role: role
        };
        setRole(role, null, staffData);
        document.body.classList.remove('logged-out');
        document.getElementById('page-login').style.display = 'none';
        document.getElementById('appShell').style.display = 'flex';
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const landing = 'dashboard';
        const dashboardPage = document.getElementById('page-' + landing);
        if (dashboardPage) dashboardPage.classList.add('active');
        const navItem = document.querySelector(`.nav-item[data-page="${landing}"]`);
        if (navItem) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            navItem.classList.add('active');
        }
        setMobileActive(document.querySelector(`.mobile-nav-item[data-page="${landing}"]`));
    }

    function handleLogin() {
        const email = document.getElementById('emailInput')?.value.trim();
        const password = document.getElementById('passwordInput')?.value || '';
        clearLoginAlerts();
        if (!email) { showLoginError('Please enter your email or user ID'); return; }
        if (!password) { showLoginError('Please enter your password'); return; }

        setLoginBusy(true);
        setTimeout(() => {
            const normalized = email.toLowerCase();
            const isAdmin = normalized === 'admin@printshop.com' && password === 'admin123';
            // Check dynamic staff accounts from STAFF array
            const staffMatch = STAFF.find(s => s.email && s.email.toLowerCase() === normalized && s.password === password && s.active !== false);
            if (!isAdmin && !staffMatch) {
                showLoginError('Invalid credentials. Please check your email and password.');
                setLoginBusy(false);
                return;
            }
            if (staffMatch && staffMatch.role === 'admin') {
                loginSuccess('admin', staffMatch);
            } else {
                loginSuccess(staffMatch ? 'staff' : 'admin', staffMatch || null);
            }
            logActivity('Login', (CURRENT_USER ? CURRENT_USER.name : 'Admin') + ' logged in as ' + (CURRENT_USER ? CURRENT_USER.role : 'admin'));
            setLoginBusy(false);
        }, 220);
    }

    function logout() {
        logActivity('Logout', (CURRENT_USER ? CURRENT_USER.name : 'User') + ' logged out');
        CURRENT_USER = null;
        document.getElementById('appShell').style.display = 'none';
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const loginPage = document.getElementById('page-login');
        if (loginPage) {
            loginPage.style.display = '';
            loginPage.classList.add('active');
        }
        document.body.classList.remove('role-staff');
        document.body.classList.add('role-admin', 'logged-out');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        setMobileActive(document.querySelector('.mobile-nav-item[data-page="dashboard"]'));
        clearLoginAlerts();
        const emailInput = document.getElementById('emailInput');
        if (emailInput) { emailInput.value = ''; emailInput.focus(); }
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';
    }

    /* ============================================================
       NAVIGATION
    ============================================================ */
    function goto(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const page = document.getElementById('page-' + pageId);
        if (page) page.classList.add('active');
        const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (nav) nav.classList.add('active');
        window.scrollTo(0,0);
    }
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => goto(item.dataset.page));
    });

    /* ============================================================
       ROLE SWITCHER
    ============================================================ */
    function setRole(role, evt, staffData) {
        document.body.classList.remove('role-admin','role-staff');
        document.body.classList.add('role-' + role);
        document.querySelectorAll('.role-switcher button').forEach(b => b.classList.toggle('active', b.dataset.role === role));
        if (evt && evt.target) {
            const clicked = evt.target.closest('button');
            if (clicked) clicked.classList.add('active');
        }
        if (role === 'staff') {
            const staffName = (staffData && staffData.name) ? staffData.name : 'Staff';
            const staffInitial = staffName.charAt(0).toUpperCase();
            const firstName = staffName.split(' ')[0];
            document.getElementById('userName').textContent = staffName;
            document.getElementById('userRole').textContent = 'Staff';
            document.getElementById('userAvatar').textContent = staffInitial;
            document.getElementById('greetName').textContent = firstName;
            const allowed = ['dashboard','new-bill','customers','bills'];
            const current = document.querySelector('.page.active')?.id.replace('page-','');
            if (!allowed.includes(current)) goto('dashboard');
            document.querySelectorAll('.admin-only-view').forEach(el => el.style.display='none');
            document.querySelectorAll('.staff-only-view').forEach(el => el.style.display='');
        } else {
            const adminName = (staffData && staffData.name) ? staffData.name : 'Admin';
            const adminInitial = adminName.charAt(0).toUpperCase();
            const adminFirst = adminName.split(' ')[0];
            document.getElementById('userName').textContent = adminName;
            document.getElementById('userRole').textContent = 'Admin';
            document.getElementById('userAvatar').textContent = adminInitial;
            document.getElementById('greetName').textContent = adminFirst;
            document.querySelectorAll('.admin-only-view').forEach(el => el.style.display='');
            document.querySelectorAll('.staff-only-view').forEach(el => el.style.display='none');
        }
    }

    /* ============================================================
       LIVE CLOCK + DATE
    ============================================================ */
    function updateClock() {
        const now = new Date();
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dateEl = document.querySelector('.topbar-date');
        const timeEl = document.querySelector('.topbar-time');
        if (dateEl) dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        if (timeEl) {
            let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            timeEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    /* ============================================================
       TAB PILLS (generic — any .tab-pills group)
    ============================================================ */
    document.querySelectorAll('.tab-pills').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    /* ============================================================
       JOB TYPE TOGGLE (new-bill page)
    ============================================================ */
    document.querySelectorAll('.job-toggle').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    /* ============================================================
       NEW BILL — line item helpers
    ============================================================ */
    let SHORTCUT_ITEMS = {};
    function loadShortcutItems() {
        const stored = localStorage.getItem('fp_shortcut_items');
        if (stored) {
            try { SHORTCUT_ITEMS = JSON.parse(stored); return; } catch(e) {}
        }
        SHORTCUT_ITEMS = {};
    }
    loadShortcutItems();

    const COUNTER_KEYWORDS = ['lamination','cutting','flex printing','flex','foam board','shape cutting','vinyl','standee','banner'];
    const NORMAL_KEYWORDS  = ['xerox','photocopy','print','scan','binding','visiting card','letterhead'];

    function detectType(name) {
        const text = String(name || '').toLowerCase();
        const isCounter = COUNTER_KEYWORDS.some(k => text.includes(k));
        const isNormal  = NORMAL_KEYWORDS.some(k => text.includes(k));
        if (isCounter && !isNormal) return 'counter';
        if (isNormal && !isCounter) return 'normal';
        if (isCounter && isNormal) return 'mixed';
        return 'unclassified';
    }

    function getShortcutForName(value) {
        const text = value.toLowerCase();
        return Object.values(SHORTCUT_ITEMS).find(item => text.includes(item.desc.toLowerCase()) || text.includes(Object.keys(SHORTCUT_ITEMS).find(k => item === SHORTCUT_ITEMS[k]) || '')) || null;
    }

    function parseDimensionArea(text) {
        const match = String(text).toLowerCase().match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
        if (!match) return 0;
        const w = parseFloat(match[1]) || 0;
        const h = parseFloat(match[2]) || 0;
        return w * h;
    }

    function calculateLineItemAmount(name, qty, price, unit) {
        const area = parseDimensionArea(name);
        const normalizedUnit = String(unit).trim().toLowerCase();
        const isAreaProduct = area > 0 && (normalizedUnit === '' || normalizedUnit.includes('sq'));
        if (isAreaProduct) {
            return qty * area * price;
        }
        return qty * price;
    }

    function applyShortcutData(row) {
        const nameEl = row.querySelector('.li-name');
        if (!nameEl) return;
        const itemKey = Object.keys(SHORTCUT_ITEMS).find(key => nameEl.value.toLowerCase().includes(key));
        if (!itemKey) return;
        const item = SHORTCUT_ITEMS[itemKey];
        if (nameEl.value.trim().toLowerCase() === itemKey || !nameEl.value.toLowerCase().includes(item.desc.toLowerCase())) {
            nameEl.value = item.desc;
        }
        const priceEl = row.querySelector('.li-price');
        if (priceEl) priceEl.value = item.price.toFixed(2);
        const unitEl = row.querySelector('.li-unit');
        if (unitEl) {
            const area = parseDimensionArea(nameEl.value);
            if (area > 0 && (!unitEl.value.trim() || unitEl.value.toLowerCase().includes('sq'))) {
                unitEl.value = 'sqft';
            } else {
                unitEl.value = item.unit;
            }
        }
    }

    function applyInventoryPrice(row) {
        var nameEl = row.querySelector('.li-name');
        var priceEl = row.querySelector('.li-price');
        if (!nameEl || !priceEl || typeof INVENTORY_ITEMS === 'undefined') return;
        var text = (nameEl.value || '').toLowerCase();
        if (!text) return;
        var match = INVENTORY_ITEMS.find(function(inv) {
            var invName = (inv.name || '').toLowerCase();
            return text.includes(invName) || invName.includes(text);
        });
        if (match && match.cost > 0) {
            priceEl.value = match.cost.toFixed(2);
        }
    }

    function updateLineItemNumbers() {
        document.querySelectorAll('#lineItemsContainer .li-row').forEach((row, index) => {
            const sino = row.querySelector('.li-sino');
            if (sino) sino.textContent = String(index + 1);
        });
    }

    function recalcRow(row) {
        const name  = row.querySelector('.li-name')?.value || '';
        const qty   = parseFloat(row.querySelector('.li-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.li-price')?.value) || 0;
        const unit  = row.querySelector('.li-unit')?.value || '';
        const amtEl = row.querySelector('.li-amount');
        const amount = calculateLineItemAmount(name, qty, price, unit);
        if (amtEl) amtEl.textContent = '₹ ' + amount.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0});
    }

    function recalcSummary() {
        let subtotal = 0;
        document.querySelectorAll('#lineItemsContainer .li-row').forEach(row => {
            const name  = row.querySelector('.li-name')?.value || '';
            const qty   = parseFloat(row.querySelector('.li-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.li-price')?.value) || 0;
            const unit  = row.querySelector('.li-unit')?.value || '';
            subtotal += calculateLineItemAmount(name, qty, price, unit);
        });
        const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
        const gstPct   = parseFloat(document.getElementById('gstInput')?.value) || 0;
        const paidInfo = getTotalPaid();
        const paid     = paidInfo.total;
        const afterDisc = Math.max(0, subtotal - discount);
        const gstAmt   = afterDisc * gstPct / 100;
        const total    = afterDisc + gstAmt;
        const balance  = total - paid;

        const fmt = v => '₹ ' + v.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0});
        const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setId('previewSubtotal', fmt(subtotal));
        setId('previewDiscount', '− ' + fmt(discount));
        setId('previewGst', fmt(gstAmt));
        setId('previewTotal', fmt(total));
        setId('previewPaid', fmt(paid));

        const gstLabelEl = document.getElementById('previewGstLabel');
        if (gstLabelEl) gstLabelEl.textContent = `GST (${gstPct}%)`;

        const statusEl = document.getElementById('previewStatus');
        const statusBadge = document.getElementById('previewStatusBadge');
        if (statusEl) {
            if (paid === total)      { statusEl.textContent = 'Fully Paid';    statusEl.style.color = 'var(--emerald-text)'; }
            else if (paid < total)   { statusEl.textContent = `Due ₹ ${Math.abs(balance).toLocaleString('en-IN')}`; statusEl.style.color = 'var(--rose-text)'; }
            else                     { statusEl.textContent = `Overpaid ₹ ${Math.abs(balance).toLocaleString('en-IN')}`; statusEl.style.color = 'var(--gold-strong)'; }
        }
        if (statusBadge) {
            if (paid === total)     { statusBadge.className='badge badge-paid'; statusBadge.textContent='Paid'; }
            else if (paid < total)  { statusBadge.className='badge badge-outstanding'; statusBadge.textContent='Pending'; }
            else                    { statusBadge.className='badge badge-partial'; statusBadge.textContent='Overpaid'; }
        }
        updatePaymentAllocation(total, paid, paidInfo.cash, paidInfo.online);
        detectBillType();
    }

    function detectBillType() {
        let counterCount = 0, normalCount = 0;
        document.querySelectorAll('#lineItemsContainer .li-row').forEach(row => {
            const name = row.querySelector('.li-name')?.value || '';
            const t = detectType(name);
            if (t === 'counter') counterCount++;
            else if (t === 'normal') normalCount++;
        });
        const typeEl   = document.getElementById('autoTypeBadge');
        const kwEl     = document.getElementById('detectedKeywords');
        const mixEl    = document.getElementById('mixedWarning');
        const domEl    = document.getElementById('dominantType');

        const isMixed = counterCount > 0 && normalCount > 0;
        if (mixEl) mixEl.style.display = isMixed ? '' : 'none';
        const dominant = counterCount >= normalCount ? 'counter' : 'normal';
        if (domEl) domEl.textContent = dominant === 'counter' ? 'Counter' : 'Normal';

        if (typeEl) {
            if (counterCount > 0 && normalCount === 0)      { typeEl.textContent = 'Counter Sale'; typeEl.style.color = 'var(--coral-text)'; }
            else if (normalCount > 0 && counterCount === 0) { typeEl.textContent = 'Normal Sale'; typeEl.style.color = 'var(--primary)'; }
            else if (counterCount > 0 || normalCount > 0)   { typeEl.textContent = 'Mixed Bill'; typeEl.style.color = 'var(--gold-strong)'; }
            else                                             { typeEl.textContent = 'Unclassified'; typeEl.style.color = 'var(--text-muted)'; }
        }

        let found = [];
        document.querySelectorAll('#lineItemsContainer .li-row').forEach(row => {
            const name = row.querySelector('.li-name')?.value.toLowerCase() || '';
            [...COUNTER_KEYWORDS, ...NORMAL_KEYWORDS].forEach(k => { if (name.includes(k) && !found.includes(k)) found.push(k); });
        });
        if (kwEl) kwEl.textContent = found.length ? found.map(k=>`"${k}"`).join(', ') : 'none';
    }

    function getRowAreaSqFt(w, h, unit) {
        if (!w || !h || w <= 0 || h <= 0) return 0;
        if (unit === 'ft') return w * h;
        if (unit === 'in') return (w / 12) * (h / 12);
        if (unit === 'mm') return (w / 304.8) * (h / 304.8);
        return 0;
    }

    function showRowConfigPanel(row, cat) {
        const panel = row.querySelector('.li-config-panel');
        if (!panel) return;
        if (!cat) {
            panel.innerHTML = '';
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = '';
        
        if (cat === 'paper') {
            const typesOpts = PRICING_DB.paper.types.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
            panel.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div>
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Paper Type</label>
                        <select class="select select-xs w-full li-pjc-type" style="height: 24px; font-size: 11px; padding: 0 4px; border: 1px solid var(--border); border-radius: 6px; background:var(--surface);">
                            ${typesOpts}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Print Side</label>
                        <select class="select select-xs w-full li-pjc-side" style="height: 24px; font-size: 11px; padding: 0 4px; border: 1px solid var(--border); border-radius: 6px; background:var(--surface);">
                            <option value="os">O/S — One Side</option>
                            <option value="fb">F/B — Both Sides</option>
                        </select>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] border-t border-dashed border-slate-200 pt-2 mt-2">
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Lamination:</span>
                        <select class="select select-xs li-pjc-lamination" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="gloss">Gloss</option>
                            <option value="matte">Matte</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Cutting:</span>
                        <select class="select select-xs li-pjc-cutting" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="normal">Normal</option>
                            <option value="half">Half</option>
                            <option value="full_shape">Full Shape</option>
                        </select>
                    </div>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-creasing w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Crease</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-perforation w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Perf</span>
                    </label>
                </div>
            `;
        } else if (cat === 'sticker') {
            const typesOpts = PRICING_DB.sticker.types.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
            panel.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div class="col-span-2">
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Sticker Type</label>
                        <select class="select select-xs w-full li-pjc-type" style="height: 24px; font-size: 11px; padding: 0 4px; border: 1px solid var(--border); border-radius: 6px; background:var(--surface);">
                            ${typesOpts}
                        </select>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] border-t border-dashed border-slate-200 pt-2 mt-2">
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Lamination:</span>
                        <select class="select select-xs li-pjc-lamination" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="gloss">Gloss</option>
                            <option value="matte">Matte</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Cutting:</span>
                        <select class="select select-xs li-pjc-cutting" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="normal">Normal</option>
                            <option value="half">Half</option>
                            <option value="full_shape">Full Shape</option>
                        </select>
                    </div>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-creasing w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Crease</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-perforation w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Perf</span>
                    </label>
                </div>
            `;
        } else if (cat === 'flex') {
            const typesOpts = PRICING_DB.flex.types.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
            panel.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div class="col-span-2">
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Flex Material</label>
                        <select class="select select-xs w-full li-pjc-type" style="height: 24px; font-size: 11px; padding: 0 4px; border: 1px solid var(--border); border-radius: 6px; background:var(--surface);">
                            ${typesOpts}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-[11px] mb-2">
                    <div>
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Width</label>
                        <input class="input tabular w-full li-pjc-w" type="number" min="0" step="0.01" value="4" style="height: 24px; font-size: 11px; padding: 0 6px; border: 1px solid var(--border); border-radius: 6px;" />
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Height</label>
                        <input class="input tabular w-full li-pjc-h" type="number" min="0" step="0.01" value="3" style="height: 24px; font-size: 11px; padding: 0 6px; border: 1px solid var(--border); border-radius: 6px;" />
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-500 font-semibold mb-0.5" style="color:var(--text-muted)">Unit</label>
                        <select class="select select-xs w-full li-pjc-unit" style="height: 24px; font-size: 11px; padding: 0 4px; border: 1px solid var(--border); border-radius: 6px; background:var(--surface);">
                            <option value="ft">Ft</option>
                            <option value="in">In</option>
                            <option value="mm">MM</option>
                        </select>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] border-t border-dashed border-slate-200 pt-2 mt-2">
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Lamination:</span>
                        <select class="select select-xs li-pjc-lamination" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="gloss">Gloss</option>
                            <option value="matte">Matte</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-semibold">Cutting:</span>
                        <select class="select select-xs li-pjc-cutting" style="height: 20px; font-size: 10px; padding: 0 2px; border: 1px solid var(--border); border-radius: 4px; background:var(--surface);">
                            <option value="none">None</option>
                            <option value="normal">Normal</option>
                            <option value="half">Half</option>
                            <option value="full_shape">Full Shape</option>
                        </select>
                    </div>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-creasing w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Crease</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" class="li-pjc-perforation w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-[10px] text-gray-600 font-medium">Perf</span>
                    </label>
                </div>
            `;
        }

        bindRowCalculatorEvents(row, cat);
        updateRowPricing(row, cat);
    }

    function bindRowCalculatorEvents(row, cat) {
        const panel = row.querySelector('.li-config-panel');
        if (!panel) return;
        panel.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', () => updateRowPricing(row, cat));
            el.addEventListener('input', () => updateRowPricing(row, cat));
        });
    }

    function updateRowPricing(row, cat) {
        const qty = parseFloat(row.querySelector('.li-qty')?.value) || 0;
        const nameEl = row.querySelector('.li-name');
        const priceEl = row.querySelector('.li-price');
        const unitEl = row.querySelector('.li-unit');
        
        if (!cat) return;
        
        const typeKey = row.querySelector('.li-pjc-type')?.value;
        const side = row.querySelector('.li-pjc-side')?.value || 'os';
        const lamKey = row.querySelector('.li-pjc-lamination')?.value || 'none';
        const cutKey = row.querySelector('.li-pjc-cutting')?.value || 'none';
        const hasCreasing = row.querySelector('.li-pjc-creasing')?.checked || false;
        const hasPerforation = row.querySelector('.li-pjc-perforation')?.checked || false;
        
        let totalCost = 0;
        let descriptionText = '';
        let unitText = 'sheet';
        let sqft = 0;
        
        if (cat === 'paper') {
            const typeObj = PRICING_DB.paper.types.find(t => t.key === typeKey);
            if (!typeObj) return;
            
            const rate = side === 'os' ? typeObj.os : typeObj.fb;
            const sideLabel = side === 'os' ? 'O/S' : 'F/B';
            descriptionText = `Paper: ${typeObj.label} (${sideLabel})`;
            unitText = 'sheet';
            
            totalCost += qty * rate;
            
            if (lamKey !== 'none') {
                const lam = PRICING_DB.lamination[lamKey];
                const perSh = side === 'os' ? lam.perSheetOS : lam.perSheetFB;
                const lamRaw = qty * perSh;
                const lamChg = Math.max(lamRaw, lam.min);
                totalCost += lamChg;
                descriptionText += ` + ${lamKey === 'gloss' ? 'Gloss' : 'Matte'} Lam`;
            }
            if (cutKey !== 'none') {
                const cut = PRICING_DB.cutting[cutKey];
                const cutRaw = qty * cut.perSheet;
                const cutChg = Math.max(cutRaw, cut.min);
                totalCost += cutChg;
                descriptionText += ` + ${cutKey === 'normal' ? 'Normal' : cutKey === 'half' ? 'Half' : 'Shape'} Cut`;
            }
            if (hasCreasing) {
                const cs = PRICING_DB.additionalServices.creasing;
                const csRaw = qty * cs.perSheet;
                const csChg = Math.max(csRaw, cs.min);
                totalCost += csChg;
                descriptionText += ' + Crease';
            }
            if (hasPerforation) {
                const pf = PRICING_DB.additionalServices.perforation;
                const pfRaw = qty * pf.perSheet;
                const pfChg = Math.max(pfRaw, pf.min);
                totalCost += pfChg;
                descriptionText += ' + Perf';
            }
            
        } else if (cat === 'sticker') {
            const typeObj = PRICING_DB.sticker.types.find(t => t.key === typeKey);
            if (!typeObj) return;
            
            const rate = typeObj.rate;
            descriptionText = `Sticker: ${typeObj.label}`;
            unitText = 'print';
            
            totalCost += qty * rate;
            
            if (lamKey !== 'none') {
                const lam = PRICING_DB.lamination[lamKey];
                const perSh = side === 'os' ? lam.perSheetOS : lam.perSheetFB;
                const lamRaw = qty * perSh;
                const lamChg = Math.max(lamRaw, lam.min);
                totalCost += lamChg;
                descriptionText += ` + ${lamKey === 'gloss' ? 'Gloss' : 'Matte'} Lam`;
            }
            if (cutKey !== 'none') {
                const cut = PRICING_DB.cutting[cutKey];
                const cutRaw = qty * cut.perSheet;
                const cutChg = Math.max(cutRaw, cut.min);
                totalCost += cutChg;
                descriptionText += ` + ${cutKey === 'normal' ? 'Normal' : cutKey === 'half' ? 'Half' : 'Shape'} Cut`;
            }
            if (hasCreasing) {
                const cs = PRICING_DB.additionalServices.creasing;
                const csRaw = qty * cs.perSheet;
                const csChg = Math.max(csRaw, cs.min);
                totalCost += csChg;
                descriptionText += ' + Crease';
            }
            if (hasPerforation) {
                const pf = PRICING_DB.additionalServices.perforation;
                const pfRaw = qty * pf.perSheet;
                const pfChg = Math.max(pfRaw, pf.min);
                totalCost += pfChg;
                descriptionText += ' + Perf';
            }
            
        } else if (cat === 'flex') {
            const typeObj = PRICING_DB.flex.types.find(t => t.key === typeKey);
            if (!typeObj) return;
            
            const rate = typeObj.rate;
            const w = parseFloat(row.querySelector('.li-pjc-w')?.value) || 0;
            const h = parseFloat(row.querySelector('.li-pjc-h')?.value) || 0;
            const unit = row.querySelector('.li-pjc-unit')?.value || 'ft';
            
            sqft = getRowAreaSqFt(w, h, unit);
            
            let w_ft = w;
            let h_ft = h;
            if (unit === 'in') {
                w_ft = w / 12;
                h_ft = h / 12;
            } else if (unit === 'mm') {
                w_ft = w / 304.8;
                h_ft = h / 304.8;
            }
            const w_ft_str = Number(w_ft.toFixed(2));
            const h_ft_str = Number(h_ft.toFixed(2));
            
            let dimStr = `${w_ft_str}x${h_ft_str} ft`;
            if (unit !== 'ft') {
                dimStr = `${w_ft_str}x${h_ft_str} ft (${w}x${h} ${unit})`;
            }
            
            descriptionText = `Flex: ${typeObj.label} ${dimStr}`;
            unitText = 'sqft';
            
            const printCost = qty * sqft * rate;
            totalCost += printCost;
            
            if (lamKey !== 'none') {
                const lam = PRICING_DB.lamination[lamKey];
                const totalSqft = sqft * qty;
                const lamRaw = totalSqft * lam.perSheetOS;
                const lamChg = Math.max(lamRaw, lam.min);
                totalCost += lamChg;
                descriptionText += ` + ${lamKey === 'gloss' ? 'Gloss' : 'Matte'} Lam`;
            }
            if (cutKey !== 'none') {
                const cut = PRICING_DB.cutting[cutKey];
                const cutRaw = qty * cut.perSheet;
                const cutChg = Math.max(cutRaw, cut.min);
                totalCost += cutChg;
                descriptionText += ` + ${cutKey === 'normal' ? 'Normal' : cutKey === 'half' ? 'Half' : 'Shape'} Cut`;
            }
            if (hasCreasing) {
                const cs = PRICING_DB.additionalServices.creasing;
                const csRaw = qty * cs.perSheet;
                const csChg = Math.max(csRaw, cs.min);
                totalCost += csChg;
                descriptionText += ' + Crease';
            }
            if (hasPerforation) {
                const pf = PRICING_DB.additionalServices.perforation;
                const pfRaw = qty * pf.perSheet;
                const pfChg = Math.max(pfRaw, pf.min);
                totalCost += pfChg;
                descriptionText += ' + Perf';
            }
        }
        
        if (nameEl) nameEl.value = descriptionText;
        if (unitEl) unitEl.value = unitText;
        
        let finalPrice = 0;
        if (cat === 'flex') {
            finalPrice = (qty > 0 && sqft > 0) ? (totalCost / (qty * sqft)) : 0;
        } else {
            finalPrice = qty > 0 ? (totalCost / qty) : 0;
        }
        if (priceEl) priceEl.value = finalPrice.toFixed(2);
        
        recalcRow(row);
        recalcSummary();
    }

    function buildLineItemRow(name='', qty=1, price=0, unit='') {
        const row = document.createElement('tr');
        row.className = 'li-row';
        row.innerHTML = `
            <td class="text-center li-sino"></td>
            <td>
                <div class="flex flex-col gap-1.5">
                    <div class="flex gap-1.5 items-center">
                        <select class="select select-sm li-category" style="width: 100px; height: 38px; font-size: 13px; padding: 2px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface);">
                            <option value="">Custom</option>
                            <option value="paper">Paper</option>
                            <option value="sticker">Sticker</option>
                            <option value="flex">Flex</option>
                        </select>
                        <input class="input w-full li-name" list="billingItemShortcuts" placeholder="Description of Goods" value="${name}" />
                    </div>
                    <div class="li-config-panel p-2 bg-slate-50 border border-slate-200 rounded-md text-xs" style="display:none;"></div>
                </div>
            </td>
            <td><input class="input w-full text-center tabular li-qty" type="number" min="0" value="${qty}" /></td>
            <td><input class="input w-full text-right tabular li-price" type="number" min="0" step="0.01" value="${price.toFixed(2)}" /></td>
            <td><input class="input w-full li-unit" placeholder="Per" value="${unit}" /></td>
            <td class="text-right font-bold tabular font-serif text-lg li-amount">₹ ${(qty*price).toLocaleString('en-IN')}</td>
            <td class="text-right"><button class="btn btn-ghost p-1.5 rounded li-del-btn"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
        `;

        setupLineItemRow(row);
        lucide.createIcons({ nodes: [row] });
        return row;
    }

    function setupLineItemRow(row) {
        const nameEl = row.querySelector('.li-name');
        const qtyEl = row.querySelector('.li-qty');
        const priceEl = row.querySelector('.li-price');
        const deleteBtn = row.querySelector('.li-del-btn');
        const catEl = row.querySelector('.li-category');

        if (nameEl) {
            nameEl.addEventListener('input', () => {
                applyShortcutData(row);
                var cat = row.querySelector('.li-category')?.value || '';
                if (!cat) applyInventoryPrice(row);
                recalcRow(row);
                recalcSummary();
            });
        }
        if (qtyEl) {
            qtyEl.addEventListener('input', () => {
                const cat = row.querySelector('.li-category')?.value || '';
                if (cat) {
                    updateRowPricing(row, cat);
                }
                recalcRow(row);
                recalcSummary();
            });
        }
        if (priceEl) priceEl.addEventListener('input', () => { recalcRow(row); recalcSummary(); });
        if (deleteBtn) deleteBtn.addEventListener('click', () => {
            row.remove();
            updateLineItemNumbers();
            recalcSummary();
        });
        if (catEl) {
            catEl.addEventListener('change', () => {
                showRowConfigPanel(row, catEl.value);
            });
        }
    }

    function setupExistingLineItemRows() {
        document.querySelectorAll('#lineItemsContainer .li-row').forEach(row => setupLineItemRow(row));
        updateLineItemNumbers();
        recalcSummary();
    }

    const addItemBtn = document.getElementById('addItemBtn') || document.querySelector('#page-new-bill .btn.btn-accent');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            const container = document.getElementById('lineItemsContainer');
            if (!container) return;
            const row = buildLineItemRow('', 1, 0, '');
            container.appendChild(row);
            updateLineItemNumbers();
            row.querySelector('.li-name')?.focus();
            recalcSummary();
        });
    }

    setupExistingLineItemRows();

    window.updateCustomerSuggestions = function() {
        var dl = document.getElementById('customerSuggestions');
        if (!dl) return;
        dl.innerHTML = '';
        if (typeof CUSTOMERS === 'undefined') return;
        CUSTOMERS.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.name || '';
            opt.setAttribute('data-phone', c.phone || '');
            dl.appendChild(opt);
        });
    };

    var custNameInput = document.getElementById('custName');
    if (custNameInput) {
        custNameInput.addEventListener('input', function() {
            if (typeof CUSTOMERS === 'undefined') return;
            var val = custNameInput.value.trim().toLowerCase();
            var match = CUSTOMERS.find(function(c) { return (c.name || '').toLowerCase() === val; });
            if (match) {
                var phoneEl = document.getElementById('custPhone');
                if (phoneEl && !phoneEl.value) phoneEl.value = match.phone || '';
            }
        });
    }

    function getPaymentMode() {
        return document.querySelector('#paymentModePills button.active')?.dataset.payment || 'single';
    }

    function updatePaymentModeFields() {
        const mode = getPaymentMode();
        const singleSection = document.getElementById('singlePaymentFields');
        const splitSection = document.getElementById('splitPaymentFields');
        if (singleSection) singleSection.style.display = mode === 'single' ? '' : 'none';
        if (splitSection) splitSection.style.display = mode === 'split' ? '' : 'none';
    }

    function getTotalPaid() {
        if (getPaymentMode() === 'split') {
            const cash = parseFloat(document.getElementById('cashPaidInput')?.value) || 0;
            const online = parseFloat(document.getElementById('onlinePaidInput')?.value) || 0;
            return { total: cash + online, cash, online };
        }
        const paid = parseFloat(document.getElementById('paidInput')?.value) || 0;
        return { total: paid, cash: 0, online: 0 };
    }

    function updatePaymentAllocation(total, paid, cash, online) {
        const allocationText = document.getElementById('paymentAllocationText');
        const allocationDetail = document.getElementById('paymentAllocationDetail');
        if (!allocationText || !allocationDetail) return;
        if (paid === total) {
            allocationText.textContent = 'Fully allocated';
            allocationDetail.textContent = getPaymentMode() === 'split' ? `Cash ${formatMoney(cash)} · Online ${formatMoney(online)}` : `All ${formatMoney(paid)}`;
        } else if (paid < total) {
            allocationText.textContent = 'Pending';
            allocationDetail.textContent = `Due ${formatMoney(total - paid)}`;
        } else {
            allocationText.textContent = 'Overpaid';
            allocationDetail.textContent = `Overpaid by ${formatMoney(paid - total)}`;
        }
    }

    const paymentModePills = document.querySelectorAll('#paymentModePills button');
    paymentModePills.forEach(btn => btn.addEventListener('click', () => {
        paymentModePills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePaymentModeFields();
        recalcSummary();
    }));
    updatePaymentModeFields();

    ['discountInput','gstInput','paidInput','cashPaidInput','onlinePaidInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', recalcSummary);
    });

    // Make static line items recalculate too
    document.querySelectorAll('#lineItemsContainer input').forEach(inp => {
        inp.addEventListener('input', () => recalcSummary());
    });

    /* ============================================================
       GENERATE BILL button
    ============================================================ */
    const generateBtn = document.getElementById('generateBillBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const custName = document.getElementById('custName')?.value?.trim();
            const custPhone = document.getElementById('custPhone')?.value?.trim();
            const shipTo = document.getElementById('shipTo')?.value?.trim();
            const billTo = document.getElementById('billTo')?.value?.trim();
            if (!custName) { toast('Please enter customer name', 'alert-circle'); return; }
            const invNum = 'INV-' + String(Math.floor(Math.random()*900)+88).padStart(5,'0');

            const items = [];
            document.querySelectorAll('#lineItemsContainer .li-row').forEach(row => {
                const name = row.querySelector('.li-name')?.value?.trim() || '';
                const qty = parseFloat(row.querySelector('.li-qty')?.value) || 0;
                const price = parseFloat(row.querySelector('.li-price')?.value) || 0;
                const unit = row.querySelector('.li-unit')?.value || '';
                const amountText = row.querySelector('.li-amount')?.textContent || '';
                const amount = parseFloat(amountText.replace(/[^0-9.-]+/g,'')) || (qty * price);
                if (name) items.push({ name, qty, price, unit, amount });
            });

            const subtotal = parseFloat((document.getElementById('previewSubtotal')?.textContent || '').replace(/[^0-9.-]+/g,'')) || 0;
            const gstPercent = parseFloat(document.getElementById('gstInput')?.value) || 0;
            const gstAmount = parseFloat((document.getElementById('previewGst')?.textContent || '').replace(/[^0-9.-]+/g,'')) || 0;
            const total = parseFloat((document.getElementById('previewTotal')?.textContent || '').replace(/[^0-9.-]+/g,'')) || (subtotal + gstAmount);
            const paidInfo = getTotalPaid();
            const paid = paidInfo.total;
            const status = paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Outstanding');
            const type = detectType(items.map(i => i.name).join(' ')) === 'counter' ? 'Counter' : 'Normal';

            const billObj = stampRecord({ inv: invNum, date: localDateStr(new Date()), customer: custName, phone: custPhone, shipTo, billTo, items, subtotal, gst: gstAmount, gstPercent, total, paid, status, type });

            const itemsHtml = items.map(item => {
                const name = item.name || '';
                const detail = `${item.qty || 0} ${item.unit || ''} × ₹${(item.price || 0).toLocaleString('en-IN')} = ₹${(item.amount || 0).toLocaleString('en-IN')}`;
                return `
                    <div class="flex justify-between items-center py-1 text-sm border-b border-gray-100 last:border-b-0" style="border-color:var(--border)">
                        <span class="font-medium">${name}</span>
                        <span class="tabular-nums text-xs" style="color:var(--text-muted)">${detail}</span>
                    </div>
                `;
            }).join('');

            const totalText = document.getElementById('previewTotal')?.textContent || '—';

            try {
                await saveBillToServer(billObj);
                if (typeof window.deductInventoryFromBill === 'function') window.deductInventoryFromBill(items);
                resetNewBillForm();
                openModal(`
                    <div class="font-serif text-2xl font-bold mb-1">Bill Generated!</div>
                    <div class="text-sm mb-5" style="color:var(--text-muted)">Invoice created successfully</div>
                    <div style="background:var(--surface-tint);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px">
                        <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Invoice #</span><span class="font-mono font-bold" style="color:var(--primary)">${invNum}</span></div>
                        <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Customer</span><span class="font-semibold">${custName}</span></div>
                        <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Contact</span><span class="font-mono">${custPhone||'—'}</span></div>
                        <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Ship To</span><span class="font-mono">${shipTo||'—'}</span></div>
                        <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Bill To</span><span class="font-mono">${billTo||'—'}</span></div>
                        
                        <!-- Purchased Items List -->
                        <div class="mt-3 pt-3 border-t" style="border-color:var(--border)">
                            <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--text-muted)">Items Purchased</div>
                            <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
                                ${itemsHtml || '<div class="text-xs" style="color:var(--text-subtle)">No items</div>'}
                            </div>
                        </div>

                        <div class="flex justify-between mt-3 pt-3 border-t" style="border-color:var(--border)"><span style="color:var(--text-muted)">Total</span><span class="font-serif font-bold text-xl" style="color:var(--primary)">${totalText}</span></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <button class="btn btn-secondary text-sm" onclick="toast('PDF downloaded');closeModal()"><i data-lucide="download" class="w-4 h-4"></i> PDF</button>
                        <button class="btn text-sm" style="background:#f0fdf4;color:#16a34a;border:1px solid #86efac" onclick="toast('Shared on WhatsApp!');closeModal()"><i data-lucide="message-circle" class="w-4 h-4"></i> WA</button>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button class="btn btn-secondary flex-1" onclick="window.printBillByInvoice('${invNum}');closeModal()"><i data-lucide="printer" class="w-4 h-4"></i> Print</button>
                        <button class="btn btn-primary flex-1" onclick="closeModal()"><i data-lucide="check" class="w-4 h-4"></i> Done</button>
                    </div>
                `);
                toast('Bill saved', 'check-circle');
                logActivity('Bill Created', 'Generated <span class="font-mono font-bold" style="color:var(--primary)">' + invNum + '</span> for ' + custName + ' · ₹ ' + Math.round(total).toLocaleString('en-IN'));
            } catch (e) {
                console.error('saveBillToServer failed:', e);
                // Fallback: save locally so user can continue working offline
                try {
                    billObj._offline = true;
                    addBill(billObj);
                    if (typeof window.deductInventoryFromBill === 'function') window.deductInventoryFromBill(items);
                    resetNewBillForm();
                    openModal(`
                        <div class="font-serif text-2xl font-bold mb-1">Bill Generated (Offline)</div>
                        <div class="text-sm mb-5" style="color:var(--text-muted)">Saved locally because the backend is unavailable.</div>
                        <div style="background:var(--surface-tint);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px">
                            <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Invoice #</span><span class="font-mono font-bold" style="color:var(--primary)">${invNum}</span></div>
                            <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Customer</span><span class="font-semibold">${custName}</span></div>
                            <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Contact</span><span class="font-mono">${custPhone||'—'}</span></div>
                            <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Ship To</span><span class="font-mono">${shipTo||'—'}</span></div>
                            <div class="flex justify-between mb-2"><span style="color:var(--text-muted)">Bill To</span><span class="font-mono">${billTo||'—'}</span></div>
                            
                            <!-- Purchased Items List -->
                            <div class="mt-3 pt-3 border-t" style="border-color:var(--border)">
                                <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--text-muted)">Items Purchased</div>
                                <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
                                    ${itemsHtml || '<div class="text-xs" style="color:var(--text-subtle)">No items</div>'}
                                </div>
                            </div>

                            <div class="flex justify-between mt-3 pt-3 border-t" style="border-color:var(--border)"><span style="color:var(--text-muted)">Total</span><span class="font-serif font-bold text-xl" style="color:var(--primary)">${totalText}</span></div>
                        </div>
                        <div class="flex gap-2 mt-4">
                            <button class="btn btn-secondary flex-1" onclick="window.printBillByInvoice('${invNum}');closeModal()"><i data-lucide="printer" class="w-4 h-4"></i> Print</button>
                            <button class="btn btn-primary flex-1" onclick="closeModal()"><i data-lucide="check" class="w-4 h-4"></i> Done</button>
                        </div>
                    `);
                    toast('Saved locally (offline)', 'check-circle');
                    logActivity('Bill Created', 'Generated <span class="font-mono font-bold" style="color:var(--primary)">' + invNum + '</span> for ' + custName + ' · ₹ ' + Math.round(total).toLocaleString('en-IN') + ' (offline)');
                } catch (e2) {
                    console.error('Local fallback failed:', e2);
                    toast('Unable to save bill (server and local fallback failed)', 'alert-circle');
                }
            }
        });
    }

    /* ============================================================
       PRINT / PDF / WA buttons (invoice preview area)
    ============================================================ */
    document.querySelectorAll('#page-new-bill .btn.btn-secondary').forEach(btn => {
        const text = btn.textContent.trim();
        if (text.includes('Print'))      btn.addEventListener('click', () => toast('Sent to printer'));
        else if (text.includes('PDF'))   btn.addEventListener('click', () => toast('PDF downloaded'));
    });
    const waBtn = document.querySelector('#page-new-bill .btn[style*="16a34a"]');
    if (waBtn) waBtn.addEventListener('click', () => toast('Shared on WhatsApp!'));

    /* ============================================================
       BILLS PAGE — search + filter + Export CSV/PDF
    ============================================================ */
    // Wired to the unified filterBills function
    document.getElementById('bill-search-input')?.addEventListener('input', () => { if (typeof filterBills === 'function') filterBills(); });
    document.getElementById('bill-status-select')?.addEventListener('change', () => { if (typeof filterBills === 'function') filterBills(); });

    // Export CSV for Bills
    const billBtns = document.querySelectorAll('#page-bills .page-header .btn');
    billBtns.forEach(btn => {
        const txt = btn.textContent.trim();
        if (txt.includes('Export CSV')) btn.addEventListener('click', () => exportBillsCSV());
        else if (txt.includes('Export PDF')) btn.addEventListener('click', () => toast('PDF report prepared — check your downloads', 'file-text'));
    });

    function exportBillsCSV() {
        const headers = ['Bill #','Date','Customer','Type','Created By','Total','Paid','Status'];
        const rows = [];
        document.querySelectorAll('#page-bills tbody tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            rows.push([
                cells[0]?.textContent.trim(),
                cells[1]?.textContent.trim(),
                cells[2]?.textContent.trim(),
                cells[3]?.textContent.trim(),
                cells[4]?.textContent.trim(),
                cells[5]?.textContent.trim(),
                cells[6]?.textContent.trim(),
                cells[7]?.textContent.trim(),
            ]);
        });
        const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href=url; a.download='bills_export.csv'; a.click();
        URL.revokeObjectURL(url);
        toast('CSV downloaded');
    }

    /* ============================================================
       CUSTOMERS — search + New Customer + View Profile
    ============================================================ */
    const custSearch = document.querySelector('#page-customers .input[placeholder*="Search by name"]');
    if (custSearch) {
        custSearch.addEventListener('input', () => {
            const q = custSearch.value.toLowerCase();
            document.querySelectorAll('#page-customers .customer-card').forEach(card => {
                card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    // New Customer button
    const newCustBtn = document.querySelector('#page-customers .btn.btn-primary');
    if (newCustBtn) {
        newCustBtn.addEventListener('click', () => openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Add New Customer</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Create a new customer profile</div>
            <div class="space-y-4">
                <div><label class="label">Customer Name <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="nc-name" placeholder="Full name or business name" /></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="label">Phone</label><input class="input font-mono" id="nc-phone" placeholder="+91 XXXXX XXXXX" /></div>
                    <div><label class="label">Email</label><input class="input" id="nc-email" placeholder="email@example.com" /></div>
                </div>
                <div><label class="label">GSTIN (Optional)</label><input class="input font-mono" id="nc-gst" placeholder="29ABCDE1234F1Z5" /></div>
                <button class="btn btn-primary w-full mt-2" onclick="saveNewCustomer()"><i data-lucide="user-plus" class="w-4 h-4"></i> Save Customer</button>
            </div>
        `));
    }

    async function saveNewCustomer() {
        const name = document.getElementById('nc-name')?.value.trim();
        const phone = document.getElementById('nc-phone')?.value.trim();
        const email = document.getElementById('nc-email')?.value.trim();
        const gst = document.getElementById('nc-gst')?.value.trim();
        if (!name) { toast('Customer name is required', 'alert-circle'); return; }
        try {
            await saveCustomerToServer({ name, phone, email, gst });
            document.getElementById('modalOverlay').style.display = 'none';
            toast(`Customer "${name}" added`, 'check-circle');
            logActivity('Customer Added', 'Added new customer: <strong>' + name + '</strong>');
        } catch (e) {
            console.error(e);
            toast('Unable to save customer to server', 'alert-circle');
        }
    }

    // Customer bill history data
    const CUSTOMER_BILLS = {};

    function statusBadgeClass(s) {
        if (s==='Paid') return 'badge-paid';
        if (s==='Partial') return 'badge-partial';
        return 'badge-outstanding';
    }

    // View Profile buttons — handled by openCustomerProfile() below

    /* ============================================================
       REPORTS — tab switching, date shortcuts, generate, CSV export
    ============================================================ */
    const rptTabs = document.getElementById('rpt-tabs');
    if (rptTabs) {
        rptTabs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                rptTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const key = btn.dataset.rpt;
                ['counter','normal','gst','stock','expenses'].forEach(k => {
                    const panel = document.getElementById('rpt-panel-' + k);
                    if (panel) panel.style.display = (k === key) ? '' : 'none';
                });
            });
        });
    }

    const rptStart = document.getElementById('rpt-start');
    const rptEnd   = document.getElementById('rpt-end');

    // Use local date string to avoid UTC timezone offset (e.g. India UTC+5:30 showing wrong date)
    function localDateStr(d) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + mo + '-' + day;
    }

    const COUNTER_MATERIAL_NAMES = [
        '130 gsm', '170 gsm', '220 gsm', '250 gsm', '300 gsm', '350 gsm', '400 gsm',
        'maplitho', 'bound',
        'pvc', 'normal sticker', 'thick sticker', 'transparent sticker'
    ];

    function isCounterItem(itemName) {
        const n = (itemName || '').toLowerCase();
        return COUNTER_MATERIAL_NAMES.some(function(mat) {
            return n.includes(mat);
        });
    }

    function classifyBillItems(b) {
        var items = b.items || [];
        var billTotal = Number(b.total) || 0;
        var billPaid = Number(b.paid) || 0;
        var billGst = Number(b.gst) || 0;
        var counterItems = [], normalItems = [];
        var counterAmt = 0, normalAmt = 0;
        items.forEach(function(item) {
            var amt = Number(item.amount) || 0;
            if (isCounterItem(item.name)) { counterItems.push(item); counterAmt += amt; }
            else { normalItems.push(item); normalAmt += amt; }
        });
        if (items.length === 0) {
            if (b.type && b.type.toLowerCase() === 'counter') counterAmt = billTotal;
            else normalAmt = billTotal;
        }
        var sub = counterAmt + normalAmt;
        var cShare = sub > 0 ? counterAmt / sub : 0;
        var nShare = sub > 0 ? normalAmt / sub : 0;
        return {
            counterItems: counterItems, normalItems: normalItems,
            counterAmt: counterAmt, normalAmt: normalAmt,
            counterFull: counterAmt + billGst * cShare,
            normalFull: normalAmt + billGst * nShare,
            counterGst: billGst * cShare, normalGst: billGst * nShare,
            counterPaid: billPaid * cShare, normalPaid: billPaid * nShare
        };
    }

    function renderBarChart(containerId, dailyData, color) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var labels = Object.keys(dailyData).sort();
        if (!labels.length) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:14px">No data for this period</div>';
            return;
        }
        var values = labels.map(function(k) { return dailyData[k]; });
        var maxVal = Math.max.apply(null, values) || 1;
        var W = 760, H = 220, padL = 55, padR = 15, padT = 20, padB = 40;
        var chartW = W - padL - padR, chartH = H - padT - padB;
        var barW = Math.min(40, Math.max(12, Math.floor(chartW / labels.length) - 6));
        var gap = (chartW - barW * labels.length) / (labels.length + 1);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var gridLines = '';
        for (var g = 0; g <= 4; g++) {
            var gy = padT + (chartH * g / 4);
            var gv = Math.round(maxVal * (4 - g) / 4);
            gridLines += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#e8e0d0" stroke-width="1" stroke-dasharray="3 4"/>';
            gridLines += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" font-weight="600" fill="#9d96aa">₹' + (gv >= 1000 ? Math.round(gv / 1000) + 'k' : gv) + '</text>';
        }
        var bars = '';
        labels.forEach(function(dateStr, i) {
            var v = values[i];
            var barH = (v / maxVal) * chartH;
            var x = padL + gap + i * (barW + gap);
            var y = padT + chartH - barH;
            bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="4" fill="' + color + '" opacity="0.85"/>';
            if (v > 0) bars += '<text x="' + (x + barW / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" font-weight="700" fill="' + color + '">₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v) + '</text>';
            var d = new Date(dateStr + 'T00:00:00');
            var lbl = d.getDate() + ' ' + months[d.getMonth()];
            bars += '<text x="' + (x + barW / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="' + (labels.length > 14 ? 7 : labels.length > 7 ? 8 : 10) + '" font-weight="600" fill="#6b6478">' + lbl + '</text>';
        });
        container.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:' + H + 'px;display:block">' + gridLines + bars + '</svg>';
    }

    window.openReportBillDetail = function(inv, category) {
        var bill = BILLS.find(function(b) { return b.inv === inv; });
        if (!bill) { toast('Bill not found', 'alert-circle'); return; }
        var items = bill.items || [];
        var filtered = items.filter(function(item) {
            return category === 'counter' ? isCounterItem(item.name) : !isCounterItem(item.name);
        });
        if (!filtered.length && items.length === 0) {
            filtered = [{ name: bill.type || 'Item', qty: 1, price: Number(bill.total) || 0, unit: '', amount: Number(bill.total) || 0 }];
        }
        var itemsHtml = filtered.map(function(item) {
            return '<div class="flex justify-between items-center py-2 text-sm" style="border-bottom:1px solid var(--border)">'
                + '<span class="font-medium">' + (item.name || '') + '</span>'
                + '<span class="tabular text-xs" style="color:var(--text-muted)">' + (item.qty || 0) + ' ' + (item.unit || '') + ' × ₹' + (Number(item.price) || 0).toLocaleString('en-IN') + ' = ₹' + (Number(item.amount) || 0).toLocaleString('en-IN') + '</span>'
                + '</div>';
        }).join('');
        var label = category === 'counter' ? 'Counter Items' : 'Normal Items';
        var total = filtered.reduce(function(s, it) { return s + (Number(it.amount) || 0); }, 0);
        openModal(
            '<div class="font-serif text-2xl font-bold mb-1">' + inv + '</div>'
            + '<div class="text-sm mb-1" style="color:var(--text-muted)">' + (bill.customer || '') + ' · ' + formatShortDate(bill.date) + '</div>'
            + '<div class="mb-4"><span class="badge badge-' + (category === 'counter' ? 'admin' : 'job') + '">' + label + '</span></div>'
            + '<div style="background:var(--surface-tint);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">'
            + '<div class="text-xs font-bold uppercase tracking-widest mb-3" style="color:var(--text-muted)">Items in this ' + category + ' report</div>'
            + '<div class="max-h-60 overflow-y-auto">' + (itemsHtml || '<div class="text-sm" style="color:var(--text-subtle)">No items</div>') + '</div>'
            + '<div class="flex justify-between mt-3 pt-3" style="border-top:1px solid var(--border)"><span class="font-semibold" style="color:var(--text-muted)">Subtotal</span><span class="font-serif font-bold text-lg" style="color:var(--primary)">₹ ' + total.toLocaleString('en-IN') + '</span></div>'
            + '</div>'
            + '<button class="btn btn-primary w-full" onclick="closeModal()"><i data-lucide="check" class="w-4 h-4"></i> Close</button>'
        );
    };

    function generateReport() {
        var s = rptStart ? rptStart.value : '';
        var e = rptEnd ? rptEnd.value : '';
        if (!s || !e) { toast('Please select a date range', 'alert-circle'); return; }
        var startDate = new Date(s + 'T00:00:00');
        var endDate   = new Date(e + 'T23:59:59');
        if (startDate > endDate) { toast('Start date must be before end date', 'alert-circle'); return; }
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var fmt = function(d) { return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear(); };

        var staffSel = document.getElementById('rpt-staff');
        var staffVal = staffSel ? staffSel.value : 'all';

        var filtered = BILLS.filter(function(b) {
            var rawDate = (b.date || '').split('T')[0];
            var bd = new Date(rawDate + 'T00:00:00');
            if (isNaN(bd)) return false;
            if (bd < startDate || bd > endDate) return false;
            if (staffVal && staffVal !== 'all') {
                var by = (b.createdBy || '').toLowerCase();
                if (by.indexOf(staffVal.toLowerCase()) === -1) return false;
            }
            return true;
        });

        var counterRows = [], normalRows = [], gstRows = [];
        var cBillsCount=0, cTotal=0, cPaid=0, cGst=0;
        var nBillsCount=0, nTotal=0, nPaid=0, nOutstanding=0;
        var gBillsCount=0, gTaxable=0, gTax=0;
        var counterDaily = {}, normalDaily = {};

        filtered.forEach(function(b) {
            var billGst = Number(b.gst) || 0;
            var c = classifyBillItems(b);
            var dateKey = (b.date || '').split('T')[0];

            var statusLower = (b.status || '').toLowerCase();
            var statusBadge = statusLower.includes('paid') && !statusLower.includes('partial') && !statusLower.includes('outstanding')
                ? '<span class="badge badge-paid">Paid</span>'
                : statusLower.includes('partial')
                    ? '<span class="badge badge-partial">Partial</span>'
                    : '<span class="badge badge-outstanding">Outstanding</span>';

            if (c.counterAmt > 0) {
                counterDaily[dateKey] = (counterDaily[dateKey] || 0) + Math.round(c.counterFull);
                counterRows.push('<tr style="cursor:pointer" onclick="openReportBillDetail(\'' + b.inv + '\',\'counter\')">'
                    + '<td class="font-mono font-bold" style="color:var(--primary)">' + b.inv + '</td>'
                    + '<td style="color:var(--text-muted)">' + formatShortDate(b.date) + '</td>'
                    + '<td class="font-semibold">' + (b.customer||'') + '</td>'
                    + '<td>' + (b.createdBy||'') + '</td>'
                    + '<td class="tabular font-bold" style="text-align:right">₹ ' + Math.round(c.counterFull).toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + Math.round(c.counterGst).toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + Math.round(c.counterPaid).toLocaleString('en-IN') + '</td>'
                    + '<td>' + statusBadge + '</td>'
                    + '</tr>');
                cBillsCount++; cTotal += c.counterFull; cPaid += c.counterPaid; cGst += c.counterGst;
            }

            if (c.normalAmt > 0) {
                normalDaily[dateKey] = (normalDaily[dateKey] || 0) + Math.round(c.normalFull);
                normalRows.push('<tr style="cursor:pointer" onclick="openReportBillDetail(\'' + b.inv + '\',\'normal\')">'
                    + '<td class="font-mono font-bold" style="color:var(--primary)">' + b.inv + '</td>'
                    + '<td style="color:var(--text-muted)">' + formatShortDate(b.date) + '</td>'
                    + '<td class="font-semibold">' + (b.customer||'') + '</td>'
                    + '<td>' + (b.createdBy||'') + '</td>'
                    + '<td class="tabular font-bold" style="text-align:right">₹ ' + Math.round(c.normalFull).toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + Math.round(c.normalGst).toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + Math.round(c.normalPaid).toLocaleString('en-IN') + '</td>'
                    + '<td>' + statusBadge + '</td>'
                    + '</tr>');
                nBillsCount++; nTotal += c.normalFull; nPaid += c.normalPaid; nOutstanding += Math.max(0, c.normalFull - c.normalPaid);
            }

            if (billGst > 0) {
                var billTotal = Number(b.total) || 0;
                var taxableAmt = Number(b.subtotal) || (billTotal - billGst);
                var cgst = billGst / 2, sgst = billGst / 2;
                var gstin = b.gstin || b.gstNumber || '—';
                gstRows.push('<tr>'
                    + '<td class="font-mono font-bold" style="color:var(--primary)">' + b.inv + '</td>'
                    + '<td style="color:var(--text-muted)">' + formatShortDate(b.date) + '</td>'
                    + '<td class="font-semibold">' + (b.customer||'') + '</td>'
                    + '<td class="font-mono">' + gstin + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + taxableAmt.toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + cgst.toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular" style="text-align:right">₹ ' + sgst.toLocaleString('en-IN') + '</td>'
                    + '<td class="tabular font-bold" style="text-align:right;color:var(--primary)">₹ ' + billGst.toLocaleString('en-IN') + '</td>'
                    + '</tr>');
                gBillsCount++; gTaxable += taxableAmt; gTax += billGst;
            }
        });

        renderBarChart('rpt-counter-chart', counterDaily, '#424C7A');
        renderBarChart('rpt-normal-chart', normalDaily, '#A64833');

        var counterBody = document.getElementById('rpt-counter-body');
        var normalBody  = document.getElementById('rpt-normal-body');
        var gstBody     = document.getElementById('rpt-gst-body');
        if (counterBody) counterBody.innerHTML = counterRows.length ? counterRows.join('') : '<tr><td colspan="8" class="text-center" style="color:var(--text-muted)">No counter sales in this period.</td></tr>';
        if (normalBody)  normalBody.innerHTML  = normalRows.length  ? normalRows.join('')  : '<tr><td colspan="8" class="text-center" style="color:var(--text-muted)">No normal sales in this period.</td></tr>';
        if (gstBody)     gstBody.innerHTML     = gstRows.length     ? gstRows.join('')     : '<tr><td colspan="8" class="text-center" style="color:var(--text-muted)">No GST bills in this period.</td></tr>';

        var cPanel = document.getElementById('rpt-panel-counter');
        if (cPanel) {
            var cards = cPanel.querySelectorAll('.stat');
            if (cards[0]) cards[0].querySelector('.stat-value').textContent = cBillsCount;
            if (cards[1]) cards[1].querySelector('.stat-value').textContent = '₹ ' + Math.round(cTotal).toLocaleString('en-IN');
            if (cards[2]) cards[2].querySelector('.stat-value').textContent = '₹ ' + Math.round(cPaid).toLocaleString('en-IN');
            if (cards[3]) cards[3].querySelector('.stat-value').textContent = '₹ ' + Math.round(cGst).toLocaleString('en-IN');
        }
        var nPanel = document.getElementById('rpt-panel-normal');
        if (nPanel) {
            var cards = nPanel.querySelectorAll('.stat');
            if (cards[0]) cards[0].querySelector('.stat-value').textContent = nBillsCount;
            if (cards[1]) cards[1].querySelector('.stat-value').textContent = '₹ ' + Math.round(nTotal).toLocaleString('en-IN');
            if (cards[2]) cards[2].querySelector('.stat-value').textContent = '₹ ' + Math.round(nPaid).toLocaleString('en-IN');
            if (cards[3]) cards[3].querySelector('.stat-value').textContent = '₹ ' + Math.round(nOutstanding).toLocaleString('en-IN');
        }
        var gPanel = document.getElementById('rpt-panel-gst');
        if (gPanel) {
            var cards = gPanel.querySelectorAll('.stat');
            if (cards[0]) cards[0].querySelector('.stat-value').textContent = '₹ ' + gTaxable.toLocaleString('en-IN');
            if (cards[1]) cards[1].querySelector('.stat-value').textContent = '₹ ' + (gTax/2).toLocaleString('en-IN');
            if (cards[2]) cards[2].querySelector('.stat-value').textContent = '₹ ' + (gTax/2).toLocaleString('en-IN');
            if (cards[3]) cards[3].querySelector('.stat-value').textContent = '₹ ' + gTax.toLocaleString('en-IN');
        }

        var span = document.getElementById('rpt-staff-count');
        if (span) span.textContent = String(filtered.length);

        var gstCount = document.getElementById('gst-summary-count');
        var gstSumTaxable = document.getElementById('gst-summary-taxable');
        var gstSumTax = document.getElementById('gst-summary-tax');
        if (gstCount) gstCount.textContent = gBillsCount;
        if (gstSumTaxable) gstSumTaxable.textContent = '₹ ' + gTaxable.toLocaleString('en-IN');
        if (gstSumTax) gstSumTax.textContent = '₹ ' + gTax.toLocaleString('en-IN');

        generateExpensesReport(startDate, endDate);

        toast('Report generated: ' + fmt(startDate) + ' to ' + fmt(endDate), 'check-circle');
    }


    document.getElementById('rpt-today') && document.getElementById('rpt-today').addEventListener('click', function() {
        var today = localDateStr(new Date());
        if (rptStart) rptStart.value = today;
        if (rptEnd)   rptEnd.value   = today;
        generateReport();
        toast('Date set to today — showing today\'s bills', 'calendar');
    });

    document.getElementById('rpt-month') && document.getElementById('rpt-month').addEventListener('click', function() {
        var now = new Date();
        var y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
        if (rptStart) rptStart.value = y + '-' + m + '-01';
        if (rptEnd)   rptEnd.value   = localDateStr(now);
        generateReport();
        toast('Date set to this month', 'calendar-days');
    });

    document.getElementById('rpt-generate') && document.getElementById('rpt-generate').addEventListener('click', function() {
        generateReport();
    });

    // wire staff selector to re-run reports
    const rptStaffSel = document.getElementById('rpt-staff');
    if (rptStaffSel) {
        rptStaffSel.addEventListener('change', function() { generateReport(); });
    }

    window.exportRptPDF = function(type) {
        var panelId = {counter:'rpt-panel-counter', normal:'rpt-panel-normal', gst:'rpt-panel-gst', stock:'rpt-panel-stock', expenses:'rpt-panel-expenses', bills:'bills-table'}[type];
        var el = document.getElementById(panelId === 'bills-table' ? 'bills-table' : panelId);
        var table = el;
        if (table && table.tagName !== 'TABLE') table = table.querySelector('table');
        if (!table) { toast('No data to export', 'alert-circle'); return; }
        var title = { counter:'Counter Sales Report', normal:'Normal Sales Report', gst:'GST Report', stock:'Stock Valuation', expenses:'Expenses Report', bills:'All Bills' }[type] || 'Report';
        var headers = [];
        table.querySelectorAll('thead th').forEach(function(th) {
            if (!th.classList.contains('admin-only-view') || (CURRENT_USER && CURRENT_USER.role === 'admin')) {
                var t = th.textContent.trim();
                if (t && t !== 'Actions') headers.push(t);
            }
        });
        var rows = [];
        table.querySelectorAll('tbody tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var row = [];
            tr.querySelectorAll('td').forEach(function(td) {
                if (!td.classList.contains('admin-only-view') || (CURRENT_USER && CURRENT_USER.role === 'admin')) {
                    var t = td.textContent.trim();
                    if (td.querySelector('.bill-delete-btn')) return;
                    row.push(t);
                }
            });
            if (row.length) rows.push(row);
        });
        try {
            var jsPDF = window.jspdf.jsPDF;
            var doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });
            doc.setFontSize(18);
            doc.text(title, 14, 20);
            doc.setFontSize(10);
            doc.setTextColor(130);
            doc.text('Smart Friends · Generated on ' + new Date().toLocaleString('en-IN'), 14, 28);
            doc.autoTable({ head: [headers], body: rows, startY: 34, styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [166, 72, 51], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [250, 247, 243] } });
            doc.save(type + '_report.pdf');
            toast(title + ' downloaded', 'check-circle');
        } catch(e) {
            console.error('PDF generation failed', e);
            toast('PDF download failed — check console', 'alert-circle');
        }
    };

    window.exportRptCSV = function(type) {
        const panelId = {counter:'rpt-panel-counter', normal:'rpt-panel-normal', gst:'rpt-panel-gst', stock:'rpt-panel-stock', expenses:'rpt-panel-expenses', bills:'page-bills'}[type];
        const panel = document.getElementById(panelId);
        if (!panel) { toast('Export failed', 'alert-circle'); return; }
        const table = panel.querySelector('table');
        if (!table) { toast('No data to export', 'alert-circle'); return; }
        const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
        const rows = [...table.querySelectorAll('tbody tr')].map(tr =>
            [...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
        const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type:'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href=url; a.download=`${type}_report.csv`; a.click();
        URL.revokeObjectURL(url);
        toast(`${type} CSV downloaded`);
    };

    /* ============================================================
       EXPENSES STORAGE + RENDERING
    ============================================================ */
    const EXPENSE_ENTRIES = [];

    function formatMoney(value) {
        return '₹ ' + Number(value).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
    }

    function renderExpenseTable() {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!EXPENSE_ENTRIES.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--text-muted)">No expenses recorded yet.</td></tr>';
            return;
        }
        EXPENSE_ENTRIES.slice().reverse().forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.category === 'shop' ? 'Shop' : 'Personal'}</td>
                <td>${entry.description}</td>
                <td class="text-right">${formatMoney(entry.amount)}</td>
                <td>${entry.notes || '—'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function renderExpensesReport() {
        generateExpensesReport(null, null);
    }

    function generateExpensesReport(startDate, endDate) {
        const body = document.getElementById('rpt-expenses-body');
        const totalEl = document.getElementById('rpt-exp-total');
        const shopEl = document.getElementById('rpt-exp-shop');
        const personalEl = document.getElementById('rpt-exp-personal');
        const countEl = document.getElementById('rpt-exp-count');
        if (!body || !totalEl || !shopEl || !personalEl || !countEl) return;

        const entries = EXPENSE_ENTRIES.filter(function(entry) {
            if (!startDate || !endDate) return true;
            const ed = new Date((entry.date || '') + 'T00:00:00');
            if (isNaN(ed)) return false;
            return ed >= startDate && ed <= endDate;
        });

        let total = 0, shopTotal = 0, personalTotal = 0;
        body.innerHTML = '';
        if (!entries.length) {
            body.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--text-muted)">No expenses in this period.</td></tr>';
        } else {
            entries.slice().reverse().forEach(entry => {
                total += entry.amount;
                if (entry.category === 'shop') shopTotal += entry.amount;
                else personalTotal += entry.amount;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entry.date}</td>
                    <td>${entry.category === 'shop' ? 'Shop' : 'Personal'}</td>
                    <td>${entry.description}</td>
                    <td class="text-right">${formatMoney(entry.amount)}</td>
                    <td>${entry.createdBy || '—'}</td>
                    <td>${entry.notes || '—'}</td>
                `;
                body.appendChild(row);
            });
        }
        totalEl.textContent = formatMoney(total);
        shopEl.textContent = formatMoney(shopTotal);
        personalEl.textContent = formatMoney(personalTotal);
        countEl.textContent = String(entries.length);
    }

    function syncExpenseViews() {
        renderExpenseTable();
        renderExpensesReport();
    }

    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', async () => {
            const category = document.getElementById('expenseCategory')?.value || 'shop';
            const date = document.getElementById('expenseDate')?.value || '';
            const description = document.getElementById('expenseDescription')?.value.trim() || '';
            const amount = parseFloat(document.getElementById('expenseAmount')?.value) || 0;
            const notes = document.getElementById('expenseNotes')?.value.trim() || '';
            if (!date) { toast('Please select an expense date', 'alert-circle'); return; }
            if (!description) { toast('Please enter a description', 'alert-circle'); return; }
            if (amount <= 0) { toast('Please enter a valid amount', 'alert-circle'); return; }
            try {
                    await saveExpenseToServer(stampRecord({ category, date, description, amount, notes }));
                    document.getElementById('expenseDescription').value = '';
                    document.getElementById('expenseAmount').value = '';
                    document.getElementById('expenseNotes').value = '';
                    toast('Expense saved', 'check-circle');
                    logActivity('Expense Added', description + ' · ₹ ' + amount.toLocaleString('en-IN'));
            } catch (e) {
                console.error(e);
                    // fallback: save expense locally for later sync
                    try {
                        const entry = stampRecord({ category, date, description, amount, notes, _offline: true });
                        EXPENSE_ENTRIES.push(entry);
                        saveOfflineExpense(entry);
                        syncExpenseViews();
                        document.getElementById('expenseDescription').value = '';
                        document.getElementById('expenseAmount').value = '';
                        document.getElementById('expenseNotes').value = '';
                        toast('Saved offline — will sync when backend is reachable', 'cloud-off');
                        logActivity('Expense Added', description + ' · ₹ ' + amount.toLocaleString('en-IN') + ' (offline)');
                    } catch (e2) {
                        console.error('offline save failed', e2);
                        toast('Unable to save expense to server', 'alert-circle');
                    }
            }
        });
    }

    const API_BASE = 'http://127.0.0.1:5000/api';
    let CURRENT_USER = null;

    function stampRecord(obj, isUpdate) {
        var now = localDateStr(new Date());
        var time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        var userName = (CURRENT_USER && CURRENT_USER.name) || document.getElementById('userName')?.textContent || 'System';
        var userRole = (CURRENT_USER && CURRENT_USER.role) || 'admin';
        var userEmail = (CURRENT_USER && CURRENT_USER.email) || '';
        if (isUpdate) {
            obj.lastUpdatedBy = userName;
            obj.lastUpdatedByRole = userRole;
            obj.lastUpdatedAt = now + ' ' + time;
        } else {
            obj.createdBy = userName;
            obj.createdByRole = userRole;
            obj.createdByEmail = userEmail;
            obj.createdAt = now + ' ' + time;
        }
        return obj;
    }

    const BILLS = [];
    const CUSTOMERS = [];
    const STAFF = [];
    const ACTIVITY_LOG = [];

    function logActivity(action, details) {
        var userName = (CURRENT_USER && CURRENT_USER.name) || document.getElementById('userName')?.textContent || 'System';
        var userRole = (CURRENT_USER && CURRENT_USER.role) || 'admin';
        var now = new Date();
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var timestamp = now.getDate() + ' ' + months[now.getMonth()] + ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        var entry = { user: userName, role: userRole, action: action, details: details, timestamp: timestamp, dateSort: now.toISOString() };
        ACTIVITY_LOG.push(entry);
        try { localStorage.setItem('fp_activity_log', JSON.stringify(ACTIVITY_LOG)); } catch(e) {}
        if (window._serverAvailable) { try { apiPost('/activity', entry); } catch(e) {} }
        renderActivityLog();
    }

    function loadActivityLog() {
        try {
            var s = localStorage.getItem('fp_activity_log');
            if (!s) return;
            var arr = JSON.parse(s);
            if (Array.isArray(arr)) { ACTIVITY_LOG.length = 0; ACTIVITY_LOG.push.apply(ACTIVITY_LOG, arr); }
        } catch(e) {}
    }

    function renderActivityLog() {
        var tbody = document.getElementById('activity-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!ACTIVITY_LOG.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">No activity logged yet.</td></tr>';
            return;
        }
        var entries = ACTIVITY_LOG.slice().reverse().slice(0, 50);
        entries.forEach(function(entry) {
            var initials = (entry.user || 'S').charAt(0).toUpperCase();
            var avatarBg = entry.role === 'admin' ? 'var(--gold-soft)' : 'var(--rose-soft)';
            var avatarColor = entry.role === 'admin' ? 'var(--gold-strong)' : 'var(--rose-text)';
            var avatarBorder = entry.role === 'admin' ? '#ecd99a' : '#f3c4ca';
            var badgeClass = 'badge-paid';
            var act = (entry.action || '').toLowerCase();
            if (act.includes('delete')) badgeClass = 'badge-outstanding';
            else if (act.includes('edit') || act.includes('update') || act.includes('payment')) badgeClass = 'badge-partial';
            else if (act.includes('login') || act.includes('logout')) badgeClass = 'badge-partial';
            var tr = document.createElement('tr');
            tr.setAttribute('data-staff', entry.user);
            tr.setAttribute('data-action', entry.action);
            tr.innerHTML = '<td class="font-mono text-xs" style="color:var(--text-muted)">' + (entry.timestamp || '') + '</td>'
                + '<td><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style="background:' + avatarBg + ';color:' + avatarColor + ';border:1px solid ' + avatarBorder + '">' + initials + '</div><span class="text-sm font-semibold">' + (entry.user || '') + '</span></div></td>'
                + '<td><span class="badge ' + badgeClass + '">' + (entry.action || '') + '</span></td>'
                + '<td class="text-sm">' + (entry.details || '') + '</td>'
                + '<td class="font-mono text-xs" style="color:var(--text-subtle)">' + (entry.role || '') + '</td>';
            tbody.appendChild(tr);
        });
    }

    function formatShortDate(dateStr) {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return isNaN(d) ? dateStr : (d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear());
    }

    async function fetchJson(url, options = {}) {
        const res = await fetch(url, options);
        const text = await res.text();
        if (!res.ok) {
            throw new Error(text || `${res.status} ${res.statusText}`);
        }
        try { return JSON.parse(text); } catch(e) { return text; }
    }

    async function apiGet(path) {
        return fetchJson(`${API_BASE}${path}`);
    }

    async function apiPost(path, payload) {
        return fetchJson(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    window._serverAvailable = false;

    async function loadServerData() {
        try {
            const [bills, customers, staff, expenses, inventory, activity] = await Promise.all([
                apiGet('/bills'),
                apiGet('/customers'),
                apiGet('/staff'),
                apiGet('/expenses'),
                apiGet('/inventory'),
                apiGet('/activity')
            ]);
            BILLS.length = 0; BILLS.push(...(Array.isArray(bills) ? bills : []));
            CUSTOMERS.length = 0; CUSTOMERS.push(...(Array.isArray(customers) ? customers : []));
            STAFF.length = 0; STAFF.push(...(Array.isArray(staff) ? staff : []));
            EXPENSE_ENTRIES.length = 0; EXPENSE_ENTRIES.push(...(Array.isArray(expenses) ? expenses : []));
            if (Array.isArray(inventory) && inventory.length) {
                INVENTORY_ITEMS.length = 0;
                INVENTORY_ITEMS.push(...inventory);
            }
            if (Array.isArray(activity) && activity.length) {
                ACTIVITY_LOG.length = 0;
                ACTIVITY_LOG.push(...activity);
            }
            window._serverAvailable = true;
        } catch (e) {
            console.error('Unable to load server data — using offline mode', e);
            window._serverAvailable = false;
        }
    }

    function renderBills() {
        const tbody = document.getElementById('bills-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!BILLS.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: var(--text-muted)">No bills yet. Create a new bill to populate this list.</td></tr>';
            return;
        }
        BILLS.slice().reverse().forEach(b => {
            const tr = document.createElement('tr');
            tr.className = 'bill-row';
            tr.dataset.inv = b.inv;
            tr.dataset.customer = b.customer;
            tr.dataset.date = formatShortDate(b.date);
            tr.dataset.rawDate = b.date || '';
            tr.dataset.type = b.type || 'Normal';
            tr.dataset.by = b.createdBy || '';
            tr.dataset.total = b.total || 0;
            tr.dataset.paid = b.paid || 0;
            tr.dataset.status = b.status || 'Outstanding';
            tr.dataset.items = JSON.stringify(b.items || []);
            tr.style.cursor = 'pointer';
            const statusBadge = b.status && b.status.toLowerCase().includes('paid') ? '<span class="badge badge-paid">Paid</span>' : (b.status && b.status.toLowerCase().includes('partial') ? '<span class="badge badge-partial">Partial</span>' : '<span class="badge badge-outstanding">Outstanding</span>');
            tr.innerHTML = `<td class="font-mono font-bold" style="color: var(--primary)">${b.inv}</td>
      <td style="color: var(--text-muted)">${formatShortDate(b.date)}</td>
      <td class="font-semibold">${b.customer}</td>
      <td><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style="background: var(--gold-soft); color: var(--gold-strong); border: 1px solid #ecd99a">${(b.createdBy||'').charAt(0)}</div><span class="text-sm font-semibold">${b.createdBy||''}</span></div></td>
      <td class="tabular font-bold" style="text-align:right">₹ ${Number(b.total).toLocaleString('en-IN')}</td>
      <td class="tabular" style="text-align:right">₹ ${Number(b.paid).toLocaleString('en-IN')}</td>
      <td>${statusBadge}</td>
      <td class="admin-only-view"><button class="btn btn-ghost p-1 rounded bill-delete-btn" title="Delete bill" onclick="event.stopPropagation();deleteBill('${b.inv}')"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--rose)"></i></button></td>`;
            tr.addEventListener('click', () => window.openBillDetailsByName(b.inv));
            lucide.createIcons({ nodes: [tr] });
            tbody.appendChild(tr);
        });
    }

    window.deleteBill = function(inv) {
        var idx = BILLS.findIndex(function(b) { return b.inv === inv; });
        if (idx === -1) return;
        var bill = BILLS[idx];
        if (!confirm('Delete bill ' + inv + ' for ' + (bill.customer || '') + '?')) return;
        BILLS.splice(idx, 1);
        try { localStorage.setItem('fp_bills_offline', JSON.stringify(BILLS.filter(function(b) { return b._offline; }))); } catch(e) {}
        if (window._serverAvailable) { try { fetchJson(API_BASE + '/bills/' + inv, { method: 'DELETE' }); } catch(e) {} }
        renderBills();
        renderReportsFromBills();
        renderCustomerGrid();
        if (typeof renderDashboardRecentBills === 'function') renderDashboardRecentBills();
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
        logActivity('Bill Deleted', 'Deleted <span class="font-mono font-bold" style="color:var(--primary)">' + inv + '</span> for ' + (bill.customer || '') + ' · ₹ ' + Math.round(Number(bill.total) || 0).toLocaleString('en-IN'));
        toast('Bill ' + inv + ' deleted', 'check-circle');
    };

    function renderReportsFromBills() {
        var today = localDateStr(new Date());
        if (rptStart) rptStart.value = today;
        if (rptEnd) rptEnd.value = today;
        generateReport();
    }

    async function saveBillToServer(bill) {
        const created = await apiPost('/bills', bill);
        BILLS.push(created);
        // Ensure the customer exists (create if needed) and update views
        try { await ensureCustomerExists(created.customer, created.phone); } catch(e){ console.error('ensureCustomerExists error', e); }
        renderBills();
        renderReportsFromBills();
        renderCustomerGrid();
        updateReportStaffOptions();
        if (typeof renderDashboardRecentBills === 'function') renderDashboardRecentBills(); if (typeof updateDashboardStats === 'function') updateDashboardStats();
    }

    async function saveCustomerToServer(data) {
        const created = await apiPost('/customers', data);
        CUSTOMERS.push(created);
        renderCustomerGrid();
        return created;
    }

    function saveOfflineStaff() {
        try { localStorage.setItem('fp_staff_offline', JSON.stringify(STAFF)); } catch(e) {}
    }

    function loadOfflineStaff() {
        try {
            var s = localStorage.getItem('fp_staff_offline');
            if (!s) return;
            var arr = JSON.parse(s);
            if (!Array.isArray(arr)) return;
            arr.forEach(function(st) {
                if (!STAFF.find(function(ex) { return (ex.email || '').toLowerCase() === (st.email || '').toLowerCase(); })) {
                    STAFF.push(st);
                }
            });
        } catch(e) {}
    }

    async function saveStaffToServer(data) {
        try {
            const created = await apiPost('/staff', data);
            STAFF.push(created);
        } catch(e) {
            STAFF.push(data);
        }
        saveOfflineStaff();
        renderStaffGrid();
        return data;
    }

    async function saveExpenseToServer(entry) {
        const created = await apiPost('/expenses', entry);
        EXPENSE_ENTRIES.push(created);
        syncExpenseViews();
        return created;
    }

    function saveOfflineBill(bill) {
        try {
            const s = localStorage.getItem('fp_bills_offline');
            const arr = s ? JSON.parse(s) : [];
            arr.push(bill);
            localStorage.setItem('fp_bills_offline', JSON.stringify(arr));
        } catch (e) { console.error('saveOfflineBill', e); }
    }

    function saveOfflineExpense(entry) {
        try {
            const s = localStorage.getItem('fp_expenses_offline');
            const arr = s ? JSON.parse(s) : [];
            arr.push(entry);
            localStorage.setItem('fp_expenses_offline', JSON.stringify(arr));
        } catch (e) { console.error('saveOfflineExpense', e); }
    }

    function loadOfflineExpenses() {
        try {
            const s = localStorage.getItem('fp_expenses_offline');
            if (!s) return;
            const arr = JSON.parse(s);
            if (!Array.isArray(arr)) return;
            arr.forEach(en => { en._offline = true; EXPENSE_ENTRIES.push(en); });
        } catch (e) { console.error('loadOfflineExpenses', e); }
    }

    function loadOfflineBills() {
        try {
            const s = localStorage.getItem('fp_bills_offline');
            if (!s) return;
            const arr = JSON.parse(s);
            if (!Array.isArray(arr)) return;
            arr.forEach(b => { b._offline = true; BILLS.push(b); });
        } catch (e) { console.error('loadOfflineBills', e); }
    }

    function saveOfflineCustomers() {
        try {
            localStorage.setItem('fp_customers_offline', JSON.stringify(CUSTOMERS));
        } catch (e) { console.error('saveOfflineCustomers', e); }
    }

    function loadOfflineCustomers() {
        try {
            const s = localStorage.getItem('fp_customers_offline');
            if (!s) return;
            const arr = JSON.parse(s);
            if (!Array.isArray(arr)) return;
            arr.forEach(c => {
                if (!CUSTOMERS.find(ex => (ex.name || '').toLowerCase() === (c.name || '').toLowerCase())) {
                    CUSTOMERS.push(c);
                }
            });
        } catch (e) { console.error('loadOfflineCustomers', e); }
    }

    async function ensureCustomerExists(name, phone) {
        if (!name) return;
        var nameMatch = CUSTOMERS.filter(c => (c.name || '').toLowerCase() === (name || '').toLowerCase());
        var exists = null;
        if (phone) {
            exists = nameMatch.find(c => (c.phone || '').replace(/\s/g,'') === phone.replace(/\s/g,''));
            if (!exists && nameMatch.length) {
                exists = nameMatch.find(c => !c.phone);
                if (exists) { exists.phone = phone; saveOfflineCustomers(); }
            }
        } else {
            exists = nameMatch[0] || null;
        }
        if (exists) return exists;
        const newCust = stampRecord({ name: name, phone: phone || '' });
        try {
            const created = await saveCustomerToServer(newCust);
            saveOfflineCustomers();
            return created;
        } catch (e) {
            try {
                CUSTOMERS.push(newCust);
                saveOfflineCustomers();
                renderCustomerGrid();
                return newCust;
            } catch (e2) { console.error('ensureCustomerExists fallback failed', e2); }
        }
    }

    function addBill(b) {
        BILLS.push(b);
        if (b._offline) saveOfflineBill(b);
        // Ensure customer exists locally (non-blocking)
        ensureCustomerExists(b.customer, b.phone).then(() => {
            renderCustomerGrid();
        }).catch(e => { console.error('ensureCustomerExists error', e); });
        renderBills();
        renderReportsFromBills();
        updateReportStaffOptions();
        if (typeof renderDashboardRecentBills === 'function') renderDashboardRecentBills(); if (typeof updateDashboardStats === 'function') updateDashboardStats();
    }

    function showCustomerProfileByName(name) {
        if (!name) return;
        const cards = Array.from(document.querySelectorAll('#customer-grid .customer-card'));
        const card = cards.find(c => (c.dataset.cname || '').toLowerCase() === (name || '').toLowerCase());
        if (card) openCustomerProfile(card);
    }

    function buildCustomerCard(customer) {
        const custPhone = (customer.phone || '').replace(/\s/g,'');
        const bills = BILLS.filter(b => {
            if ((b.customer || '').toLowerCase() !== (customer.name || '').toLowerCase()) return false;
            if (custPhone && b.phone) return b.phone.replace(/\s/g,'') === custPhone;
            return true;
        });
        const lifetime = bills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0);
        const outstanding = bills.reduce((sum, bill) => sum + Math.max(0, (parseFloat(bill.total) || 0) - (parseFloat(bill.paid) || 0)), 0);
        const orders = bills.length;
        const last = bills.length ? formatShortDate(bills.reduce((latest, bill) => new Date(bill.date) > new Date(latest.date) ? bill : latest, bills[0]).date) : '—';
        const card = document.createElement('div');
        card.className = 'customer-card';
        card.dataset.cname = customer.name;
        card.dataset.cphone = customer.phone || '—';
        card.dataset.cltv = lifetime.toLocaleString('en-IN');
        card.dataset.coutstanding = outstanding.toLocaleString('en-IN');
        card.dataset.corders = orders;
        card.dataset.clast = last;
        card.dataset.cbills = JSON.stringify(bills.map(b => ({ inv: b.inv, date: b.date, dateDisplay: formatShortDate(b.date), total: b.total, paid: b.paid, status: b.status })));
        card.innerHTML = `
            <div class="flex items-center gap-3 mb-4">
                <div class="customer-avatar"><i data-lucide="user" class="w-5 h-5"></i></div>
                <div>
                    <div class="font-serif font-bold text-lg">${customer.name}</div>
                    <div class="text-sm font-mono flex items-center gap-1" style="color: var(--text-muted)">
                        <i data-lucide="phone" class="w-3 h-3"></i> ${customer.phone || '—'}
                    </div>
                </div>
            </div>
            <div class="text-xs font-bold uppercase tracking-widest mb-1" style="color: var(--text-muted)">Lifetime Value</div>
            <div class="font-serif font-bold text-2xl mb-1" style="color: var(--gold-strong)">₹ ${lifetime.toLocaleString('en-IN')}</div>
            <div class="text-xs font-semibold mb-3" style="color: var(--rose-text)">Outstanding: ₹ ${outstanding.toLocaleString('en-IN')}</div>
            <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
                <span>${orders} orders</span><span>Last: ${last}</span>
            </div>
            <button class="btn btn-primary w-full mt-4 text-sm view-profile-btn"><i data-lucide="eye" class="w-3.5 h-3.5"></i> View Profile</button>`;
        card.querySelector('.view-profile-btn')?.addEventListener('click', () => openCustomerProfile(card));
        lucide.createIcons({ nodes: [card] });
        return card;
    }

    function renderCustomerGrid() {
        const grid = document.getElementById('customer-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!CUSTOMERS.length) {
            grid.innerHTML = '<div class="text-center" style="color:var(--text-muted);grid-column:1/-1;padding:32px">No customers yet. Add one to begin.</div>';
        } else {
            CUSTOMERS.forEach(c => grid.appendChild(buildCustomerCard(c)));
        }
        if (typeof updateCustomerSuggestions === 'function') updateCustomerSuggestions();
    }

    function buildStaffCard(staff) {
        const card = document.createElement('div');
        card.className = 'customer-card';
        const initials = (staff.name || staff.email || 'U').charAt(0).toUpperCase();
        const roleBadge = staff.role === 'admin' ? '<span class="badge badge-admin"><i data-lucide="shield" class="w-3 h-3"></i> Admin</span>' : '<span class="badge badge-staff"><i data-lucide="user" class="w-3 h-3"></i> Staff</span>';
        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="customer-avatar" style="background: var(--gold-soft); color: var(--gold-strong); font-weight: 700">${initials}</div>
                    <div>
                        <div class="font-serif font-bold text-lg">${staff.name}</div>
                        <div class="text-xs font-mono" style="color: var(--text-muted)">${staff.email}</div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 mb-4">
                ${roleBadge}
                <span class="badge badge-paid">${staff.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div>
                    <div class="text-xs font-bold uppercase tracking-widest" style="color: var(--text-muted)">Bills</div>
                    <div class="font-serif font-bold text-xl">${staff.stats?.bills || 0}</div>
                </div>
                <div>
                    <div class="text-xs font-bold uppercase tracking-widest" style="color: var(--text-muted)">Counter</div>
                    <div class="font-serif font-bold text-xl" style="color: var(--coral-text)">${staff.stats?.counter || 0}</div>
                </div>
                <div>
                    <div class="text-xs font-bold uppercase tracking-widest" style="color: var(--text-muted)">Normal</div>
                    <div class="font-serif font-bold text-xl" style="color: var(--primary)">${staff.stats?.normal || 0}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4 pt-3" style="border-top: 1px solid var(--border)">
                <div>
                    <div class="text-xs font-bold uppercase tracking-widest" style="color: var(--text-muted)">Revenue Generated</div>
                    <div class="font-serif font-bold text-xl mt-0.5" style="color: var(--gold-strong)">₹ ${staff.stats?.revenue?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div>
                    <div class="text-xs font-bold uppercase tracking-widest" style="color: var(--text-muted)">Last Active</div>
                    <div class="font-serif font-bold text-base mt-0.5" style="color: var(--emerald-text)">${staff.lastActive || 'Just now'}</div>
                </div>
            </div>
            <div class="flex items-center gap-2 pt-3" style="border-top: 1px solid var(--border)">
                <label class="switch"><input type="checkbox" ${staff.active ? 'checked' : ''} /><span class="switch-slider"></span></label>
                <span class="text-sm font-semibold">${staff.active ? 'Active' : 'Inactive'}</span>
                <button class="btn-ghost p-1.5 rounded ml-auto staff-edit-btn"><i data-lucide="edit-2" class="w-4 h-4" style="color: var(--primary)"></i></button>
                <button class="btn-ghost p-1.5 rounded staff-delete-btn"><i data-lucide="trash-2" class="w-4 h-4" style="color: var(--rose)"></i></button>
            </div>`;
        lucide.createIcons({ nodes: [card] });
        card.querySelector('.staff-edit-btn')?.addEventListener('click', () => openEditStaffModal(staff));
        card.querySelector('.staff-delete-btn')?.addEventListener('click', () => deleteStaffMember(staff));
        const toggle = card.querySelector('input[type="checkbox"]');
        toggle?.addEventListener('change', () => {
            staff.active = toggle.checked;
            saveOfflineStaff();
            renderStaffGrid();
        });
        return card;
    }

    function openEditStaffModal(staff) {
        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Edit Staff</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Update staff account details</div>
            <div class="space-y-4">
                <div><label class="label">Full Name <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="es-name" value="${staff.name || ''}" /></div>
                <div><label class="label">Email</label>
                    <input class="input" id="es-email" value="${staff.email || ''}" /></div>
                <div><label class="label">Role</label>
                    <select class="select" id="es-role">
                        <option value="staff" ${staff.role === 'staff' ? 'selected' : ''}>Staff</option>
                        <option value="admin" ${staff.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select></div>
                <div><label class="label">New Password (leave blank to keep current)</label>
                    <input class="input" id="es-pass" type="password" placeholder="••••••••" /></div>
                <button class="btn btn-primary w-full mt-2" onclick="saveEditStaff('${staff.email}')"><i data-lucide="check" class="w-4 h-4"></i> Save Changes</button>
            </div>
        `);
    }

    window.saveEditStaff = function(originalEmail) {
        var match = STAFF.find(s => (s.email || '').toLowerCase() === (originalEmail || '').toLowerCase());
        if (!match) { toast('Staff not found', 'alert-circle'); return; }
        var name = document.getElementById('es-name')?.value.trim();
        var email = document.getElementById('es-email')?.value.trim();
        var role = document.getElementById('es-role')?.value || 'staff';
        var pass = document.getElementById('es-pass')?.value.trim();
        if (!name) { toast('Name is required', 'alert-circle'); return; }
        match.name = name;
        match.email = email;
        match.role = role;
        if (pass) match.password = pass;
        saveOfflineStaff();
        renderStaffGrid();
        document.getElementById('modalOverlay').style.display = 'none';
        toast('Staff "' + name + '" updated', 'check-circle');
        logActivity('Staff Updated', 'Updated <strong>' + name + '</strong> account details');
    };

    function deleteStaffMember(staff) {
        if (!confirm('Delete staff member "' + staff.name + '"?')) return;
        var idx = STAFF.indexOf(staff);
        if (idx !== -1) {
            STAFF.splice(idx, 1);
            saveOfflineStaff();
            renderStaffGrid();
            toast('"' + staff.name + '" deleted', 'check-circle');
            logActivity('Staff Deleted', 'Removed <strong>' + staff.name + '</strong> from staff');
        }
    }

    function renderStaffGrid() {
        const usersPanel = document.getElementById('staff-panel-users');
        if (!usersPanel) return;
        usersPanel.innerHTML = '<div class="grid grid-cols-2 gap-4" id="staff-users-grid"></div>';
        const grid = usersPanel.querySelector('#staff-users-grid');
        if (!grid) return;
        if (!STAFF.length) {
            grid.innerHTML = '<div class="text-center" style="color:var(--text-muted);grid-column:1/-1;padding:32px">No staff users yet.</div>';
            return;
        }
        STAFF.forEach(user => grid.appendChild(buildStaffCard(user)));
    }

    function updateReportStaffOptions() {
        var sel = document.getElementById('rpt-staff');
        if (!sel) return;
        var current = sel.value || 'all';
        sel.innerHTML = '<option value="all">All</option>';
        var names = new Set();
        STAFF.forEach(function(s) { if (s.name) names.add(s.name); });
        BILLS.forEach(function(b) { if (b.createdBy) names.add(b.createdBy); });
        names.forEach(function(name) {
            var opt = document.createElement('option');
            opt.value = name.toLowerCase();
            opt.textContent = name;
            sel.appendChild(opt);
        });
        sel.value = current;
        var actSel = document.getElementById('activity-filter-staff');
        if (actSel) {
            var actCurrent = actSel.value || '';
            actSel.innerHTML = '<option value="">All Staff</option>';
            names.forEach(function(name) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                actSel.appendChild(opt);
            });
            actSel.value = actCurrent;
        }
    }

    function resetNewBillForm() {
        const fields = ['custName','custPhone','shipTo','billTo','billingNotes'];
        fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const discount = document.getElementById('discountInput'); if (discount) discount.value = '0';
        const gst = document.getElementById('gstInput'); if (gst) gst.value = '18';
        document.getElementById('paidInput') && (document.getElementById('paidInput').value = '0');
        document.getElementById('cashPaidInput') && (document.getElementById('cashPaidInput').value = '0');
        document.getElementById('onlinePaidInput') && (document.getElementById('onlinePaidInput').value = '0');
        document.querySelectorAll('#paymentModePills button').forEach(btn => btn.classList.toggle('active', btn.dataset.payment === 'single'));
        updatePaymentModeFields();
        const container = document.getElementById('lineItemsContainer');
        if (container) {
            container.innerHTML = '';
            const defaultRows = [
                {name:'',qty:1,price:0,unit:''}
            ];
            defaultRows.forEach((item, index) => {
                const row = buildLineItemRow(item.name, item.qty, item.price, item.unit);
                container.appendChild(row);
            });
            updateLineItemNumbers();
        }
        recalcSummary();
    }

    async function initializeApp() {
        // One-time data reset: clear any old mock/demo data from previous sessions
        const RESET_VERSION = 'fp_reset_v3';
        if (!localStorage.getItem(RESET_VERSION)) {
            ['fp_inventory_items','fp_shortcut_items','fp_bills_offline','fp_expenses_offline','fp_dropdown_settings','fp_customers_offline','fp_customer_payments','fp_staff_offline','fp_activity_log'].forEach(k => localStorage.removeItem(k));
            localStorage.setItem(RESET_VERSION, '1');
        }

        await loadServerData();
        // load any locally-saved offline bills to merge with server data
        loadOfflineBills();
        // load any offline-saved customers, staff, and activity log
        loadOfflineCustomers();
        loadOfflineStaff();
        loadActivityLog();
        // rebuild customers from bills if any customers are missing
        BILLS.forEach(b => {
            if (b.customer && !CUSTOMERS.find(c => (c.name || '').toLowerCase() === (b.customer || '').toLowerCase())) {
                CUSTOMERS.push({ name: b.customer, phone: b.phone || '' });
            }
        });
        if (CUSTOMERS.length) saveOfflineCustomers();
        // load any offline-saved expenses
        loadOfflineExpenses();
        renderCustomerGrid();
        renderStaffGrid();
        renderBills();
        renderReportsFromBills();
        renderExpenseTable();
        renderExpensesReport();
        updateReportStaffOptions();
        
        // Load settings and inventory data
        if (typeof loadShortcutItems === 'function') loadShortcutItems();
        if (typeof loadDropdownSettings === 'function') loadDropdownSettings();
        if (typeof loadInventoryData === 'function') loadInventoryData();
        if (typeof renderDashboardRecentBills === 'function') renderDashboardRecentBills(); if (typeof updateDashboardStats === 'function') updateDashboardStats();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderDashboardLowStock === 'function') renderDashboardLowStock();
        if (typeof updatePOSDatalist === 'function') updatePOSDatalist();
        if (typeof updateCustomerSuggestions === 'function') updateCustomerSuggestions();
        renderActivityLog();
    }

    initializeApp();

    /* ============================================================
       STAFF PAGE — Add Staff + Edit + Delete + Toggle Active
    ============================================================ */
    const addStaffBtn = document.querySelector('#page-staff .page-header .btn.btn-primary');
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Add New Staff</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Create a staff account</div>
            <div class="space-y-4">
                <div><label class="label">Full Name <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="ns-name" placeholder="Staff member's name" /></div>
                <div><label class="label">Email</label><input class="input" id="ns-email" placeholder="email@printshop.com" /></div>
                <div><label class="label">Role</label>
                    <select class="select" id="ns-role">
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div><label class="label">Temporary Password <span style="color:var(--rose)">*</span></label>
                    <input class="input" type="password" id="ns-pass" placeholder="Min 8 characters" /></div>
                <button class="btn btn-primary w-full mt-2" onclick="saveNewStaff()"><i data-lucide="user-plus" class="w-4 h-4"></i> Create Account</button>
            </div>
        `));
    }

    async function saveNewStaff() {
        const name = document.getElementById('ns-name')?.value.trim();
        const email = document.getElementById('ns-email')?.value.trim();
        const role = document.getElementById('ns-role')?.value || 'staff';
        const pass = document.getElementById('ns-pass')?.value.trim();
        if (!name) { toast('Name is required', 'alert-circle'); return; }
        if (!pass || pass.length < 8) { toast('Password must be at least 8 characters', 'alert-circle'); return; }
        try {
            await saveStaffToServer(stampRecord({ name, email, password: pass, role, active: true }));
            document.getElementById('modalOverlay').style.display = 'none';
            toast(`Staff "${name}" added successfully`, 'check-circle');
            logActivity('Staff Added', 'Created account for <strong>' + name + '</strong> (' + role + ')');
        } catch (e) {
            console.error(e);
            toast('Unable to save staff', 'alert-circle');
        }
    }

    // Staff edit buttons
    document.querySelectorAll('#page-staff .btn-ghost').forEach(btn => {
        const icon = btn.querySelector('i[data-lucide="edit-2"]');
        const trashIcon = btn.querySelector('i[data-lucide="trash-2"]');
        if (icon) {
            btn.addEventListener('click', () => {
                const card = btn.closest('.customer-card');
                const name = card.querySelector('.font-serif')?.textContent.trim() || '';
                const email = card.querySelector('.font-mono')?.textContent.trim() || '';
                const role = card.querySelector('.badge-admin') ? 'Admin' : 'Staff';
                openModal(`
                    <div class="font-serif text-2xl font-bold mb-1">Edit Staff</div>
                    <div class="text-sm mb-5" style="color:var(--text-muted)">Update staff details</div>
                    <div class="space-y-4">
                        <div><label class="label">Name</label><input class="input" value="${name}" id="es-name" /></div>
                        <div><label class="label">Email</label><input class="input" value="${email}" id="es-email" /></div>
                        <div><label class="label">Role</label>
                            <select class="select" id="es-role">
                                <option ${role==='Staff'?'selected':''}>Staff</option>
                                <option ${role==='Admin'?'selected':''}>Admin</option>
                            </select>
                        </div>
                        <button class="btn btn-primary w-full mt-2" onclick="toast('Changes saved');closeModal()"><i data-lucide="save" class="w-4 h-4"></i> Save Changes</button>
                    </div>
                `);
            });
        }
        if (trashIcon) {
            btn.addEventListener('click', () => {
                const card = btn.closest('.customer-card');
                const name = card.querySelector('.font-serif')?.textContent.trim() || 'this staff member';
                openModal(`
                    <div class="font-serif text-2xl font-bold mb-1">Remove Staff</div>
                    <div class="text-sm mb-5" style="color:var(--text-muted)">Are you sure you want to remove <strong>${name}</strong>? This cannot be undone.</div>
                    <div class="grid grid-cols-2 gap-3">
                        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button class="btn" style="background:var(--rose);color:white" onclick="toast('${name} removed');closeModal()"><i data-lucide="trash-2" class="w-4 h-4"></i> Remove</button>
                    </div>
                `);
            });
        }
    });

    /* ============================================================
       STAFF — tab switching (Users / Activity Logs)
    ============================================================ */
    const staffTabs = document.getElementById('staff-tabs');
    if (staffTabs) {
        staffTabs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                staffTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const key = btn.dataset.staffTab;
                ['users','activity'].forEach(k => {
                    const panel = document.getElementById('staff-panel-' + k);
                    if (panel) panel.style.display = (k === key) ? '' : 'none';
                });
            });
        });
    }

    /* ============================================================
       ACTIVITY LOG — live search + filters
    ============================================================ */
    function filterActivityLog() {
        const q      = (document.getElementById('activity-search')?.value || '').toLowerCase();
        const staff  = (document.getElementById('activity-filter-staff')?.value || '').toLowerCase();
        const action = (document.getElementById('activity-filter-type')?.value || '').toLowerCase();
        document.querySelectorAll('#activity-tbody tr').forEach(row => {
            const rowStaff  = (row.dataset.staff  || '').toLowerCase();
            const rowAction = (row.dataset.action || '').toLowerCase();
            const rowText   = row.textContent.toLowerCase();
            const matchQ = !q      || rowText.includes(q);
            const matchS = !staff  || rowStaff.includes(staff);
            const matchA = !action || rowAction.includes(action);
            row.style.display = (matchQ && matchS && matchA) ? '' : 'none';
        });
    }
    document.getElementById('activity-search')?.addEventListener('input', filterActivityLog);
    document.getElementById('activity-filter-staff')?.addEventListener('change', filterActivityLog);
    document.getElementById('activity-filter-type')?.addEventListener('change', filterActivityLog);

    window.exportActivityCSV = function() {
        const headers = ['Timestamp','Staff','Action','Details','IP'];
        const rows = [...document.querySelectorAll('#activity-tbody tr')]
            .filter(r => r.style.display !== 'none')
            .map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
        const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type:'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href=url; a.download='activity_log.csv'; a.click();
        URL.revokeObjectURL(url);
        toast('Activity log exported');
    };

    /* ============================================================
       SETTINGS — Tab switching
    ============================================================ */
    const settingsTabs = document.getElementById('settings-tabs');
    if (settingsTabs) {
        settingsTabs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                settingsTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const key = btn.dataset.settingsTab;
                ['store','rates','invoice','dropdowns'].forEach(k => {
                    const panel = document.getElementById('settings-panel-' + k);
                    if (panel) panel.style.display = (k === key) ? '' : 'none';
                });
                if (key === 'dropdowns') {
                    if (typeof renderSettingsShortcuts === 'function') renderSettingsShortcuts();
                    if (typeof renderSettingsDropdownLists === 'function') renderSettingsDropdownLists();
                }
            });
        });
    }

    /* ============================================================
       SETTINGS — Paper rates: add/delete rows
    ============================================================ */
    function bindPaperDeleteBtns() {
        document.querySelectorAll('#paper-rates-list .del-paper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.grid');
                const name = row.querySelector('input')?.value || 'paper';
                row.remove();
                toast(`"${name}" removed`);
            });
        });
    }
    bindPaperDeleteBtns();

    document.getElementById('add-paper-btn')?.addEventListener('click', () => {
        const container = document.getElementById('paper-rates-list');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 gap-2 items-center';
        row.innerHTML = `
            <input class="input col-span-6" placeholder="Paper name (e.g. A4 100gsm)" />
            <input class="input col-span-3 text-right tabular" value="1.00" type="number" min="0" step="0.01" />
            <select class="select col-span-2"><option>sheet</option><option>sqft</option><option>meter</option></select>
            <button class="btn-ghost p-2 rounded col-span-1 justify-self-center del-paper-btn"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--rose)"></i></button>`;
        row.querySelector('.del-paper-btn').addEventListener('click', () => { row.remove(); toast('Paper removed'); });
        container.appendChild(row);
        lucide.createIcons({ nodes: [row] });
        row.querySelector('input').focus();
        toast('New paper row added');
    });

    /* ============================================================
       SETTINGS — Save store settings + live invoice preview
    ============================================================ */
    window.updateInvPreview = function() {
        const name = document.getElementById('store-name')?.value || 'Print Shop';
        const phone = document.getElementById('store-phone')?.value || '';
        const addr = (document.getElementById('store-address')?.value || '').split('\n')[0];
        const gst = document.getElementById('store-gst')?.value || '';
        const initial = name.charAt(0).toUpperCase();

        const previewLogo = document.getElementById('inv-preview-logo');
        const previewName = document.getElementById('inv-preview-name');
        const previewPhone = document.getElementById('inv-preview-phone');
        const previewAddr = document.getElementById('inv-preview-addr');
        const previewGst = document.getElementById('inv-preview-gst');
        const logoEl = document.getElementById('logo-preview');

        if (previewLogo) previewLogo.textContent = initial;
        if (previewName) previewName.textContent = name;
        if (previewPhone) previewPhone.textContent = phone;
        if (previewAddr) previewAddr.textContent = addr;
        if (previewGst) previewGst.textContent = gst ? `GST: ${gst}` : '';
        if (logoEl && !logoEl.querySelector('img')) logoEl.textContent = initial;
    };

    window.saveStoreSettings = function() {
        const name = document.getElementById('store-name')?.value.trim();
        if (!name) { toast('Shop name is required', 'alert-circle'); return; }

        // Reflect shop name in sidebar brand
        const brandName = document.querySelector('.brand-name');
        if (brandName) brandName.textContent = name;

        // Reflect owner/admin name across the UI
        const owner = document.getElementById('store-owner')?.value.trim();
        if (owner) {
            const firstName = owner.split(' ')[0];
            const initial = owner.charAt(0).toUpperCase();

            // Only update if currently in admin view (don't override staff demo)
            const isAdmin = document.body.classList.contains('role-admin');
            if (isAdmin) {
                const userNameEl = document.getElementById('userName');
                const userAvatarEl = document.getElementById('userAvatar');
                const greetNameEl = document.getElementById('greetName');
                if (userNameEl) userNameEl.textContent = owner;
                if (userAvatarEl) userAvatarEl.textContent = initial;
                if (greetNameEl) greetNameEl.textContent = firstName;
            }
        }

        // Update invoice preview
        updateInvPreview();
        toast('Store settings saved — all pages updated', 'check-circle');
    };

    window.savePaperRates = function() {
        toast('Paper rates saved successfully', 'check-circle');
    };

    window.handleLogoUpload = function(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const logoEl = document.getElementById('logo-preview');
            const previewLogo = document.getElementById('inv-preview-logo');
            if (logoEl) {
                logoEl.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`;
            }
            if (previewLogo) {
                previewLogo.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`;
            }
            toast('Logo uploaded');
        };
        reader.readAsDataURL(file);
    };

    window.resetLogo = function() {
        const name = document.getElementById('store-name')?.value || 'Print Shop';
        const initial = name.charAt(0).toUpperCase();
        const logoEl = document.getElementById('logo-preview');
        const previewLogo = document.getElementById('inv-preview-logo');
        if (logoEl) logoEl.innerHTML = initial;
        if (previewLogo) previewLogo.innerHTML = initial;
        toast('Logo reset to default');
    };

    /* ============================================================
       BILLS — Click row to view bill detail + status management
    ============================================================ */
    function getBadgeHtml(status) {
        if (status === 'paid') return `<span class="badge badge-paid">Paid</span>`;
        if (status === 'partial') return `<span class="badge badge-partial">Partial</span>`;
        return `<span class="badge badge-outstanding">Outstanding</span>`;
    }

    function openBillModal(row) {
        const inv = row.dataset.inv;
        const customer = row.dataset.customer;
        const date = row.dataset.date;
        const type = row.dataset.type;
        const by = row.dataset.by;
        const total = parseFloat(row.dataset.total);
        const paid = parseFloat(row.dataset.paid);
        const outstanding = total - paid;
        const status = row.dataset.status;
        const items = row.dataset.items || '';

        let parsedItems = [];
        try { parsedItems = JSON.parse(items); } catch(e) { parsedItems = []; }
        const itemsHtml = parsedItems.length ? parsedItems.map(item => {
            const name = item.name || '';
            const detail = `${item.qty || 0} ${item.unit || ''} × ₹${(item.price || 0).toLocaleString('en-IN')} = ₹${(item.amount || 0).toLocaleString('en-IN')}`;
            return `<div class="flex justify-between items-center py-2" style="border-bottom:1px solid var(--border)">
                <span class="text-sm font-semibold">${name}</span>
                <span class="text-sm tabular" style="color:var(--text-muted)">${detail}</span>
            </div>`;
        }).join('') : '<div class="text-sm" style="color:var(--text-muted);padding:8px 0">No line items</div>';

        const payActions = status !== 'paid' ? `
            <div style="background:var(--primary-soft);border-radius:12px;padding:16px;margin-top:4px">
                <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--primary-text)">Record Payment</div>
                <div class="flex gap-2">
                    <input class="input text-right tabular flex-1" id="bill-pay-amount" type="number" min="0" step="0.01" max="${outstanding}" placeholder="Amount" value="${outstanding}" />
                    <select class="select" style="width:120px" id="bill-pay-mode">
                        <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
                    </select>
                    <button class="btn btn-primary" onclick="recordBillPayment('${inv}', ${total}, ${paid})">
                        <i data-lucide="check" class="w-4 h-4"></i> Record
                    </button>
                </div>
            </div>` : '';

        openModal(`
            <div class="flex items-center justify-between mb-1">
                <div class="font-mono font-bold text-lg" style="color:var(--primary)">${inv}</div>
                ${getBadgeHtml(status)}
            </div>
            <div class="font-serif text-2xl font-bold mb-4">${customer}</div>
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div style="background:var(--surface-tint);border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:var(--text-muted)">Total</div>
                    <div class="font-serif font-bold text-lg">₹ ${total.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:var(--emerald-soft);border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:var(--emerald-text)">Paid</div>
                    <div class="font-serif font-bold text-lg" style="color:var(--emerald-text)">₹ ${paid.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:${outstanding > 0 ? 'var(--rose-soft)' : 'var(--emerald-soft)'};border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">Outstanding</div>
                    <div class="font-serif font-bold text-lg" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">₹ ${outstanding.toLocaleString('en-IN')}</div>
                </div>
            </div>
            <div class="text-xs grid grid-cols-3 gap-2 mb-4" style="color:var(--text-muted)">
                <span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${date}</span>
                <span><i data-lucide="tag" class="w-3 h-3 inline"></i> ${type}</span>
                <span><i data-lucide="user" class="w-3 h-3 inline"></i> ${by}</span>
            </div>
            <div class="mb-4">
                <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--text-muted)">Line Items</div>
                ${itemsHtml}
            </div>
            ${payActions}
            <div class="flex gap-2 mt-4">
                <button class="btn btn-secondary flex-1" onclick="toast('Printing invoice…','printer');closeModal()"><i data-lucide="printer" class="w-4 h-4"></i> Print</button>
                <button class="btn btn-secondary flex-1" onclick="toast('Invoice shared via WhatsApp','message-circle');closeModal()"><i data-lucide="share-2" class="w-4 h-4"></i> Share</button>
                ${status !== 'paid' ? `<button class="btn flex-1" style="background:var(--emerald);color:white" onclick="markBillPaid('${inv}', ${total})"><i data-lucide="check-circle" class="w-4 h-4"></i> Mark Paid</button>` : ''}
            </div>
        `);
    }

    window.recordBillPayment = function(inv, total, currentPaid) {
        const amount = parseFloat(document.getElementById('bill-pay-amount')?.value || 0);
        const mode = document.getElementById('bill-pay-mode')?.value || 'Cash';
        if (!amount || amount <= 0) { toast('Enter a valid amount', 'alert-circle'); return; }
        const newPaid = Math.min(currentPaid + amount, total);
        const newStatus = (total - newPaid) <= 0 ? 'paid' : 'partial';
        syncBillPayment(inv, newPaid, newStatus);
        toast(`₹${amount.toLocaleString('en-IN')} recorded via ${mode}`, 'check-circle');
        document.getElementById('modalOverlay').style.display = 'none';
    };

    window.markBillPaid = function(inv, total) {
        syncBillPayment(inv, total, 'paid');
        toast(`${inv} marked as Paid`, 'check-circle');
        document.getElementById('modalOverlay').style.display = 'none';
    };

    function syncBillPayment(inv, newPaid, newStatus) {
        // Update global BILLS array
        const globalBill = BILLS.find(b => b.inv === inv);
        if (globalBill) {
            globalBill.paid = newPaid;
            globalBill.status = newStatus;
        }
        // Update Bills tab table row
        updateBillRowInTable(inv, newPaid, newStatus);
        // Update customer data if profile is open
        if (currentCustomerData) {
            const cb = currentCustomerData.bills.find(b => b.inv === inv);
            if (cb) {
                cb.paid = newPaid;
                cb.status = newStatus;
            }
            refreshProfileStats();
            renderCustomerBills();
            renderLedger();
        }
        // Update customer card outstanding
        renderCustomerGrid();
    }

    function updateBillRowInTable(inv, newPaid, newStatus) {
        const rows = document.querySelectorAll('.bill-row');
        rows.forEach(row => {
            if (row.dataset.inv === inv) {
                const total = parseFloat(row.dataset.total);
                row.dataset.paid = newPaid;
                row.dataset.status = newStatus;
                const cells = row.querySelectorAll('td');
                if (cells[6]) cells[6].innerHTML = `₹ ${newPaid.toLocaleString('en-IN')}`;
                if (cells[7]) cells[7].innerHTML = getBadgeHtml(newStatus);
            }
        });
    }

    document.querySelectorAll('.bill-row').forEach(row => {
        row.addEventListener('click', () => window.openBillDetailsByName(row.dataset.inv));
        row.addEventListener('mouseenter', () => row.style.background = 'var(--primary-soft)');
        row.addEventListener('mouseleave', () => row.style.background = '');
    });

    /* Bills search/filter */
    const billsSearchInput = document.getElementById('bill-search-input');
    const billsStatusSelect = document.getElementById('bill-status-select');
    const billDateMode = document.getElementById('bill-date-mode');

    window.filterBills = function() {
        const q = (billsSearchInput?.value || '').toLowerCase();
        const s = (billsStatusSelect?.value || '').toLowerCase();
        
        const dateMode = billDateMode?.value || 'all';
        const specDate = document.getElementById('bill-filter-date')?.value || '';
        const startDate = document.getElementById('bill-filter-start')?.value || '';
        const endDate = document.getElementById('bill-filter-end')?.value || '';
        const specMonth = document.getElementById('bill-filter-month')?.value || '';

        document.querySelectorAll('.bill-row').forEach(row => {
            const text = row.textContent.toLowerCase();
            const rowStatus = row.dataset.status || '';
            const rawDate = row.dataset.rawDate || '';

            const matchQ = !q || text.includes(q);
            const matchS = !s || s === 'all' || rowStatus.toLowerCase() === s.toLowerCase();
            
            let matchD = true;
            if (dateMode === 'single') {
                matchD = !specDate || (rawDate === specDate);
            } else if (dateMode === 'range') {
                matchD = (!startDate || rawDate >= startDate) && (!endDate || rawDate <= endDate);
            } else if (dateMode === 'month') {
                matchD = !specMonth || rawDate.startsWith(specMonth);
            }

            row.style.display = (matchQ && matchS && matchD) ? '' : 'none';
        });
    };

    billsSearchInput?.addEventListener('input', window.filterBills);
    billsStatusSelect?.addEventListener('change', window.filterBills);
    
    billDateMode?.addEventListener('change', () => {
        const mode = billDateMode.value;
        document.getElementById('bill-date-all')?.classList.add('hidden');
        document.getElementById('bill-filter-date')?.classList.add('hidden');
        document.getElementById('bill-filter-range-container')?.classList.add('hidden');
        document.getElementById('bill-filter-month')?.classList.add('hidden');

        if (mode === 'all') {
            document.getElementById('bill-date-all')?.classList.remove('hidden');
        } else if (mode === 'single') {
            document.getElementById('bill-filter-date')?.classList.remove('hidden');
        } else if (mode === 'range') {
            document.getElementById('bill-filter-range-container')?.classList.remove('hidden');
        } else if (mode === 'month') {
            document.getElementById('bill-filter-month')?.classList.remove('hidden');
        }
        window.filterBills();
    });

    document.getElementById('bill-filter-date')?.addEventListener('input', window.filterBills);
    document.getElementById('bill-filter-start')?.addEventListener('input', window.filterBills);
    document.getElementById('bill-filter-end')?.addEventListener('input', window.filterBills);
    document.getElementById('bill-filter-month')?.addEventListener('input', window.filterBills);

    /* ============================================================
       CUSTOMERS — "New Customer" button + View Profile
    ============================================================ */
    document.querySelector('#page-customers .btn.btn-primary')?.addEventListener('click', () => {
        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">New Customer</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Add a new customer to the directory</div>
            <div class="space-y-4">
                <div><label class="label">Customer / Company Name <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="nc-name" placeholder="e.g. Raj Enterprises" /></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="label">Phone</label>
                        <input class="input font-mono" id="nc-phone" placeholder="optional" /></div>
                    <div><label class="label">Email</label>
                        <input class="input" id="nc-email" placeholder="optional" /></div>
                </div>
                <div><label class="label">GST Number</label>
                    <input class="input font-mono" id="nc-gst" placeholder="optional" /></div>
                <div><label class="label">Address</label>
                    <textarea class="input" id="nc-addr" rows="2" placeholder="optional"></textarea></div>
                <button class="btn btn-primary w-full mt-2" onclick="saveNewCustomer()">
                    <i data-lucide="user-plus" class="w-4 h-4"></i> Add Customer
                </button>
            </div>
        `);
    });

    window.saveNewCustomer = function() {
        const name = document.getElementById('nc-name')?.value.trim();
        const phone = document.getElementById('nc-phone')?.value.trim();
        if (!name) { toast('Name is required', 'alert-circle'); return; }
        // Add a new card to the grid
        const grid = document.getElementById('customer-grid');
        if (grid) {
            const card = document.createElement('div');
            card.className = 'customer-card';
            card.dataset.cname = name;
            card.dataset.cphone = phone;
            card.dataset.cltv = '0';
            card.dataset.coutstanding = '0';
            card.dataset.corders = '0';
            card.dataset.clast = '—';
            card.dataset.cbills = '[]';
            card.innerHTML = `
                <div class="flex items-center gap-3 mb-4">
                    <div class="customer-avatar"><i data-lucide="user" class="w-5 h-5"></i></div>
                    <div>
                        <div class="font-serif font-bold text-lg">${name}</div>
                        <div class="text-sm font-mono flex items-center gap-1" style="color:var(--text-muted)">
                            <i data-lucide="phone" class="w-3 h-3"></i> ${phone}
                        </div>
                    </div>
                </div>
                <div class="text-xs font-bold uppercase tracking-widest mb-1" style="color:var(--text-muted)">Lifetime Value</div>
                <div class="font-serif font-bold text-2xl mb-4" style="color:var(--gold-strong)">₹ 0</div>
                <div class="flex items-center justify-between text-xs" style="color:var(--text-muted)">
                    <span>0 orders</span><span>—</span>
                </div>
                <button class="btn btn-primary w-full mt-4 text-sm view-profile-btn">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i> View Profile
                </button>`;
            grid.appendChild(card);
            lucide.createIcons({ nodes: [card] });
            card.querySelector('.view-profile-btn').addEventListener('click', () => openCustomerProfile(card));
        }
        toast(`Customer "${name}" added`);
        document.getElementById('modalOverlay').style.display = 'none';
    };

    /* ============================================================
       CUSTOMER PROFILE — full-page dashboard
    ============================================================ */

    const DEMO_PAYMENTS = {};

    let currentCustomerData = null;
    let currentCustomerCard = null;

    function openCustomerProfile(card) {
        currentCustomerCard = card;
        const name = card.dataset.cname;
        const phone = card.dataset.cphone;
        let bills = [];
        try { bills = JSON.parse(card.dataset.cbills || '[]'); } catch(e) {}
        const liveBills = BILLS.filter(b => (b.customer || '').toLowerCase() === (name || '').toLowerCase());
        liveBills.forEach(lb => {
            if (!bills.find(cb => cb.inv === lb.inv)) {
                bills.push({ inv: lb.inv, date: lb.date, dateDisplay: formatShortDate(lb.date), total: lb.total, paid: lb.paid, status: lb.status });
            }
        });
        const orders = bills.length;

        if (!window.CUSTOMER_PAYMENTS) {
            window.CUSTOMER_PAYMENTS = {};
            try {
                const stored = localStorage.getItem('fp_customer_payments');
                if (stored) window.CUSTOMER_PAYMENTS = JSON.parse(stored);
            } catch(e) {}
        }
        if (!window.CUSTOMER_PAYMENTS[name]) {
            window.CUSTOMER_PAYMENTS[name] = [...(DEMO_PAYMENTS[name] || [])];
        }

        currentCustomerData = { name, phone, orders, bills, payments: window.CUSTOMER_PAYMENTS[name] };

        const nameEl = document.getElementById('profileCustomerName');
        if (nameEl) nameEl.textContent = name;
        const phoneEl = document.getElementById('profileCustomerPhone');
        if (phoneEl) phoneEl.textContent = phone;
        const ordersEl = document.getElementById('profileTotalOrders');
        if (ordersEl) ordersEl.textContent = orders;
        const billCountEl = document.getElementById('profileBillCount');
        if (billCountEl) billCountEl.textContent = bills.length + ' BILLS';

        refreshProfileStats();
        renderCustomerBills();
        renderLedger();
        goto('customer-profile');
    }

    function refreshProfileStats() {
        if (!currentCustomerData) return;
        const lifetimeBilled = currentCustomerData.bills.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
        const totalPaid = currentCustomerData.bills.reduce((s, b) => s + (parseFloat(b.paid) || 0), 0);
        const outstanding = currentCustomerData.bills.reduce((s, b) => s + Math.max(0, (parseFloat(b.total) || 0) - (parseFloat(b.paid) || 0)), 0);
        
        const lifetimeBilledEl = document.getElementById('profileLifetimeBilled');
        if (lifetimeBilledEl) lifetimeBilledEl.textContent = '₹ ' + lifetimeBilled.toLocaleString('en-IN');
        
        const totalPaidEl = document.getElementById('profileTotalPaid');
        if (totalPaidEl) totalPaidEl.textContent = '₹ ' + totalPaid.toLocaleString('en-IN');
        
        const outstandingBalanceEl = document.getElementById('profileOutstandingBalance');
        if (outstandingBalanceEl) outstandingBalanceEl.textContent = outstanding > 0 ? '₹ ' + outstanding.toLocaleString('en-IN') : '₹ 0';
    }

    function renderCustomerBills() {
        if (!currentCustomerData) return;
        const tbody = document.getElementById('profileBillsTable');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!currentCustomerData.bills.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted)">No bills yet</td></tr>';
            return;
        }
        currentCustomerData.bills.forEach(bill => {
            const total = parseFloat(bill.total) || 0;
            const paid = parseFloat(bill.paid) || 0;
            const due = total - paid;
            const status = (bill.status || (due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding')).toLowerCase();
            const badgeClass = status === 'paid' ? 'badge-paid' : status === 'partial' ? 'badge-partial' : 'badge-outstanding';
            const dueDisplay = due > 0 ? '₹&nbsp;' + due.toLocaleString('en-IN') : '—';
            const dueColor = due > 0 ? 'var(--rose-text)' : 'var(--text-muted)';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="font-mono font-bold" style="color:var(--primary);font-size:12px">${bill.inv}</span></td>
                <td style="color:var(--text-muted);font-size:13px;white-space:nowrap">${bill.dateDisplay || bill.date}</td>
                <td class="tabular font-semibold" style="text-align:right">₹&nbsp;${total.toLocaleString('en-IN')}</td>
                <td class="tabular" style="text-align:right;color:var(--emerald-text)">₹&nbsp;${paid.toLocaleString('en-IN')}</td>
                <td class="tabular font-semibold" style="text-align:right;color:${dueColor}">${dueDisplay}</td>
                <td><span class="badge ${badgeClass}" style="font-size:10px;padding:3px 9px;text-transform:capitalize">${status.charAt(0).toUpperCase()+status.slice(1)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    function formatLedgerDate(isoDate) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const d = new Date(isoDate + 'T00:00:00');
        return String(d.getDate()).padStart(2,'0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function renderLedger() {
        if (!currentCustomerData) return;
        const container = document.getElementById('profileLedger');
        if (!container) return;
        container.innerHTML = '';

        const entries = [];
        currentCustomerData.bills.forEach(bill => {
            entries.push({
                type: 'bill',
                sortDate: bill.date,
                displayDate: bill.dateDisplay || bill.date,
                label: bill.inv,
                amount: parseFloat(bill.total) || 0,
                sub: 'billed'
            });
        });
        currentCustomerData.payments.forEach(p => {
            entries.push({
                type: 'payment',
                sortDate: p.date,
                displayDate: formatLedgerDate(p.date),
                label: 'Payment',
                amount: parseFloat(p.amount) || 0,
                sub: p.notes || p.method || ''
            });
        });

        entries.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));

        if (!entries.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No entries yet</div>';
            return;
        }

        entries.forEach((entry, i) => {
            const isBill = entry.type === 'bill';
            const iconColor = isBill ? 'var(--rose-text)' : 'var(--emerald-text)';
            const iconBg   = isBill ? 'var(--rose-soft)'  : 'var(--emerald-soft)';
            const amountColor = isBill ? 'var(--rose-text)' : 'var(--emerald-text)';
            const sign = isBill ? '+' : '−';
            const isLast = i === entries.length - 1;

            const div = document.createElement('div');
            div.style.cssText = `display:flex;align-items:center;gap:12px;padding:12px 0;${isLast ? '' : 'border-bottom:1px solid var(--border)'}`;
            div.innerHTML = `
                <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${iconBg};color:${iconColor}">
                    <i data-lucide="${isBill ? 'arrow-up-right' : 'arrow-down-left'}" style="width:15px;height:15px"></i>
                </div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:13px;color:var(--text-strong)">${entry.label}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.displayDate}${entry.sub ? ' · ' + entry.sub : ''}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                    <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;color:${amountColor}">${sign}₹&nbsp;${entry.amount.toLocaleString('en-IN')}</div>
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-subtle);margin-top:2px">${entry.sub === 'billed' ? 'billed' : 'paid'}</div>
                </div>
            `;
            container.appendChild(div);
        });
        lucide.createIcons({ nodes: [container] });
    }

    function openRecordPaymentModal() {
        if (!currentCustomerData) return;
        const outstanding = currentCustomerData.bills.reduce((s, b) => {
            return s + Math.max(0, (parseFloat(b.total)||0) - (parseFloat(b.paid)||0));
        }, 0);
        if (outstanding <= 0) { toast('No outstanding balance to record payment for', 'check-circle'); return; }
        const today = new Date().toISOString().split('T')[0];
        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Record Payment</div>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px">Payment will be deducted from the customer's total outstanding balance.</p>
            <div style="background:var(--rose-soft);border:1px solid #f3c4ca;border-radius:14px;padding:18px;margin-bottom:22px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--rose-text);margin-bottom:6px">Current Outstanding</div>
                <div class="font-serif font-bold" style="font-size:30px;color:var(--rose-text)">₹ ${outstanding.toLocaleString('en-IN')}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
                <div>
                    <label class="label">Amount Received (₹) <span style="color:var(--rose)">*</span></label>
                    <input class="input tabular" id="modal-pay-amount" type="number" placeholder="0.00" min="0.01" step="0.01" autofocus />
                </div>
                <div>
                    <label class="label">Date</label>
                    <input class="input" id="modal-pay-date" type="date" value="${today}" />
                </div>
                <div>
                    <label class="label">Note (Optional)</label>
                    <input class="input" id="modal-pay-notes" placeholder="e.g. Cash received, UPI, cheque..." />
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-accent" onclick="confirmPayment()">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Confirm Payment
                    </button>
                </div>
            </div>
        `);
    }

    window.confirmPayment = function() {
        const amount = parseFloat(document.getElementById('modal-pay-amount')?.value) || 0;
        const date   = document.getElementById('modal-pay-date')?.value || '';
        const notes  = document.getElementById('modal-pay-notes')?.value.trim() || '';
        if (amount <= 0) { toast('Enter a valid payment amount', 'alert-circle'); return; }
        if (!date)       { toast('Date is required', 'alert-circle'); return; }

        // Allocate to oldest pending bills first
        const pendingBills = currentCustomerData.bills
            .map((b, idx) => ({ ...b, idx, pending: (parseFloat(b.total)||0) - (parseFloat(b.paid)||0) }))
            .filter(b => b.pending > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        let remaining = amount;
        pendingBills.forEach(b => {
            if (remaining <= 0) return;
            const toAlloc = Math.min(remaining, b.pending);
            const orig = currentCustomerData.bills[b.idx];
            orig.paid = (parseFloat(orig.paid) || 0) + toAlloc;
            const total = parseFloat(orig.total) || 0;
            orig.status = orig.paid >= total ? 'paid' : orig.paid > 0 ? 'partial' : 'outstanding';
            remaining -= toAlloc;
        });

        // Record the payment
        if (!window.CUSTOMER_PAYMENTS[currentCustomerData.name]) window.CUSTOMER_PAYMENTS[currentCustomerData.name] = [];
        window.CUSTOMER_PAYMENTS[currentCustomerData.name].push(stampRecord({ date, amount, method: 'Cash', notes }));
        currentCustomerData.payments = window.CUSTOMER_PAYMENTS[currentCustomerData.name];
        try { localStorage.setItem('fp_customer_payments', JSON.stringify(window.CUSTOMER_PAYMENTS)); } catch(e) {}

        // Sync updated bills back to the card element so re-opening works correctly
        if (currentCustomerCard) {
            currentCustomerCard.dataset.cbills = JSON.stringify(currentCustomerData.bills);
            const newOutstanding = currentCustomerData.bills.reduce((s, b) => s + Math.max(0, (parseFloat(b.total)||0) - (parseFloat(b.paid)||0)), 0);
            const outEl = currentCustomerCard.querySelector('.text-xs.font-semibold[style*="rose"]');
            if (outEl) outEl.textContent = 'Outstanding: ₹ ' + newOutstanding.toLocaleString('en-IN');
        }

        // Sync updated bills back to the global BILLS array and persist
        currentCustomerData.bills.forEach(cb => {
            const globalBill = BILLS.find(gb => gb.inv === cb.inv);
            if (globalBill) {
                globalBill.paid = cb.paid;
                globalBill.status = cb.status;
            }
        });
        try { localStorage.setItem('fp_bills_offline', JSON.stringify(BILLS.filter(b => b._offline))); } catch(e) {}
        renderBills();
        renderReportsFromBills();

        refreshProfileStats();
        renderCustomerBills();
        renderLedger();
        document.getElementById('profileBillCount').textContent = currentCustomerData.bills.length + ' BILLS';
        closeModal();
        toast('Payment of ₹ ' + amount.toLocaleString('en-IN') + ' recorded', 'check-circle');
        logActivity('Payment Recorded', '₹ ' + amount.toLocaleString('en-IN') + ' received from <strong>' + currentCustomerData.name + '</strong>');
    };

    // Wire Record Payment button
    document.getElementById('recordPaymentBtn')?.addEventListener('click', openRecordPaymentModal);

    // Wire New Bill button on profile page
    document.getElementById('profileNewBillBtn')?.addEventListener('click', () => {
        const name = currentCustomerData?.name || '';
        goto('new-bill');
        const custInput = document.getElementById('custName');
        if (custInput && name) custInput.value = name;
        toast('New bill for ' + name);
    });

    // Wire up all View Profile buttons
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', () => openCustomerProfile(btn.closest('.customer-card')));
    });

    // Customer search
    const customerSearch = document.querySelector('#page-customers .input[placeholder*="Search by name"]');
    customerSearch?.addEventListener('input', () => {
        const q = customerSearch.value.toLowerCase();
        document.querySelectorAll('#customer-grid .customer-card').forEach(card => {
            card.style.display = !q || card.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });

    window.closeModal = closeModal;

    /* ============================================================
       INVOICE PRINT / CSV / LOOKUP HELPERS
    ============================================================ */
    window.openCustomerHistoryModal = function() {
        if (!currentCustomerData) {
            toast('No customer profile loaded', 'alert-circle');
            return;
        }

        const name = currentCustomerData.name;
        const phone = currentCustomerData.phone || '—';
        const bills = currentCustomerData.bills || [];

        if (!bills.length) {
            toast('No purchase history found for this customer', 'alert-circle');
            return;
        }

        const resolvedBills = bills.map(cb => {
            let bill = BILLS.find(b => b.inv === cb.inv);
            if (!bill) {
                const total = parseFloat(String(cb.total).replace(/[^0-9.-]+/g,'')) || 0;
                const paid = parseFloat(String(cb.paid).replace(/[^0-9.-]+/g,'')) || 0;
                bill = {
                    inv: cb.inv,
                    date: cb.date,
                    dateDisplay: cb.dateDisplay,
                    customer: name,
                    phone: phone,
                    total: total,
                    paid: paid,
                    status: cb.status || (total - paid <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding'),
                    type: cb.type || 'Normal',
                    createdBy: 'System',
                    subtotal: total / 1.18,
                    gstPercent: 18,
                    gst: total - (total / 1.18),
                    items: [
                        { name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: total / 1.18, amount: total / 1.18 }
                    ]
                };
            }
            return bill;
        });

        let billsHtml = resolvedBills.map(bill => {
            let parsedItems = bill.items || [];
            if (typeof parsedItems === 'string') {
                try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
            }
            if (!parsedItems.length) {
                const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
                parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
            }

            const itemsRows = parsedItems.map(item => {
                const detail = `${item.qty || 0} ${item.unit || ''} × ₹${(parseFloat(item.price)||0).toLocaleString('en-IN')} = ₹${(parseFloat(item.amount)||0).toLocaleString('en-IN')}`;
                return `<div class="flex justify-between items-center py-1 text-xs border-b border-gray-100 last:border-b-0" style="border-color:var(--border)">
                    <span style="color:var(--text-strong); font-weight: 500;">${item.name}</span>
                    <span class="tabular" style="color:var(--text-muted)">${detail}</span>
                </div>`;
            }).join('');

            const dateStr = bill.dateDisplay || formatShortDate(bill.date);
            const total = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            const paid = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
            const due = total - paid;
            const status = (bill.status || '').toLowerCase();
            const badgeClass = status === 'paid' ? 'badge-paid' : status === 'partial' ? 'badge-partial' : 'badge-outstanding';

            return `
                <div class="card mb-4" style="padding: 14px; background: var(--surface-tint); border: 1px solid var(--border); border-radius: 12px;">
                    <div class="flex justify-between items-center mb-2 pb-2 border-b" style="border-color:var(--border)">
                        <div>
                            <span class="font-mono font-bold" style="color:var(--primary)">${bill.inv}</span>
                            <span class="text-xs ml-2" style="color:var(--text-muted)">${dateStr}</span>
                        </div>
                        <span class="badge ${badgeClass}" style="font-size:10px; padding:2px 7px; text-transform:capitalize">${status}</span>
                    </div>
                    <div class="space-y-1 mb-2">
                        ${itemsRows}
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t text-xs font-semibold" style="border-color:var(--border); color: var(--text-strong)">
                        <span>Billed: ₹${total.toLocaleString('en-IN')}</span>
                        <span style="color: var(--emerald-text)">Paid: ₹${paid.toLocaleString('en-IN')}</span>
                        ${due > 0 ? `<span style="color: var(--rose-text)">Due: ₹${due.toLocaleString('en-IN')}</span>` : '<span>Fully Paid</span>'}
                    </div>
                </div>
            `;
        }).join('');

        const lifetimeBilled = resolvedBills.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
        const totalPaid = resolvedBills.reduce((s, b) => s + (parseFloat(b.paid) || 0), 0);
        const outstanding = lifetimeBilled - totalPaid;

        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Customer Purchase History</div>
            <div class="font-semibold text-lg" style="color:var(--primary)">${name}</div>
            <div class="text-xs mb-4 font-mono flex items-center gap-1" style="color:var(--text-muted)"><i data-lucide="phone" class="w-3.5 h-3.5 inline"></i><span>${phone}</span></div>
            
            <div class="grid grid-cols-3 gap-3 mb-4 text-center">
                <div style="background:var(--surface-tint);border-radius:10px;padding:8px">
                    <div class="text-[9px] font-bold uppercase tracking-widest mb-0.5" style="color:var(--text-muted)">Total Billed</div>
                    <div class="font-serif font-bold text-sm">₹ ${lifetimeBilled.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:var(--emerald-soft);border-radius:10px;padding:8px">
                    <div class="text-[9px] font-bold uppercase tracking-widest mb-0.5" style="color:var(--emerald-text)">Total Paid</div>
                    <div class="font-serif font-bold text-sm" style="color:var(--emerald-text)">₹ ${totalPaid.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:${outstanding > 0 ? 'var(--rose-soft)' : 'var(--emerald-soft)'};border-radius:10px;padding:8px">
                    <div class="text-[9px] font-bold uppercase tracking-widest mb-0.5" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">Outstanding</div>
                    <div class="font-serif font-bold text-sm" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">₹ ${outstanding.toLocaleString('en-IN')}</div>
                </div>
            </div>
            
            <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--text-muted)">Bills & Purchase Details</div>
            <div style="max-height:300px; overflow-y:auto; padding-right:4px; margin-bottom:15px">
                ${billsHtml}
            </div>
            
            <div class="flex gap-2">
                <button class="btn btn-secondary flex-1" onclick="window.printCustomerHistory()"><i data-lucide="printer" class="w-4 h-4"></i> Print History</button>
                <button class="btn btn-secondary flex-1" onclick="window.downloadCustomerHistoryCSV()"><i data-lucide="download" class="w-4 h-4"></i> Export CSV</button>
                <button class="btn btn-primary" onclick="closeModal()">Close</button>
            </div>
        `);
    };

    window.printCustomerHistory = function() {
        if (!currentCustomerData) return;
        const name = currentCustomerData.name;
        const phone = currentCustomerData.phone || '—';
        const bills = currentCustomerData.bills || [];

        const resolvedBills = bills.map(cb => {
            let bill = BILLS.find(b => b.inv === cb.inv);
            if (!bill) {
                const total = parseFloat(String(cb.total).replace(/[^0-9.-]+/g,'')) || 0;
                const paid = parseFloat(String(cb.paid).replace(/[^0-9.-]+/g,'')) || 0;
                bill = {
                    inv: cb.inv,
                    date: cb.date,
                    dateDisplay: cb.dateDisplay,
                    customer: name,
                    phone: phone,
                    total: total,
                    paid: paid,
                    status: cb.status || (total - paid <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding'),
                    type: cb.type || 'Normal',
                    createdBy: 'System',
                    subtotal: total / 1.18,
                    gstPercent: 18,
                    gst: total - (total / 1.18),
                    items: [
                        { name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: total / 1.18, amount: total / 1.18 }
                    ]
                };
            }
            return bill;
        });

        let contentHtml = '';
        resolvedBills.forEach(bill => {
            let parsedItems = bill.items || [];
            if (typeof parsedItems === 'string') {
                try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
            }
            if (!parsedItems.length) {
                const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
                parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
            }

            const itemsRows = parsedItems.map(item => `
                <tr>
                    <td>${item.name || ''}</td>
                    <td class="num">${item.qty || 0} ${item.unit || ''}</td>
                    <td class="num">₹ ${(parseFloat(item.price)||0).toLocaleString('en-IN')}</td>
                    <td class="num">₹ ${(parseFloat(item.amount)||0).toLocaleString('en-IN')}</td>
                </tr>
            `).join('');

            const dateStr = bill.dateDisplay || formatShortDate(bill.date);
            const total = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            const paid = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
            const due = total - paid;
            
            contentHtml += `
            <div class="bill-block" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <table style="width: 100%; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 10px;">
                    <tr>
                        <td><strong>Invoice:</strong> <span style="color:#1e3a8a; font-family: monospace; font-weight: bold;">${bill.inv}</span></td>
                        <td style="text-align: right;"><strong>Date:</strong> ${dateStr}</td>
                    </tr>
                </table>
                <table class="items-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="text-align: left; padding: 6px; border: 1px solid #e5e7eb;">Description</th>
                            <th class="num" style="text-align: right; padding: 6px; border: 1px solid #e5e7eb; width: 15%;">Qty</th>
                            <th class="num" style="text-align: right; padding: 6px; border: 1px solid #e5e7eb; width: 20%;">Rate</th>
                            <th class="num" style="text-align: right; padding: 6px; border: 1px solid #e5e7eb; width: 20%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 10px; font-weight: bold; font-size: 13px;">
                    Total: ₹ ${total.toLocaleString('en-IN')} | 
                    Paid: ₹ ${paid.toLocaleString('en-IN')} | 
                    Due: <span style="color: ${due > 0 ? '#ef4444' : '#10b981'}">₹ ${due.toLocaleString('en-IN')}</span>
                </div>
            </div>
            `;
        });

        const lifetimeBilled = resolvedBills.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
        const totalPaid = resolvedBills.reduce((s, b) => s + (parseFloat(b.paid) || 0), 0);
        const outstanding = lifetimeBilled - totalPaid;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast('Popup blocked! Please allow popups for printing.', 'alert-circle');
            return;
        }

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Purchase History - ${name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #333; }
        .container { max-width: 800px; margin: auto; }
        .header { border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; }
        .company-name { font-size: 26px; font-weight: bold; color: #1e3a8a; font-family: Georgia, serif; }
        .summary-box { background: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; }
        .summary-item { text-align: center; flex: 1; }
        .summary-item .val { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-top: 5px; }
        .items-table td, .items-table th { padding: 6px; border: 1px solid #e5e7eb; }
        .items-table th.num, .items-table td.num { text-align: right; }
        @media print {
            body { margin: 0; }
            .container { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table style="width: 100%;">
                <tr>
                    <td>
                        <div class="company-name">FRIENDS PRINTING</div>
                        <div>Customer Statement & Statement of Accounts</div>
                    </td>
                    <td style="text-align: right; vertical-align: bottom;">
                        <h2 style="margin: 0; color: #1e3a8a;">CUSTOMER HISTORY</h2>
                        <div><strong>Client Name:</strong> ${name}</div>
                        <div><strong>Phone:</strong> ${phone}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        <div class="summary-box">
            <div class="summary-item">
                <div style="font-size: 11px; text-transform: uppercase; color: #666;">Total Billed</div>
                <div class="val">₹ ${lifetimeBilled.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
                <div style="font-size: 11px; text-transform: uppercase; color: #666;">Total Paid</div>
                <div class="val" style="color: #10b981;">₹ ${totalPaid.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-item">
                <div style="font-size: 11px; text-transform: uppercase; color: #666;">Outstanding Due</div>
                <div class="val" style="color: ${outstanding > 0 ? '#ef4444' : '#10b981'};">₹ ${outstanding.toLocaleString('en-IN')}</div>
            </div>
        </div>
        
        <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color: #1e3a8a;">Purchase Details</h3>
        ${contentHtml}
    </div>
    \\x3cscript\\x3e
        window.onload = function() {
            window.print();
        };
    \\x3c/script\\x3e
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    window.downloadCustomerHistoryCSV = function() {
        if (!currentCustomerData) return;
        const name = currentCustomerData.name;
        const phone = currentCustomerData.phone || '—';
        const bills = currentCustomerData.bills || [];

        const resolvedBills = bills.map(cb => {
            let bill = BILLS.find(b => b.inv === cb.inv);
            if (!bill) {
                const total = parseFloat(String(cb.total).replace(/[^0-9.-]+/g,'')) || 0;
                const paid = parseFloat(String(cb.paid).replace(/[^0-9.-]+/g,'')) || 0;
                bill = {
                    inv: cb.inv,
                    date: cb.date,
                    dateDisplay: cb.dateDisplay,
                    customer: name,
                    phone: phone,
                    total: total,
                    paid: paid,
                    status: cb.status || (total - paid <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding'),
                    type: cb.type || 'Normal',
                    createdBy: 'System',
                    subtotal: total / 1.18,
                    gstPercent: 18,
                    gst: total - (total / 1.18),
                    items: [
                        { name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: total / 1.18, amount: total / 1.18 }
                    ]
                };
            }
            return bill;
        });

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Customer History Statement\\n";
        csvContent += `Customer Name,\${name}\\n`;
        csvContent += `Phone,\${phone}\\n\\n`;
        
        csvContent += "Invoice Number,Date,Status,Item Description,Quantity,Unit,Rate,Line Total,Invoice Total,Invoice Paid,Invoice Due\\n";

        const esc = (val) => {
            if (val === null || val === undefined) return '';
            let s = String(val).replace(/"/g, '""');
            if (s.includes(',') || s.includes('\\n') || s.includes('"')) return `"\${s}"`;
            return s;
        };

        resolvedBills.forEach(bill => {
            let parsedItems = bill.items || [];
            if (typeof parsedItems === 'string') {
                try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
            }
            if (!parsedItems.length) {
                const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
                parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
            }

            const total = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            const paid = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
            const due = total - paid;
            const status = bill.status || 'outstanding';
            const dateStr = bill.dateDisplay || formatShortDate(bill.date);

            parsedItems.forEach((item, idx) => {
                const isFirstRow = idx === 0;
                const invCol = isFirstRow ? esc(bill.inv) : '';
                const dateCol = isFirstRow ? esc(dateStr) : '';
                const statusCol = isFirstRow ? esc(status) : '';
                const invTotalCol = isFirstRow ? total : '';
                const invPaidCol = isFirstRow ? paid : '';
                const invDueCol = isFirstRow ? due : '';

                csvContent += `\${invCol},\\$\${dateCol},\\$\${statusCol},\\$\${esc(item.name)},\${item.qty || 0},\\$\${esc(item.unit || 'pcs')},\${(parseFloat(item.price)||0).toFixed(2)},\${(parseFloat(item.amount)||0).toFixed(2)},\${invTotalCol},\${invPaidCol},\${invDueCol}\\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `\${name.replace(/\\s+/g, '_')}_history.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast('History CSV Downloaded', 'check-circle');
    };

    window.printBillByInvoice = function(invId) {
        const bill = BILLS.find(b => b.inv === invId) || (currentCustomerData && currentCustomerData.bills.find(b => b.inv === invId));
        if (!bill) {
            toast('Bill not found', 'alert-circle');
            return;
        }

        // Resolve standard/mocked bill fields
        const customerName = bill.customer || (currentCustomerData ? currentCustomerData.name : 'Customer');
        const customerPhone = bill.phone || (currentCustomerData ? currentCustomerData.phone : '');
        const billTo = bill.billTo || '';
        const shipTo = bill.shipTo || '';
        const dateVal = bill.date ? new Date(bill.date) : new Date();
        const formattedDate = isNaN(dateVal.getTime()) ? (bill.dateDisplay || bill.date || '') : dateVal.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
        }
        if (!parsedItems.length) {
            // fallback mock item
            const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
        }

        const itemsRows = parsedItems.map(item => {
            return `<tr>
                <td>${item.name || ''}</td>
                <td class="num">${item.qty || 0} ${item.unit || ''}</td>
                <td class="num">₹ ${(parseFloat(item.price)||0).toLocaleString('en-IN')}</td>
                <td class="num">₹ ${(parseFloat(item.amount)||0).toLocaleString('en-IN')}</td>
            </tr>`;
        }).join('');

        const totalAmt = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
        const paidAmt = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
        const dueAmt = totalAmt - paidAmt;
        const subtotalAmt = parseFloat(bill.subtotal) || (totalAmt / 1.18);
        const gstPercentVal = bill.gstPercent !== undefined ? bill.gstPercent : 18;
        const gstAmt = parseFloat(bill.gst) || (totalAmt - subtotalAmt);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast('Popup blocked! Please allow popups for printing.', 'alert-circle');
            return;
        }

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${bill.inv}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #333; }
        .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 14px; line-height: 24px; }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .invoice-box table td { padding: 8px; vertical-align: top; }
        .invoice-box table tr td:nth-child(2) { text-align: right; }
        .invoice-header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #1e3a8a; font-family: Georgia, serif; }
        .invoice-title { font-size: 24px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-top: 10px; }
        .details-table { margin-bottom: 30px; }
        .details-table td { padding: 4px 0; }
        .items-table { width: 100%; margin-top: 20px; border-bottom: 2px solid #eee; border-collapse: collapse; }
        .items-table th { background: #f3f4f6; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
        .items-table td { padding: 10px; border: 1px solid #e5e7eb; }
        .items-table th.num, .items-table td.num { text-align: right; }
        .totals-table { width: 40%; margin-left: auto; margin-top: 20px; }
        .totals-table td { padding: 6px; }
        .totals-table tr.grand-total td { font-weight: bold; font-size: 16px; border-top: 2px solid #3b82f6; padding-top: 10px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        @media print {
            body { margin: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <table class="details-table" style="width: 100%;">
            <tr>
                <td>
                    <div class="company-name">FRIENDS PRINTING</div>
                    <div>Your Reliable Printing Partner</div>
                </td>
                <td style="text-align: right;">
                    <div class="invoice-title">INVOICE</div>
                    <div><strong>Invoice #:</strong> ${bill.inv}</div>
                    <div><strong>Date:</strong> ${formattedDate}</div>
                </td>
            </tr>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <table class="details-table" style="width: 100%;">
            <tr>
                <td style="width: 50%;">
                    <strong>Bill To:</strong><br>
                    ${customerName}<br>
                    ${customerPhone && customerPhone !== '—' ? 'Phone: ' + customerPhone + '<br>' : ''}
                    ${billTo ? 'Address: ' + billTo : ''}
                </td>
                <td style="width: 50%; text-align: right;">
                    ${shipTo ? '<strong>Ship To:</strong><br>' + shipTo : ''}
                </td>
            </tr>
        </table>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th class="num" style="width: 15%;">Qty</th>
                    <th class="num" style="width: 20%;">Price</th>
                    <th class="num" style="width: 20%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
        
        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">₹ ${subtotalAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
            </tr>
            ${gstPercentVal > 0 ? `
            <tr>
                <td>GST (${gstPercentVal}%):</td>
                <td style="text-align: right;">₹ ${gstAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
            </tr>` : ''}
            <tr class="grand-total">
                <td>Total:</td>
                <td style="text-align: right;">₹ ${totalAmt.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
                <td style="color: #10b981;">Paid:</td>
                <td style="text-align: right; color: #10b981;">₹ ${paidAmt.toLocaleString('en-IN')}</td>
            </tr>
            ${dueAmt > 0 ? `
            <tr style="color: #ef4444; font-weight: bold;">
                <td>Balance Due:</td>
                <td style="text-align: right;">₹ ${dueAmt.toLocaleString('en-IN')}</td>
            </tr>` : `
            <tr style="color: #10b981; font-weight: bold;">
                <td>Status:</td>
                <td style="text-align: right;">PAID</td>
            </tr>`}
        </table>
        
        <div class="footer">
            Thank you for your business!<br>
            If you have any questions about this invoice, please contact us.<br>
            Generated by ${bill.createdBy || 'Staff'}
        </div>
    </div>
    \x3cscript\x3e
        window.onload = function() {
            window.print();
        };
    \x3c/script\x3e
</body>
</html>`;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    window.printInvoice = window.printBillByInvoice;

    window.downloadInvoiceCSV = function(invId) {
        const bill = BILLS.find(b => b.inv === invId) || (currentCustomerData && currentCustomerData.bills.find(b => b.inv === invId));
        if (!bill) {
            toast('Bill not found', 'alert-circle');
            return;
        }

        const customerName = bill.customer || (currentCustomerData ? currentCustomerData.name : 'Customer');
        const customerPhone = bill.phone || (currentCustomerData ? currentCustomerData.phone : '');
        const billTo = bill.billTo || '';
        const shipTo = bill.shipTo || '';
        const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
        const paidVal = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
        const due = totalVal - paidVal;
        const subtotalAmt = parseFloat(bill.subtotal) || (totalVal / 1.18);
        const gstPercentVal = bill.gstPercent !== undefined ? bill.gstPercent : 18;
        const gstAmt = parseFloat(bill.gst) || (totalVal - subtotalAmt);

        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
        }
        if (!parsedItems.length) {
            parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Invoice Number,Date,Customer,Phone,Bill To,Ship To,Created By,Type,Subtotal,GST %,GST Amount,Total,Paid,Due\n";

        const esc = (val) => {
            if (val === null || val === undefined) return '';
            let s = String(val).replace(/"/g, '""');
            if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
            return s;
        };

        csvContent += `${esc(bill.inv)},${esc(bill.date)},${esc(customerName)},${esc(customerPhone)},${esc(billTo)},${esc(shipTo)},${esc(bill.createdBy || 'Staff')},${esc(bill.type || 'Normal')},${subtotalAmt.toFixed(2)},${gstPercentVal},${gstAmt.toFixed(2)},${totalVal.toFixed(2)},${paidVal.toFixed(2)},${due.toFixed(2)}\n\n`;

        csvContent += "Item Name,Quantity,Unit,Unit Price,Item Amount\n";
        parsedItems.forEach(item => {
            csvContent += `${esc(item.name)},${item.qty || 0},${esc(item.unit || 'pcs')},${(parseFloat(item.price)||0).toFixed(2)},${(parseFloat(item.amount)||0).toFixed(2)}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${bill.inv}_invoice.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast('CSV Downloaded', 'check-circle');
    };

    window.openBillDetailsByName = function(invId) {
        const bill = BILLS.find(b => b.inv === invId) || (currentCustomerData && currentCustomerData.bills.find(b => b.inv === invId));
        if (!bill) {
            toast('Bill not found', 'alert-circle');
            return;
        }

        const customerName = bill.customer || (currentCustomerData ? currentCustomerData.name : 'Customer');
        const total = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
        const paid = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
        const outstanding = total - paid;
        const status = (bill.status || (outstanding <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding')).toLowerCase();

        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
        }
        if (!parsedItems.length) {
            parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: total / 1.18, amount: total / 1.18 }];
        }

        const itemsHtml = parsedItems.map(item => {
            const name = item.name || '';
            const detail = `${item.qty || 0} ${item.unit || ''} × ₹${(parseFloat(item.price)||0).toLocaleString('en-IN')} = ₹${(parseFloat(item.amount)||0).toLocaleString('en-IN')}`;
            return `<div class="flex justify-between items-center py-2" style="border-bottom:1px solid var(--border)">
                <span class="text-sm font-semibold">${name}</span>
                <span class="text-sm tabular" style="color:var(--text-muted)">${detail}</span>
            </div>`;
        }).join('');

        const payActions = status !== 'paid' ? `
            <div style="background:var(--primary-soft);border-radius:12px;padding:16px;margin-top:4px">
                <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--primary-text)">Record Payment</div>
                <div class="flex gap-2">
                    <input class="input text-right tabular flex-1" id="bill-pay-amount" type="number" min="0" step="0.01" max="${outstanding}" placeholder="Amount" value="${outstanding}" />
                    <select class="select" style="width:120px" id="bill-pay-mode">
                        <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
                    </select>
                    <button class="btn btn-primary" onclick="recordBillPayment('${bill.inv}', ${total}, ${paid})">
                        <i data-lucide="check" class="w-4 h-4"></i> Record
                    </button>
                </div>
            </div>` : '';

        openModal(`
            <div class="flex items-center justify-between mb-1">
                <div class="font-mono font-bold text-lg" style="color:var(--primary)">${bill.inv}</div>
                ${getBadgeHtml(status)}
            </div>
            <div class="font-serif text-2xl font-bold mb-4">${customerName}</div>
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div style="background:var(--surface-tint);border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:var(--text-muted)">Total</div>
                    <div class="font-serif font-bold text-lg">₹ ${total.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:var(--emerald-soft);border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:var(--emerald-text)">Paid</div>
                    <div class="font-serif font-bold text-lg" style="color:var(--emerald-text)">₹ ${paid.toLocaleString('en-IN')}</div>
                </div>
                <div style="background:${outstanding > 0 ? 'var(--rose-soft)' : 'var(--emerald-soft)'};border-radius:10px;padding:12px">
                    <div class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">Outstanding</div>
                    <div class="font-serif font-bold text-lg" style="color:${outstanding > 0 ? 'var(--rose-text)' : 'var(--emerald-text)'}">₹ ${outstanding.toLocaleString('en-IN')}</div>
                </div>
            </div>
            <div class="text-xs grid grid-cols-3 gap-2 mb-4" style="color:var(--text-muted)">
                <span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${bill.dateDisplay || formatShortDate(bill.date)}</span>
                <span><i data-lucide="tag" class="w-3 h-3 inline"></i> ${bill.type || 'Normal'}</span>
                <span><i data-lucide="user" class="w-3 h-3 inline"></i> ${bill.createdBy || 'Staff'}</span>
            </div>
            <div class="mb-4">
                <div class="text-xs font-bold uppercase tracking-widest mb-2" style="color:var(--text-muted)">Line Items</div>
                <div class="max-h-40 overflow-y-auto pr-1">
                    ${itemsHtml}
                </div>
            </div>
            ${payActions}
            <div class="flex gap-2 mt-4">
                <button class="btn btn-secondary flex-1" onclick="window.printBillByInvoice('${bill.inv}')"><i data-lucide="printer" class="w-4 h-4"></i> Print / PDF</button>
                <button class="btn btn-secondary flex-1" onclick="window.downloadInvoiceCSV('${bill.inv}')"><i data-lucide="download" class="w-4 h-4"></i> CSV</button>
                ${status !== 'paid' ? `<button class="btn flex-1" style="background:var(--emerald);color:white" onclick="markBillPaid('${bill.inv}', ${total})"><i data-lucide="check-circle" class="w-4 h-4"></i> Mark Paid</button>` : ''}
            </div>
        `);
    };

    window.closeModal = closeModal;

    /* ============================================================
       LOGOUT BUTTON
    ============================================================ */
    const logoutBtn = document.querySelector('.user-block button[title="Logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Log Out</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Are you sure you want to log out?</div>
            <div class="grid grid-cols-2 gap-3">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="logout();closeModal()"><i data-lucide="log-out" class="w-4 h-4"></i> Log Out</button>
            </div>
        `));
    }

    /* ============================================================
       DASHBOARD quick-action cards click → navigate
    ============================================================ */
    document.querySelectorAll('#page-dashboard .stat[onclick], #page-dashboard [data-goto]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => goto(el.dataset.goto || el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]));
    });

    /* ============================================================
       "Split into two bills?" link in mixed warning
    ============================================================ */
    const splitLink = document.querySelector('#mixedWarning a');
    if (splitLink) {
        splitLink.addEventListener('click', e => {
            e.preventDefault();
            toast('Split bill feature coming soon', 'layers');
        });
    }

    /* ============================================================
       INIT
    ============================================================ */
    lucide.createIcons();
    document.querySelectorAll('.staff-only-view').forEach(el => el.style.display = 'none');
    recalcSummary(); // initial invoice preview calculation

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    ['emailInput','passwordInput'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    });
    const pwdToggle = document.getElementById('togglePwd');
    if (pwdToggle) pwdToggle.addEventListener('click', togglePasswordVisibility);

    /* ============================================================
       MOBILE — bottom nav, drawer, table scroll wrappers
    ============================================================ */
    // Wrap all data tables in scroll containers
    document.querySelectorAll('.data-table').forEach(function(table) {
        if (!table.parentElement.classList.contains('table-scroll-wrap')) {
            var wrapper = document.createElement('div');
            wrapper.className = 'table-scroll-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });

    function setMobileActive(btn) {
        document.querySelectorAll('.mobile-nav-item').forEach(function(b) { b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
    }

    // Sync mobile nav active state when goto() is called
    var _origGoto = window.goto || function(){};
    window.goto = function(pageId) {
        _origGoto(pageId);
        // Sync desktop nav active (already done in original goto)
        // Sync mobile nav
        var mobileBtn = document.querySelector('.mobile-nav-item[data-page="' + pageId + '"]');
        document.querySelectorAll('.mobile-nav-item').forEach(function(b) { b.classList.remove('active'); });
        if (mobileBtn) mobileBtn.classList.add('active');
        else {
            // "More" items — highlight the More button
            var moreBtn = document.querySelector('.mobile-nav-item:last-child');
            if (moreBtn) moreBtn.classList.add('active');
        }
    };

    function openMobileDrawer() {
        document.getElementById('mobileMoreDrawer').classList.add('open');
        document.getElementById('mobileDrawerOverlay').classList.add('open');
    }
    function closeMobileDrawer() {
        document.getElementById('mobileMoreDrawer').classList.remove('open');
        document.getElementById('mobileDrawerOverlay').classList.remove('open');
    }

    // Sync mobile user info when role changes
    var _origSetRole = window.setRole || function(){};
    window.setRole = function(role, evt, staffData) {
        _origSetRole(role, evt, staffData);
        var mobileAvatar = document.getElementById('mobileUserAvatar');
        var mobileName = document.getElementById('mobileUserName');
        var mobileRole = document.getElementById('mobileUserRole');
        if (role === 'staff') {
            var sName = (staffData && staffData.name) ? staffData.name : (document.getElementById('userName')?.textContent || 'Staff');
            if (mobileAvatar) mobileAvatar.textContent = sName.charAt(0).toUpperCase();
            if (mobileName) mobileName.textContent = sName;
            if (mobileRole) mobileRole.textContent = 'Staff';
            document.querySelectorAll('.mobile-more-drawer .staff-hidden').forEach(function(el) { el.style.display = 'none'; });
        } else {
            var aName = (staffData && staffData.name) ? staffData.name : (document.getElementById('userName')?.textContent || 'Admin');
            if (mobileAvatar) mobileAvatar.textContent = aName.charAt(0).toUpperCase();
            if (mobileName) mobileName.textContent = aName;
            if (mobileRole) mobileRole.textContent = 'Admin';
            document.querySelectorAll('.mobile-more-drawer .staff-hidden').forEach(function(el) { el.style.display = ''; });
        }
    };

    // Sync mobile name when settings are saved
    var _origSaveStore = window.saveStoreSettings || function(){};
    window.saveStoreSettings = function() {
        _origSaveStore();
        var owner = document.getElementById('store-owner') ? document.getElementById('store-owner').value.trim() : '';
        if (owner) {
            var mobileAvatar = document.getElementById('mobileUserAvatar');
            var mobileName = document.getElementById('mobileUserName');
            if (mobileAvatar) mobileAvatar.textContent = owner.charAt(0).toUpperCase();
            if (mobileName) mobileName.textContent = owner;
        }
    };

    lucide.createIcons({ nodes: [document.querySelector('.mobile-nav'), document.getElementById('mobileMoreDrawer')] });

    /* ============================================================
       PRINT JOB CALCULATOR — PRICING ENGINE
       All rates are stored in PRICING_DB. No hardcoded values in
       calculation logic. To update any rate, only edit PRICING_DB.
    ============================================================ */
    const PRICING_DB = {
        paper: {
            types: [
                { key: '130_gsm',  label: '130 GSM',   os: 7,  fb: 12 },
                { key: '170_gsm',  label: '170 GSM',   os: 7,  fb: 12 },
                { key: '220_gsm',  label: '220 GSM',   os: 8,  fb: 14 },
                { key: '250_gsm',  label: '250 GSM',   os: 8,  fb: 14 },
                { key: '300_gsm',  label: '300 GSM',   os: 8,  fb: 14 },
                { key: '350_gsm',  label: '350 GSM',   os: 15, fb: 20 },
                { key: '400_gsm',  label: '400 GSM',   os: 20, fb: 25 },
                { key: 'maplitho', label: 'Maplitho',  os: 7,  fb: 12 },
                { key: 'bound',    label: 'Bound',      os: 6,  fb: 12 },
            ]
        },
        sticker: {
            types: [
                { key: 'pvc',         label: 'PVC',                rate: 22 },
                { key: 'normal',      label: 'Normal Sticker',     rate: 12 },
                { key: 'thick',       label: 'Thick Sticker',      rate: 20 },
                { key: 'transparent', label: 'Transparent Sticker',rate: 18 },
            ]
        },
        flex: {
            types: [
                { key: 'normal_flex', label: 'Normal Flex', rate: 18 },
                { key: 'star_flex',   label: 'Star Flex',   rate: 22 },
                { key: 'vinyl',       label: 'Vinyl',       rate: 35 },
                { key: 'blackout',    label: 'Blackout',    rate: 25 },
                { key: 'laminated',   label: 'Laminated',   rate: 45 },
            ]
        },
        lamination: {
            gloss: { perSheetOS: 2, perSheetFB: 4, min: 150 },
            matte: { perSheetOS: 3, perSheetFB: 5, min: 150 },
        },
        cutting: {
            normal:     { perSheet: 1,  min: 50  },
            half:       { perSheet: 2,  min: 100 },
            full_shape: { perSheet: 5,  min: 200 },
        },
        additionalServices: {
            creasing:    { perSheet: 2, min: 150 },
            perforation: { perSheet: 2, min: 150 },
        }
    };

    /* Dynamic Inline Calculator Event Hooks completed */

    /* ============================================================
       INVENTORY & LOW STOCK & DROPDOWN SETTINGS MANAGEMENT
    ============================================================ */
    const INVENTORY_ITEMS = [];
    let DROPDOWN_SETTINGS = {
        materialTypes: ['A4 80gsm', 'A3 80gsm', 'Art Paper 130gsm', 'Card 250gsm', 'Art Paper 300gsm', '130 GSM', '170 GSM', '220 GSM', '250 GSM', '300 GSM', '350 GSM', '400 GSM', 'Maplitho', 'Bound', 'PVC', 'Normal Sticker', 'Thick Sticker', 'Transparent Sticker', 'Normal Flex', 'Star Flex', 'Vinyl', 'Blackout', 'Laminated'],
        units: ['sheets', 'sqft', 'litres', 'rolls', 'pieces', 'pack'],
        categories: ['Paper', 'Ink', 'Consumable', 'Flex', 'Sticker']
    };

    function isLowStock(item) {
        return (parseFloat(item.qty) || 0) < 5;
    }

    window.loadInventoryData = function() {
        const stored = localStorage.getItem('fp_inventory_items');
        if (stored) {
            try {
                INVENTORY_ITEMS.length = 0;
                INVENTORY_ITEMS.push(...JSON.parse(stored));
                return;
            } catch (e) {
                console.error('loadInventoryData error', e);
            }
        }
        // No default mock data — start fresh
        INVENTORY_ITEMS.length = 0;
        window.saveInventoryData();
    }

    window.saveInventoryData = function() {
        localStorage.setItem('fp_inventory_items', JSON.stringify(INVENTORY_ITEMS));
    }

    window.loadDropdownSettings = function() {
        const stored = localStorage.getItem('fp_dropdown_settings');
        if (stored) {
            try { DROPDOWN_SETTINGS = JSON.parse(stored); } catch(e) {}
        }
    }

    window.syncDropdownSettings = function() {
        localStorage.setItem('fp_dropdown_settings', JSON.stringify(DROPDOWN_SETTINGS));
        if (window._serverAvailable) { try { apiPost('/settings/dropdown_settings', { value: DROPDOWN_SETTINGS }); } catch(e) {} }
    }

    window.deductInventoryFromBill = function(billItems) {
        if (!billItems || !billItems.length || !INVENTORY_ITEMS.length) return;
        let deducted = [];
        billItems.forEach(bi => {
            const biName = (bi.name || '').toLowerCase();
            if (!biName) return;
            const match = INVENTORY_ITEMS.find(inv => {
                const invName = (inv.name || '').toLowerCase();
                const invType = (inv.type || '').toLowerCase();
                return biName.includes(invName) || invName.includes(biName)
                    || (invType && (biName.includes(invType) || invType.includes(biName)));
            });
            if (match) {
                const deductQty = parseFloat(bi.qty) || 0;
                match.qty = Math.max(0, (parseFloat(match.qty) || 0) - deductQty);
                deducted.push({ name: match.name, deducted: deductQty, remaining: match.qty });
            }
        });
        if (deducted.length) {
            window.saveInventoryData();
            if (typeof window.renderInventoryTable === 'function') window.renderInventoryTable();
            if (typeof window.renderDashboardLowStock === 'function') window.renderDashboardLowStock();
        }
        return deducted;
    }

    window.renderInventoryTable = function() {
        const tbody = document.getElementById('inventory-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let totalPaper = 0;
        let totalInk = 0;
        let lowStockCount = 0;

        INVENTORY_ITEMS.forEach(item => {
            if (item.category === 'Paper') {
                totalPaper += (parseFloat(item.qty) || 0);
            } else if (item.category === 'Ink') {
                totalInk += (parseFloat(item.qty) || 0);
            }
            if (isLowStock(item)) {
                lowStockCount++;
            }
        });

        // Update stats
        const paperCard = document.querySelector('#page-inventory .stat-gold .stat-value');
        if (paperCard) paperCard.textContent = `${totalPaper.toLocaleString('en-IN')} sht`;
        const inkCard = document.querySelector('#page-inventory .stat-sky .stat-value');
        if (inkCard) inkCard.textContent = `${totalInk.toLocaleString('en-IN')} L`;
        const lowCard = document.querySelector('#page-inventory .stat-rose .stat-value');
        if (lowCard) lowCard.textContent = lowStockCount.toString();

        const q = (document.getElementById('inventory-search')?.value || '').toLowerCase();
        const lowOnly = document.getElementById('inventory-filter-low-stock')?.checked;

        const filtered = INVENTORY_ITEMS.filter(item => {
            const matchQ = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
            const matchLow = !lowOnly || isLowStock(item);
            return matchQ && matchLow;
        });

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="color: var(--text-muted)">No inventory items found matching filters.</td></tr>';
            return;
        }

        filtered.forEach(item => {
            const val = (item.qty * item.cost);
            const statusBadge = isLowStock(item)
                ? '<span class="badge" style="background: var(--rose-soft); color: var(--rose-text); border: 1px solid #f3c4ca"><i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1"></i>Low Stock</span>'
                : '<span class="badge badge-paid">OK</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-semibold">${item.name}</td>
                <td style="color:var(--text-muted)">${item.category}</td>
                <td style="color:var(--text-muted)">${item.type}</td>
                <td class="tabular font-bold" style="text-align:right; ${isLowStock(item)?'color: var(--rose);':''}">${item.qty.toLocaleString('en-IN')}</td>
                <td style="color:var(--text-muted)">${item.unit}</td>
                <td class="tabular" style="text-align:right">₹ ${item.cost.toFixed(2)}</td>
                <td class="tabular font-bold" style="text-align:right">₹ ${val.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${statusBadge}</td>
                <td style="text-align:center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="btn-ghost p-1.5 rounded" onclick="openEditInventoryItemModal(${item.id})"><i data-lucide="edit-2" class="w-3.5 h-3.5" style="color: var(--primary)"></i></button>
                        <button class="btn-ghost p-1.5 rounded" onclick="deleteInventoryItem(${item.id})"><i data-lucide="trash-2" class="w-3.5 h-3.5" style="color: var(--rose)"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons({ nodes: [tbody] });
    }

    window.renderDashboardLowStock = function() {
        const container = document.getElementById('dashboard-low-stock-list');
        if (!container) return;
        container.innerHTML = '';
        
        const lowStockItems = INVENTORY_ITEMS.filter(isLowStock);
        
        // Reports page card
        const rptLowCard = document.querySelector('#rpt-panel-stock .stat-rose .stat-value');
        if (rptLowCard) rptLowCard.textContent = lowStockItems.length.toString();
        
        let totalVal = 0;
        let paperStock = 0;
        let inkStock = 0;
        INVENTORY_ITEMS.forEach(item => {
            totalVal += (item.qty * item.cost);
            if (item.category === 'Paper') paperStock += item.qty;
            if (item.category === 'Ink') inkStock += item.qty;
        });
        const rptValCard = document.querySelector('#rpt-panel-stock .stat-gold .stat-value');
        if (rptValCard) rptValCard.textContent = `₹ ${totalVal.toLocaleString('en-IN', {maximumFractionDigits:0})}`;
        const rptPaperCard = document.querySelector('#rpt-panel-stock .stat-sky .stat-value');
        if (rptPaperCard) rptPaperCard.textContent = `${paperStock.toLocaleString('en-IN')} sht`;
        const rptInkCard = document.querySelector('#rpt-panel-stock .stat-emerald .stat-value');
        if (rptInkCard) rptInkCard.textContent = `${inkStock.toLocaleString('en-IN')} L`;

        // Valuation report table
        const valuationTbody = document.getElementById('stock-valuation-tbody');
        if (valuationTbody) {
            valuationTbody.innerHTML = '';
            INVENTORY_ITEMS.forEach(item => {
                const tr = document.createElement('tr');
                const total = item.qty * item.cost;
                const status = isLowStock(item) ? '<span class="badge badge-outstanding">Low</span>' : '<span class="badge badge-paid">OK</span>';
                tr.innerHTML = `
                    <td class="font-semibold">${item.name}</td>
                    <td style="color:var(--text-muted)">${item.category}</td>
                    <td style="color:var(--text-muted)">${item.unit}</td>
                    <td class="tabular" style="text-align:right">${(item.qty + 1000).toLocaleString('en-IN')}</td>
                    <td class="tabular" style="text-align:right">1,000</td>
                    <td class="tabular font-bold" style="text-align:right; ${isLowStock(item)?'color:var(--rose-text)':''}">${item.qty.toLocaleString('en-IN')}</td>
                    <td class="tabular" style="text-align:right">₹ ${item.cost.toFixed(2)}</td>
                    <td class="tabular font-bold" style="text-align:right;color:var(--primary)">₹ ${total.toLocaleString('en-IN')}</td>
                    <td>${status}</td>
                `;
                valuationTbody.appendChild(tr);
            });
        }

        if (!lowStockItems.length) {
            container.innerHTML = `
                <div class="text-center py-6 text-sm" style="color: var(--text-muted)">
                    <i data-lucide="check-circle" class="w-8 h-8 mx-auto mb-2 text-emerald" style="color:var(--emerald)"></i>
                    All items are well stocked.
                </div>
            `;
            lucide.createIcons({ nodes: [container] });
            return;
        }

        lowStockItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 rounded-xl';
            div.style.background = 'var(--rose-soft)';
            div.style.border = '1px solid #f3c4ca';
            div.innerHTML = `
                <div>
                    <div class="font-semibold text-sm text-strong">${item.name}</div>
                    <div class="text-xs text-muted" style="color: var(--text-muted)">Category: ${item.category}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-sm" style="color: var(--rose)">${item.qty} ${item.unit}</div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-rose" style="color:var(--rose)">Low Stock</div>
                </div>
            `;
            container.appendChild(div);
        });
        lucide.createIcons({ nodes: [container] });
    }

    window.openAddInventoryItemModal = function() {
        var paperOpts = PRICING_DB.paper.types.map(function(t) { return '<option value="' + t.key + '">' + t.label + '</option>'; }).join('');
        var stickerOpts = PRICING_DB.sticker.types.map(function(t) { return '<option value="' + t.key + '">' + t.label + '</option>'; }).join('');
        var flexOpts = PRICING_DB.flex.types.map(function(t) { return '<option value="' + t.key + '">' + t.label + '</option>'; }).join('');
        var cats = DROPDOWN_SETTINGS.categories.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
        var units = DROPDOWN_SETTINGS.units.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
        var types = DROPDOWN_SETTINGS.materialTypes.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');

        openModal('<div class="font-serif text-2xl font-bold mb-1">Add New Item</div>'
            + '<div class="text-sm mb-5" style="color:var(--text-muted)">Add a stock item to the inventory</div>'
            + '<div class="space-y-4">'
            + '<div><label class="label">Item Mode</label>'
            + '<select class="select" id="ni-mode" onchange="onInventoryModeChange()">'
            + '<option value="paper">Paper</option><option value="sticker">Sticker</option><option value="flex">Flex</option><option value="custom">Custom / Manual</option></select></div>'
            + '<div id="ni-paper-config">'
            + '<div class="grid grid-cols-2 gap-3 mb-3"><div><label class="label">Paper Type</label><select class="select" id="ni-paper-type" onchange="onInventoryConfigChange()">' + paperOpts + '</select></div>'
            + '<div><label class="label">Print Side</label><select class="select" id="ni-paper-side" onchange="onInventoryConfigChange()"><option value="os">O/S — One Side</option><option value="fb">F/B — Both Sides</option></select></div></div></div>'
            + '<div id="ni-sticker-config" style="display:none"><div class="mb-3"><label class="label">Sticker Type</label><select class="select" id="ni-sticker-type" onchange="onInventoryConfigChange()">' + stickerOpts + '</select></div></div>'
            + '<div id="ni-flex-config" style="display:none"><div class="mb-3"><label class="label">Flex Material</label><select class="select" id="ni-flex-type" onchange="onInventoryConfigChange()">' + flexOpts + '</select></div></div>'
            + '<div id="ni-custom-config" style="display:none">'
            + '<div><label class="label">Item Name <span style="color:var(--rose)">*</span></label><input class="input" id="ni-name" placeholder="e.g. Art Paper 300gsm" /></div>'
            + '<div class="grid grid-cols-3 gap-3 mt-3"><div><label class="label">Category</label><select class="select" id="ni-category">' + cats + '</select></div>'
            + '<div><label class="label">Material Type</label><select class="select" id="ni-type">' + types + '</select></div>'
            + '<div><label class="label">Unit</label><select class="select" id="ni-unit">' + units + '</select></div></div></div>'
            + '<div id="ni-auto-fields">'
            + '<div class="p-3 rounded-lg mb-3" style="background:var(--surface-tint);border:1px solid var(--border)">'
            + '<div class="text-xs font-bold uppercase tracking-widest mb-1" style="color:var(--text-muted)">Auto-filled</div>'
            + '<div class="font-semibold" id="ni-auto-name">130 GSM (O/S)</div>'
            + '<div class="text-sm" style="color:var(--text-muted)">Rate: ₹<span id="ni-auto-rate">7</span> per sheet</div></div></div>'
            + '<div class="grid grid-cols-2 gap-3">'
            + '<div><label class="label">Initial Qty <span style="color:var(--rose)">*</span></label><input class="input font-mono" type="number" id="ni-qty" placeholder="e.g. 50" value="10" /></div>'
            + '<div><label class="label">Unit Cost (₹) <span style="color:var(--rose)">*</span></label><input class="input font-mono" type="number" step="0.01" id="ni-cost" placeholder="e.g. 2.50" value="7.00" /></div></div>'
            + '<button class="btn btn-primary w-full mt-2" onclick="saveNewInventoryItem()"><i data-lucide="plus" class="w-4 h-4"></i> Add Item</button>'
            + '</div>');
        onInventoryConfigChange();
    };

    window.onInventoryModeChange = function() {
        var mode = document.getElementById('ni-mode')?.value || 'custom';
        document.getElementById('ni-paper-config').style.display = mode === 'paper' ? '' : 'none';
        document.getElementById('ni-sticker-config').style.display = mode === 'sticker' ? '' : 'none';
        document.getElementById('ni-flex-config').style.display = mode === 'flex' ? '' : 'none';
        document.getElementById('ni-custom-config').style.display = mode === 'custom' ? '' : 'none';
        document.getElementById('ni-auto-fields').style.display = mode === 'custom' ? 'none' : '';
        if (mode !== 'custom') onInventoryConfigChange();
    };

    window.onInventoryConfigChange = function() {
        var mode = document.getElementById('ni-mode')?.value || 'custom';
        var name = '', rate = 0, unit = 'sheets', category = 'Paper', type = '';
        if (mode === 'paper') {
            var key = document.getElementById('ni-paper-type')?.value;
            var side = document.getElementById('ni-paper-side')?.value || 'os';
            var t = PRICING_DB.paper.types.find(function(x) { return x.key === key; });
            if (t) { name = t.label + ' (' + (side === 'os' ? 'O/S' : 'F/B') + ')'; rate = side === 'os' ? t.os : t.fb; type = t.label; }
            category = 'Paper'; unit = 'sheets';
        } else if (mode === 'sticker') {
            var key = document.getElementById('ni-sticker-type')?.value;
            var t = PRICING_DB.sticker.types.find(function(x) { return x.key === key; });
            if (t) { name = t.label; rate = t.rate; type = t.label; }
            category = 'Sticker'; unit = 'sheets';
        } else if (mode === 'flex') {
            var key = document.getElementById('ni-flex-type')?.value;
            var t = PRICING_DB.flex.types.find(function(x) { return x.key === key; });
            if (t) { name = t.label; rate = t.rate; type = t.label; }
            category = 'Flex'; unit = 'sqft';
        }
        var nameEl = document.getElementById('ni-auto-name');
        var rateEl = document.getElementById('ni-auto-rate');
        var costEl = document.getElementById('ni-cost');
        if (nameEl) nameEl.textContent = name;
        if (rateEl) rateEl.textContent = rate;
        if (costEl) costEl.value = rate.toFixed(2);
        window._niAutoData = { name: name, category: category, type: type, unit: unit };
    };

    window.applyInventorySuggestion = function(key) {
        var item = SHORTCUT_ITEMS[key];
        if (!item) return;
        var nameEl = document.getElementById('ni-name');
        if (nameEl) nameEl.value = item.desc;
        var costEl = document.getElementById('ni-cost');
        if (costEl && item.price) costEl.value = item.price;
    };

    window.openEditInventoryItemModal = function(id) {
        const item = INVENTORY_ITEMS.find(x => x.id === id);
        if (!item) return;
        const cats = DROPDOWN_SETTINGS.categories.map(c => `<option value="${c}" ${c===item.category?'selected':''}>${c}</option>`).join('');
        const units = DROPDOWN_SETTINGS.units.map(u => `<option value="${u}" ${u===item.unit?'selected':''}>${u}</option>`).join('');
        const types = DROPDOWN_SETTINGS.materialTypes.map(t => `<option value="${t}" ${t===item.type?'selected':''}>${t}</option>`).join('');

        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Edit Stock / Item</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Update inventory quantities or details</div>
            <div class="space-y-4">
                <div>
                    <label class="label">Item Name <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="ei-name" value="${item.name}" />
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="label">Category</label>
                        <select class="select" id="ei-category">
                            ${cats}
                        </select>
                    </div>
                    <div>
                        <label class="label">Material Type</label>
                        <select class="select" id="ei-type">
                            ${types}
                        </select>
                    </div>
                    <div>
                        <label class="label">Unit</label>
                        <select class="select" id="ei-unit">
                            ${units}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="label">Current Stock Qty <span style="color:var(--rose)">*</span></label>
                        <input class="input font-mono" type="number" id="ei-qty" value="${item.qty}" />
                    </div>
                    <div>
                        <label class="label">Unit Cost (₹) <span style="color:var(--rose)">*</span></label>
                        <input class="input font-mono" type="number" step="0.01" id="ei-cost" value="${item.cost}" />
                    </div>
                </div>
                <button class="btn btn-primary w-full mt-2" onclick="saveEditInventoryItem(${item.id})"><i data-lucide="check" class="w-4 h-4"></i> Save Changes</button>
            </div>
        `);
    };

    window.saveNewInventoryItem = function() {
        var mode = document.getElementById('ni-mode')?.value || 'custom';
        var name, category, type, unit;
        if (mode !== 'custom' && window._niAutoData) {
            name = window._niAutoData.name;
            category = window._niAutoData.category;
            type = window._niAutoData.type;
            unit = window._niAutoData.unit;
        } else {
            name = (document.getElementById('ni-name')?.value || '').trim();
            category = document.getElementById('ni-category')?.value;
            type = document.getElementById('ni-type')?.value;
            unit = document.getElementById('ni-unit')?.value;
        }
        var qty = parseFloat(document.getElementById('ni-qty')?.value) || 0;
        var cost = parseFloat(document.getElementById('ni-cost')?.value) || 0;

        if (!name) { toast('Item name is required', 'alert-circle'); return; }
        const newItem = stampRecord({
            id: Date.now(),
            name, category, type, unit, qty, cost
        });
        INVENTORY_ITEMS.push(newItem);
        window.saveInventoryData();
        if (window._serverAvailable) { apiPost('/inventory', newItem).then(function(saved) { if (saved && saved._id) newItem.id = saved._id; }).catch(function(){}); }
        window.renderInventoryTable();
        window.renderDashboardLowStock();
        document.getElementById('modalOverlay').style.display = 'none';
        toast(`Added "${name}" to inventory`, 'check-circle');
        logActivity('Inventory Added', 'Added <strong>' + name + '</strong> · Qty: ' + qty + ' ' + unit);
    };

    window.saveEditInventoryItem = function(id) {
        const item = INVENTORY_ITEMS.find(x => x.id === id);
        if (!item) return;
        const name = document.getElementById('ei-name')?.value.trim();
        const category = document.getElementById('ei-category')?.value;
        const type = document.getElementById('ei-type')?.value;
        const unit = document.getElementById('ei-unit')?.value;
        const qty = parseFloat(document.getElementById('ei-qty')?.value) || 0;
        const cost = parseFloat(document.getElementById('ei-cost')?.value) || 0;

        if (!name) { toast('Item name is required', 'alert-circle'); return; }
        item.name = name;
        item.category = category;
        item.type = type;
        item.unit = unit;
        item.qty = qty;
        item.cost = cost;
        stampRecord(item, true);

        window.saveInventoryData();
        window.renderInventoryTable();
        window.renderDashboardLowStock();
        document.getElementById('modalOverlay').style.display = 'none';
        toast(`Updated "${name}" details`, 'check-circle');
        logActivity('Inventory Updated', 'Updated <strong>' + name + '</strong> · Qty: ' + qty);
    };

    window.deleteInventoryItem = function(id) {
        const idx = INVENTORY_ITEMS.findIndex(x => x.id === id);
        if (idx === -1) return;
        const name = INVENTORY_ITEMS[idx].name;
        if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
            INVENTORY_ITEMS.splice(idx, 1);
            window.saveInventoryData();
            window.renderInventoryTable();
            window.renderDashboardLowStock();
            toast(`Deleted "${name}"`, 'check-circle');
            logActivity('Inventory Deleted', 'Deleted <strong>' + name + '</strong> from inventory');
        }
    };

    window.renderSettingsShortcuts = function() {
        const tbody = document.getElementById('settings-shortcuts-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        Object.keys(SHORTCUT_ITEMS).forEach(k => {
            const item = SHORTCUT_ITEMS[k];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-mono font-semibold">${k}</td>
                <td>${item.desc}</td>
                <td class="tabular" style="text-align:right">₹ ${item.price.toFixed(2)}</td>
                <td>${item.unit}</td>
                <td style="text-align:center">
                    <button class="btn-ghost p-1 rounded" onclick="deleteShortcutKey('${k}')"><i data-lucide="trash-2" class="w-3.5 h-3.5" style="color:var(--rose)"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons({ nodes: [tbody] });
    };

    window.openAddShortcutModal = function() {
        openModal(`
            <div class="font-serif text-2xl font-bold mb-1">Add Shortcut Key</div>
            <div class="text-sm mb-5" style="color:var(--text-muted)">Configure a new shortcut code expansion</div>
            <div class="space-y-4">
                <div>
                    <label class="label">Shortcut Code / Key <span style="color:var(--rose)">*</span></label>
                    <input class="input font-mono" id="nsh-key" placeholder="e.g. flex4x6" />
                </div>
                <div>
                    <label class="label">Expanded Description <span style="color:var(--rose)">*</span></label>
                    <input class="input" id="nsh-desc" placeholder="e.g. Flex printing 4x6 ft" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="label">Default Rate (₹) <span style="color:var(--rose)">*</span></label>
                        <input class="input font-mono" type="number" id="nsh-price" value="0.00" />
                    </div>
                    <div>
                        <label class="label">Default Unit</label>
                        <select class="select" id="nsh-unit">
                            ${DROPDOWN_SETTINGS.units.map(u => `<option value="${u}">${u}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-full mt-2" onclick="saveNewShortcutKey()"><i data-lucide="plus" class="w-4 h-4"></i> Add Shortcut</button>
            </div>
        `);
    };

    window.saveNewShortcutKey = function() {
        const key = document.getElementById('nsh-key')?.value.trim().toLowerCase();
        const desc = document.getElementById('nsh-desc')?.value.trim();
        const price = parseFloat(document.getElementById('nsh-price')?.value) || 0;
        const unit = document.getElementById('nsh-unit')?.value || 'sheet';

        if (!key) { toast('Shortcut key is required', 'alert-circle'); return; }
        if (!desc) { toast('Description is required', 'alert-circle'); return; }
        
        SHORTCUT_ITEMS[key] = { desc, price, unit };
        localStorage.setItem('fp_shortcut_items', JSON.stringify(SHORTCUT_ITEMS));
        
        window.updatePOSDatalist();
        window.renderSettingsShortcuts();
        document.getElementById('modalOverlay').style.display = 'none';
        toast(`Shortcut "${key}" configured`, 'check-circle');
    };

    window.deleteShortcutKey = function(key) {
        if (confirm(`Delete shortcut code "${key}"?`)) {
            delete SHORTCUT_ITEMS[key];
            localStorage.setItem('fp_shortcut_items', JSON.stringify(SHORTCUT_ITEMS));
            window.updatePOSDatalist();
            window.renderSettingsShortcuts();
            toast(`Shortcut "${key}" deleted`, 'check-circle');
        }
    };

    window.updatePOSDatalist = function() {
        const dl = document.getElementById('billingItemShortcuts');
        if (dl) {
            dl.innerHTML = Object.keys(SHORTCUT_ITEMS).map(k => {
                return `<option value="${k}">${SHORTCUT_ITEMS[k].desc}</option>`;
            }).join('');
        }
    }

    window.renderSettingsDropdownLists = function() {
        const renderList = (id, options, key) => {
            const list = document.getElementById(id);
            if (!list) return;
            list.innerHTML = '';
            options.forEach(opt => {
                const span = document.createElement('span');
                span.className = 'badge text-xs mr-1 mb-1 font-semibold flex items-center gap-1';
                span.style.background = 'var(--primary-soft)';
                span.style.color = 'var(--primary-text)';
                span.style.border = '1px solid #f3e0db';
                span.innerHTML = `${opt} <i data-lucide="x" class="w-3 h-3 cursor-pointer text-rose hover:scale-110" onclick="deleteDropdownOption('${key}', '${opt}')"></i>`;
                list.appendChild(span);
            });
            lucide.createIcons({ nodes: [list] });
        };

        renderList('settings-categories-list', DROPDOWN_SETTINGS.categories, 'categories');
        renderList('settings-units-list', DROPDOWN_SETTINGS.units, 'units');
        renderList('settings-types-list', DROPDOWN_SETTINGS.materialTypes, 'materialTypes');
    };

    window.addDropdownOption = function(key, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const val = input.value.trim();
        if (!val) { toast('Value cannot be empty', 'alert-circle'); return; }
        if (DROPDOWN_SETTINGS[key].includes(val)) { toast('Value already exists', 'alert-circle'); return; }
        
        DROPDOWN_SETTINGS[key].push(val);
        localStorage.setItem('fp_dropdown_settings', JSON.stringify(DROPDOWN_SETTINGS));
        input.value = '';
        window.renderSettingsDropdownLists();
        toast('Option added successfully', 'check-circle');
    };

    window.deleteDropdownOption = function(key, val) {
        const idx = DROPDOWN_SETTINGS[key].indexOf(val);
        if (idx !== -1) {
            DROPDOWN_SETTINGS[key].splice(idx, 1);
            localStorage.setItem('fp_dropdown_settings', JSON.stringify(DROPDOWN_SETTINGS));
            window.renderSettingsDropdownLists();
            toast('Option deleted', 'check-circle');
        }
    };

    window.updateDashboardStats = function() {
        var today = localDateStr(new Date());
        var todayBills = BILLS.filter(function(b) { return (b.date || '').split('T')[0] === today; });
        var allPaid = 0, allBilled = 0, allOutstanding = 0, pendingCount = 0;
        todayBills.forEach(function(b) {
            var t = Number(b.total) || 0;
            var p = Number(b.paid) || 0;
            allBilled += t;
            allPaid += p;
            var due = Math.max(0, t - p);
            if (due > 0) pendingCount++;
            allOutstanding += due;
        });
        var todayExpenses = (typeof EXPENSE_ENTRIES !== 'undefined' ? EXPENSE_ENTRIES : []).filter(function(e) { return e.date === today; });
        var expTotal = todayExpenses.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);
        var creditSales = allBilled - allPaid;
        var balance = allPaid - expTotal;
        var fmt = function(v) { return '₹' + Math.round(v).toLocaleString('en-IN'); };
        var el = function(id) { return document.getElementById(id); };
        if (el('dash-net-sales')) el('dash-net-sales').textContent = fmt(allPaid);
        if (el('dash-credit-sales')) el('dash-credit-sales').textContent = fmt(Math.max(0, creditSales));
        if (el('dash-expenses')) el('dash-expenses').textContent = fmt(expTotal);
        if (el('dash-balance')) el('dash-balance').textContent = fmt(balance);
        if (el('dash-revenue')) el('dash-revenue').textContent = '₹ ' + Math.round(allPaid).toLocaleString('en-IN');
        if (el('dash-billed')) el('dash-billed').textContent = '₹ ' + Math.round(allBilled).toLocaleString('en-IN');
        if (el('dash-billed-sub')) el('dash-billed-sub').textContent = todayBills.length + ' bills issued';
        if (el('dash-outstanding')) el('dash-outstanding').textContent = '₹ ' + Math.round(allOutstanding).toLocaleString('en-IN');
        if (el('dash-outstanding-sub')) el('dash-outstanding-sub').textContent = pendingCount + ' bills pending';
        if (el('dash-orders')) el('dash-orders').textContent = todayBills.length;
        if (el('dash-orders-sub')) el('dash-orders-sub').textContent = todayBills.length + ' orders';
        if (el('snapshot-timestamp')) {
            var now = new Date();
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            el('snapshot-timestamp').textContent = 'As of ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        // Staff dashboard
        if (CURRENT_USER && CURRENT_USER.role === 'staff') {
            var myName = CURRENT_USER.name;
            var myBills = todayBills.filter(function(b) { return (b.createdBy || '') === myName; });
            var myPaid = myBills.reduce(function(s, b) { return s + (Number(b.paid) || 0); }, 0);
            var myPaidCount = myBills.filter(function(b) { return (b.status || '').toLowerCase().includes('paid') && !(b.status || '').toLowerCase().includes('partial'); }).length;
            var myPending = myBills.length - myPaidCount;
            if (el('dash-staff-bills')) el('dash-staff-bills').textContent = myBills.length;
            if (el('dash-staff-bills-sub')) el('dash-staff-bills-sub').textContent = myPaidCount + ' paid · ' + myPending + ' outstanding';
            if (el('dash-staff-revenue')) el('dash-staff-revenue').innerHTML = '₹ ' + Math.round(myPaid).toLocaleString('en-IN') + '<span class="text-base font-normal" style="color: var(--text-muted)">.00</span>';
        }
    };

    window.renderDashboardRecentBills = function() {
        const tbody = document.getElementById('dashboard-recent-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const recent = BILLS.slice().reverse().slice(0, 6);
        if (!recent.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">No bills created yet.</td></tr>';
            return;
        }

        recent.forEach(b => {
            const tr = document.createElement('tr');
            const badgeClass = b.status && b.status.toLowerCase().includes('paid') ? 'badge-paid' : (b.status && b.status.toLowerCase().includes('partial') ? 'badge-partial' : 'badge-outstanding');
            const initials = (b.createdBy || '').charAt(0).toUpperCase();
            
            tr.innerHTML = `
                <td class="font-mono font-semibold" style="color: var(--primary)">${b.inv}</td>
                <td class="font-semibold">${b.customer}</td>
                <td class="admin-only-view">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style="background: var(--gold-soft); color: var(--gold-strong); border: 1px solid #ecd99a">${initials}</div>
                        <span class="text-sm font-semibold">${b.createdBy||''}</span>
                    </div>
                </td>
                <td class="tabular font-bold" style="text-align: right">₹ ${Number(b.total).toLocaleString('en-IN')}</td>
                <td><span class="badge ${badgeClass}">${b.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Connect filter/search event listeners in Inventory Page
    document.getElementById('inventory-search')?.addEventListener('input', () => window.renderInventoryTable());
    document.getElementById('inventory-filter-low-stock')?.addEventListener('change', () => window.renderInventoryTable());

    /* Dynamic Inline Calculator Event Hooks completed */
