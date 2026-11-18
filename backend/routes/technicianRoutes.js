const express = require('express');
const router = express.Router();
const {
  getAssignedJobs,
  getJobById,
  acceptJob,
  updateJobStatus,
  completeJob
} = require('../controllers/technicianController');
const { protect, authorize, requireApprovedTechnician } = require('../middleware/auth');

// All technician routes require authenticated technician
router.use(protect, authorize('technician'), requireApprovedTechnician);

router.get('/jobs', getAssignedJobs);
router.get('/jobs/:id', getJobById);
router.post('/jobs/:id/accept', acceptJob);
router.post('/jobs/:id/status', updateJobStatus);
router.post('/jobs/:id/complete', completeJob);

module.exports = router;
