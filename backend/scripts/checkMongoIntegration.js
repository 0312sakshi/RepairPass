const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const checkMongo = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/repairpass';
  console.log(`[Attempting MongoDB Connection]: ${uri} (timeout: 4000ms)`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log('[SUCCESS]: Connected to MongoDB!');

    // 1. Create test document
    const testEmail = `test_verification_${Date.now()}@repairpass.example`;
    const created = await User.create({
      name: 'Integration Test User',
      email: testEmail,
      passwordHash: '$2b$10$abcdef1234567890abcdef1234567890abcdef1234567890abc',
      phone: '9000000000',
      role: 'customer'
    });
    console.log(`[SUCCESS]: Document persisted with ID: ${created._id}`);

    // 2. Read test document
    const retrieved = await User.findById(created._id);
    if (!retrieved || retrieved.email !== testEmail) {
      throw new Error('Retrieved document did not match persisted data');
    }
    console.log('[SUCCESS]: Document retrieved and verified successfully.');

    // 3. Clean up test document
    await User.findByIdAndDelete(created._id);
    console.log('[SUCCESS]: Test document cleaned up from database.');

    await mongoose.disconnect();
    console.log('[RESULT]: MONGODB INTEGRATION VERIFICATION PASSED');
    process.exit(0);
  } catch (err) {
    console.log('[STATUS]: MongoDB integration verification: NOT COMPLETED');
    console.log(`Reason: ${err.message}`);
    process.exit(2);
  }
};

checkMongo();
