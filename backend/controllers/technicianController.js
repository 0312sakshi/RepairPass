const crypto = require('crypto');
const ServiceRequest = require('../models/ServiceRequest');
const { encryptOtp } = require('../utils/otpCrypto');

/**
 * @desc    Get all service requests assigned to the logged-in technician
 * @route   GET /api/technician/jobs
 * @access  Protected (Technician)
 */
const getAssignedJobs = async (req, res, next) => {
  try {
    const jobs = await ServiceRequest.find({ assignedTechnician: req.user._id })
      .populate('customer', 'name phone city')
      .populate('appliance', 'category brand modelNumber serialNumber warrantyDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a specific assigned job
 * @route   GET /api/technician/jobs/:id
 * @access  Protected (Technician)
 */
const getJobById = async (req, res, next) => {
  try {
    const job = await ServiceRequest.findById(req.params.id)
      .populate('customer', 'name phone city')
      .populate('appliance', 'category brand modelNumber serialNumber purchaseDate warrantyDetails');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    if (!job.assignedTechnician || job.assignedTechnician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this job.'
      });
    }

    res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Technician accepts an assigned job
 * @route   POST /api/technician/jobs/:id/accept
 * @access  Protected (Technician)
 */
const acceptJob = async (req, res, next) => {
  try {
    const job = await ServiceRequest.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    if (!job.assignedTechnician || job.assignedTechnician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this job.'
      });
    }

    if (job.status !== 'ASSIGNED') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept job: Current status is '${job.status}'. Expected status 'ASSIGNED'.`
      });
    }

    const prevStatus = job.status;
    job.status = 'ACCEPTED';
    job.statusHistory.push({
      fromStatus: prevStatus,
      toStatus: 'ACCEPTED',
      changedBy: req.user._id,
      technician: req.user._id,
      changedAt: new Date(),
      note: 'Technician accepted the job assignment.'
    });

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job accepted successfully.',
      job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Technician updates service progress status (ON_THE_WAY, REACHED, IN_PROGRESS)
 * @route   POST /api/technician/jobs/:id/status
 * @access  Protected (Technician)
 */
const updateJobStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const allowedStatuses = ['ON_THE_WAY', 'REACHED', 'IN_PROGRESS'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status update. Allowed statuses: ${allowedStatuses.join(', ')}`
      });
    }

    const job = await ServiceRequest.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    if (!job.assignedTechnician || job.assignedTechnician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this job.'
      });
    }

    const prevStatus = job.status;
    job.status = status;
    job.statusHistory.push({
      fromStatus: prevStatus,
      toStatus: status,
      changedBy: req.user._id,
      technician: req.user._id,
      changedAt: new Date(),
      note: note ? note.trim() : `Technician updated status to ${status.replace(/_/g, ' ')}.`
    });

    await job.save();

    res.status(200).json({
      success: true,
      message: `Job status updated to ${status.replace(/_/g, ' ')}.`,
      job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Technician submits repair details & marks COMPLETED (triggers encrypted OTP generation)
 * @route   POST /api/technician/jobs/:id/complete
 * @access  Protected (Technician)
 */
const completeJob = async (req, res, next) => {
  try {
    const { diagnosis, repairNotes, partsUsed, laborCost, finalRepairCost } = req.body;

    if (!diagnosis || finalRepairCost === undefined || finalRepairCost === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide diagnosis and final repair cost.'
      });
    }

    const job = await ServiceRequest.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    if (!job.assignedTechnician || job.assignedTechnician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this job.'
      });
    }

    // Generate random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpEncrypted = encryptOtp(rawOtp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins

    const prevStatus = job.status;
    job.status = 'COMPLETED';
    job.completionDetails = {
      diagnosis: diagnosis.trim(),
      repairNotes: repairNotes ? repairNotes.trim() : '',
      partsUsed: Array.isArray(partsUsed) ? partsUsed : [],
      laborCost: Number(laborCost) || 0,
      finalRepairCost: Number(finalRepairCost),
      submittedAt: now
    };
    job.completionOtp = {
      otpEncrypted,
      generatedAt: now,
      expiresAt,
      attemptsCount: 0,
      verifiedAt: null
    };

    job.statusHistory.push({
      fromStatus: prevStatus,
      toStatus: 'COMPLETED',
      changedBy: req.user._id,
      technician: req.user._id,
      changedAt: now,
      note: 'Technician completed repair work and submitted details. Completion OTP generated for customer.'
    });

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Repair completed successfully. Customer has been issued the completion OTP.',
      status: job.status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedJobs,
  getJobById,
  acceptJob,
  updateJobStatus,
  completeJob
};
