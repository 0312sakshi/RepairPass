import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected technician map for assignment: { [requestId]: technicianId }
  const [assignmentMap, setAssignmentMap] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  // Active tab: 'requests' | 'users'
  const [activeTab, setActiveTab] = useState('requests');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, techsRes, reqsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminTechnicians(),
        api.getAdminRequests()
      ]);

      if (usersRes.success) setUsers(usersRes.users || []);
      if (techsRes.success) {
        setTechnicians(techsRes.technicians || []);
        // Initialize default selections for unassigned requests
        const initialMap = {};
        if (techsRes.technicians.length > 0) {
          (reqsRes.requests || []).forEach((r) => {
            if (r.assignedTechnician) {
              initialMap[r._id] = r.assignedTechnician._id;
            } else {
              initialMap[r._id] = techsRes.technicians[0]._id;
            }
          });
        }
        setAssignmentMap(initialMap);
      }
      if (reqsRes.success) setRequests(reqsRes.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAssign = async (requestId) => {
    const selectedTechId = assignmentMap[requestId];
    if (!selectedTechId) {
      setError('Please select a technician first.');
      return;
    }

    try {
      setAssigningId(requestId);
      setError('');
      setSuccess('');
      const res = await api.assignTechnician(requestId, selectedTechId);
      if (res.success) {
        setSuccess(res.message || 'Technician assigned successfully.');
        await loadAdminData();
      }
    } catch (err) {
      setError(err.message || 'Assignment failed.');
    } finally {
      setAssigningId(null);
    }
  };

  // KPI computations
  const totalUsersCount = users.length;
  const customersCount = users.filter((u) => u.role === 'customer').length;
  const techniciansCount = users.filter((u) => u.role === 'technician').length;
  const totalRequestsCount = requests.length;
  const pendingAssignmentCount = requests.filter((r) => r.status === 'SUBMITTED').length;
  const closedCount = requests.filter((r) => r.status === 'CLOSED').length;

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'customer') return u.role === 'customer';
    if (userRoleFilter === 'technician') return u.role === 'technician';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span className="green-status">Closed / Verified</span>;
      case 'COMPLETED':
        return <span className="yellow-status">Completed (OTP Issued)</span>;
      case 'IN_PROGRESS':
        return <span className="blue-status">In Repair</span>;
      case 'ASSIGNED':
        return <span className="blue-status">Assigned</span>;
      case 'SUBMITTED':
        return <span className="red-status">Pending Assignment</span>;
      default:
        return <span className="blue-status">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <main className="container" style={{ padding: '35px 0' }}>
      <div className="welcome">
        <div>
          <p className="small-heading">System Administration</p>
          <h1>Administrator Portal</h1>
          <p>Monitor platform operations, inspect registered accounts, and assign service technicians.</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* KPI Overview */}
      <section className="four-columns summary" style={{ marginBottom: '30px' }}>
        <div className="card">
          <p className="small-heading">Total Users</p>
          <strong>{loading ? '...' : totalUsersCount}</strong>
          <p>{customersCount} Customers, {techniciansCount} Technicians</p>
        </div>
        <div className="card">
          <p className="small-heading">All Requests</p>
          <strong>{loading ? '...' : totalRequestsCount}</strong>
          <p>Logged in system</p>
        </div>
        <div className="card">
          <p className="small-heading">Pending Action</p>
          <strong style={{ color: pendingAssignmentCount > 0 ? '#b91c1c' : '#1e3a8a' }}>
            {loading ? '...' : pendingAssignmentCount}
          </strong>
          <p>Awaiting technician assignment</p>
        </div>
        <div className="card">
          <p className="small-heading">Closed Repaired</p>
          <strong>{loading ? '...' : closedCount}</strong>
          <p>Verified with completion OTP</p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '25px' }}>
        <button
          className={activeTab === 'requests' ? 'button' : 'buttonout'}
          onClick={() => setActiveTab('requests')}
          style={{ borderRadius: '6px 6px 0 0' }}
        >
          Service Requests ({totalRequestsCount})
        </button>
        <button
          className={activeTab === 'users' ? 'button' : 'buttonout'}
          onClick={() => setActiveTab('users')}
          style={{ borderRadius: '6px 6px 0 0' }}
        >
          Registered Accounts ({totalUsersCount})
        </button>
      </div>

      {/* TAB 1: SERVICE REQUESTS & ASSIGNMENT */}
      {activeTab === 'requests' && (
        <section className="section" style={{ paddingTop: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2>All Service Requests & Technician Assignment</h2>
              <p style={{ color: '#64748b' }}>Assign available field technicians to pending customer service tickets.</p>
            </div>
            <button className="outline-button" onClick={loadAdminData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>

          {loading ? (
            <p style={{ marginTop: '20px' }}>Loading requests...</p>
          ) : requests.length > 0 ? (
            <div className="table-box" style={{ marginTop: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Customer</th>
                    <th>Appliance</th>
                    <th>Reported Issue</th>
                    <th>Status</th>
                    <th>Assign Technician</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.requestNumber}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <strong>{req.customer?.name}</strong>
                        <div style={{ fontSize: '12px' }}>📞 {req.contactPhone || req.customer?.phone}</div>
                        {req.customer?.city && <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {req.customer.city}</div>}
                      </td>
                      <td>
                        {req.appliance?.brand} {req.appliance?.category}
                        {req.appliance?.modelNumber && <div style={{ fontSize: '11px', color: '#64748b' }}>Model: {req.appliance.modelNumber}</div>}
                      </td>
                      <td style={{ maxWidth: '200px', fontSize: '13px' }}>{req.problemDescription}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td style={{ minWidth: '220px' }}>
                        {req.status === 'CLOSED' ? (
                          <span style={{ fontSize: '13px', color: '#15803d' }}>
                            ✓ Repaired by {req.assignedTechnician?.name || 'Technician'}
                          </span>
                        ) : technicians.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#b91c1c' }}>No technicians registered</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={assignmentMap[req._id] || (req.assignedTechnician ? req.assignedTechnician._id : '')}
                              onChange={(e) => setAssignmentMap({ ...assignmentMap, [req._id]: e.target.value })}
                              style={{ padding: '6px', fontSize: '13px' }}
                            >
                              {technicians.map((t) => (
                                <option key={t._id} value={t._id}>
                                  {t.name} ({t.city || 'Available'})
                                </option>
                              ))}
                            </select>
                            <button
                              className="button"
                              style={{ padding: '6px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                              onClick={() => handleAssign(req._id)}
                              disabled={assigningId === req._id}
                            >
                              {assigningId === req._id ? 'Saving...' : req.assignedTechnician ? 'Reassign' : 'Assign'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <Link
                          className="outline-button"
                          style={{ padding: '5px 8px', fontSize: '12px' }}
                          to={`/customer/requests/${req._id}`}
                        >
                          View Audit
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
              <p>There are no repair tickets submitted in the system.</p>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: REGISTERED USERS */}
      {activeTab === 'users' && (
        <section className="section" style={{ paddingTop: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2>Registered Platform Users</h2>
              <p style={{ color: '#64748b' }}>Complete directory of Customers and Field Technicians.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={userRoleFilter === 'all' ? 'button' : 'buttonout'}
                onClick={() => setUserRoleFilter('all')}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                All ({users.length})
              </button>
              <button
                className={userRoleFilter === 'customer' ? 'button' : 'buttonout'}
                onClick={() => setUserRoleFilter('customer')}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Customers ({customersCount})
              </button>
              <button
                className={userRoleFilter === 'technician' ? 'button' : 'buttonout'}
                onClick={() => setUserRoleFilter('technician')}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Technicians ({techniciansCount})
              </button>
            </div>
          </div>

          <div className="table-box" style={{ marginTop: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Role</th>
                  <th>Registered On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td>{u.city || 'Not specified'}</td>
                    <td>
                      <span className={u.role === 'technician' ? 'blue-status' : 'green-status'} style={{ textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="green-status">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
