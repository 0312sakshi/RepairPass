import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAppliances() {
      try {
        setLoading(true);
        const res = await api.getAppliances();
        if (res.success) {
          setAppliances(res.appliances || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load appliances.');
      } finally {
        setLoading(false);
      }
    }
    loadAppliances();
  }, []);

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
    <main className="container" style={{ padding: '30px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <p className="small-heading">Appliance Registry</p>
          <h1>My Registered Appliances</h1>
          <p>Centralized digital record for all your household equipment and warranties.</p>
        </div>
        <Link className="button" to="/customer/appliances/new">
          + Add New Appliance
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p style={{ marginTop: '20px' }}>Loading appliances...</p>
      ) : appliances.length > 0 ? (
        <div className="three-columns appliance-list" style={{ marginTop: '25px' }}>
          {appliances.map((appliance) => (
            <div key={appliance._id} className="card">
              {renderWarrantyBadge(appliance.warrantyDetails)}
              <h3>
                {appliance.brand !== 'Unknown' ? `${appliance.brand} ` : ''}
                {appliance.category}
              </h3>
              {appliance.modelNumber && (
                <p>
                  <b>Model Number:</b> {appliance.modelNumber}
                </p>
              )}
              {appliance.serialNumber && (
                <p>
                  <b>Serial No:</b> {appliance.serialNumber}
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
          <p>Register your household appliances to start tracking warranties and service history.</p>
          <div style={{ marginTop: '16px' }}>
            <Link className="button" to="/customer/appliances/new">
              Register First Appliance
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
