const mongoose = require('mongoose');

const partUsedSubSchema = new mongoose.Schema(
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

const serviceRecordSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: [true, 'Service record must reference the closed service request'],
      unique: true // Strictly enforces 1:1 relationship between ServiceRequest and ServiceRecord
    },
    appliance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appliance',
      required: [true, 'Service record must reference the serviced appliance']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Service record must reference the customer']
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Service record must reference the technician who performed the service']
    },
    diagnosis: {
      type: String,
      required: [true, 'Please provide the diagnosis summary'],
      trim: true
    },
    repairNotes: {
      type: String,
      trim: true,
      default: ''
    },
    partsUsed: [partUsedSubSchema],
    totalCost: {
      type: Number,
      required: [true, 'Please provide the final total repair cost'],
      min: 0
    },
    completionDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes
serviceRecordSchema.index({ appliance: 1, completionDate: -1 });
serviceRecordSchema.index({ customer: 1, completionDate: -1 });

// Immutability Guard: ServiceRecord is a permanent historical audit record
serviceRecordSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('ServiceRecord is an immutable historical record and cannot be modified.'));
  }
  next();
});

const blockUpdate = function (next) {
  next(new Error('ServiceRecord is an immutable historical record and cannot be modified.'));
};

serviceRecordSchema.pre('updateOne', blockUpdate);
serviceRecordSchema.pre('findOneAndUpdate', blockUpdate);
serviceRecordSchema.pre('updateMany', blockUpdate);

module.exports = mongoose.model('ServiceRecord', serviceRecordSchema);
