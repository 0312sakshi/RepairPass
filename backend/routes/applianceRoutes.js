const express = require('express');
const router = express.Router();
const {
  getMyAppliances,
  createAppliance,
  getApplianceById,
  getApplianceHistory
} = require('../controllers/applianceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('customer'), getMyAppliances);
router.post('/', protect, authorize('customer'), createAppliance);
router.get('/:id', protect, authorize('customer', 'admin'), getApplianceById);
router.get('/:id/history', protect, authorize('customer', 'admin'), getApplianceHistory);

module.exports = router;
