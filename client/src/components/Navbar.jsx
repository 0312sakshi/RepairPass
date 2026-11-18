import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardHome = () => {
    if (!user) return '/';
    if (user.role === 'technician') return '/technician/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
  };

  return (
    <header className={user ? 'dashboard-header' : ''}>
      <div className="container navbar">
        <Link className="logo" to={getDashboardHome()}>
          RepairPass
        </Link>

        <nav>
          {!user ? (
            <>
              <Link to="/#home">Home</Link>
              <Link to="/#features">Features</Link>
              <Link to="/#categories">Appliances</Link>
              <Link to="/#about">About</Link>
              <Link to="/#contact">Contact</Link>
            </>
          ) : user.role === 'technician' ? (
            <>
              <NavLink to="/technician/dashboard" end>
                Assigned Jobs
              </NavLink>
            </>
          ) : user.role === 'admin' ? (
            <>
              <NavLink to="/admin/dashboard" end>
                Admin Overview
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/customer/dashboard" end>
                Dashboard
              </NavLink>
              <NavLink to="/customer/appliances">My Appliances</NavLink>
              <NavLink to="/customer/requests">Service Requests</NavLink>
              <NavLink to="/customer/history">History</NavLink>
            </>
          )}
        </nav>

        <div className="nav-actions">
          {!user ? (
            <>
              <Link className="outline-button" to="/login">
                Sign In
              </Link>
              <Link className="button" to="/register">
                Register
              </Link>
            </>
          ) : (
            <>
              <span style={{ fontSize: '13px', marginRight: '6px' }}>
                Hi, <strong>{user.name.split(' ')[0]}</strong>
                {user.role !== 'customer' && (
                  <span
                    style={{
                      marginLeft: '6px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      backgroundColor: user.role === 'admin' ? '#fef3c7' : '#e0f2fe',
                      color: user.role === 'admin' ? '#92400e' : '#0369a1',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}
                  >
                    {user.role}
                  </span>
                )}
              </span>
              <button className="buttonout" onClick={handleLogout} style={{ padding: '6px 12px' }}>
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
