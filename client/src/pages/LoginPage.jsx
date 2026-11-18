import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/customer/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === 'customer') {
        const destination = location.state?.from?.pathname?.startsWith('/customer')
          ? location.state.from.pathname
          : '/customer/dashboard';
        navigate(destination, { replace: true });
      } else if (user.role === 'technician') {
        const destination = location.state?.from?.pathname?.startsWith('/technician')
          ? location.state.from.pathname
          : '/technician/dashboard';
        navigate(destination, { replace: true });
      } else if (user.role === 'admin') {
        const destination = location.state?.from?.pathname?.startsWith('/admin')
          ? location.state.from.pathname
          : '/admin/dashboard';
        navigate(destination, { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <main className="form-page">
      <div className="form-box">
        <h1>Welcome Back</h1>
        <p>Sign in to manage your household appliances and repair requests.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="center-text">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '13px' }}>
          <p style={{ fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Demo Quick-Fill Credentials:</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => fillDemo('sanjana@example.com', 'SecurePass123')}
            >
              Customer
            </button>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => fillDemo('rakesh@example.com', 'TechPass123')}
            >
              Technician
            </button>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => fillDemo('admin@repairpass.example', 'Admin@RepairPass2026')}
            >
              Administrator
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
