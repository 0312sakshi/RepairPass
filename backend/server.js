const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const applianceRoutes = require('./routes/applianceRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built React client in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

/**
 * Public Health Check Endpoint
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'RepairPass Appliance Service & Service History Management System',
    status: 'Operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Export app for test suites; start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[RepairPass Server]: Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[Health Check]: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
