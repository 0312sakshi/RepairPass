import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [role, setRole] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    password: '',
    confirmPassword: '',
    specialization: 'Air Conditioners, Refrigerators',
    experienceYears: 4
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, registerTechnician } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setSubmitting(true);

    try {
      if (role === 'technician') {
        const specArray = typeof formData.specialization === 'string'
          ? formData.specialization.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        await registerTechnician({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          password: formData.password,
          specialization: specArray.length > 0 ? specArray : ['General Appliances'],
          experienceYears: Number(formData.experienceYears) || 1
        });
        navigate('/technician/dashboard');
      } else {
        await register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          password: formData.password
        });
        navigate('/customer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="form-page">
      <div className="form-box">
        <h1>Create Your Account</h1>
        <p>Register as a {role === 'technician' ? 'Technician' : 'Customer'} on RepairPass.</p>

        {/* Role Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            className={role === 'customer' ? 'button' : 'outline-button'}
            style={{ flex: 1, padding: '8px' }}
            onClick={() => setRole('customer')}
          >
            Customer
          </button>
          <button
            type="button"
            className={role === 'technician' ? 'button' : 'outline-button'}
            style={{ flex: 1, padding: '8px' }}
            onClick={() => setRole('technician')}
          >
            Technician
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder={role === 'technician' ? 'Rakesh Verma' : 'Sanjana Tiwari'}
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />

          <label>Mobile Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="9876543210"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <label>City</label>
          <input
            type="text"
            name="city"
            placeholder="Ghaziabad"
            value={formData.city}
            onChange={handleChange}
          />

          {role === 'technician' && (
            <>
              <label>Specialization (comma-separated)</label>
              <input
                type="text"
                name="specialization"
                placeholder="Air Conditioners, Refrigerators"
                value={formData.specialization}
                onChange={handleChange}
                required
              />

              <label>Years of Experience</label>
              <input
                type="number"
                name="experienceYears"
                min="0"
                max="50"
                value={formData.experienceYears}
                onChange={handleChange}
                required
              />
            </>
          )}

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Create a secure password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Enter the password again"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating Account...' : `Register as ${role === 'technician' ? 'Technician' : 'Customer'}`}
          </button>
        </form>

        <p className="center-text">
          Already registered? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </main>
  );
}
