import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [appliances, setAppliances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [appRes, reqRes, recRes] = await Promise.all([
          api.getAppliances(),
          api.getRequests(),
          api.getMyRecords()
        ]);

        if (appRes.success) setAppliances(appRes.appliances || []);
        if (reqRes.success) setRequests(reqRes.requests || []);
        if (recRes.success) setRecords(recRes.records || []);
      } catch (err) {
        setError(err.message || 'Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute live metrics from real data
  const totalAppliances = appliances.length;
  const activeWarranties = appliances.filter((a) => a.warrantyDetails?.status === 'ACTIVE').length;
  const pendingRequests = requests.filter((r) => r.status !== 'CLOSED' && r.status !== 'CANCELLED').length;
  const completedRepairs = records.length;

  const activeRequest = requests.find((r) => r.status !== 'CLOSED' && r.status !== 'CANCELLED');

  // Compute 4-step progress class for visual tracker
  const getStepClass = (stepNumber, currentStatus) => {
    const statusRanks = {
      SUBMITTED: 1,
      ASSIGNED: 2,
      ACCEPTED: 2,
      ON_THE_WAY: 2,
      REACHED: 3,
      IN_PROGRESS: 3,
      COMPLETED: 3,
      CLOSED: 4
    };
    const rank = statusRanks[currentStatus] || 1;
    if (rank > stepNumber) return 'complete-step';
    if (rank === stepNumber) return 'current-step';
    return '';
  };

  const renderWarrantyBadge = (warrantyDetails) => {
    if (!warrantyDetails || warrantyDetails.status === 'UNKNOWN') {
      return <span className="yellow-status">Warranty Unknown</span>;
    }
    if (warrantyDetails.status === 'ACTIVE') {
      return <span className="green-status">Active Warranty</span>;
    }
    return <span className="red-status">Expired Warranty</span>;
  };

  return (
    <main className="container">
      {/* Welcome Banner */}
      <section className="welcome">
        <div>
          <h1>Welcome, {user?.name || 'Customer'}</h1>
          <p>Here is the real-time operational status of your registered appliances and repair requests.</p>
        </div>
        <div className="actions">
          <Link className="button" to="/customer/requests/new">
            Raise Repair Request
          </Link>
          <Link className="outline-button" to="/customer/appliances/new">
            Add Appliance
          </Link>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary KPI Cards */}
      <section className="four-columns summary">
        <div className="card">
          <p className="small-heading">Appliances</p>
          <strong>{loading ? '...' : totalAppliances}</strong>
          <p>Registered equipment</p>
        </div>
        <div className="card">
          <p className="small-heading">Coverage</p>
          <strong>{loading ? '...' : activeWarranties}</strong>
          <p>Active warranties</p>
        </div>
        <div className="card">
          <p className="small-heading">In Service</p>
          <strong>{loading ? '...' : pendingRequests}</strong>
          <p>Pending / Active jobs</p>
        </div>
        <div className="card">
          <p className="small-heading">Passport Records</p>
          <strong>{loading ? '...' : completedRepairs}</strong>
          <p>Completed repair logs</p>
        </div>
      </section>

      {/* Active Repair Status Banner */}
      <section className="section" id="active-service">
        <p className="small-heading">Service Requests</p>
        <h2>Active Service Ticket</h2>

        {loading ? (
          <p>Loading active request status...</p>
        ) : activeRequest ? (
          <div className="card repair-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <h3>
                {activeRequest.appliance?.brand} {activeRequest.appliance?.category} — Request{' '}
                <span style={{ color: '#1e3a8a' }}>{activeRequest.requestNumber}</span>
              </h3>
              <span className="blue-status">{activeRequest.status.replace(/_/g, ' ')}</span>
            </div>

            <p style={{ marginTop: '8px' }}>
              <b>Reported Issue:</b> {activeRequest.problemDescription}
            </p>

            {/* 4-Step Progress Indicator */}
            <div className="repair-steps">
              <div className={getStepClass(1, activeRequest.status)}>1<br />Request Raised</div>
              <div className={getStepClass(2, activeRequest.status)}>2<br />Assigned / On Way</div>
              <div className={getStepClass(3, activeRequest.status)}>3<br />In Repair / Done</div>
              <div className={getStepClass(4, activeRequest.status)}>4<br />Verified & Closed</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <p>
                  <b>Technician:</b> {activeRequest.assignedTechnician?.name || 'Awaiting assignment by Admin'}
                </p>
                {activeRequest.assignedTechnician?.phone && (
                  <p>
                    <b>Technician Phone:</b> {activeRequest.assignedTechnician.phone}
                  </p>
                )}
              </div>
              <div>
                <p>
                  <b>Scheduled Date:</b> {new Date(activeRequest.preferredDate).toLocaleDateString()} (
                  {activeRequest.preferredTimeSlot})
                </p>
                {activeRequest.completionDetails?.finalRepairCost > 0 && (
                  <p>
                    <b>Final Bill Amount:</b> ₹{activeRequest.completionDetails.finalRepairCost}
                  </p>
                )}
              </div>
            </div>

            <div className="actions" style={{ marginTop: '15px' }}>
              <Link className="button" to={`/customer/requests/${activeRequest._id}`}>
                {activeRequest.status === 'COMPLETED' ? 'Verify Completion with OTP' : 'View Full Details & Timeline'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No active service requests</h3>
            <p>All your appliances are in working order. Need maintenance or a repair?</p>
            <div style={{ marginTop: '14px' }}>
              <Link className="button" to="/customer/requests/new">
                Raise Repair Request
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Registered Appliances Preview */}
      <section className="section" id="appliances">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p className="small-heading">My Household Equipment</p>
            <h2>Registered Appliances</h2>
          </div>
          <Link className="outline-button" to="/customer/appliances">
            View All Appliances ({appliances.length})
          </Link>
        </div>

        {loading ? (
          <p>Loading your appliances...</p>
        ) : appliances.length > 0 ? (
          <div className="three-columns appliance-list">
            {appliances.slice(0, 3).map((appliance) => (
              <div key={appliance._id} className="card">
                {renderWarrantyBadge(appliance.warrantyDetails)}
                <h3>
                  {appliance.brand !== 'Unknown' ? `${appliance.brand} ` : ''}
                  {appliance.category}
                </h3>
                {appliance.modelNumber && (
                  <p>
                    <b>Model:</b> {appliance.modelNumber}
                  </p>
                )}
                <p>
                  <b>Purchased:</b>{' '}
                  {appliance.purchaseDate ? new Date(appliance.purchaseDate).toLocaleDateString() : 'Not Specified'}
                </p>
                <p>
                  <b>Warranty:</b>{' '}
                  {appliance.warrantyDetails?.expiryDate
                    ? `Till ${new Date(appliance.warrantyDetails.expiryDate).toLocaleDateString()}`
                    : 'Unknown'}
                </p>

                <div className="actions">
                  <Link className="outline-button" to={`/customer/appliances/${appliance._id}/passport`}>
                    View Passport
                  </Link>
                  <Link
                    className="button"
                    to="/customer/requests/new"
                    state={{ preselectedApplianceId: appliance._id }}
                  >
                    Request Repair
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No appliances registered yet</h3>
            <p>Register your refrigerator, washing machine, AC or other appliances to track warranties and repairs.</p>
            <div style={{ marginTop: '14px' }}>
              <Link className="button" to="/customer/appliances/new">
                Add Your First Appliance
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
