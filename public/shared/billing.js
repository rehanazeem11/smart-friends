/* ============================================================
   SFBilling — shared billing logic
   Loaded as a plain <script> (no build step) before app.js, and
   loadable in Node (via a vm context or `global.window = global`)
   for scripts/verify-billing.js. No dependencies besides jsPDF /
   jspdf-autotable, which are only touched by the PDF functions —
   the math functions have none.

   This is the single source of truth for: normal-bill line-item
   math and totals, the normal-bill object shape, and invoice
   rendering (print HTML + PDF) for both normal and GST bills.
   Extracted from app.js verbatim where possible — see the git
   history for the pre-extraction originals if behaviour is ever
   in question.
   ============================================================ */
(function (global) {
    'use strict';

    /* ---------- line-item math (normal, non-GST bills) ---------- */

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
        // Area products must explicitly have a unit containing 'sq' (e.g. sqft, sq, sqin)
        const isAreaProduct = area > 0 && normalizedUnit.includes('sq');
        if (isAreaProduct) {
            return qty * area * price;
        }
        return qty * price;
    }

    /* ---------- bill totals (normal, non-GST bills) ---------- */

    function getStoreGstInfo(storeSettings) {
        const cgst = parseFloat(storeSettings && storeSettings.cgst) || 0;
        const sgst = parseFloat(storeSettings && storeSettings.sgst) || 0;
        const total = cgst + sgst;
        return {
            percent: total,
            factor: 1 + (total / 100)
        };
    }

    // Mirrors app.js's recalcSummary(): subtotal minus a flat discount, then
    // GST on what's left.
    function computeBillTotals({ subtotal, discount, gstPercent }) {
        const sub = subtotal || 0;
        const disc = discount || 0;
        const afterDiscount = Math.max(0, sub - disc);
        const gstAmount = afterDiscount * (gstPercent || 0) / 100;
        const total = afterDiscount + gstAmount;
        return { subtotal: sub, discount: disc, afterDiscount, gstAmount, total };
    }

    /* ---------- bill/item classification + sheet count ---------- */

    const COUNTER_MATERIAL_NAMES = [
        '130 gsm', '170 gsm', '220 gsm', '250 gsm', '300 gsm', '350 gsm', '400 gsm',
        'maplitho', 'bound',
        'pvc', 'sticker'
    ];

    function isCounterItem(itemName) {
        const n = (itemName || '').toLowerCase();
        return COUNTER_MATERIAL_NAMES.some(function (mat) {
            return n.includes(mat);
        });
    }

    // 'Counter' if any item is explicitly/inferentially a counter item, else 'Normal'.
    function determineBillType(items) {
        const hasCounter = (items || []).some(function (i) {
            const ov = i.report_type_override || i.reportTypeOverride || 'auto';
            if (ov === 'counter') return true;
            if (ov === 'normal') return false;
            return isCounterItem(i.name);
        });
        return hasCounter ? 'Counter' : 'Normal';
    }

    // Sheet-impression count. OS = 1x qty, FB = 2x qty per item. Only items
    // whose name marks them as sheet-based (sheet:/print only/sticker:) count.
    function getBillSheetDetails(items) {
        if (!items || !items.length) {
            return { printing_type: '', sheet_quantity: 0, calculated_sheet_count: 0 };
        }
        let totalQty = 0;
        let totalCount = 0;
        let hasOS = false;
        let hasFB = false;

        items.forEach(function (item) {
            var name = (item.name || '').toLowerCase();
            var qty = parseFloat(item.qty) || 0;
            if (qty <= 0) return;

            var isSheet = name.indexOf('sheet:') === 0 || name.indexOf('print only') === 0 || name.indexOf('sticker:') === 0;
            if (!isSheet) return;

            var isFB = name.indexOf('f/b') !== -1 || name.indexOf('front & back') !== -1 || name.indexOf('front and back') !== -1 || name.indexOf('both sides') !== -1;

            totalQty += qty;
            if (isFB) {
                hasFB = true;
                totalCount += qty * 2;
            } else {
                hasOS = true;
                totalCount += qty * 1;
            }
        });

        let type = '';
        if (hasOS && hasFB) {
            type = 'OS & FB';
        } else if (hasFB) {
            type = 'FB';
        } else if (hasOS) {
            type = 'OS';
        }

        return {
            printing_type: type,
            sheet_quantity: totalQty,
            calculated_sheet_count: totalCount
        };
    }

    function calculateBillSheetCount(items) {
        return getBillSheetDetails(items).calculated_sheet_count;
    }

    function formatShortDate(dateStr) {
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return isNaN(d) ? dateStr : (d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear());
    }

    /* ---------- amount-in-words (Indian numbering: lakh/crore) ---------- */

    function convertAmountPartToWords(amount) {
        const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const doubleDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tensDigits = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        if (amount === 0) return "";

        function helper(n) {
            let str = "";
            if (n >= 100) {
                str += singleDigits[Math.floor(n / 100)] + " Hundred ";
                n %= 100;
            }
            if (n >= 20) {
                str += tensDigits[Math.floor(n / 10)] + " ";
                n %= 10;
            } else if (n >= 10) {
                str += doubleDigits[n - 10] + " ";
                n = 0;
            }
            if (n > 0) {
                str += singleDigits[n] + " ";
            }
            return str.trim();
        }

        let result = "";
        if (amount >= 10000000) {
            result += helper(Math.floor(amount / 10000000)) + " Crore ";
            amount %= 10000000;
        }
        if (amount >= 100000) {
            result += helper(Math.floor(amount / 100000)) + " Lakh ";
            amount %= 100000;
        }
        if (amount >= 1000) {
            result += helper(Math.floor(amount / 1000)) + " Thousand ";
            amount %= 1000;
        }
        if (amount > 0) {
            result += helper(amount);
        }

        return result.trim();
    }

    function convertNumberToWords(num) {
        if (num === 0) return 'Zero Rupees Only';

        let parts = String(parseFloat(num).toFixed(2)).split('.');
        let rupees = parseInt(parts[0]) || 0;
        let paise = parseInt(parts[1]) || 0;

        let words = '';

        if (rupees > 0) {
            words += convertAmountPartToWords(rupees) + ' Rupees';
        }

        if (paise > 0) {
            if (rupees > 0) words += ' and ';
            words += convertAmountPartToWords(paise) + ' Paise';
        }

        return words + ' Only';
    }

    /* ---------- assembling a new normal (POS) bill ---------- */

    // Returns the exact object shape POST /api/bills expects for a normal
    // (non-GST) bill, given the raw inputs app.js already reads from its
    // form/DOM (unchanged) and computes (paid/status, and subtotal/gstAmount/
    // total as displayed — these are passed in as-is rather than recomputed
    // here, so a bill's stored numbers always match what the user saw on
    // screen before saving, byte for byte).
    //
    // formData: {
    //   inv, clientRequestId, date, customer, phone, shipTo, billTo,
    //   items,                              // [{name, qty, price, unit, amount, report_type_override, reportTypeOverride}]
    //   subtotal, discount, gstPercent, gstAmount, total, paid, status,
    //   createdAt                           // "DD Mon · hh:mm AM/PM" — same format stampRecord() uses
    // }
    // user: { name, role, email } — same shape as app.js's CURRENT_USER
    function buildBill(formData, user) {
        const items = formData.items || [];
        const details = getBillSheetDetails(items);
        const type = determineBillType(items);

        return {
            inv: formData.inv,
            clientRequestId: formData.clientRequestId,
            date: formData.date,
            customer: formData.customer,
            phone: formData.phone,
            shipTo: formData.shipTo,
            billTo: formData.billTo,
            items: items,
            subtotal: formData.subtotal,
            discountAmount: formData.discount || 0,
            gst: formData.gstAmount,
            gstPercent: formData.gstPercent,
            total: formData.total,
            paid: formData.paid,
            status: formData.status,
            type: type,
            printing_type: details.printing_type,
            sheet_quantity: details.sheet_quantity,
            calculated_sheet_count: details.calculated_sheet_count,
            calculatedSheetCount: details.calculated_sheet_count,
            report_type_override: 'auto',
            reportTypeOverride: 'auto',
            createdBy: (user && user.name) || 'System',
            createdByRole: (user && user.role) || 'admin',
            createdByEmail: (user && user.email) || '',
            createdAt: formData.createdAt
        };
    }

    /* ---------- invoice rendering: normal (non-GST) bill ---------- */

    function renderBillPrintHtml(bill, storeSettings, logoBase64) {
        // Resolve standard/mocked bill fields
        const customerName = bill.customer || 'Customer';
        const customerPhone = bill.phone || '';
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
        // Use bill's stored GST if available, else fall back to current Settings
        const gstInfo = getStoreGstInfo(storeSettings);
        const gstPercentVal = bill.gstPercent !== undefined ? bill.gstPercent : gstInfo.percent;
        const subtotalAmt = parseFloat(bill.subtotal) || (totalAmt / (1 + gstPercentVal / 100));
        const gstAmt = parseFloat(bill.gst) || (totalAmt - subtotalAmt);
        const discountAmt = parseFloat(bill.discountAmount) || 0;

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
                    <div style="margin-bottom: 10px;">
                        <img src="${logoBase64}" style="width: 100%; max-width: 480px; height: auto; object-fit: contain;" alt="SMART FRIENDS Logo">
                    </div>
                    ${(storeSettings && storeSettings.address) ? `<div style="margin-top: 5px; font-size: 11px;">${storeSettings.address.replace(/\n/g, '<br>')}</div>` : ''}
                    ${(storeSettings && storeSettings.showPhoneOnInvoice && storeSettings.phone) ? `<div style="margin-top: 5px; font-size: 11px;">Phone: ${storeSettings.phone}</div>` : ''}
                    ${(storeSettings && storeSettings.gst) ? `<div style="font-size: 11px;">GSTIN/UIN: ${storeSettings.gst}</div>` : ''}
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
            ${discountAmt > 0 ? `
            <tr>
                <td>Discount:</td>
                <td style="text-align: right;">− ₹ ${discountAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
            </tr>` : ''}
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
</body>
</html>`;
        return html;
    }

    // Shared by every print function: writes HTML into a hidden iframe and
    // triggers the browser print dialog on it, then removes the iframe.
    function printHtmlViaHiddenIframe(html) {
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();

        printFrame.onload = function () {
            setTimeout(function () {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                setTimeout(function () { document.body.removeChild(printFrame); }, 1000);
            }, 250);
        };
    }

    function printBill(bill, storeSettings, logoBase64) {
        printHtmlViaHiddenIframe(renderBillPrintHtml(bill, storeSettings, logoBase64));
    }

    function downloadBillPDF(bill, storeSettings, logoBase64) {
        const customerName = bill.customer || 'Customer';
        const customerPhone = bill.phone || '';
        const billTo = bill.billTo || '';
        const shipTo = bill.shipTo || '';
        const dateVal = bill.date ? new Date(bill.date) : new Date();
        const formattedDate = isNaN(dateVal.getTime()) ? (bill.dateDisplay || bill.date || '') : dateVal.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
        }
        if (!parsedItems.length) {
            const totalVal = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            parsedItems = [{ name: 'Printing Services (Standard)', qty: 1, unit: 'Job', price: totalVal / 1.18, amount: totalVal / 1.18 }];
        }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Draw logo image
            try {
                doc.addImage(logoBase64, 'PNG', 14, 12, 120, 22.8);
            } catch (e) {
                console.error("Failed to add logo image to PDF", e);
            }
            
            doc.setFontSize(9);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('Phone: ' + (storeSettings.phone || '') + ' | Email: smartfriends.info@gmail.com', 14, 42);

            let contentY = 45;
            if (storeSettings.address) {
                const addressLines = storeSettings.address.split('\n');
                addressLines.forEach(line => {
                    if (line.trim()) {
                        doc.text(line.trim(), 14, contentY);
                        contentY += 4.5;
                    }
                });
            }

            doc.setFontSize(16);
            doc.setTextColor(166, 72, 51);
            doc.setFont('Helvetica', 'bold');
            doc.text('INVOICE', 140, 26);
            
            doc.setFontSize(9);
            doc.setTextColor(51, 51, 51);
            doc.setFont('Helvetica', 'normal');
            doc.text(`Invoice No:  ${bill.inv}`, 140, 32);
            doc.text(`Date:        ${formattedDate}`, 140, 37);

            doc.setDrawColor(220, 220, 220);
            doc.line(14, contentY, 196, contentY);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('BILL TO:', 14, contentY + 8);
            doc.text('SHIP TO:', 105, contentY + 8);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(customerName, 14, contentY + 13);
            if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, contentY + 17);
            if (billTo) doc.text(billTo, 14, contentY + 21, { maxWidth: 80 });

            if (shipTo) {
                doc.text(shipTo, 105, contentY + 13, { maxWidth: 80 });
            } else {
                doc.text('Same as billing address', 105, contentY + 13);
            }

            const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
            const gstInfo = getStoreGstInfo(storeSettings);
            const rows = parsedItems.map(item => [
                item.name || '',
                `${item.qty || 0} ${item.unit || ''}`,
                `Rs. ${(parseFloat(item.price)||0).toLocaleString('en-IN')}`,
                `Rs. ${(parseFloat(item.amount)||0).toLocaleString('en-IN')}`
            ]);

            doc.autoTable({
                head: [headers],
                body: rows,
                startY: contentY + 31,
                theme: 'striped',
                headStyles: { fillColor: [166, 72, 51] },
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 25, halign: 'right' },
                    2: { cellWidth: 30, halign: 'right' },
                    3: { cellWidth: 27, halign: 'right' }
                }
            });

            let finalY = doc.lastAutoTable.finalY + 8;
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }

            const totalAmt = parseFloat(String(bill.total).replace(/[^0-9.-]+/g,'')) || 0;
            const paidAmt = parseFloat(String(bill.paid).replace(/[^0-9.-]+/g,'')) || 0;
            const dueAmt = totalAmt - paidAmt;
            const subtotalAmt = parseFloat(bill.subtotal) || (totalAmt / gstInfo.factor);
            const gstPercentVal = bill.gstPercent !== undefined ? bill.gstPercent : gstInfo.percent;
            const gstAmt = parseFloat(bill.gst) || (totalAmt - subtotalAmt);
            const discountAmt = parseFloat(bill.discountAmount) || 0;
            // Every row below Subtotal shifts down by this much when a discount
            // row is inserted, so nothing overlaps — 0 (no shift) when there's
            // no discount, leaving the layout byte-for-byte as before.
            const discountOffset = discountAmt > 0 ? 5 : 0;

            doc.setFont('Helvetica', 'normal');
            doc.text('Subtotal:', 130, finalY);
            doc.text(`Rs. ${subtotalAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}`, 196, finalY, { align: 'right' });

            if (discountAmt > 0) {
                doc.text('Discount:', 130, finalY + 5);
                doc.text(`- Rs. ${discountAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}`, 196, finalY + 5, { align: 'right' });
            }

            doc.text(`GST (${gstPercentVal}%):`, 130, finalY + 5 + discountOffset);
            doc.text(`Rs. ${gstAmt.toLocaleString('en-IN', {maximumFractionDigits:2})}`, 196, finalY + 5 + discountOffset, { align: 'right' });

            doc.setFont('Helvetica', 'bold');
            doc.text('Total Amount:', 130, finalY + 11 + discountOffset);
            doc.text(`Rs. ${totalAmt.toLocaleString('en-IN')}`, 196, finalY + 11 + discountOffset, { align: 'right' });

            doc.setFont('Helvetica', 'normal');
            doc.text('Amount Paid:', 130, finalY + 16 + discountOffset);
            doc.text(`Rs. ${paidAmt.toLocaleString('en-IN')}`, 196, finalY + 16 + discountOffset, { align: 'right' });

            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(166, 72, 51);
            doc.text('Balance Due:', 130, finalY + 22 + discountOffset);
            doc.text(`Rs. ${dueAmt.toLocaleString('en-IN')}`, 196, finalY + 22 + discountOffset, { align: 'right' });

            doc.setTextColor(100, 100, 100);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Terms & Conditions:', 14, finalY + 10 + discountOffset);
            doc.text(storeSettings.terms || 'Goods once sold will not be returned.', 14, finalY + 14 + discountOffset, { maxWidth: 100 });

            doc.setFontSize(10);
            doc.setTextColor(166, 72, 51);
            doc.setFont('Helvetica', 'italic');
            doc.text('Thank you for your business!', 14, finalY + 28 + discountOffset);

            doc.save(`Invoice_${bill.inv}.pdf`);
    }

    /* ---------- invoice rendering: GST tax invoice ---------- */

    function renderGstInvoicePrintHtml(bill, storeSettings, logoBase64) {
        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
        }
        
        // Calculate items sub-lists & pad rows to 10 rows matching exact layout
        let rowsHtml = '';
        let totalQty = 0;
        let totalTaxable = bill.subtotal || 0;
        let totalTax = bill.gst || 0;
        let grandTotal = bill.total || 0;
        
        const isInterstate = (bill.buyerStateCode || '36') !== '36';
        
        parsedItems.forEach((item, idx) => {
            totalQty += item.qty || 0;
            const cgst = item.cgstAmount || 0;
            const sgst = item.sgstAmount || 0;
            const igst = item.igstAmount || 0;
            
            rowsHtml += `
                <tr class="item-row">
                    <td class="center">${idx + 1}</td>
                    <td class="bold font-serif">${item.name} ${item.description ? '<br><span class="desc-note">' + item.description + '</span>' : ''}</td>
                    <td class="center font-mono">${item.hsn || ''}</td>
                    <td class="right font-mono">${(item.qty || 0).toFixed(2)}</td>
                    <td class="right font-mono">${(item.price || 0).toFixed(2)}</td>
                    <td class="center">${item.unit || 'Nos'}</td>
                    <td class="right font-mono">${(item.discountPercent || 0).toFixed(1)} %</td>
                    <td class="right font-mono">${(item.taxableValue || 0).toFixed(2)}</td>
                    <td class="center font-mono">${item.gstRate} %</td>
                    <td class="right font-mono">${(cgst + sgst + igst).toFixed(2)}</td>
                    <td class="right font-mono">${(item.amount || 0).toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Pad rows to 10 rows
        const minRows = 10;
        for (let i = parsedItems.length; i < minRows; i++) {
            rowsHtml += `
                <tr class="item-row pad">
                    <td class="center">&nbsp;</td>
                    <td>&nbsp;</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                </tr>
            `;
        }
        
        // Group taxes by HSN
        const hsnSummary = {};
        parsedItems.forEach(item => {
            const h = item.hsn || '—';
            if (!hsnSummary[h]) {
                hsnSummary[h] = { taxable: 0, cgstRate: item.gstRate/2, cgstAmt: 0, sgstRate: item.gstRate/2, sgstAmt: 0, igstRate: item.gstRate, igstAmt: 0, totalTax: 0 };
            }
            hsnSummary[h].taxable += item.taxableValue || 0;
            hsnSummary[h].cgstAmt += item.cgstAmount || 0;
            hsnSummary[h].sgstAmt += item.sgstAmount || 0;
            hsnSummary[h].igstAmt += item.igstAmount || 0;
            hsnSummary[h].totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount) || 0;
        });
        
        let hsnRows = '';
        let hsnTaxableTotal = 0;
        let hsnCgstTotal = 0;
        let hsnSgstTotal = 0;
        let hsnIgstTotal = 0;
        let hsnTaxTotal = 0;
        
        Object.keys(hsnSummary).forEach(hsn => {
            const g = hsnSummary[hsn];
            hsnTaxableTotal += g.taxable;
            hsnCgstTotal += g.cgstAmt;
            hsnSgstTotal += g.sgstAmt;
            hsnIgstTotal += g.igstAmt;
            hsnTaxTotal += g.totalTax;
            
            hsnRows += `
                <tr class="hsn-row font-mono text-xs">
                    <td>${hsn}</td>
                    <td class="right">${g.taxable.toFixed(2)}</td>
                    <td class="center">${isInterstate ? '0.0' : g.cgstRate.toFixed(1)}%</td>
                    <td class="right">${g.cgstAmt.toFixed(2)}</td>
                    <td class="center">${isInterstate ? '0.0' : g.sgstRate.toFixed(1)}%</td>
                    <td class="right">${g.sgstAmt.toFixed(2)}</td>
                    <td class="center">${isInterstate ? g.igstRate.toFixed(1) : '0.0'}%</td>
                    <td class="right">${g.igstAmt.toFixed(2)}</td>
                    <td class="right bold">${g.totalTax.toFixed(2)}</td>
                </tr>
            `;
        });
        
        const wordsAmt = convertNumberToWords(grandTotal);
        const wordsTax = convertNumberToWords(totalTax);
        
        const printHtml = `<!DOCTYPE html>
<html>
<head>
    <title>GST Tax Invoice ${bill.inv}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            line-height: 14px;
        }
        .invoice-box {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1.5px solid #000;
            background: #fff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
        }
        th, td {
            border: 1px solid #000;
            padding: 5px 6px;
            vertical-align: top;
            text-align: left;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .font-mono { font-family: Courier, monospace; font-size:10px; }
        .font-serif { font-family: Georgia, serif; }
        .header-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            text-transform: uppercase;
            border-bottom: 1.5px solid #000;
        }
        .info-grid {
            border-bottom: 1.5px solid #000;
        }
        .info-col-left {
            width: 50%;
            border-right: 1.5px solid #000;
            padding: 0;
        }
        .info-col-right {
            width: 50%;
            padding: 0;
        }
        .seller-block, .consignee-block, .buyer-block {
            padding: 8px;
            border-bottom: 1px solid #000;
        }
        .buyer-block {
            border-bottom: none;
        }
        .block-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
            font-size: 10px;
            color: #444;
        }
        .desc-note {
            font-size: 9px;
            font-weight: normal;
            color: #555;
            font-style: italic;
        }
        .nested-grid td {
            border: none;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 6px;
            width: 50%;
        }
        .nested-grid tr:last-child td {
            border-bottom: none;
        }
        .nested-grid td:last-child {
            border-right: none;
        }
        .product-table th {
            font-weight: bold;
            text-align: center;
            font-size: 10px;
            background: #fbfbfb;
            padding: 6px 3px;
        }
        .product-table .item-row td {
            border-top: none;
            border-bottom: none;
            padding: 5px 6px;
        }
        .product-table .item-row.pad td {
            height: 18px;
        }
        .product-table .total-row td {
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            background: #fafafa;
        }
        .bottom-section {
            border-bottom: 1.5px solid #000;
        }
        .words-block {
            width: 45%;
            border-right: 1px solid #000;
            padding: 8px;
        }
        .hsn-block {
            width: 55%;
            padding: 0;
        }
        .hsn-table th {
            font-size: 8px;
            text-align: center;
            padding: 3px 2px;
            font-weight: bold;
        }
        .hsn-table td {
            padding: 3px 4px;
            font-size: 9px;
        }
        .hsn-table .total-row td {
            border-top: 1.5px solid #000;
        }
        .tax-words-block {
            padding: 8px;
            border-bottom: 1.5px solid #000;
        }
        .footer-block {
            padding: 0;
        }
        .footer-col-left {
            width: 55%;
            border-right: 1px solid #000;
            padding: 8px;
        }
        .footer-col-right {
            width: 45%;
            padding: 8px;
            text-align: right;
            position: relative;
            min-height: 80px;
        }
        .declaration-title {
            text-decoration: underline;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .declaration-text {
            font-size: 9px;
            line-height: 12px;
            color: #333;
        }
        .sig-space {
            margin-top: 50px;
            font-weight: bold;
            text-align: right;
            padding-right: 10px;
        }
        .watermark {
            text-align: center;
            font-size: 8px;
            color: #777;
            padding: 4px 0;
            border-top: none;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header-title">GST TAX INVOICE</div>
        
        <!-- Seller / Invoice Grid -->
        <table class="info-grid">
            <tr>
                <td class="info-col-left">
                    <div class="seller-block">
                        <div style="margin-bottom: 6px;">
                            <img src="${logoBase64}" style="width: 100%; max-width: 380px; height: auto; object-fit: contain;" alt="Smart Friends Logo">
                        </div>
                        <div style="font-size: 10px; line-height: 14px; margin-top: 6px;">
                            ${(storeSettings && storeSettings.address) ? `<strong>Address:</strong><br>${storeSettings.address.replace(/\n/g, '<br>')}<br>` : ''}
                            <strong>GSTIN/UIN:</strong> ${storeSettings.gst || '36ACWFS4518D1ZS'}<br>
                            <strong>State Name:</strong> ${storeSettings.state || 'Telangana'}${storeSettings.stateCode ? ', Code: ' + storeSettings.stateCode : ', Code: 36'}<br>
                            <strong>Contact:</strong> ${storeSettings.phone || '+91-9398752735'}<br>
                            <strong>E-Mail:</strong> ${storeSettings.email || 'smartfriends.info@gmail.com'}
                        </div>
                    </div>
                    
                    <div class="consignee-block">
                        <div class="block-title">Consignee (Ship to)</div>
                        <div class="bold font-serif" style="margin-bottom: 3px;">${bill.consigneeCompany || 'Same as Buyer'}</div>
                        <div>${bill.consigneeAddress || '—'}</div>
                        <div style="margin-top: 4px;">
                            <strong>GSTIN/UIN :</strong> ${bill.consigneeGSTIN || '—'}<br>
                            <strong>State Name :</strong> ${bill.consigneeState || '—'}${bill.consigneeStateCode ? ', Code: ' + bill.consigneeStateCode : ''}
                        </div>
                    </div>
                    
                    <div class="buyer-block">
                        <div class="block-title">Buyer (Bill to)</div>
                        <div class="bold font-serif" style="margin-bottom: 3px;">${bill.buyerCompany || bill.customer}</div>
                        <div>${bill.buyerAddress || '—'}</div>
                        <div style="margin-top: 4px;">
                            <strong>GSTIN/UIN :</strong> ${bill.buyerGSTIN || '—'}<br>
                            <strong>State Name :</strong> ${bill.buyerState || '—'}${bill.buyerStateCode ? ', Code: ' + bill.buyerStateCode : ''}
                        </div>
                    </div>
                </td>
                
                <td class="info-col-right">
                    <table class="nested-grid">
                        <tr>
                            <td>
                                <strong>Invoice No.</strong><br>
                                <span class="bold font-mono" style="font-size:11px;color:#a30000">${bill.inv}</span>
                            </td>
                            <td>
                                <strong>Dated</strong><br>
                                <span class="bold font-mono">${formatShortDate(bill.date)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Delivery Note</strong><br>
                                <span>${bill.deliveryNote || '—'}</span>
                            </td>
                            <td>
                                <strong>Mode/Terms of Payment</strong><br>
                                <span>${bill.modeTermsPayment || '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Reference No. & Date.</strong><br>
                                <span>${bill.refNo || '—'}</span>
                            </td>
                            <td>
                                <strong>Other References</strong><br>
                                <span>${bill.otherReferences || '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Buyer's Order No.</strong><br>
                                <span>${bill.buyersOrderNo || '—'}</span>
                            </td>
                            <td>
                                <strong>Dated</strong><br>
                                <span>${bill.orderDate ? formatShortDate(bill.orderDate) : '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Dispatch Doc No.</strong><br>
                                <span>${bill.dispatchDocNo || '—'}</span>
                            </td>
                            <td>
                                <strong>Delivery Note Date</strong><br>
                                <span>${bill.deliveryNoteDate ? formatShortDate(bill.deliveryNoteDate) : '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Dispatched through</strong><br>
                                <span>${bill.dispatchedThrough || '—'}</span>
                            </td>
                            <td>
                                <strong>Destination</strong><br>
                                <span>${bill.destination || '—'}</span>
                            </td>
                        </tr>
                        <tr style="height: 35px;">
                            <td colspan="2" style="border-right:none">
                                <strong>Terms of Delivery</strong><br>
                                <span style="font-size: 9px; line-height:11px">${bill.termsOfDelivery || 'Goods once sold cannot be taken back.'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Place of Supply</strong><br>
                                <span class="bold">${bill.placeOfSupply || '—'}</span>
                            </td>
                            <td>
                                <strong>State Code</strong><br>
                                <span class="bold">${bill.buyerStateCode || '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Due Date</strong><br>
                                <span class="font-mono">${bill.dueDate ? formatShortDate(bill.dueDate) : '—'}</span>
                            </td>
                            <td>
                                <strong>e-Way Bill No.</strong><br>
                                <span class="bold font-mono">${bill.eWayBillNo || '—'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Reverse Charge</strong><br>
                                <span class="bold">${bill.reverseCharge || 'No'}</span>
                            </td>
                            <td>
                                <strong>Tax Payable Reverse Charge</strong><br>
                                <span class="bold">${bill.taxPayableReverseCharge || 'No'}</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Product Items Table -->
        <table class="product-table">
            <thead>
                <tr>
                    <th style="width: 4%;">Sl No.</th>
                    <th style="width: 42%;">Description of Goods / Services</th>
                    <th style="width: 8%;">HSN/SAC</th>
                    <th style="width: 8%;">Quantity</th>
                    <th style="width: 8%;">Rate</th>
                    <th style="width: 5%;">per</th>
                    <th style="width: 7%;">Disc (%)</th>
                    <th style="width: 8%;">Taxable Value</th>
                    <th style="width: 8%; border-bottom: none;" colspan="2">GST</th>
                    <th style="width: 10%;">Total Amount</th>
                </tr>
                <tr style="height: 12px; font-size:8px;">
                    <th style="border-top:none; border-right:1px solid #000; width:4%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:42%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:8%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:8%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:8%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:5%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:7%;">&nbsp;</th>
                    <th style="border-top:none; border-right:1px solid #000; width:8%;">&nbsp;</th>
                    <th style="border-right:1px solid #000; font-size: 8px; padding: 1px; width: 4%;">Rate %</th>
                    <th style="border-right:1px solid #000; font-size: 8px; padding: 1px; width: 4%;">Amount</th>
                    <th style="border-top:none; width:10%;">&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                
                <!-- Total Row -->
                <tr class="total-row bold font-mono">
                    <td class="center">&nbsp;</td>
                    <td style="text-align: right; font-family: Arial, sans-serif; font-size: 10px;">Total</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">${totalQty.toFixed(2)}</td>
                    <td class="right">&nbsp;</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td class="right">₹ ${totalTaxable.toFixed(2)}</td>
                    <td class="center">&nbsp;</td>
                    <td class="right">₹ ${totalTax.toFixed(2)}</td>
                    <td class="right" style="font-size: 11px;">₹ ${grandTotal.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Bottom split: Words & HSN Table -->
        <table class="bottom-section">
            <tr>
                <td class="words-block">
                    <div style="font-size: 9px; text-transform: uppercase; color: #444; margin-bottom: 3px;">Amount Chargeable (in words)</div>
                    <div class="bold" style="font-size: 11px; line-height: 14px; color: #1e3a8a;">${wordsAmt}</div>
                </td>
                <td class="hsn-block">
                    <table class="hsn-table">
                        <thead>
                            <tr>
                                <th rowspan="2" style="border-top:none; border-left:none;">HSN/SAC</th>
                                <th rowspan="2" style="border-top:none;">Taxable Value</th>
                                <th colspan="2" style="border-top:none;">Central Tax (CGST)</th>
                                <th colspan="2" style="border-top:none;">State Tax (SGST)</th>
                                <th colspan="2" style="border-top:none;">Integrated Tax (IGST)</th>
                                <th rowspan="2" style="border-top:none; border-right:none;">Total Tax Amount</th>
                            </tr>
                            <tr>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Rate</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hsnRows}
                            <tr class="total-row bold font-mono">
                                <td style="border-left:none;">Total</td>
                                <td class="right">${hsnTaxableTotal.toFixed(2)}</td>
                                <td class="center">&nbsp;</td>
                                <td class="right">${hsnCgstTotal.toFixed(2)}</td>
                                <td class="center">&nbsp;</td>
                                <td class="right">${hsnSgstTotal.toFixed(2)}</td>
                                <td class="center">&nbsp;</td>
                                <td class="right">${hsnIgstTotal.toFixed(2)}</td>
                                <td class="right" style="border-right:none;">${hsnTaxTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Tax words -->
        <div class="tax-words-block">
            <div style="font-size: 9px; text-transform: uppercase; color: #444; margin-bottom: 2px;">Tax Amount (in words) :</div>
            <div class="bold" style="font-size: 10px; color:#1e3a8a;">${wordsTax}</div>
        </div>
        
        <!-- Footer Signatures & Declaration -->
        <table class="footer-block">
            <tr>
                <td class="footer-col-left">
                    <div style="margin-bottom: 6px;"><strong>Company's PAN :</strong> ACWFS4518D</div>
                    <div class="declaration-title">Declaration</div>
                    <div class="declaration-text">
                        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </div>
                </td>
                <td class="footer-col-right">
                    <div class="bold" style="font-size: 10px; text-transform: uppercase; text-align:right;">for SMART FRIENDS</div>
                    <div class="sig-space">Authorised Signatory</div>
                </td>
            </tr>
        </table>
        
        <div class="watermark">This is a Computer Generated Invoice</div>
    </div>
</body>
</html>`;
        return printHtml;
    }

    function printGstInvoice(bill, storeSettings, logoBase64) {
        printHtmlViaHiddenIframe(renderGstInvoicePrintHtml(bill, storeSettings, logoBase64));
    }

    function downloadGstInvoicePDF(bill, storeSettings, logoBase64) {
        let parsedItems = bill.items || [];
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
        }
        
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Standard bounding box: 10mm margin. Dimensions: 190mm wide, 277mm high.
            // Draw outer border box
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.rect(10, 10, 190, 277);
            
            // Header
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('GST TAX INVOICE', 105, 15.5, { align: 'center' });
            doc.line(10, 17.5, 200, 17.5); // Divider line
            
            
            // Left Column Blocks (Seller, Consignee, Buyer)
            // Seller Block
            // Draw logo image at top-left
            try {
                doc.addImage(logoBase64, 'PNG', 11.5, 18.5, 92, 17.5);
            } catch(e) {
                console.error('Logo add failed', e);
            }
            doc.setTextColor(0, 0, 0);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            let currentY = 39.5;
            if (storeSettings.address) {
                const addressLines = storeSettings.address.split('\n');
                addressLines.forEach(line => {
                    if (line.trim()) {
                        doc.text(line.trim(), 13, currentY);
                        currentY += 3.5;
                    }
                });
            }
            currentY = Math.max(currentY, 43.5);
            doc.text('GSTIN/UIN: ' + (storeSettings.gst || '36ACWFS4518D1ZS'), 13, currentY);
            doc.text('State Name: ' + (storeSettings.state || 'Telangana') + ', Code: ' + (storeSettings.stateCode || '36'), 13, currentY + 3.5);
            doc.text('Contact: ' + (storeSettings.phone || '+91-9398752735'), 13, currentY + 7);
            doc.text('E-Mail: smartfriends.info@gmail.com', 13, currentY + 10.5);
            
            doc.line(10, 62, 105, 62); // Divider (moved down from 58)
            
            // Consignee Block (height 26mm: 62 to 88)
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text('Consignee (Ship to)', 13, 66);
            doc.setTextColor(0, 0, 0);
            doc.setFont('Helvetica', 'bold');
            doc.text(bill.consigneeCompany || 'Same as Buyer', 13, 70);
            doc.setFont('Helvetica', 'normal');
            doc.text(bill.consigneeAddress || '—', 13, 74, { maxWidth: 90 });
            doc.text(`GSTIN/UIN: ${bill.consigneeGSTIN || '—'}`, 13, 82);
            doc.text(`State Name: ${bill.consigneeState || '—'}${bill.consigneeStateCode ? ', Code: ' + bill.consigneeStateCode : ''}`, 13, 85.5);
            
            doc.line(10, 88, 105, 88); // Divider
            
            // Buyer Block (height 30mm: 88 to 118)
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text('Buyer (Bill to)', 13, 92);
            doc.setTextColor(0, 0, 0);
            doc.text(bill.buyerCompany || bill.customer, 13, 96);
            doc.setFont('Helvetica', 'normal');
            doc.text(bill.buyerAddress || '—', 13, 100, { maxWidth: 90 });
            doc.text(`GSTIN/UIN: ${bill.buyerGSTIN || '—'}`, 13, 110);
            doc.text(`State Name: ${bill.buyerState || '—'}${bill.buyerStateCode ? ', Code: ' + bill.buyerStateCode : ''}`, 13, 113.5);
            
            doc.line(10, 118, 200, 118); // Divider (full width)
            
            // Right Column Blocks (Invoice grid details: height 90mm split into 10 rows)
            // Vertical split: X = 105, now extends to 118 to match taller left column
            doc.line(105, 17.5, 105, 118);
            
            const rightRowsY = [17.5, 25.5, 33.5, 41.5, 49.5, 57.5, 65.5, 75.5, 83.5, 91.5, 99.5, 107.5, 118];
            const midX = 152;
            
            // Draw horizontal split lines in Right Column
            for(let r=1; r < rightRowsY.length; r++) {
                doc.line(105, rightRowsY[r], 200, rightRowsY[r]);
                // Vertical split inside cells (except for Row 7 - Terms of Delivery)
                if (r !== 7 && r !== 11) {
                    doc.line(midX, rightRowsY[r-1], midX, rightRowsY[r]);
                }
            }
            
            // Populate right grid details
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(7);
            
            // Row 1
            doc.text('Invoice No.', 107, 20.5); doc.setFont('Helvetica', 'bold'); doc.setFontSize(8.5); doc.text(bill.inv, 107, 23.5);
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(7); doc.text('Dated', 154, 20.5); doc.setFont('Helvetica', 'bold'); doc.text(formatShortDate(bill.date), 154, 23.5);
            
            // Row 2
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(7); doc.text('Delivery Note', 107, 28.5); doc.text(bill.deliveryNote || '—', 107, 31.5);
            doc.text('Mode/Terms of Payment', 154, 28.5); doc.text(bill.modeTermsPayment || '—', 154, 31.5);
            
            // Row 3
            doc.text('Reference No. & Date.', 107, 36.5); doc.text(bill.refNo || '—', 107, 39.5);
            doc.text('Other References', 154, 36.5); doc.text(bill.otherReferences || '—', 154, 39.5);
            
            // Row 4
            doc.text("Buyer's Order No.", 107, 44.5); doc.text(bill.buyersOrderNo || '—', 107, 47.5);
            doc.text('Dated', 154, 44.5); doc.text(bill.orderDate ? formatShortDate(bill.orderDate) : '—', 154, 47.5);
            
            // Row 5
            doc.text('Dispatch Doc No.', 107, 52.5); doc.text(bill.dispatchDocNo || '—', 107, 55.5);
            doc.text('Delivery Note Date', 154, 52.5); doc.text(bill.deliveryNoteDate ? formatShortDate(bill.deliveryNoteDate) : '—', 154, 55.5);
            
            // Row 6
            doc.text('Dispatched through', 107, 60.5); doc.text(bill.dispatchedThrough || '—', 107, 63.5);
            doc.text('Destination', 154, 60.5); doc.text(bill.destination || '—', 154, 63.5);
            
            // Row 7 (Terms of delivery)
            doc.text('Terms of Delivery', 107, 68.5);
            doc.text(bill.termsOfDelivery || 'Goods once sold will not be returned.', 107, 72, { maxWidth: 90 });
            
            // Row 8
            doc.text('Place of Supply', 107, 78.5); doc.setFont('Helvetica', 'bold'); doc.text(bill.placeOfSupply || '—', 107, 81.5);
            doc.setFont('Helvetica', 'normal'); doc.text('State Code', 154, 78.5); doc.setFont('Helvetica', 'bold'); doc.text(bill.buyerStateCode || '—', 154, 81.5);
            
            // Row 9
            doc.setFont('Helvetica', 'normal'); doc.text('Due Date', 107, 86.5); doc.text(bill.dueDate ? formatShortDate(bill.dueDate) : '—', 107, 89.5);
            doc.text('e-Way Bill No.', 154, 86.5); doc.setFont('Helvetica', 'bold'); doc.text(bill.eWayBillNo || '—', 154, 89.5);
            
            // Row 10
            doc.setFont('Helvetica', 'normal'); doc.text('Reverse Charge', 107, 94.5); doc.setFont('Helvetica', 'bold'); doc.text(bill.reverseCharge || 'No', 107, 97.5);
            doc.setFont('Helvetica', 'normal'); doc.text('Tax Payable Reverse Charge', 154, 94.5); doc.setFont('Helvetica', 'bold'); doc.text(bill.taxPayableReverseCharge || 'No', 154, 97.5);
            
            // Row 11
            doc.setFont('Helvetica', 'normal'); doc.text('Shipping/Logistics Note', 107, 102.5); doc.text('GST Standard Tax Billing', 107, 105.5);
            
            // ============ Product Items Table Drawing (Y = 107.5 to Y = 191.5) ============
            const tableStartY = 107.5;
            const tableHeight = 84;
            const headerHeight = 9;
            const rowHeight = 7;
            const tableEndY = tableStartY + tableHeight;
            
            // Columns X Coordinates and Widths:
            // Total width = 190. Margins: 10 to 200.
            const colX = [10, 17, 82, 97, 110, 123, 131, 143, 160, 172, 185, 200];
            const colHeaders = ['Sl', 'Description of Goods / Services', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc %', 'Taxable Val', 'GST%', 'GST Amt', 'Total Amt'];
            
            // Draw header backgrounds
            doc.setFillColor(248, 248, 248);
            doc.rect(10, tableStartY, 190, headerHeight, 'F');
            doc.line(10, tableStartY + headerHeight, 200, tableStartY + headerHeight);
            
            // Draw column borders
            colX.forEach(cx => {
                doc.line(cx, tableStartY, cx, tableEndY);
            });
            
            // Draw header titles
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            const headerY = tableStartY + 5.5;
            doc.text('Sl', 11, headerY);
            doc.text('Description of Goods / Services', 18, headerY);
            doc.text('HSN/SAC', 83, headerY);
            doc.text('Quantity', 109, headerY, { align: 'right' });
            doc.text('Rate', 122, headerY, { align: 'right' });
            doc.text('per', 124, headerY);
            doc.text('Disc %', 142, headerY, { align: 'right' });
            doc.text('Taxable Val', 159, headerY, { align: 'right' });
            doc.text('GST%', 171, headerY, { align: 'right' });
            doc.text('GST Amt', 184, headerY, { align: 'right' });
            doc.text('Total Amt', 199, headerY, { align: 'right' });
            
            // Plot items
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            let itemY = tableStartY + headerHeight + 5;
            
            let totalQty = 0;
            let totalTaxable = bill.subtotal || 0;
            let totalTax = bill.gst || 0;
            let grandTotal = bill.total || 0;
            
            parsedItems.forEach((item, idx) => {
                if (itemY < tableEndY - 8) {
                    totalQty += item.qty || 0;
                    const lineTax = (item.cgstAmount + item.sgstAmount + item.igstAmount) || 0;
                    
                    doc.text(String(idx + 1), 13.5, itemY, { align: 'center' });
                    doc.setFont('Helvetica', 'bold');
                    doc.text(item.name || '—', 18, itemY, { maxWidth: 62 });
                    doc.setFont('Helvetica', 'normal');
                    if (item.description) {
                        doc.setFontSize(6.5);
                        doc.text(item.description, 18, itemY + 3.5, { maxWidth: 62 });
                        doc.setFontSize(7.5);
                    }
                    doc.text(item.hsn || '—', 89.5, itemY, { align: 'center' });
                    doc.text(parseFloat(item.qty).toFixed(2), 109, itemY, { align: 'right' });
                    doc.text(parseFloat(item.price).toFixed(2), 122, itemY, { align: 'right' });
                    doc.text(item.unit || 'Nos', 124, itemY);
                    doc.text(parseFloat(item.discountPercent).toFixed(1) + '%', 142, itemY, { align: 'right' });
                    doc.text(parseFloat(item.taxableValue).toFixed(2), 159, itemY, { align: 'right' });
                    doc.text(item.gstRate + '%', 166, itemY);
                    doc.text(parseFloat(lineTax).toFixed(2), 184, itemY, { align: 'right' });
                    doc.text(parseFloat(item.amount).toFixed(2), 199, itemY, { align: 'right' });
                    
                    itemY += rowHeight + (item.description ? 3 : 0);
                }
            });
            
            // Draw Table total row (Y = 191.5 to Y = 197.5)
            const totalY = tableEndY;
            doc.line(10, totalY, 200, totalY);
            doc.setFillColor(250, 250, 250);
            doc.rect(10, totalY, 190, 6, 'F');
            doc.rect(10, totalY, 190, 6);
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('Total', 18, totalY + 4.5);
            doc.text(totalQty.toFixed(2), 109, totalY + 4.5, { align: 'right' });
            doc.text('Rs. ' + totalTaxable.toFixed(2), 159, totalY + 4.5, { align: 'right' });
            doc.text('Rs. ' + totalTax.toFixed(2), 184, totalY + 4.5, { align: 'right' });
            doc.text('Rs. ' + grandTotal.toFixed(2), 199, totalY + 4.5, { align: 'right' });
            
            // ============ Bottom Grid: Words block & HSN block (Y = 203.5 to Y = 239.5) ============
            const bottomStartY = totalY + 6;
            const bottomHeight = 36;
            const bottomEndY = bottomStartY + bottomHeight;
            
            // Draw horizontal and vertical bounds for HSN box
            doc.line(10, bottomEndY, 200, bottomEndY);
            // vertical line at X = 90
            doc.line(90, bottomStartY, 90, bottomEndY);
            
            // Words details (Left Column)
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text('Amount Chargeable (in words)', 12, bottomStartY + 4);
            doc.setTextColor(30, 50, 120);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            
            const wordsAmt = convertNumberToWords(grandTotal);
            const wordsTax = convertNumberToWords(totalTax);
            
            doc.text(wordsAmt, 12, bottomStartY + 8, { maxWidth: 76 });
            
            // HSN table details (Right Column X = 90 to X = 200)
            // Major group boundaries (HSN/SAC, Taxable Val, CGST, SGST, IGST, Total Tax)
            const hsnMajorColX = [90, 108, 126, 145, 164, 183, 200];
            // Sub-dividers between each group's "Rate" and "Amt" values — these must not
            // cross the merged group header (e.g. "Central (CGST)"), only the rows below it.
            const hsnSubColX = [134, 153, 172];
            doc.setFillColor(248, 248, 248);
            doc.rect(90, bottomStartY, 110, 8, 'F');
            doc.line(90, bottomStartY + 8, 200, bottomStartY + 8);

            // Draw HSN columns
            hsnMajorColX.forEach(hx => {
                doc.line(hx, bottomStartY, hx, bottomEndY - 6); // ends before HSN totals row
            });
            hsnSubColX.forEach(hx => {
                doc.line(hx, bottomStartY + 8, hx, bottomEndY - 6); // starts below the merged header row
            });
            
            // Draw HSN Headers
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(0, 0, 0);
            doc.text('HSN/SAC', 91, bottomStartY + 5);
            doc.text('Taxable Val', 109, bottomStartY + 5);
            doc.text('Central (CGST)', 135.5, bottomStartY + 3.5, { align: 'center' }); doc.text('Rate / Amt', 135.5, bottomStartY + 6.5, { align: 'center' });
            doc.text('State (SGST)', 154.5, bottomStartY + 3.5, { align: 'center' }); doc.text('Rate / Amt', 154.5, bottomStartY + 6.5, { align: 'center' });
            doc.text('Integrated', 173.5, bottomStartY + 3.5, { align: 'center' }); doc.text('Rate / Amt', 173.5, bottomStartY + 6.5, { align: 'center' });
            doc.text('Total Tax', 184, bottomStartY + 5);
            
            // Group taxes by HSN
            const hsnSummary = {};
            parsedItems.forEach(item => {
                const h = item.hsn || '—';
                if (!hsnSummary[h]) {
                    hsnSummary[h] = { taxable: 0, cgstRate: item.gstRate/2, cgstAmt: 0, sgstRate: item.gstRate/2, sgstAmt: 0, igstRate: item.gstRate, igstAmt: 0, totalTax: 0 };
                }
                hsnSummary[h].taxable += item.taxableValue || 0;
                hsnSummary[h].cgstAmt += item.cgstAmount || 0;
                hsnSummary[h].sgstAmt += item.sgstAmount || 0;
                hsnSummary[h].igstAmt += item.igstAmount || 0;
                hsnSummary[h].totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount) || 0;
            });
            
            // Populate HSN Rows
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6.5);
            let hsnRowY = bottomStartY + 11.5;
            
            const isGSTInterstate = (bill.buyerStateCode || '36') !== '36';
            let hsnTaxableTotal = 0;
            let hsnCgstTotal = 0;
            let hsnSgstTotal = 0;
            let hsnIgstTotal = 0;
            let hsnTaxTotal = 0;
            
            Object.keys(hsnSummary).forEach(hsn => {
                if (hsnRowY < bottomEndY - 7) {
                    const g = hsnSummary[hsn];
                    hsnTaxableTotal += g.taxable;
                    hsnCgstTotal += g.cgstAmt;
                    hsnSgstTotal += g.sgstAmt;
                    hsnIgstTotal += g.igstAmt;
                    hsnTaxTotal += g.totalTax;
                    
                    doc.text(hsn, 91, hsnRowY);
                    doc.text(g.taxable.toFixed(2), 125, hsnRowY, { align: 'right' });
                    doc.text(isGSTInterstate ? '0%' : g.cgstRate.toFixed(0) + '%', 130, hsnRowY);
                    doc.text(g.cgstAmt.toFixed(2), 144, hsnRowY, { align: 'right' });
                    doc.text(isGSTInterstate ? '0%' : g.sgstRate.toFixed(0) + '%', 149, hsnRowY);
                    doc.text(g.sgstAmt.toFixed(2), 163, hsnRowY, { align: 'right' });
                    doc.text(isGSTInterstate ? g.igstRate.toFixed(0) + '%' : '0%', 168, hsnRowY);
                    doc.text(g.igstAmt.toFixed(2), 182, hsnRowY, { align: 'right' });
                    doc.text(g.totalTax.toFixed(2), 199, hsnRowY, { align: 'right' });
                    
                    hsnRowY += 5;
                }
            });
            
            // Draw HSN totals row
            const hsnTotalY = bottomEndY - 6;
            doc.line(90, hsnTotalY, 200, hsnTotalY);
            doc.setFillColor(250, 250, 250);
            doc.rect(90, hsnTotalY, 110, 6, 'F');
            doc.rect(90, hsnTotalY, 110, 6);
            
            doc.setFont('Helvetica', 'bold');
            doc.text('Total', 91, hsnTotalY + 4.2);
            doc.text(hsnTaxableTotal.toFixed(2), 125, hsnTotalY + 4.2, { align: 'right' });
            doc.text(hsnCgstTotal.toFixed(2), 144, hsnTotalY + 4.2, { align: 'right' });
            doc.text(hsnSgstTotal.toFixed(2), 163, hsnTotalY + 4.2, { align: 'right' });
            doc.text(hsnIgstTotal.toFixed(2), 182, hsnTotalY + 4.2, { align: 'right' });
            doc.text(hsnTaxTotal.toFixed(2), 199, hsnTotalY + 4.2, { align: 'right' });
            
            // ============ Tax Words Block (Y = 243.5 to Y = 251.5) ============
            const taxWordsY = bottomEndY;
            doc.line(10, taxWordsY + 8, 200, taxWordsY + 8);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text('Tax Amount (in words) :', 12, taxWordsY + 5.2);
            doc.setTextColor(30, 50, 120);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(wordsTax, 43, taxWordsY + 5.2);
            
            // ============ Footer details (Y = 251.5 to Y = 287) ============
            const footerY = taxWordsY + 8;
            // Vertical split in footer at X = 115
            doc.line(115, footerY, 115, 287);
            
            // Left Footer content
            doc.setTextColor(0, 0, 0);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('Company\'s PAN : ACWFS4518D', 12, footerY + 5);
            doc.text('Declaration', 12, footerY + 11);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 12, footerY + 15, { maxWidth: 98 });
            
            // Right Footer content (Authorized signatory)
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('for SMART FRIENDS', 118, footerY + 5);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('Authorised Signatory', 198, footerY + 30, { align: 'right' });
            
            // Bottom computer note
            doc.setFont('Helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 100, 100);
            doc.text('This is a Computer Generated Invoice', 105, 291.5, { align: 'center' });
            
            // Save & Download
            doc.save(`GST_Invoice_${bill.inv}.pdf`);
    }

    global.SFBilling = {
        parseDimensionArea,
        calculateLineItemAmount,
        getStoreGstInfo,
        computeBillTotals,
        isCounterItem,
        determineBillType,
        getBillSheetDetails,
        calculateBillSheetCount,
        formatShortDate,
        convertNumberToWords,
        buildBill,
        renderBillPrintHtml,
        printBill,
        downloadBillPDF,
        renderGstInvoicePrintHtml,
        printGstInvoice,
        downloadGstInvoicePDF
    };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
