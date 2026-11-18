const mongoose = require('mongoose');
const crypto = require('crypto');

const statusHistorySubSchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      required: true
    },
    toStatus: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const partItemSubSchema = new mongoose.Schema(
  {
    partName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const completionDetailsSubSchema = new mongoose.Schema(
  {
    diagnosis: {
      type: String,
      trim: true,
      default: ''
    },
    repairNotes: {
      type: String,
      trim: true,
      default: ''
    },
    partsUsed: [partItemSubSchema],
    laborCost: {
      type: Number,
      default: 0
    },
    finalRepairCost: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const completionOtpSubSchema = new mongoose.Schema(
  {
    otpEncrypted: {
      type: String,
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    attemptsCount: {
      type: Number,
      default: 0
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Request must belong to a customer']
    },
    appliance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appliance',
      required: [true, 'Request must specify an appliance']
    },
    problemDescription: {
      type: String,
      required: [true, 'Please describe the problem or fault'],
      trim: true
    },
    preferredDate: {
      type: Date,
      required: [true, 'Please provide a preferred service date']
    },
    preferredTimeSlot: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening'],
      required: [true, 'Please select a preferred time slot']
    },
    contactPhone: {
      type: String,
      required: [true, 'Please provide a contact phone number'],
      trim: true
    },
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'ASSIGNED',
        'ACCEPTED',
        'ON_THE_WAY',
        'REACHED',
        'IN_PROGRESS',
        'COMPLETED',
        'CLOSED',
        'REJECTED',
        'CANCELLED'
      ],
      default: 'SUBMITTED'
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    statusHistory: [statusHistorySubSchema],
    completionDetails: {
      type: completionDetailsSubSchema,
      default: () => ({})
    },
    // Excluded from default queries to prevent leaking OTP to unauthorized users
    completionOtp: {
      type: completionOtpSubSchema,
      select: false,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Indexes
serviceRequestSchema.index({ customer: 1, status: 1 });
serviceRequestSchema.index({ assignedTechnician: 1, status: 1 });
serviceRequestSchema.index({ status: 1 });

// Helper to generate a collision-free request code: RP-YYMM-XXXX
let requestSequenceCounter = Math.floor(Math.random() * 10000);

serviceRequestSchema.statics.generateRequestNumber = function () {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  requestSequenceCounter = (requestSequenceCounter + 1) % 65536;
  const hex = requestSequenceCounter.toString(16).toUpperCase().padStart(4, '0');
  return `RP-${year}${month}-${hex}`;
};

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
