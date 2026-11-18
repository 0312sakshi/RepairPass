const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('[Error]: MONGODB_URI not specified in .env');
      process.exit(1);
    }

    console.log(`[Connecting to MongoDB]: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@repairpass.example';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@RepairPass2026';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log(`[Notice]: Administrator account already exists for ${adminEmail}. No change made.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const passwordHash = await User.hashPassword(adminPassword);

    const admin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      phone: adminPhone,
      city: 'Ghaziabad',
      role: 'admin',
      accountStatus: 'active'
    });

    console.log('========================================================');
    console.log('  INITIAL REPAIRPASS ADMINISTRATOR SEEDED SUCCESSFULLY');
    console.log('========================================================');
    console.log(`  Admin ID:    ${admin._id}`);
    console.log(`  Email:       ${admin.email}`);
    console.log(`  Role:        ${admin.role}`);
    console.log(`  Account:     ${admin.accountStatus}`);
    console.log('========================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Admin Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
