import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function RequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OTP state
  const [activeOtp, setActiveOtp] = useState(null);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpError, setOtpError] = useState('');

  const loadRequest = async () => {
    try {
      setLoading(true);
      const res = await api.getRequestById(id);
      if (res.success && res.request) {
        setRequest(res.request);
      }
    } catch (err) {
      setError(err.message || 'Failed to load request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  // Retrieve customer OTP
  const handleFetchOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const res = await api.getCompletionOtp(id);
      if (res.success && res.otp) {
        setActiveOtp(res.otp);
        setOtpExpiry(res.expiresAt);
      }
    } catch (err) {
      setOtpError(err.message || 'Could not retrieve OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Customer verifies OTP and closes ticket
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setOtpError('Please enter the 6-digit OTP.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const res = await api.verifyCompletion(id, otpInput.trim());
      if (res.success) {
        setOtpMessage('Service verified successfully! Ticket is now CLOSED and permanently recorded in appliance history.');
        setActiveOtp(null);
        setOtpInput('');
        // Reload request to show CLOSED status
        await loadRequest();
      }
    } catch (err) {
      setOtpError(err.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Customer regenerates OTP
  const handleRegenerateOtp = async () => {
    setRegenerating(true);
    setOtpError('');
    setOtpMessage('');
    try {
      const res = await api.regenerateOtp(id);
      if (res.success) {
        setOtpMessage('New completion OTP generated. Click "View Completion OTP" to retrieve it.');
        setActiveOtp(null);
      }
    } catch (err) {
      setOtpError(err.message || 'Failed to regenerate OTP.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <main className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p>Loading ticket details...</p>
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="container" style={{ padding: '60px 0' }}>
        <div className="alert alert-error">{error || 'Service ticket not found.'}</div>
        <Link className="button" to="/customer/requests">
          Back to Service Requests
        </Link>
      </main>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span className="green-status">Closed & Recorded</span>;
      case 'COMPLETED':
        return <span className="yellow-status">Completed (Awaiting Customer OTP)</span>;
      case 'IN_PROGRESS':
        return <span className="blue-status">In Repair</span>;
      case 'REJECTED':
        return <span className="red-status">Technician Rejected</span>;
      case 'CANCELLED':
        return <span className="red-status">Cancelled</span>;
      default:
        return <span className="blue-status">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p className="small-heading">Service Ticket</p>
            <h1>Request {request.requestNumber}</h1>
          </div>
          <div>{getStatusBadge(request.status)}</div>
        </div>

        {/* Basic Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', margin: '20px 0' }}>
          <div>
            <p>
              <b>Appliance:</b> {request.appliance?.brand} {request.appliance?.category}
            </p>
            <p>
              <b>Model:</b> {request.appliance?.modelNumber || 'Not specified'}
            </p>
            <p>
              <b>Passport:</b>{' '}
              <Link to={`/customer/appliances/${request.appliance?._id}/passport`}>
                View Digital Passport
              </Link>
            </p>
          </div>
          <div>
            <p>
              <b>Scheduled Date:</b> {new Date(request.preferredDate).toLocaleDateString()}
            </p>
            <p>
              <b>Preferred Slot:</b> {request.preferredTimeSlot}
            </p>
            <p>
              <b>Contact Phone:</b> {request.contactPhone}
            </p>
          </div>
          <div>
            <p>
              <b>Technician:</b> {request.assignedTechnician?.name || <span style={{ color: '#64748b' }}>Pending Assignment</span>}
            </p>
            {request.assignedTechnician?.phone && (
              <p>
                <b>Phone:</b> {request.assignedTechnician.phone}
              </p>
            )}
            <p>
              <b>Created:</b> {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '25px' }}>
          <p style={{ margin: 0 }}>
            <b>Reported Issue:</b> {request.problemDescription}
          </p>
        </div>

        {/* COMPLETION & OTP VERIFICATION SECTION (When status === 'COMPLETED') */}
        {request.status === 'COMPLETED' && (
          <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '8px', padding: '24px', margin: '30px 0' }}>
            <h3 style={{ color: '#92400e', marginTop: 0 }}>
              Technician Completed Repair — Confirm with OTP
            </h3>
            <p style={{ color: '#78350f' }}>
              The technician has performed the repair and submitted the following job details. Please review the diagnosis and billing details below, then enter your completion OTP to confirm and close the request.
            </p>

            {/* Repair Details Submitted by Technician */}
            <div style={{ background: 'white', padding: '16px', borderRadius: '6px', margin: '15px 0', border: '1px solid #fef3c7' }}>
              <p>
                <b>Diagnosis:</b> {request.completionDetails?.diagnosis || 'Diagnosis provided by technician'}
              </p>
              {request.completionDetails?.repairNotes && (
                <p>
                  <b>Technician Notes:</b> {request.completionDetails.repairNotes}
                </p>
              )}

              {request.completionDetails?.partsUsed && request.completionDetails.partsUsed.length > 0 && (
                <div style={{ margin: '10px 0' }}>
                  <b>Parts Replaced:</b>
                  <ul style={{ margin: '6px 0 0 16px', fontSize: '13px' }}>
                    {request.completionDetails.partsUsed.map((p, idx) => (
                      <li key={idx}>
                        {p.partName} — Qty: {p.quantity} (₹{p.unitCost} each)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p style={{ fontSize: '18px', margin: '12px 0 0 0', color: '#1e3a8a' }}>
                <b>Final Repair Charge:</b> ₹{request.completionDetails?.finalRepairCost || 0}
              </p>
            </div>

            {/* OTP Alerts */}
            {otpMessage && <div className="alert alert-success">{otpMessage}</div>}
            {otpError && <div className="alert alert-error">{otpError}</div>}

            {/* OTP Retrieval */}
            {!activeOtp ? (
              <div style={{ marginTop: '15px' }}>
                <button
                  type="button"
                  className="button"
                  onClick={handleFetchOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? 'Retrieving Secure OTP...' : 'View Completion OTP'}
                </button>
                <button
                  type="button"
                  className="outline-button"
                  onClick={handleRegenerateOtp}
                  disabled={regenerating}
                  style={{ marginLeft: '12px' }}
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate Expired OTP'}
                </button>
              </div>
            ) : (
              <div className="otp-display-box">
                <p className="small-heading" style={{ color: '#1d4ed8' }}>
                  YOUR CONFIRMATION OTP
                </p>
                <div className="otp-number">{activeOtp}</div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Share this OTP with the technician, or enter it below to confirm that the appliance is working.
                  {otpExpiry && <span> Valid until {new Date(otpExpiry).toLocaleTimeString()}.</span>}
                </p>
                <button
                  type="button"
                  className="outline-button"
                  onClick={handleRegenerateOtp}
                  disabled={regenerating}
                  style={{ marginTop: '10px' }}
                >
                  {regenerating ? 'Regenerating...' : 'Generate New OTP'}
                </button>
              </div>
            )}

            {/* OTP Verification Form */}
            <form onSubmit={handleVerifyOtp} style={{ maxWidth: '400px', marginTop: '20px' }}>
              <label>Enter 6-Digit Completion OTP to Close Ticket</label>
              <input
                type="text"
                maxLength="6"
                placeholder="e.g. 582914"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                required
                style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }}
              />
              <button type="submit" disabled={verifying}>
                {verifying ? 'Verifying & Closing...' : 'Confirm Completion & Record in Passport'}
              </button>
            </form>
          </div>
        )}

        {/* CLOSED State Banner */}
        {request.status === 'CLOSED' && (
          <div className="alert alert-success" style={{ margin: '25px 0' }}>
            <h3>Service Ticket Closed & Permanently Verified</h3>
            <p>
              This repair has been verified with completion OTP. An immutable <strong>ServiceRecord</strong> has been generated in the appliance's digital passport.
            </p>
            <div style={{ marginTop: '12px' }}>
              <Link className="button" to={`/customer/appliances/${request.appliance?._id}/passport`}>
                View Appliance Passport & History
              </Link>
            </div>
          </div>
        )}

        {/* Status History Timeline */}
        <div style={{ borderTop: '1px solid #dbe2ea', paddingTop: '25px', marginTop: '30px' }}>
          <h3>Audit Trail & Status Timeline</h3>
          {request.statusHistory && request.statusHistory.length > 0 ? (
            <ul className="timeline-list">
              {request.statusHistory.map((step, idx) => (
                <li
                  key={idx}
                  className={`timeline-item ${idx === request.statusHistory.length - 1 ? 'active-step' : ''}`}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                    {step.toStatus.replace(/_/g, ' ')}
                  </div>
                  <div className="time">
                    {new Date(step.changedAt).toLocaleString()}
                  </div>
                  {step.note && <p style={{ margin: '4px 0', fontSize: '13px' }}>{step.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No status history recorded yet.</p>
          )}
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <Link className="outline-button" to="/customer/requests">
            Back to All Requests
          </Link>
        </div>
      </div>
    </main>
  );
}
