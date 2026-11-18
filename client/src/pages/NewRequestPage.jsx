import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function NewRequestPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [appliances, setAppliances] = useState([]);
  const [loadingAppliances, setLoadingAppliances] = useState(true);

  const [applianceId, setApplianceId] = useState(location.state?.preselectedApplianceId || '');
  const [problemDescription, setProblemDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAppliances() {
      try {
        setLoadingAppliances(true);
        const res = await api.getAppliances();
        if (res.success && res.appliances) {
          setAppliances(res.appliances);
          if (!applianceId && res.appliances.length > 0) {
            setApplianceId(res.appliances[0]._id);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load your appliances.');
      } finally {
        setLoadingAppliances(false);
      }
    }
    loadAppliances();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!applianceId) {
      setError('Please select an appliance for this service request.');
      return;
    }

    if (!problemDescription.trim()) {
      setError('Please provide a meaningful description of the issue or fault.');
      return;
    }

    if (!preferredDate) {
      setError('Please select a preferred service date.');
      return;
    }

    if (!contactPhone.trim()) {
      setError('Please provide a valid contact phone number.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.createRequest({
        applianceId,
        problemDescription: problemDescription.trim(),
        preferredDate,
        preferredTimeSlot,
        contactPhone: contactPhone.trim()
      });

      if (res.success && res.serviceRequest) {
        navigate(`/customer/requests/${res.serviceRequest._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit service request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div className="form-box" style={{ maxWidth: '620px' }}>
        <p className="small-heading">Service Booking</p>
        <h1>Raise Repair Request</h1>
        <p>Schedule a service visit for an existing appliance registered in your account.</p>

        {error && <div className="alert alert-error">{error}</div>}

        {loadingAppliances ? (
          <p>Loading your registered appliances...</p>
        ) : appliances.length === 0 ? (
          <div className="empty-state">
            <h3>No appliances registered</h3>
            <p>You need to register at least one household appliance before raising a service request.</p>
            <div style={{ marginTop: '16px' }}>
              <Link className="button" to="/customer/appliances/new">
                Register An Appliance Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Select Appliance *</label>
            <select
              value={applianceId}
              onChange={(e) => setApplianceId(e.target.value)}
              required
            >
              {appliances.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.brand !== 'Unknown' ? `${app.brand} ` : ''}
                  {app.category} {app.modelNumber ? `(${app.modelNumber})` : ''} — [
                  {app.warrantyDetails?.status || 'Unknown Warranty'}]
                </option>
              ))}
            </select>

            <label>Issue Description *</label>
            <textarea
              placeholder="Describe the fault symptoms (e.g., Drum not spinning, showing OE error code, low cooling, strange noise)"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            ></textarea>

            <label>Preferred Service Date *</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
            />

            <label>Preferred Time Slot *</label>
            <select
              value={preferredTimeSlot}
              onChange={(e) => setPreferredTimeSlot(e.target.value)}
              required
            >
              <option value="Morning">Morning (9:00 AM – 1:00 PM)</option>
              <option value="Afternoon">Afternoon (1:00 PM – 5:00 PM)</option>
              <option value="Evening">Evening (5:00 PM – 8:00 PM)</option>
            </select>

            <label>Contact Phone for Service Day *</label>
            <input
              type="tel"
              placeholder="9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
            />

            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting Service Ticket...' : 'Submit Service Request'}
            </button>
          </form>
        )}

        <p className="center-text">
          <Link to="/customer/requests">Back to Service Requests</Link>
        </p>
      </div>
    </main>
  );
}
