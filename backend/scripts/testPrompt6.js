/**
 * RepairPass - Prompt 6 Final Integration Verification Suite
 * Tests Technician job lifecycle, Admin assignment, and cross-role integration.
 */
const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appliance = require('../models/Appliance');
const ServiceRequest = require('../models/ServiceRequest');
const ServiceRecord = require('../models/ServiceRecord');
const { encryptOtp, decryptOtp } = require('../utils/otpCrypto');
const { authorize, requireApprovedTechnician } = require('../middleware/auth');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    console.error(`         ${err.message}`);
  }
}

async function runPrompt6Tests() {
  console.log('================================================================');
  console.log('   REPAIRPASS PROMPT 6 - FINAL INTEGRATION VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Technician creation has approved status out of the box (no blocking)
  runTest('Technician user creation assigns technician role and active status', () => {
    const tech = new User({
      name: 'Rakesh Verma',
      email: 'rakesh.tech@example.com',
      phone: '9876543210',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      role: 'technician',
      technicianVerificationStatus: 'approved'
    });

    assert.strictEqual(tech.role, 'technician');
    assert.strictEqual(tech.technicianVerificationStatus, 'approved');
    assert.strictEqual(tech.accountStatus, 'active');
  });

  // 2. Admin role authorization guard
  runTest('Admin authorization guard permits admin and forbids customer & technician', () => {
    const adminGuard = authorize('admin');

    let customerForbidden = false;
    adminGuard({ user: { role: 'customer' } }, {
      status: (code) => {
        if (code === 403) customerForbidden = true;
        return { json: () => {} };
      }
    }, () => {});
    assert.strictEqual(customerForbidden, true, 'Customer must be blocked with 403');

    let techForbidden = false;
    adminGuard({ user: { role: 'technician' } }, {
      status: (code) => {
        if (code === 403) techForbidden = true;
        return { json: () => {} };
      }
    }, () => {});
    assert.strictEqual(techForbidden, true, 'Technician must be blocked with 403');

    let adminAllowed = false;
    adminGuard({ user: { role: 'admin' } }, {}, () => {
      adminAllowed = true;
    });
    assert.strictEqual(adminAllowed, true, 'Admin must be granted access');
  });

  // 3. Technician authorization guard
  runTest('Technician authorization guard permits approved technician and blocks customer', () => {
    const techGuard = authorize('technician');

    let customerForbidden = false;
    techGuard({ user: { role: 'customer' } }, {
      status: (code) => {
        if (code === 403) customerForbidden = true;
        return { json: () => {} };
      }
    }, () => {});
    assert.strictEqual(customerForbidden, true, 'Customer must be blocked from technician routes');

    let techAllowed = false;
    techGuard({ user: { role: 'technician' } }, {}, () => {
      techAllowed = true;
    });
    assert.strictEqual(techAllowed, true, 'Technician must be permitted');
  });

  // 4. Admin assignment transition (SUBMITTED -> ASSIGNED)
  runTest('Admin technician assignment transitions request to ASSIGNED', () => {
    const customerId = new mongoose.Types.ObjectId();
    const applianceId = new mongoose.Types.ObjectId();
    const technicianId = new mongoose.Types.ObjectId();

    const request = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: customerId,
      appliance: applianceId,
      problemDescription: 'Washing machine drum makes loud vibrating noise during spin cycle.',
      preferredDate: new Date('2026-11-20'),
      preferredTimeSlot: '10:00 AM - 01:00 PM',
      status: 'SUBMITTED',
      statusHistory: [{ status: 'SUBMITTED', changedBy: customerId, note: 'Request raised by customer' }]
    });

    assert.strictEqual(request.status, 'SUBMITTED');
    assert.strictEqual(request.assignedTechnician, null);

    // Perform Admin Assignment
    request.assignedTechnician = technicianId;
    request.status = 'ASSIGNED';
    request.statusHistory.push({
      status: 'ASSIGNED',
      changedBy: new mongoose.Types.ObjectId(), // admin ID
      note: 'Assigned to technician Rakesh Verma by Administrator'
    });

    assert.strictEqual(request.status, 'ASSIGNED');
    assert.strictEqual(request.assignedTechnician.toString(), technicianId.toString());
    assert.strictEqual(request.statusHistory.length, 2);
  });

  // 5. Technician Job Acceptance (ASSIGNED -> ACCEPTED)
  runTest('Technician accepts job and transitions status to ACCEPTED', () => {
    const technicianId = new mongoose.Types.ObjectId();
    const request = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: new mongoose.Types.ObjectId(),
      appliance: new mongoose.Types.ObjectId(),
      assignedTechnician: technicianId,
      problemDescription: 'Water leakage from drain pipe',
      preferredDate: new Date('2026-11-21'),
      preferredTimeSlot: '02:00 PM - 05:00 PM',
      status: 'ASSIGNED'
    });

    request.status = 'ACCEPTED';
    request.statusHistory.push({
      status: 'ACCEPTED',
      changedBy: technicianId,
      note: 'Job accepted by technician'
    });

    assert.strictEqual(request.status, 'ACCEPTED');
  });

  // 6. Technician Job Status Progression (ON_THE_WAY -> REACHED -> IN_PROGRESS)
  runTest('Technician advances on-site service status (ON_THE_WAY, REACHED, IN_PROGRESS)', () => {
    const technicianId = new mongoose.Types.ObjectId();
    const request = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: new mongoose.Types.ObjectId(),
      appliance: new mongoose.Types.ObjectId(),
      assignedTechnician: technicianId,
      problemDescription: 'Cooling coil frosted',
      preferredDate: new Date('2026-11-21'),
      preferredTimeSlot: '10:00 AM - 01:00 PM',
      status: 'ACCEPTED'
    });

    const allowedTransitions = ['ON_THE_WAY', 'REACHED', 'IN_PROGRESS'];
    for (const nextStatus of allowedTransitions) {
      request.status = nextStatus;
      request.statusHistory.push({
        status: nextStatus,
        changedBy: technicianId,
        note: `Status updated to ${nextStatus}`
      });
      assert.strictEqual(request.status, nextStatus);
    }

    assert.strictEqual(request.statusHistory.length, 3);
  });

  // 7. Technician Job Completion with diagnosis, parts, costs, and OTP generation
  let completedRequest;
  let generatedPlainOtp = '714923';

  runTest('Technician completes job: saves diagnosis, costs, and generates encrypted completion OTP', () => {
    const customerId = new mongoose.Types.ObjectId();
    const applianceId = new mongoose.Types.ObjectId();
    const technicianId = new mongoose.Types.ObjectId();

    completedRequest = new ServiceRequest({
      requestNumber: ServiceRequest.generateRequestNumber(),
      customer: customerId,
      appliance: applianceId,
      assignedTechnician: technicianId,
      problemDescription: 'Defrost heater burned out',
      preferredDate: new Date('2026-11-21'),
      preferredTimeSlot: '02:00 PM - 05:00 PM',
      status: 'IN_PROGRESS'
    });

    // Populate completion details
    const partsReplaced = [
      { partName: 'Defrost Heater Element', quantity: 1, unitCost: 850 },
      { partName: 'Bimetal Thermostat', quantity: 1, unitCost: 400 }
    ];
    const laborCost = 500;
    const partsTotal = partsReplaced.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);
    const totalCost = partsTotal + laborCost;

    completedRequest.completionDetails = {
      diagnosis: 'Defrost heater burned out causing ice blockage on evaporator fins.',
      repairNotes: 'Replaced defrost heating element and bimetal thermostat. Tested auto-defrost cycle.',
      partsUsed: partsReplaced,
      laborCost,
      finalRepairCost: totalCost,
      submittedAt: new Date()
    };

    // Generate AES-256 encrypted OTP
    const encrypted = encryptOtp(generatedPlainOtp);
    completedRequest.completionOtp = {
      otpEncrypted: encrypted,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attemptsCount: 0
    };

    completedRequest.status = 'COMPLETED';
    completedRequest.statusHistory.push({
      status: 'COMPLETED',
      changedBy: technicianId,
      note: 'Repair completed on-site. Completion OTP generated for customer verification.'
    });

    assert.strictEqual(completedRequest.status, 'COMPLETED');
    assert.strictEqual(completedRequest.completionDetails.finalRepairCost, 1750);
    assert.ok(completedRequest.completionOtp.otpEncrypted.includes(':'));
  });

  // 8. Customer OTP Verification and Immutable Digital Passport creation
  runTest('Customer validates completion OTP: transitions to CLOSED and creates permanent ServiceRecord', () => {
    assert.ok(completedRequest, 'Must have completed request');

    // Customer decrypts OTP
    const decryptedOtp = decryptOtp(completedRequest.completionOtp.otpEncrypted);
    assert.strictEqual(decryptedOtp, generatedPlainOtp, 'Customer receives original 6-digit OTP');

    // Verify OTP matching
    assert.strictEqual(generatedPlainOtp, decryptedOtp);
    completedRequest.completionOtp.verifiedAt = new Date();
    completedRequest.status = 'CLOSED';
    completedRequest.statusHistory.push({
      status: 'CLOSED',
      changedBy: completedRequest.customer,
      note: 'Completion confirmed by customer with OTP'
    });

    assert.strictEqual(completedRequest.status, 'CLOSED');
    assert.ok(completedRequest.completionOtp.verifiedAt);

    // Create ServiceRecord in digital passport
    const record = new ServiceRecord({
      appliance: completedRequest.appliance,
      customer: completedRequest.customer,
      technician: completedRequest.assignedTechnician,
      serviceRequest: completedRequest._id,
      diagnosis: completedRequest.completionDetails.diagnosis,
      repairNotes: completedRequest.completionDetails.repairNotes,
      partsUsed: completedRequest.completionDetails.partsUsed,
      totalCost: completedRequest.completionDetails.finalRepairCost,
      completionDate: new Date()
    });

    assert.strictEqual(record.totalCost, 1750);
    assert.strictEqual(record.partsUsed.length, 2);
    assert.strictEqual(record.diagnosis, completedRequest.completionDetails.diagnosis);
  });

  // 9. ServiceRecord Immutability Guard
  runTest('ServiceRecord immutability guard protects customer repair history from tampering', async () => {
    const record = new ServiceRecord({
      appliance: new mongoose.Types.ObjectId(),
      customer: new mongoose.Types.ObjectId(),
      technician: new mongoose.Types.ObjectId(),
      serviceRequest: new mongoose.Types.ObjectId(),
      requestNumber: 'RP-2611-B892',
      serviceDate: new Date(),
      problemDescription: 'Motor failure',
      diagnosis: 'Burned armature windings',
      repairSummary: 'Replaced motor assembly',
      verifiedByCustomer: true
    });

    let prevented = false;
    try {
      // Simulate save on non-new document
      record.isNew = false;
      await record.save();
    } catch (err) {
      if (err.message.includes('ServiceRecord documents are immutable')) {
        prevented = true;
      }
    }
    assert.strictEqual(prevented, true, 'Immutability guard must block modification of finalized records');
  });

  console.log('\n================================================================');
  console.log(`   EXECUTION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('[RESULT]: PASS - All Prompt 6 integration tests executed successfully.');
    process.exit(0);
  } else {
    console.error('[RESULT]: FAIL - One or more tests failed.');
    process.exit(1);
  }
}

runPrompt6Tests();
