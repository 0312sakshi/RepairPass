import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const CATEGORIES = [
  'Refrigerator',
  'Washing Machine',
  'Television',
  'Microwave',
  'Geyser',
  'Fan',
  'Cooler',
  'AC',
  'Ceiling Fan',
  'Table Fan',
  'Inverter',
  'Other'
];

export default function NewAppliancePage() {
  const [formData, setFormData] = useState({
    category: 'Washing Machine',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyDurationMonths: ''
  });
  const [documentNote, setDocumentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.category) {
      setError('Please select an appliance category.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        category: formData.category,
        brand: formData.brand.trim() || 'Unknown',
        modelNumber: formData.modelNumber.trim(),
        serialNumber: formData.serialNumber.trim(),
        purchaseDate: formData.purchaseDate || null,
        warrantyDurationMonths: formData.warrantyDurationMonths ? Number(formData.warrantyDurationMonths) : null,
        documents: documentNote.trim()
          ? [
              {
                documentType: 'other',
                storageKey: 'placeholder_doc_note',
                originalName: documentNote.trim(),
                mimeType: 'text/plain',
                sizeBytes: 1024,
                uploadedAt: new Date()
              }
            ]
          : []
      };

      await api.createAppliance(payload);
      navigate('/customer/appliances');
    } catch (err) {
      setError(err.message || 'Failed to register appliance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div className="form-box" style={{ maxWidth: '600px' }}>
        <p className="small-heading">Appliance Registration</p>
        <h1>Add New Appliance</h1>
        <p>Register your household equipment. Invoice and warranty duration are completely optional.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Category *</label>
          <select name="category" value={formData.category} onChange={handleChange} required>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label>Brand (Optional)</label>
          <input
            type="text"
            name="brand"
            placeholder="e.g. Samsung, LG, Voltas (Leave blank for Unknown)"
            value={formData.brand}
            onChange={handleChange}
          />

          <label>Model Number (Optional)</label>
          <input
            type="text"
            name="modelNumber"
            placeholder="e.g. WW80T, GL-T402"
            value={formData.modelNumber}
            onChange={handleChange}
          />

          <label>Serial Number (Optional)</label>
          <input
            type="text"
            name="serialNumber"
            placeholder="e.g. SN-987214-X"
            value={formData.serialNumber}
            onChange={handleChange}
          />

          <label>Purchase Date (Optional)</label>
          <input
            type="date"
            name="purchaseDate"
            value={formData.purchaseDate}
            onChange={handleChange}
          />

          <label>Warranty Duration in Months (Optional)</label>
          <input
            type="number"
            name="warrantyDurationMonths"
            placeholder="e.g. 12 (1 year), 24 (2 years), 60 (5 years)"
            min="0"
            max="120"
            value={formData.warrantyDurationMonths}
            onChange={handleChange}
          />
          <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
            Warranty status is computed using calendar-month arithmetic. If left blank, status will be 'Unknown'.
          </small>

          <label>Document Reference / Physical Bill Note (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Paper invoice stored in Home Filing Cabinet #3"
            value={documentNote}
            onChange={(e) => setDocumentNote(e.target.value)}
          />
          <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
            Optional: Document reference note only. No physical bill or scanned upload is required to register this appliance.
          </small>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving Appliance...' : 'Save Appliance to Registry'}
          </button>
        </form>

        <p className="center-text">
          <Link to="/customer/appliances">Back to Appliances</Link>
        </p>
      </div>
    </main>
  );
}
