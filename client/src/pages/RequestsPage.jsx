import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        const res = await api.getRequests();
        if (res.success) {
          setRequests(res.requests || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load service requests.');
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span className="green-status">Closed / Verified</span>;
      case 'COMPLETED':
        return <span className="yellow-status">Completed (Verify OTP)</span>;
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
    <main className="container" style={{ padding: '30px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <p className="small-heading">Service Management</p>
          <h1>My Service Requests</h1>
          <p>Track live repair tickets, technician assignment, and confirm completed repairs.</p>
        </div>
        <Link className="button" to="/customer/requests/new">
          + Raise Repair Request
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p style={{ marginTop: '20px' }}>Loading service tickets...</p>
      ) : requests.length > 0 ? (
        <div className="table-box" style={{ marginTop: '25px' }}>
          <table>
            <thead>
              <tr>
                <th>Ticket Code</th>
                <th>Appliance</th>
                <th>Reported Problem</th>
                <th>Preferred Date</th>
                <th>Status</th>
                <th>Technician</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td>
                    <strong>{req.requestNumber}</strong>
                  </td>
                  <td>
                    {req.appliance?.brand} {req.appliance?.category}
                  </td>
                  <td>{req.problemDescription}</td>
                  <td>
                    {new Date(req.preferredDate).toLocaleDateString()} ({req.preferredTimeSlot})
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td>{req.assignedTechnician?.name || <span style={{ color: '#64748b' }}>Pending Assignment</span>}</td>
                  <td>
                    <Link className="button" style={{ padding: '6px 12px', fontSize: '13px' }} to={`/customer/requests/${req._id}`}>
                      {req.status === 'COMPLETED' ? 'Verify OTP' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No service requests found</h3>
          <p>You have not raised any appliance repair requests yet.</p>
          <div style={{ marginTop: '16px' }}>
            <Link className="button" to="/customer/requests/new">
              Raise a Repair Request
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
