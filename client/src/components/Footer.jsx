import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="container footer-content">
        <p>&copy; 2026 RepairPass — Appliance Service & History Management System</p>
        <p>
          <Link to="/#home">Home</Link> | <Link to="/#features">Features</Link> | <Link to="/login">Sign In</Link>
        </p>
      </div>
    </footer>
  );
}
