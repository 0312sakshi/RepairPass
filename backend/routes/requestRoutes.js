const express = require('express');
const router = express.Router();
const {
  createServiceRequest,
  technicianSubmitCompletion,
  getCustomerCompletionOtp,
  verifyCompletionAndClose,
  regenerateCompletionOtp,
  getMyServiceRequests,
  getServiceRequestById,
  getMyServiceRecords
} = require('../controllers/requestController');
const { protect, authorize, requireApprovedTechnician } = require('../middleware/auth');

// Customer requests listing & records
router.get('/', protect, authorize('customer'), getMyServiceRequests);
router.get('/records/my', protect, authorize('customer'), getMyServiceRecords);

// Customer creates request
router.post('/', protect, authorize('customer'), createServiceRequest);

// Technician completes repair details (moves to COMPLETED & generates OTP)
router.post(
  '/:id/technician-complete',
  protect,
  authorize('technician'),
  requireApprovedTechnician,
  technicianSubmitCompletion
);

// Customer views active OTP
router.get('/:id/completion-otp', protect, authorize('customer'), getCustomerCompletionOtp);

// Customer performs final verification -> closes request & creates ServiceRecord
router.post('/:id/verify-completion', protect, authorize('customer'), verifyCompletionAndClose);

// Customer regenerates OTP if expired or blocked
router.post('/:id/regenerate-otp', protect, authorize('customer'), regenerateCompletionOtp);

// Single request detail (Customer/Technician/Admin authorized in controller)
router.get('/:id', protect, authorize('customer', 'technician', 'admin'), getServiceRequestById);

module.exports = router;
