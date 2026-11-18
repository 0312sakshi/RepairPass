const mongoose = require('mongoose');

const documentSubSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ['invoice', 'warranty_card', 'other'],
      default: 'invoice'
    },
    storageKey: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const applianceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Appliance must be associated with a customer']
    },
    category: {
      type: String,
      required: [true, 'Please provide an appliance category'],
      trim: true
    },
    brand: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    modelNumber: {
      type: String,
      trim: true,
      default: ''
    },
    serialNumber: {
      type: String,
      trim: true,
      default: ''
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    warrantyDurationMonths: {
      type: Number,
      default: null
    },
    documents: [documentSubSchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for listing customer appliances sorted by creation date
applianceSchema.index({ customer: 1, createdAt: -1 });

// Virtual getter for accurate calendar-month warranty calculation
applianceSchema.virtual('warrantyDetails').get(function () {
  if (!this.purchaseDate || !this.warrantyDurationMonths || this.warrantyDurationMonths <= 0) {
    return {
      status: 'UNKNOWN',
      expiryDate: null,
      isExpired: false
    };
  }

  const purchase = new Date(this.purchaseDate);
  if (isNaN(purchase.getTime())) {
    return {
      status: 'UNKNOWN',
      expiryDate: null,
      isExpired: false
    };
  }

  // Exact calendar-month date arithmetic
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + Number(this.warrantyDurationMonths));

  const now = new Date();
  const isExpired = now > expiry;

  return {
    status: isExpired ? 'EXPIRED' : 'ACTIVE',
    expiryDate: expiry,
    isExpired
  };
});

module.exports = mongoose.model('Appliance', applianceSchema);
