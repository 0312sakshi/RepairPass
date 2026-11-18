import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function AppliancePassportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPassport() {
      try {
        setLoading(true);
        const res = await api.getApplianceHistory(id);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        setError(err.message || 'Failed to load appliance passport.');
      } finally {
        setLoading(false);
      }
    }
    loadPassport();
  }, [id]);

  if (loading) {
    return (
      <main className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p>Loading digital appliance passport...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container" style={{ padding: '60px 0' }}>
        <div className="alert alert-error">{error || 'Appliance not found.'}</div>
        <Link className="button" to="/customer/appliances">
          Back to Appliances
        </Link>
      </main>
    );
  }

  const { appliance, records } = data;

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
    <main className="container" style={{ padding: '40px 0' }}>
      <div className="passport">
        <div className="passport-title">
          <p className="small-heading" style={{ color: '#93c5fd' }}>
            DIGITAL APPLIANCE PASSPORT
          </p>
          <h2>
            {appliance.brand !== 'Unknown' ? `${appliance.brand} ` : ''}
            {appliance.category}
          </h2>
          <p>Permanent historical ledger of equipment specifications, maintenance, and verified repairs.</p>
        </div>

        {/* Equipment Specifications Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div>
            <p>
              <b>Category:</b> {appliance.category}
            </p>
            <p>
              <b>Brand:</b> {appliance.brand}
            </p>
          </div>
          <div>
            <p>
              <b>Model Number:</b> {appliance.modelNumber || 'Not Specified'}
            </p>
            <p>
              <b>Serial Number:</b> {appliance.serialNumber || 'Not Specified'}
            </p>
          </div>
          <div>
            <p>
              <b>Purchased:</b>{' '}
              {appliance.purchaseDate ? new Date(appliance.purchaseDate).toLocaleDateString() : 'Not Specified'}
            </p>
            <div>{renderWarrantyBadge(appliance.warrantyDetails)}</div>
          </div>
        </div>

        <div className="actions" style={{ marginBottom: '30px' }}>
          <Link
            className="button"
            to="/customer/requests/new"
            state={{ preselectedApplianceId: appliance._id }}
          >
            Raise Repair Request for this Appliance
          </Link>
          <Link className="outline-button" to="/customer/appliances">
            Back to All Appliances
          </Link>
        </div>

        {/* Repair History Table */}
        <div style={{ borderTop: '1px solid #dbe2ea', paddingTop: '25px' }}>
          <h3>Verified Repair & Service History ({records.length})</h3>

          {records.length > 0 ? (
            <div className="table-box">
              <table>
                <thead>
                  <tr>
                    <th>Service Date</th>
                    <th>Ticket Code</th>
                    <th>Technician</th>
                    <th>Diagnosis & Action</th>
                    <th>Parts Replaced</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec._id}>
                      <td>{new Date(rec.completionDate).toLocaleDateString()}</td>
                      <td>
                        <strong>{rec.serviceRequest?.requestNumber || 'RP-CLOSED'}</strong>
                      </td>
                      <td>{rec.technician?.name || 'Authorized Technician'}</td>
                      <td>
                        <strong>{rec.diagnosis}</strong>
                        {rec.repairNotes && <p style={{ fontSize: '13px', margin: '4px 0' }}>{rec.repairNotes}</p>}
                      </td>
                      <td>
                        {rec.partsUsed && rec.partsUsed.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px' }}>
                            {rec.partsUsed.map((p, idx) => (
                              <li key={idx}>
                                {p.partName} (Qty: {p.quantity}, ₹{p.unitCost})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: '#64748b' }}>None (Labor only)</span>
                        )}
                      </td>
                      <td>
                        <strong>₹{rec.totalCost}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: '15px' }}>
              <h3>No completed service history available</h3>
              <p>This appliance has no previous service records logged in RepairPass.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
