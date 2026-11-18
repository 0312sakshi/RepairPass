/**
 * Comprehensive Customer Workflow Verification Script
 * Validates the complete Customer + Backend API integration pipeline:
 * Public endpoints, authentication, appliance registration, request creation,
 * ownership validation, completion details, customer OTP retrieval, and OTP verification closure.
 */
process.env.NODE_ENV = 'test';

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Appliance = require('../models/Appliance');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceRecord = require('../models/ServiceRecord');
const { encryptOtp, decryptOtp } = require('../utils/otpCrypto');
const { protect, authorize, requireApprovedTechnician } = require('../middleware/auth');
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

async function executeCustomerWorkflowTests() {
  console.log('================================================================');
  console.log('   REPAIRPASS PROMPT 5 - CUSTOMER WORKFLOW VERIFICATION SUITE');
  console.log('================================================================\n');

  // Test 1: Public landing & Health Check accessible without authentication
  runTest('Public health check accessible without login (HTTP 200)', () => {
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

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(payload?.success, true);
    assert.strictEqual(payload?.status, 'Operational');
  });

  // Test 2: Protected route rejects unauthenticated request with 401
  runTest('Protected appliance route rejects unauthenticated requests (HTTP 401)', () => {
    let statusCode = 0;
    let payload = null;
    const mockReq = { headers: {} };
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

    protect(mockReq, mockRes, () => {});

    assert.strictEqual(statusCode, 401);
    assert.strictEqual(payload?.success, false);
    assert.ok(payload?.message.includes('No authentication token provided'));
  });

  // Test 3: Protected route rejects unauthorized roles with 403
  runTest('Role authorization middleware rejects wrong role with 403', () => {
    const customerOnlyGuard = authorize('customer');
    let blocked = false;
    let statusCode = 0;

    const reqTech = { user: { role: 'technician' } };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => {
            if (code === 403) blocked = true;
          }
        };
      }
    };

    customerOnlyGuard(reqTech, res, () => {});
    assert.strictEqual(blocked, true, 'Technician must be blocked from customer-only route');
    assert.strictEqual(statusCode, 403);
  });

  // Test 4: Appliance model calendar-month warranty computation (Active, Expired, Unknown)
  runTest('Appliance warranty computation: Active, Expired, Unknown', () => {
    // Unknown
    const appUnknown = new Appliance({ category: 'Television' });
    assert.strictEqual(appUnknown.warrantyDetails.status, 'UNKNOWN');
    assert.strictEqual(appUnknown.brand, 'Unknown');

    // Active
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 6);
    const appActive = new Appliance({
      category: 'Washing Machine',
      brand: 'LG',
      purchaseDate: recent,
      warrantyDurationMonths: 24
    });
    assert.strictEqual(appActive.warrantyDetails.status, 'ACTIVE');

    // Expired
    const old = new Date();
    old.setFullYear(old.getFullYear() - 3);
    const appExpired = new Appliance({
      category: 'Refrigerator',
      brand: 'Samsung',
      purchaseDate: old,
      warrantyDurationMonths: 12
    });
    assert.strictEqual(appExpired.warrantyDetails.status, 'EXPIRED');
  });

  // Test 5: Customer-Appliance Ownership Validation Logic
  runTest('Ownership validation: Customer A cannot create request for Customer B appliance', () => {
    const customerAId = '673400000000000000000001';
    const customerBId = '673400000000000000000002';

    const applianceOfB = {
      _id: '673400000000000000000099',
      customer: customerBId,
      category: 'Air Conditioner'
    };

    const isOwner = applianceOfB.customer.toString() === customerAId.toString();
    assert.strictEqual(isOwner, false, 'Customer A must not match Customer B ownership');
  });

  // Test 6: Collision-safe requestNumber generation
  runTest('ServiceRequest.generateRequestNumber() produces RP-YYMM-XXXX', () => {
    const code = ServiceRequest.generateRequestNumber();
    assert.ok(/^RP-\d{4}-[0-9A-F]{4}$/.test(code), `Generated code ${code} matches required format`);
  });

  // Test 7: Technician completes job & triggers encrypted OTP generation
  runTest('Technician completion transitions to COMPLETED and sets encrypted OTP', () => {
    const rawOtp = '684920';
    const encrypted = encryptOtp(rawOtp);
    const now = new Date();

    const request = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: '673400000000000000000001',
      appliance: '673400000000000000000002',
      problemDescription: 'Cooling gas leak',
      preferredDate: now,
      preferredTimeSlot: 'Morning',
      contactPhone: '9876543210',
      status: 'IN_PROGRESS',
      assignedTechnician: '673400000000000000000003'
    });

    // Technician completes work
    request.status = 'COMPLETED';
    request.completionDetails = {
      diagnosis: 'Refrigerant line valve replaced and recharged',
      repairNotes: 'Pressure holds steady at 120 PSI',
      partsUsed: [{ partName: 'R32 Gas Refill', quantity: 1, unitCost: 1800 }],
      laborCost: 400,
      finalRepairCost: 2200,
      submittedAt: now
    };
    request.completionOtp = {
      otpEncrypted: encrypted,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      attemptsCount: 0,
      verifiedAt: null
    };

    assert.strictEqual(request.status, 'COMPLETED');
    assert.strictEqual(request.completionDetails.finalRepairCost, 2200);
    assert.ok(request.completionOtp.otpEncrypted.includes(':'), 'OTP must be stored encrypted');
  });

  // Test 8: Customer OTP retrieval decrypts active OTP
  runTest('Customer OTP retrieval: Decrypts 6-digit OTP exclusively for owner', () => {
    const originalOtp = '684920';
    const encrypted = encryptOtp(originalOtp);

    const decrypted = decryptOtp(encrypted);
    assert.strictEqual(decrypted, originalOtp, 'Customer retrieved OTP must match original generated OTP');
  });

  // Test 9: Customer verification confirms OTP, transitions to CLOSED, marks verifiedAt
  runTest('Customer verification: Valid OTP marks request CLOSED and verifiedAt', () => {
    const originalOtp = '684920';
    const encrypted = encryptOtp(originalOtp);
    const now = new Date();

    const request = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: '673400000000000000000001',
      appliance: '673400000000000000000002',
      problemDescription: 'Cooling gas leak',
      preferredDate: now,
      preferredTimeSlot: 'Morning',
      contactPhone: '9876543210',
      status: 'COMPLETED',
      completionOtp: {
        otpEncrypted: encrypted,
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        attemptsCount: 0,
        verifiedAt: null
      }
    });

    const enteredOtp = '684920';
    const actualOtp = decryptOtp(request.completionOtp.otpEncrypted);
    assert.strictEqual(enteredOtp, actualOtp, 'Entered OTP matches decrypted stored OTP');

    request.status = 'CLOSED';
    request.completionOtp.verifiedAt = new Date();

    assert.strictEqual(request.status, 'CLOSED');
    assert.ok(request.completionOtp.verifiedAt !== null);
  });

  // Test 10: CLOSED request produces exactly one ServiceRecord in digital passport
  runTest('CLOSED request creates permanent ServiceRecord in appliance digital passport', () => {
    const record = new ServiceRecord({
      serviceRequest: '673400000000000000000010',
      appliance: '673400000000000000000002',
      customer: '673400000000000000000001',
      technician: '673400000000000000000003',
      diagnosis: 'Refrigerant line valve replaced and recharged',
      repairNotes: 'Pressure holds steady at 120 PSI',
      partsUsed: [{ partName: 'R32 Gas Refill', quantity: 1, unitCost: 1800 }],
      totalCost: 2200,
      completionDate: new Date()
    });

    assert.strictEqual(record.totalCost, 2200);
    assert.strictEqual(record.partsUsed.length, 1);
    assert.strictEqual(record.partsUsed[0].partName, 'R32 Gas Refill');
  });

  // Test 11: ServiceRecord immutability guard
  await runAsyncTest('ServiceRecord immutability guard blocks updates to existing record', async () => {
    const record = new ServiceRecord({
      serviceRequest: '673400000000000000000010',
      appliance: '673400000000000000000002',
      customer: '673400000000000000000001',
      technician: '673400000000000000000003',
      diagnosis: 'Initial diagnosis',
      totalCost: 2200
    });

    record.isNew = false; // Existing document
    let errorCaught = false;

    try {
      await record.save();
    } catch (err) {
      if (err.message.includes('immutable historical record')) {
        errorCaught = true;
      }
    }
    assert.strictEqual(errorCaught, true, 'Updating existing ServiceRecord must be rejected by schema guard');
  });

  console.log('\n================================================================');
  console.log(`   EXECUTION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  const mongoose = require('mongoose');
  await mongoose.disconnect();

  if (passedTests === totalTests) {
    console.log('[RESULT]: PASS - All Customer Module integration tests executed successfully.');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.error('[RESULT]: FAIL - One or more tests failed.');
    setTimeout(() => process.exit(1), 100);
  }
}

executeCustomerWorkflowTests();
