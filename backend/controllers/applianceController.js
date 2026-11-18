const Appliance = require('../models/Appliance');
const ServiceRecord = require('../models/ServiceRecord');

const VALID_CATEGORIES = [
  'Refrigerator',
  'Washing Machine',
  'Television',
  'Microwave',
  'Geyser',
  'Fan',
  'Cooler',
  'AC',
  'Ceiling Fan',
  'Table Fan',
  'Inverter',
  'Other'
];

/**
 * @desc    Get all registered appliances for the authenticated customer
 * @route   GET /api/appliances
 * @access  Protected (Customer)
 */
const getMyAppliances = async (req, res, next) => {
  try {
    const appliances = await Appliance.find({ customer: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: appliances.length,
      appliances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new household appliance
 * @route   POST /api/appliances
 * @access  Protected (Customer)
 */
const createAppliance = async (req, res, next) => {
  try {
    const {
      category,
      brand,
      modelNumber,
      serialNumber,
      purchaseDate,
      warrantyDurationMonths,
      documents
    } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an appliance category.'
      });
    }

    // Clean data according to schema rules
    const appliance = await Appliance.create({
      customer: req.user._id,
      category: category.trim(),
      brand: brand && brand.trim() ? brand.trim() : 'Unknown',
      modelNumber: modelNumber ? modelNumber.trim() : '',
      serialNumber: serialNumber ? serialNumber.trim() : '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      warrantyDurationMonths:
        warrantyDurationMonths !== undefined && warrantyDurationMonths !== null && warrantyDurationMonths !== ''
          ? Number(warrantyDurationMonths)
          : null,
      documents: Array.isArray(documents) ? documents : []
    });

    res.status(201).json({
      success: true,
      message: 'Appliance registered successfully.',
      appliance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single appliance details with calculated warranty
 * @route   GET /api/appliances/:id
 * @access  Protected (Customer)
 */
const getApplianceById = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.id);

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found.'
      });
    }

    // Verify ownership
    if (appliance.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this appliance.'
      });
    }

    res.status(200).json({
      success: true,
      appliance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete service history / Digital Passport for an appliance
 * @route   GET /api/appliances/:id/history
 * @access  Protected (Customer)
 */
const getApplianceHistory = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.id);

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found.'
      });
    }

    // Verify ownership
    if (appliance.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this appliance.'
      });
    }

    const records = await ServiceRecord.find({ appliance: appliance._id })
      .populate('technician', 'name phone')
      .populate('serviceRequest', 'requestNumber')
      .sort({ completionDate: -1 });

    res.status(200).json({
      success: true,
      appliance: {
        _id: appliance._id,
        category: appliance.category,
        brand: appliance.brand,
        modelNumber: appliance.modelNumber,
        serialNumber: appliance.serialNumber,
        purchaseDate: appliance.purchaseDate,
        warrantyDetails: appliance.warrantyDetails
      },
      count: records.length,
      records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  VALID_CATEGORIES,
  getMyAppliances,
  createAppliance,
  getApplianceById,
  getApplianceHistory
};
