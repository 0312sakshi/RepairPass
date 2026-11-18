const crypto = require('crypto');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceRecord = require('../models/ServiceRecord');
const Appliance = require('../models/Appliance');
const { encryptOtp, decryptOtp } = require('../utils/otpCrypto');

/**
 * @desc    Customer creates a new service request
 * @route   POST /api/requests
 * @access  Protected (Customer)
 */
const createServiceRequest = async (req, res, next) => {
  try {
    const { applianceId, problemDescription, preferredDate, preferredTimeSlot, contactPhone } = req.body;

    if (!applianceId || !problemDescription || !preferredDate || !preferredTimeSlot || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: applianceId, problemDescription, preferredDate, preferredTimeSlot, and contactPhone.'
      });
    }

    // Strict ownership validation: ServiceRequest.customer === Appliance.customer
    const appliance = await Appliance.findById(applianceId);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found.'
      });
    }

    if (appliance.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this appliance.'
      });
    }

    const requestNumber = ServiceRequest.generateRequestNumber();

    const serviceRequest = await ServiceRequest.create({
      requestNumber,
      customer: req.user._id,
      appliance: appliance._id,
      problemDescription: problemDescription.trim(),
      preferredDate,
      preferredTimeSlot,
      contactPhone: contactPhone.trim(),
      status: 'SUBMITTED',
      statusHistory: [
        {
          fromStatus: 'NONE',
          toStatus: 'SUBMITTED',
          changedBy: req.user._id,
          changedAt: new Date(),
          note: 'Service request raised by customer.'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully.',
      serviceRequest
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Technician submits repair completion details and triggers OTP generation
 * @route   POST /api/requests/:id/technician-complete
 * @access  Protected (Approved Technician)
 */
const technicianSubmitCompletion = async (req, res, next) => {
  try {
    const { diagnosis, repairNotes, partsUsed, laborCost, finalRepairCost } = req.body;

    if (!diagnosis || finalRepairCost === undefined || finalRepairCost === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide diagnosis and final repair cost.'
      });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Verify assigned technician
    if (!request.assignedTechnician || request.assignedTechnician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the technician assigned to this request.'
      });
    }

    if (request.status !== 'IN_PROGRESS' && request.status !== 'REACHED') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete job: Current status is '${request.status}'. Job must be in progress.`
      });
    }

    // Generate random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpEncrypted = encryptOtp(rawOtp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes validity

    const previousStatus = request.status;
    request.status = 'COMPLETED';
    request.completionDetails = {
      diagnosis: diagnosis.trim(),
      repairNotes: repairNotes ? repairNotes.trim() : '',
      partsUsed: Array.isArray(partsUsed) ? partsUsed : [],
      laborCost: Number(laborCost) || 0,
      finalRepairCost: Number(finalRepairCost),
      submittedAt: now
    };
    request.completionOtp = {
      otpEncrypted,
      generatedAt: now,
      expiresAt,
      attemptsCount: 0,
      verifiedAt: null
    };

    request.statusHistory.push({
      fromStatus: previousStatus,
      toStatus: 'COMPLETED',
      changedBy: req.user._id,
      technician: req.user._id,
      changedAt: now,
      note: 'Technician submitted repair details. Awaiting customer OTP verification.'
    });

    await request.save();

    // Notice: Response does NOT leak the OTP or otpEncrypted to technician!
    res.status(200).json({
      success: true,
      message: 'Repair details submitted. Customer has been issued the completion OTP for verification.',
      status: request.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer retrieves active completion OTP
 * @route   GET /api/requests/:id/completion-otp
 * @access  Protected (Owner Customer)
 */
const getCustomerCompletionOtp = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).select('+completionOtp');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Ownership check
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this service request.'
      });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `OTP is not active. Current request status is '${request.status}'.`
      });
    }

    if (!request.completionOtp || !request.completionOtp.otpEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'Completion OTP has not been generated for this request.'
      });
    }

    if (request.completionOtp.verifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'This request has already been verified and closed.'
      });
    }

    const plainOtp = decryptOtp(request.completionOtp.otpEncrypted);
    const isExpired = new Date() > new Date(request.completionOtp.expiresAt);

    res.status(200).json({
      success: true,
      otp: plainOtp,
      expiresAt: request.completionOtp.expiresAt,
      isExpired,
      attemptsCount: request.completionOtp.attemptsCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer verifies completion OTP, closes request, and creates immutable ServiceRecord
 * @route   POST /api/requests/:id/verify-completion
 * @access  Protected (Owner Customer)
 */
const verifyCompletionAndClose = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the 6-digit completion OTP.'
      });
    }

    const request = await ServiceRequest.findById(req.params.id).select('+completionOtp');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Ownership check: Authenticated Customer === request.customer
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this service request.'
      });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify completion: Request is currently in '${request.status}' status, not 'COMPLETED'.`
      });
    }

    if (!request.completionOtp || !request.completionOtp.otpEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found for this service request.'
      });
    }

    // Check attempt limit (max 5)
    if (request.completionOtp.attemptsCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum OTP verification attempts (5) exceeded. Please regenerate a new OTP.'
      });
    }

    // Check expiration
    const now = new Date();
    if (now > new Date(request.completionOtp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. The request remains in COMPLETED status. Please regenerate a new OTP.'
      });
    }

    // Verify OTP
    const actualOtp = decryptOtp(request.completionOtp.otpEncrypted);
    if (String(otp).trim() !== actualOtp) {
      request.completionOtp.attemptsCount += 1;
      await request.save();
      const remaining = 5 - request.completionOtp.attemptsCount;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : 'Attempts exceeded. Please regenerate a new OTP.'}`
      });
    }

    // OTP is valid! Perform atomic closure and create permanent ServiceRecord
    request.status = 'CLOSED';
    request.completionOtp.verifiedAt = now;
    request.statusHistory.push({
      fromStatus: 'COMPLETED',
      toStatus: 'CLOSED',
      changedBy: req.user._id,
      changedAt: now,
      note: 'Customer verified completion OTP. Request permanently closed.'
    });

    await request.save();

    // Create permanent, immutable ServiceRecord
    // Unique index on ServiceRecord.serviceRequest guarantees no duplicate can exist
    const serviceRecord = await ServiceRecord.create({
      serviceRequest: request._id,
      appliance: request.appliance,
      customer: request.customer,
      technician: request.assignedTechnician,
      diagnosis: request.completionDetails.diagnosis,
      repairNotes: request.completionDetails.repairNotes,
      partsUsed: request.completionDetails.partsUsed,
      totalCost: request.completionDetails.finalRepairCost,
      completionDate: now
    });

    res.status(200).json({
      success: true,
      message: 'Service completion verified successfully. Request is now CLOSED and permanently recorded in appliance history.',
      serviceRecordId: serviceRecord._id,
      status: request.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer regenerates expired or blocked OTP
 * @route   POST /api/requests/:id/regenerate-otp
 * @access  Protected (Owner Customer)
 */
const regenerateCompletionOtp = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).select('+completionOtp');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    // Ownership check
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this service request.'
      });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot regenerate OTP: Request status is '${request.status}', not 'COMPLETED'.`
      });
    }

    if (request.completionOtp && request.completionOtp.verifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot regenerate OTP: Request has already been closed.'
      });
    }

    // Cooldown check (prevent spamming regeneration within 30 seconds)
    const now = new Date();
    if (request.completionOtp && request.completionOtp.generatedAt) {
      const secondsSinceLast = (now - new Date(request.completionOtp.generatedAt)) / 1000;
      if (secondsSinceLast < 30) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(30 - secondsSinceLast)} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate fresh 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpEncrypted = encryptOtp(rawOtp);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    request.completionOtp = {
      otpEncrypted,
      generatedAt: now,
      expiresAt,
      attemptsCount: 0,
      verifiedAt: null
    };

    request.statusHistory.push({
      fromStatus: 'COMPLETED',
      toStatus: 'COMPLETED',
      changedBy: req.user._id,
      changedAt: now,
      note: 'Customer regenerated completion OTP.'
    });

    await request.save();

    res.status(200).json({
      success: true,
      message: 'New completion OTP generated successfully.',
      expiresAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all service requests for authenticated customer
 * @route   GET /api/requests
 * @access  Protected (Customer)
 */
const getMyServiceRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ customer: req.user._id })
      .populate('appliance', 'category brand modelNumber')
      .populate('assignedTechnician', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single service request details with timeline
 * @route   GET /api/requests/:id
 * @access  Protected (Customer / Assigned Technician / Admin)
 */
const getServiceRequestById = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('appliance', 'category brand modelNumber serialNumber purchaseDate warrantyDetails')
      .populate('assignedTechnician', 'name phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    const isOwnerCustomer = req.user.role === 'customer' && request.customer.toString() === req.user._id.toString();
    const isAssignedTech = req.user.role === 'technician' && request.assignedTechnician && request.assignedTechnician._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerCustomer && !isAssignedTech && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this service request.'
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all completed service history records for authenticated customer
 * @route   GET /api/requests/records/my
 * @access  Protected (Customer)
 */
const getMyServiceRecords = async (req, res, next) => {
  try {
    const records = await ServiceRecord.find({ customer: req.user._id })
      .populate('appliance', 'category brand modelNumber')
      .populate('technician', 'name phone')
      .populate('serviceRequest', 'requestNumber')
      .sort({ completionDate: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createServiceRequest,
  technicianSubmitCompletion,
  getCustomerCompletionOtp,
  verifyCompletionAndClose,
  regenerateCompletionOtp,
  getMyServiceRequests,
  getServiceRequestById,
  getMyServiceRecords
};
