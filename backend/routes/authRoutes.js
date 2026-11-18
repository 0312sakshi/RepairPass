const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  registerTechnician,
  login,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public endpoints
router.post('/register', registerCustomer);
router.post('/register-technician', registerTechnician);
router.post('/login', login);

// Protected endpoint (Requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;
