// Recomputes subtotal/gst/total for every normal (non-GST) bill in the
// database from its stored line items, using the same SFBilling math the
// app now uses to create bills, and reports any bill whose stored numbers
// don't match. Read-only — does not modify any bill.
//
// Known, expected source of "mismatches": the Bill model has no `discount`
// field (Mongoose strips it silently on both create and update, since it's
// never been in the schema), so a bill that had a per-bill discount applied
// at creation time has no persisted record of that discount. This script
// recomputes assuming discount=0, so such bills will show a gst/total
// mismatch even though nothing is actually wrong — only their (unrecorded)
// discount explains the gap. Their recomputed subtotal will still match
// exactly, since subtotal is captured before any discount is applied.
require('dotenv').config();
const mongoose = require('mongoose');
require('../public/shared/billing.js'); // attaches global.SFBilling
const SFBilling = global.SFBilling;
const Bill = require('../models/Bill');

const EPSILON = 0.01; // 1 paisa — floating point tolerance

function parseItems(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return []; }
    }
    return [];
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const bills = await Bill.find().lean();

    let checked = 0, matched = 0, skippedGst = 0, skippedNoItems = 0;
    const mismatches = [];

    for (const bill of bills) {
        if (bill.type === 'GST') { skippedGst++; continue; }

        const items = parseItems(bill.items);
        if (!items.length) { skippedNoItems++; continue; }

        checked++;

        const recomputedSubtotal = items.reduce((sum, item) => {
            return sum + SFBilling.calculateLineItemAmount(
                item.name, parseFloat(item.qty) || 0, parseFloat(item.price) || 0, item.unit || ''
            );
        }, 0);

        const totals = SFBilling.computeBillTotals({
            subtotal: recomputedSubtotal,
            discount: 0, // not persisted on the Bill model — see header comment
            gstPercent: parseFloat(bill.gstPercent) || 0
        });

        const storedSubtotal = parseFloat(bill.subtotal) || 0;
        const storedGst = parseFloat(bill.gst) || 0;
        const storedTotal = parseFloat(bill.total) || 0;

        const subtotalDiff = Math.abs(recomputedSubtotal - storedSubtotal);
        const gstDiff = Math.abs(totals.gstAmount - storedGst);
        const totalDiff = Math.abs(totals.total - storedTotal);

        if (subtotalDiff > EPSILON || gstDiff > EPSILON || totalDiff > EPSILON) {
            mismatches.push({
                inv: bill.inv,
                stored: { subtotal: storedSubtotal, gst: storedGst, total: storedTotal },
                recomputed: { subtotal: recomputedSubtotal, gst: totals.gstAmount, total: totals.total },
                subtotalDiff, gstDiff, totalDiff,
                likelyDiscounted: subtotalDiff <= EPSILON && (gstDiff > EPSILON || totalDiff > EPSILON)
            });
        } else {
            matched++;
        }
    }

    console.log(`Checked ${checked} normal (non-GST) bills: ${matched} matched exactly, ${mismatches.length} differ.`);
    console.log(`Skipped ${skippedGst} GST bills (GST tax math stays owned by app.js, not SFBilling) and ${skippedNoItems} bill(s) with no items.`);

    if (mismatches.length) {
        const discounted = mismatches.filter(m => m.likelyDiscounted);
        const other = mismatches.filter(m => !m.likelyDiscounted);

        if (discounted.length) {
            console.log(`\n${discounted.length} mismatch(es) with matching subtotal but differing gst/total — consistent with a`);
            console.log('per-bill discount applied at creation time (not persisted on the Bill model, see header comment):');
            discounted.forEach(m => {
                console.log(`  ${m.inv}: stored total=${m.stored.total} vs recomputed (0% discount) total=${m.recomputed.total.toFixed(2)}`);
            });
        }

        if (other.length) {
            console.log(`\n${other.length} mismatch(es) NOT explained by an unrecorded discount — worth investigating:`);
            other.forEach(m => {
                console.log(`  ${m.inv}: stored subtotal=${m.stored.subtotal} gst=${m.stored.gst} total=${m.stored.total} | recomputed subtotal=${m.recomputed.subtotal.toFixed(2)} gst=${m.recomputed.gst.toFixed(2)} total=${m.recomputed.total.toFixed(2)}`);
            });
        }
    } else {
        console.log('\nNo differences found.');
    }

    await mongoose.disconnect();
    // Exit non-zero only for genuinely unexplained mismatches, not the
    // known discount-related ones.
    const unexplained = mismatches.filter(m => !m.likelyDiscounted);
    process.exit(unexplained.length ? 1 : 0);
}

run().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
