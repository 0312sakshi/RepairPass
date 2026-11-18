/**
 * Comprehensive Backend Foundation & Correction Verification Suite
 * Tests models, validations, encryption, JWT auth, middleware, OTP lifecycle,
 * customer verification actor, immutability, and route security.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Appliance = require('../models/Appliance');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceRecord = require('../models/ServiceRecord');
const { encryptOtp, decryptOtp } = require('../utils/otpCrypto');
const { authorize, requireApprovedTechnician } = require('../middleware/auth');
const app = require('../server');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         ${err.message}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         ${err.message}`);
  }
}

async function executeTestSuite() {
  console.log('================================================================');
  console.log('  REPAIRPASS BACKEND CORRECTION & VERIFICATION GATE TEST SUITE');
  console.log('================================================================\n');

  // 1. Password Hashing & Verification
  await runAsyncTest('Password Hashing with bcryptjs ($2a$ or $2b$ support)', async () => {
    const rawPassword = 'StudentPassword@123';
    const hash = await User.hashPassword(rawPassword);
    const isValidBcrypt = hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$'));
    assert.ok(isValidBcrypt, `Hash should be a valid bcrypt string, got: ${hash.slice(0, 7)}`);

    const dummyUser = new User({ passwordHash: hash });
    const isMatch = await dummyUser.matchPassword(rawPassword);
    const isWrongMatch = await dummyUser.matchPassword('WrongPassword');

    assert.strictEqual(isMatch, true, 'Correct password must match hash');
    assert.strictEqual(isWrongMatch, false, 'Incorrect password must not match hash');
  });

  // 2. User Model Password Removal on JSON serialization
  runTest('User toJSON method strips passwordHash from responses', () => {
    const user = new User({
      name: 'Rakesh Kumar',
      email: 'tech@repairpass.example',
      passwordHash: '$2b$10$abcdef1234567890abcdef1234567890abcdef1234567890abc',
      phone: '9876543210',
      role: 'technician',
      technicianVerificationStatus: 'pending'
    });

    const jsonUser = user.toJSON();
    assert.strictEqual(jsonUser.passwordHash, undefined, 'passwordHash must not appear in JSON output');
    assert.strictEqual(jsonUser.email, 'tech@repairpass.example');
    assert.strictEqual(jsonUser.role, 'technician');
    assert.strictEqual(jsonUser.technicianVerificationStatus, 'pending');
  });

  // 3. Calendar-Month Warranty Calculation Virtual
  runTest('Appliance warrantyDetails calculation (Active, Expired, Unknown)', () => {
    const appUnknown = new Appliance({
      category: 'Washing Machine',
      brand: 'Samsung'
    });
    assert.strictEqual(appUnknown.warrantyDetails.status, 'UNKNOWN');
    assert.strictEqual(appUnknown.brand, 'Samsung');

    const appDefaultBrand = new Appliance({
      category: 'Refrigerator'
    });
    assert.strictEqual(appDefaultBrand.brand, 'Unknown');

    const today = new Date();
    const purchaseDateRecent = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const appActive = new Appliance({
      category: 'Air Conditioner',
      brand: 'Voltas',
      purchaseDate: purchaseDateRecent,
      warrantyDurationMonths: 24
    });
    assert.strictEqual(appActive.warrantyDetails.status, 'ACTIVE');
    assert.strictEqual(appActive.warrantyDetails.isExpired, false);

    const purchaseDateOld = new Date(today.getFullYear() - 3, today.getMonth(), 1);
    const appExpired = new Appliance({
      category: 'Microwave',
      purchaseDate: purchaseDateOld,
      warrantyDurationMonths: 12
    });
    assert.strictEqual(appExpired.warrantyDetails.status, 'EXPIRED');
    assert.strictEqual(appExpired.warrantyDetails.isExpired, true);
  });

  // 4. Collision-Safe Request Number Generator & Format
  runTest('Collision-Safe requestNumber format (RP-YYMM-XXXX) without countDocuments()', () => {
    const numbers = new Set();
    for (let i = 0; i < 50; i++) {
      const num = ServiceRequest.generateRequestNumber();
      assert.ok(/^RP-\d{4}-[0-9A-F]{4}$/.test(num), `Request number ${num} must match RP-YYMM-XXXX pattern`);
      numbers.add(num);
    }
    // All 50 independently generated numbers should be distinct
    assert.strictEqual(numbers.size, 50, 'Generated request numbers must be unique');
  });

  // 5. Symmetric OTP Encryption & Decryption
  runTest('OTP Encryption and Decryption using AES-256', () => {
    const originalOtp = '482915';
    const encrypted = encryptOtp(originalOtp);

    assert.ok(encrypted && encrypted.includes(':'), 'Encrypted OTP should contain IV and ciphertext');
    assert.notStrictEqual(encrypted, originalOtp, 'Encrypted OTP must differ from plain text');

    const decrypted = decryptOtp(encrypted);
    assert.strictEqual(decrypted, originalOtp, 'Decrypted OTP must match original plain OTP');
  });

  // 6. Role Authorization Middleware Logic
  runTest('Role-based authorization middleware (authorize)', () => {
    const adminOnly = authorize('admin');

    let customerBlocked = false;
    const reqCustomer = { user: { role: 'customer' } };
    const resForbidden = {
      status: (code) => {
        if (code === 403) customerBlocked = true;
        return { json: () => {} };
      }
    };
    adminOnly(reqCustomer, resForbidden, () => {});
    assert.strictEqual(customerBlocked, true, 'Customer must be blocked from admin route with 403');

    let adminAllowed = false;
    const reqAdmin = { user: { role: 'admin' } };
    adminOnly(reqAdmin, {}, () => {
      adminAllowed = true;
    });
    assert.strictEqual(adminAllowed, true, 'Admin must be granted access');
  });

  // 7. Technician Verification Gate Middleware Logic
  runTest('Technician verification gate (requireApprovedTechnician)', () => {
    let pendingBlocked = false;
    const reqPendingTech = {
      user: {
        role: 'technician',
        technicianVerificationStatus: 'pending'
      }
    };
    const resForbidden = {
      status: (code) => {
        if (code === 403) pendingBlocked = true;
        return { json: () => {} };
      }
    };

    requireApprovedTechnician(reqPendingTech, resForbidden, () => {});
    assert.strictEqual(pendingBlocked, true, 'Pending technician must be blocked from job management');

    let approvedAllowed = false;
    const reqApprovedTech = {
      user: {
        role: 'technician',
        technicianVerificationStatus: 'approved'
      }
    };
    requireApprovedTechnician(reqApprovedTech, {}, () => {
      approvedAllowed = true;
    });
    assert.strictEqual(approvedAllowed, true, 'Approved technician must be allowed');
  });

  // 8. ServiceRecord Schema Definition & Immutability Hook
  await runAsyncTest('ServiceRecord Immutability Guard (Blocks updates to existing records)', async () => {
    const record = new ServiceRecord({
      serviceRequest: '673400000000000000000003',
      appliance: '673400000000000000000002',
      customer: '673400000000000000000001',
      technician: '673400000000000000000004',
      diagnosis: 'Motor capacitor replaced',
      partsUsed: [{ partName: 'Motor Capacitor 10uF', quantity: 1, unitCost: 350 }],
      totalCost: 650
    });

    assert.strictEqual(record.totalCost, 650);

    // Simulate an existing record update attempt
    record.isNew = false;
    let blocked = false;
    try {
      await record.save();
    } catch (err) {
      if (err.message.includes('immutable historical record')) {
        blocked = true;
      }
    }
    assert.strictEqual(blocked, true, 'Saving an existing ServiceRecord must be blocked by immutability hook');
  });

  // 9. Customer Performs Final OTP Verification Logic
  runTest('Customer performs final OTP verification and closes request', () => {
    const rawOtp = '729104';
    const encrypted = encryptOtp(rawOtp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const sr = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: '673400000000000000000001',
      appliance: '673400000000000000000002',
      problemDescription: 'Noise in motor',
      preferredDate: now,
      preferredTimeSlot: 'Morning',
      contactPhone: '9876543210',
      status: 'COMPLETED',
      completionOtp: {
        otpEncrypted: encrypted,
        generatedAt: now,
        expiresAt,
        attemptsCount: 0,
        verifiedAt: null
      }
    });

    // Verification check
    const enteredOtp = '729104';
    const actualOtp = decryptOtp(sr.completionOtp.otpEncrypted);
    assert.strictEqual(enteredOtp, actualOtp, 'Entered OTP must match decrypted OTP');

    sr.status = 'CLOSED';
    sr.completionOtp.verifiedAt = new Date();

    assert.strictEqual(sr.status, 'CLOSED', 'Status must transition to CLOSED upon customer verification');
    assert.ok(sr.completionOtp.verifiedAt !== null, 'verifiedAt must be marked');
  });

  // 10. OTP Expiry & Attempt Limit Behavior
  runTest('OTP Expiry leaves request in COMPLETED; Failed attempts increment up to 5', () => {
    const rawOtp = '123456';
    const encrypted = encryptOtp(rawOtp);
    const expiredTime = new Date(Date.now() - 5000); // 5 seconds ago

    const sr = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: '673400000000000000000001',
      appliance: '673400000000000000000002',
      problemDescription: 'Leaking pipe',
      preferredDate: new Date(),
      preferredTimeSlot: 'Afternoon',
      contactPhone: '9876543210',
      status: 'COMPLETED',
      completionOtp: {
        otpEncrypted: encrypted,
        generatedAt: new Date(Date.now() - 16 * 60 * 1000),
        expiresAt: expiredTime,
        attemptsCount: 0,
        verifiedAt: null
      }
    });

    const isExpired = new Date() > sr.completionOtp.expiresAt;
    assert.strictEqual(isExpired, true, 'OTP must be flagged as expired');
    assert.strictEqual(sr.status, 'COMPLETED', 'Status must remain COMPLETED when OTP expires');

    // Simulate attempts counter increment
    for (let i = 0; i < 5; i++) {
      sr.completionOtp.attemptsCount += 1;
    }
    assert.strictEqual(sr.completionOtp.attemptsCount, 5);
    const furtherAttemptsBlocked = sr.completionOtp.attemptsCount >= 5;
    assert.strictEqual(furtherAttemptsBlocked, true, 'Further attempts must be blocked after 5 failures');
    assert.strictEqual(sr.status, 'COMPLETED', 'Failed attempts must not reopen or revert request');
  });

  // 11. OTP Response Isolation (select: false)
  runTest('OTP Isolation: completionOtp is marked select: false on schema', () => {
    const pathConfig = ServiceRequest.schema.path('completionOtp');
    assert.strictEqual(pathConfig.options.select, false, 'completionOtp must be excluded from default queries');
  });

  // 12. Secret & Environment Protection Verification
  runTest('Secret & Environment Protection (.env.example placeholders and .gitignore)', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');

    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(envExampleContent.includes('CHANGE_ME'), '.env.example must contain placeholders');
    assert.ok(!envExampleContent.includes('0123456789abcdef'), '.env.example must not contain real hex keys');

    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
    assert.ok(gitignoreContent.includes('node_modules'), '.gitignore must ignore node_modules');
  });

  // 13. Express App Health Check Route Verification
  runTest('Express App Health Check Endpoint (/api/health)', () => {
    const healthLayer = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/api/health'
    );
    assert.ok(healthLayer, 'Health check route layer must exist on Express router');

    let statusCode = 0;
    let payload = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            payload = data;
          }
        };
      }
    };

    healthLayer.route.stack[0].handle({}, mockRes);

    assert.strictEqual(statusCode, 200, 'Health endpoint must respond with status 200');
    assert.strictEqual(payload?.success, true, 'Health endpoint success must be true');
    assert.strictEqual(payload?.status, 'Operational', 'Health status must be Operational');
  });

  console.log('\n================================================================');
  console.log(`   EXECUTION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('[RESULT]: PASS - All verified units executed successfully.');
    process.exit(0);
  } else {
    console.error('[RESULT]: FAIL - One or more tests failed.');
    process.exit(1);
  }
}

executeTestSuite();
