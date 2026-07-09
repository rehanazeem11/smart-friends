const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    inv: { type: String, required: true, unique: true },
    date: String,
    customer: String,
    phone: String,
    shipTo: String,
    billTo: String,
    items: [{
        name: String,
        description: String,
        hsn: String,
        qty: Number,
        price: Number,
        unit: String,
        discountPercent: Number,
        taxableValue: Number,
        gstRate: Number,
        cgstAmount: Number,
        sgstAmount: Number,
        igstAmount: Number,
        amount: Number,
        report_type_override: { type: String, default: 'auto' }
    }],
    subtotal: Number,
    gst: Number,
    gstPercent: Number,
    total: Number,
    paid: Number,
    status: String,
    type: String,
    createdBy: String,
    createdByRole: String,
    createdByEmail: String,
    createdAt: String,
    lastUpdatedBy: String,
    lastUpdatedByRole: String,
    lastUpdatedAt: String,
    
    // GST Billing Specific Fields
    buyerCompany: String,
    buyerGSTIN: String,
    buyerPAN: String,
    buyerAddress: String,
    buyerCity: String,
    buyerState: String,
    buyerStateCode: String,
    buyerEmail: String,
    
    consigneeCompany: String,
    consigneeGSTIN: String,
    consigneeAddress: String,
    consigneeState: String,
    consigneeStateCode: String,

    deliveryNote: String,
    modeTermsPayment: String,
    refNo: String,
    otherReferences: String,
    buyersOrderNo: String,
    orderDate: String,
    dispatchDocNo: String,
    deliveryNoteDate: String,
    dispatchedThrough: String,
    destination: String,
    termsOfDelivery: String,
    placeOfSupply: String,
    reverseCharge: String,
    taxPayableReverseCharge: String,
    eWayBillNo: String,

    // Sheet tracking fields
    printing_type: { type: String, default: '' },
    sheet_quantity: { type: Number, default: 0 },
    calculated_sheet_count: { type: Number, default: 0 },

    // Report Type Override field
    report_type_override: { type: String, default: 'auto' }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
