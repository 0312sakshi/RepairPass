import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTechnicianJobs();
      if (res.success) {
        setJobs(res.jobs || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assigned jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleAccept = async (jobId) => {
    try {
      setActionSuccess('');
      setError('');
      const res = await api.acceptJob(jobId);
      if (res.success) {
        setActionSuccess(`Job ${res.job?.requestNumber || ''} accepted successfully.`);
        await loadJobs();
      }
    } catch (err) {
      setError(err.message || 'Failed to accept job.');
    }
  };

  const totalAssigned = jobs.length;
  const inProgressJobs = jobs.filter(
    (j) => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'REACHED', 'IN_PROGRESS'].includes(j.status)
  ).length;
  const completedJobs = jobs.filter((j) => ['COMPLETED', 'CLOSED'].includes(j.status)).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span className="green-status">Closed / Verified</span>;
      case 'COMPLETED':
        return <span className="yellow-status">Completed (Customer OTP)</span>;
      case 'IN_PROGRESS':
        return <span className="blue-status">In Repair</span>;
      case 'ACCEPTED':
        return <span className="blue-status">Accepted</span>;
      case 'ASSIGNED':
        return <span className="yellow-status">New Assignment</span>;
      default:
        return <span className="blue-status">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <main className="container" style={{ padding: '35px 0' }}>
      <div className="welcome">
        <div>
          <p className="small-heading">Technician Portal</p>
          <h1>Welcome, {user?.name}</h1>
          <p>Review assigned repair tasks, manage on-site diagnostic progress, and log completed work.</p>
        </div>
      </div>

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Technician KPI Summary */}
      <section className="four-columns summary" style={{ marginBottom: '30px' }}>
        <div className="card">
          <p className="small-heading">Total Jobs</p>
          <strong>{loading ? '...' : totalAssigned}</strong>
          <p>Assigned tickets</p>
        </div>
        <div className="card">
          <p className="small-heading">Active Queue</p>
          <strong>{loading ? '...' : inProgressJobs}</strong>
          <p>Needs action / in progress</p>
        </div>
        <div className="card">
          <p className="small-heading">Finished</p>
          <strong>{loading ? '...' : completedJobs}</strong>
          <p>Completed / Closed</p>
        </div>
        <div className="card">
          <p className="small-heading">Account Status</p>
          <strong style={{ fontSize: '20px', color: '#15803d', marginTop: '14px' }}>Active Technician</strong>
          <p>Authorized for field service</p>
        </div>
      </section>

      {/* Assigned Jobs List */}
      <section className="section" style={{ paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p className="small-heading">Work Orders</p>
            <h2>Assigned Service Requests</h2>
          </div>
          <button className="outline-button" onClick={loadJobs} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {loading ? (
          <p style={{ marginTop: '20px' }}>Loading assigned jobs...</p>
        ) : jobs.length > 0 ? (
          <div className="table-box" style={{ marginTop: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Ticket Code</th>
                  <th>Appliance</th>
                  <th>Customer & Location</th>
                  <th>Problem Description</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td>
                      <strong>{job.requestNumber}</strong>
                    </td>
                    <td>
                      {job.appliance?.brand} {job.appliance?.category}
                      {job.appliance?.modelNumber && <div style={{ fontSize: '12px', color: '#64748b' }}>Model: {job.appliance.modelNumber}</div>}
                    </td>
                    <td>
                      <strong>{job.customer?.name}</strong>
                      <div style={{ fontSize: '13px' }}>📞 {job.contactPhone || job.customer?.phone}</div>
                      {job.customer?.city && <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {job.customer.city}</div>}
                    </td>
                    <td style={{ maxWidth: '240px' }}>{job.problemDescription}</td>
                    <td>
                      {new Date(job.preferredDate).toLocaleDateString()}<br />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{job.preferredTimeSlot}</span>
                    </td>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {job.status === 'ASSIGNED' && (
                          <button
                            className="button"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => handleAccept(job._id)}
                          >
                            Accept
                          </button>
                        )}
                        <Link
                          className="outline-button"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          to={`/technician/jobs/${job._id}`}
                        >
                          Manage Job
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No jobs assigned yet</h3>
            <p>You currently have no repair service requests assigned by the administrator.</p>
          </div>
        )}
      </section>
    </main>
  );
}
