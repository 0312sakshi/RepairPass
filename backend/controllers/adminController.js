const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceRecord = require('../models/ServiceRecord');

/**
 * @desc    Get all registered users (Customers and Technicians)
 * @route   GET /api/admin/users
 * @access  Protected (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ['customer', 'technician'] } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all technicians for assignment dropdowns
 * @route   GET /api/admin/technicians
 * @access  Protected (Admin)
 */
const getTechnicians = async (req, res, next) => {
  try {
    const technicians = await User.find({ role: 'technician', accountStatus: 'active' })
      .select('name email phone city role')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: technicians.length,
      technicians
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all service requests across the system
 * @route   GET /api/admin/requests
 * @access  Protected (Admin)
 */
const getAllRequests = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find()
      .populate('customer', 'name email phone city')
      .populate('appliance', 'category brand modelNumber serialNumber')
      .populate('assignedTechnician', 'name email phone')
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
 * @desc    Assign an approved technician to a service request
 * @route   POST /api/admin/requests/:id/assign
 * @access  Protected (Admin)
 */
const assignTechnician = async (req, res, next) => {
  try {
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a technician ID for assignment.'
      });
    }

    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== 'technician') {
      return res.status(404).json({
        success: false,
        message: 'Technician not found or invalid role.'
      });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.'
      });
    }

    const prevStatus = request.status;
    request.assignedTechnician = technician._id;
    request.status = 'ASSIGNED';
    request.statusHistory.push({
      fromStatus: prevStatus,
      toStatus: 'ASSIGNED',
      changedBy: req.user._id,
      technician: technician._id,
      changedAt: new Date(),
      note: `Administrator assigned job to technician ${technician.name}.`
    });

    await request.save();

    res.status(200).json({
      success: true,
      message: `Technician ${technician.name} successfully assigned to request ${request.requestNumber}.`,
      request
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getTechnicians,
  getAllRequests,
  assignTechnician
};
