import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function TechnicianJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status progression state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Completion form state
  const [diagnosis, setDiagnosis] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [parts, setParts] = useState([]);
  const [laborCost, setLaborCost] = useState(300);
  const [completing, setCompleting] = useState(false);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTechnicianJobById(id);
      if (res.success && res.job) {
        setJob(res.job);
        if (res.job.completionDetails) {
          setDiagnosis(res.job.completionDetails.diagnosis || '');
          setRepairNotes(res.job.completionDetails.repairNotes || '');
          setParts(res.job.completionDetails.partsUsed || []);
          setLaborCost(res.job.completionDetails.laborCost || 300);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const handleStatusChange = async (newStatus, noteText) => {
    try {
      setUpdatingStatus(true);
      setError('');
      setSuccess('');
      const res = await api.updateJobStatus(id, newStatus, noteText);
      if (res.success) {
        setSuccess(`Status transitioned to ${newStatus.replace(/_/g, ' ')}.`);
        await loadJob();
      }
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddPart = () => {
    setParts([...parts, { partName: '', quantity: 1, unitCost: 0 }]);
  };

  const handlePartChange = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = field === 'partName' ? value : Number(value);
    setParts(updated);
  };

  const handleRemovePart = (index) => {
    setParts(parts.filter((_, idx) => idx !== index));
  };

  // Calculate live total cost
  const partsTotal = parts.reduce((sum, p) => sum + (Number(p.quantity) || 1) * (Number(p.unitCost) || 0), 0);
  const calculatedFinalCost = partsTotal + (Number(laborCost) || 0);

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setError('Please provide a diagnosis description.');
      return;
    }

    try {
      setCompleting(true);
      setError('');
      setSuccess('');

      const res = await api.completeJob(id, {
        diagnosis: diagnosis.trim(),
        repairNotes: repairNotes.trim(),
        partsUsed: parts.filter((p) => p.partName.trim()),
        laborCost: Number(laborCost) || 0,
        finalRepairCost: calculatedFinalCost
      });

      if (res.success) {
        setSuccess('Repair work submitted as COMPLETED! Completion OTP has been issued to the customer for verification.');
        await loadJob();
      }
    } catch (err) {
      setError(err.message || 'Failed to complete job.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <main className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p>Loading service job details...</p>
      </main>
    );
  }

  if (error && !job) {
    return (
      <main className="container" style={{ padding: '60px 0' }}>
        <div className="alert alert-error">{error}</div>
        <Link className="button" to="/technician/dashboard">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '35px 0' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p className="small-heading">Field Service Order</p>
            <h1>Job {job.requestNumber}</h1>
          </div>
          <div>
            <span className="blue-status" style={{ fontSize: '14px', padding: '6px 14px' }}>
              Current Status: {job.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {success && <div className="alert alert-success" style={{ marginTop: '15px' }}>{success}</div>}
        {error && <div className="alert alert-error" style={{ marginTop: '15px' }}>{error}</div>}

        {/* Customer & Appliance Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', margin: '25px 0' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <p className="small-heading">Customer Information</p>
            <p><b>Name:</b> {job.customer?.name}</p>
            <p><b>Contact Phone:</b> {job.contactPhone || job.customer?.phone}</p>
            <p><b>City:</b> {job.customer?.city || 'Not specified'}</p>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <p className="small-heading">Appliance Information</p>
            <p><b>Category:</b> {job.appliance?.category}</p>
            <p><b>Brand / Model:</b> {job.appliance?.brand} {job.appliance?.modelNumber ? `(${job.appliance.modelNumber})` : ''}</p>
            {job.appliance?.serialNumber && <p><b>Serial No:</b> {job.appliance.serialNumber}</p>}
            <p><b>Warranty:</b> {job.appliance?.warrantyDetails?.status || 'Unknown'}</p>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <p className="small-heading">Appointment Details</p>
            <p><b>Scheduled Date:</b> {new Date(job.preferredDate).toLocaleDateString()}</p>
            <p><b>Time Window:</b> {job.preferredTimeSlot}</p>
            <p><b>Created:</b> {new Date(job.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '6px', marginBottom: '25px' }}>
          <p style={{ margin: 0 }}>
            <b>Reported Issue by Homeowner:</b> {job.problemDescription}
          </p>
        </div>

        {/* Step-by-Step Status Progression Action Bar */}
        <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px', marginBottom: '30px' }}>
          <p className="small-heading">Status Lifecycle Progression</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {job.status === 'ASSIGNED' && (
              <button
                className="button"
                onClick={() => api.acceptJob(job._id).then(() => loadJob())}
                disabled={updatingStatus}
              >
                Accept Job
              </button>
            )}

            {job.status === 'ACCEPTED' && (
              <button
                className="button"
                onClick={() => handleStatusChange('ON_THE_WAY', 'Technician is en route to customer location.')}
                disabled={updatingStatus}
              >
                Mark "On The Way"
              </button>
            )}

            {job.status === 'ON_THE_WAY' && (
              <button
                className="button"
                onClick={() => handleStatusChange('REACHED', 'Technician arrived at doorstep.')}
                disabled={updatingStatus}
              >
                Mark "Reached Location"
              </button>
            )}

            {(job.status === 'REACHED' || job.status === 'ACCEPTED') && (
              <button
                className="button"
                onClick={() => handleStatusChange('IN_PROGRESS', 'Physical diagnosis and repair work started.')}
                disabled={updatingStatus}
              >
                Start Repair (In Progress)
              </button>
            )}

            {job.status === 'COMPLETED' && (
              <span className="yellow-status" style={{ fontSize: '13px', padding: '8px 14px' }}>
                Awaiting Customer OTP Verification
              </span>
            )}

            {job.status === 'CLOSED' && (
              <span className="green-status" style={{ fontSize: '13px', padding: '8px 14px' }}>
                Job Closed & Permanently Recorded
              </span>
            )}
          </div>
        </div>

        {/* REPAIR COMPLETION FORM (When IN_PROGRESS or REACHED) */}
        {['IN_PROGRESS', 'REACHED', 'COMPLETED'].includes(job.status) && (
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '25px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0 }}>Log Diagnostic Findings, Parts & Completion Details</h3>
            <p style={{ color: '#64748b' }}>
              Submitting completion details automatically transitions the ticket to <strong>COMPLETED</strong> and triggers a secure 6-digit verification OTP for the homeowner.
            </p>

            <form onSubmit={handleCompleteSubmit}>
              <label>Diagnosis Summary *</label>
              <textarea
                placeholder="Technical root cause (e.g. Broken drain pump impeller, motor capacitor failure, refrigerant leak at flare joint)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
                disabled={job.status === 'CLOSED'}
              ></textarea>

              <label>Repair Notes / Actions Taken (Optional)</label>
              <textarea
                placeholder="Details of repair performed (e.g. Replaced capacitor with 10uF 450V part, cleaned lint trap, verified motor spin cycle)"
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                disabled={job.status === 'CLOSED'}
              ></textarea>

              {/* Dynamic Parts Used Subform */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>Parts & Materials Replaced</label>
                  {job.status !== 'CLOSED' && (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={handleAddPart}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      + Add Replacement Part
                    </button>
                  )}
                </div>

                {parts.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                    No parts logged (Labor-only repair). Click "+ Add Replacement Part" if any hardware was replaced.
                  </p>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    {parts.map((part, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}
                      >
                        <input
                          type="text"
                          placeholder="Part Name (e.g. Drain Pump WW80)"
                          value={part.partName}
                          onChange={(e) => handlePartChange(idx, 'partName', e.target.value)}
                          required
                          disabled={job.status === 'CLOSED'}
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => handlePartChange(idx, 'quantity', e.target.value)}
                          required
                          disabled={job.status === 'CLOSED'}
                        />
                        <input
                          type="number"
                          placeholder="Unit Cost ₹"
                          min="0"
                          value={part.unitCost}
                          onChange={(e) => handlePartChange(idx, 'unitCost', e.target.value)}
                          required
                          disabled={job.status === 'CLOSED'}
                        />
                        {job.status !== 'CLOSED' && (
                          <button
                            type="button"
                            className="buttonout"
                            onClick={() => handleRemovePart(idx)}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labor & Billing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div>
                  <label>Labor / Service Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    required
                    disabled={job.status === 'CLOSED'}
                  />
                </div>
                <div>
                  <label>Computed Total Bill (₹)</label>
                  <input
                    type="number"
                    value={calculatedFinalCost}
                    readOnly
                    style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#1e3a8a' }}
                  />
                </div>
              </div>

              {job.status !== 'CLOSED' && (
                <button
                  type="submit"
                  disabled={completing}
                  style={{ marginTop: '25px', background: '#15803d', borderColor: '#15803d' }}
                >
                  {completing
                    ? 'Submitting Details...'
                    : job.status === 'COMPLETED'
                    ? 'Update Repair Details'
                    : 'Mark Completed & Trigger Customer OTP'}
                </button>
              )}
            </form>
          </div>
        )}

        {/* Audit Trail Timeline */}
        <div style={{ borderTop: '1px solid #dbe2ea', paddingTop: '20px' }}>
          <h3>Audit Trail & Status History</h3>
          <ul className="timeline-list">
            {job.statusHistory?.map((step, idx) => (
              <li key={idx} className="timeline-item">
                <div style={{ fontWeight: 'bold' }}>{step.toStatus.replace(/_/g, ' ')}</div>
                <div className="time">{new Date(step.changedAt).toLocaleString()}</div>
                {step.note && <p style={{ margin: '4px 0', fontSize: '13px' }}>{step.note}</p>}
              </li>
            ))}
          </ul>
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <Link className="outline-button" to="/technician/dashboard">
            Back to Assigned Jobs
          </Link>
        </div>
      </div>
    </main>
  );
}
