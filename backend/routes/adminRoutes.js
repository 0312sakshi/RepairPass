const express = require('express');
const router = express.Router();
const {
  getUsers,
  getTechnicians,
  getAllRequests,
  assignTechnician
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authenticated administrator
router.use(protect, authorize('admin'));

router.get('/users', getUsers);
router.get('/technicians', getTechnicians);
router.get('/requests', getAllRequests);
router.post('/requests/:id/assign', assignTechnician);

module.exports = router;
