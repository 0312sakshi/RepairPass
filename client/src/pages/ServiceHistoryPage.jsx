import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ServiceHistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRecords() {
      try {
        setLoading(true);
        const res = await api.getMyRecords();
        if (res.success) {
          setRecords(res.records || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load service records.');
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  return (
    <main className="container" style={{ padding: '30px 0' }}>
      <div>
        <p className="small-heading">Service History</p>
        <h1>Completed Repairs & Ledger</h1>
        <p>Permanent historical service records verified with completion OTP.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p style={{ marginTop: '20px' }}>Loading repair history...</p>
      ) : records.length > 0 ? (
        <div className="table-box" style={{ marginTop: '25px' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Appliance</th>
                <th>Ticket Code</th>
                <th>Technician</th>
                <th>Diagnosis & Notes</th>
                <th>Parts Used</th>
                <th>Total Cost</th>
                <th>Passport</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec._id}>
                  <td>{new Date(rec.completionDate).toLocaleDateString()}</td>
                  <td>
                    {rec.appliance?.brand} {rec.appliance?.category}
                  </td>
                  <td>
                    <strong>{rec.serviceRequest?.requestNumber || 'RP-CLOSED'}</strong>
                  </td>
                  <td>{rec.technician?.name || 'Technician'}</td>
                  <td>
                    <strong>{rec.diagnosis}</strong>
                    {rec.repairNotes && <p style={{ fontSize: '13px', margin: '4px 0' }}>{rec.repairNotes}</p>}
                  </td>
                  <td>
                    {rec.partsUsed && rec.partsUsed.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px' }}>
                        {rec.partsUsed.map((p, idx) => (
                          <li key={idx}>
                            {p.partName} (₹{p.unitCost})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#64748b' }}>None</span>
                    )}
                  </td>
                  <td>
                    <strong>₹{rec.totalCost}</strong>
                  </td>
                  <td>
                    <Link
                      className="outline-button"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      to={`/customer/appliances/${rec.appliance?._id}/passport`}
                    >
                      Passport
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No service records found</h3>
          <p>Completed and OTP-verified repairs will be permanently stored here.</p>
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
