const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach authenticated user to request
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: User no longer exists.'
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended: Please contact system administration.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Token is invalid or has expired.'
    });
  }
};

// Enforce role-based access control (e.g. authorize('admin'), authorize('customer', 'admin'))
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this route.`
      });
    }
    next();
  };
};

// Technician verification gate
const requireApprovedTechnician = (req, res, next) => {
  if (!req.user || req.user.role !== 'technician') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Technician account required.'
    });
  }

  if (req.user.technicianVerificationStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: 'Technician verification is pending administrator review.'
    });
  }

  if (req.user.accountStatus === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Technician account is suspended.'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireApprovedTechnician
};
