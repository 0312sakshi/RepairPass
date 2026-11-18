import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const APPLIANCE_CATEGORIES = [
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
  'Inverter'
];

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="container">
          <p className="small-heading">THE PLATFORM FOR HOMEOWNERS & SERVICE TECHNICIANS</p>
          <h1>
            RepairPass — <span>The Universal Digital Service Passport for Appliances</span>
          </h1>
          <p className="large-text">
            Empowering homeowners to track appliance care while enabling technicians to access verified service
            histories, log repairs, and manage jobs efficiently.
          </p>
          <div className="actions">
            <Link className="button" to="/register">
              Create Free Account
            </Link>
            <a className="outline-button" href="#features">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section" id="features">
        <div className="container">
          <p className="small-heading">Features</p>
          <h2>Everything about an appliance in one place</h2>
          <div className="four-columns feature-list">
            <div className="card">
              <h3>Appliance Registry</h3>
              <p>Save category, brand, model, purchase date and track warranty periods for all household appliances.</p>
            </div>
            <div className="card">
              <h3>Warranty Tracking</h3>
              <p>Automatic calendar-month warranty computation showing whether coverage is Active, Expired, or Unknown.</p>
            </div>
            <div className="card">
              <h3>Repair Workflow</h3>
              <p>Raise service tickets with preferred dates and track repair progress through clear status milestones.</p>
            </div>
            <div className="card">
              <h3>Digital Passport</h3>
              <p>Maintain permanent, immutable repair histories including diagnosis, parts replaced, and costs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appliance Categories Section */}
      <section className="section white-section" id="categories">
        <div className="container">
          <p className="small-heading">Supported Equipment</p>
          <h2>Functional Appliance Categories</h2>
          <p className="large-text">
            RepairPass natively manages service records across all major household electrical and mechanical appliances:
          </p>
          <div className="category-grid">
            {APPLIANCE_CATEGORIES.map((cat) => (
              <div key={cat} className="category-card">
                {cat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section" id="about">
        <div className="container">
          <p className="small-heading">About</p>
          <h2>Why RepairPass?</h2>
          <p>One platform designed to simplify appliance management for both sides of the repair process.</p>
          <ul className="simple-list">
            <li>Homeowners and technicians share a single source of truth for repair histories, model numbers, and warranty status.</li>
            <li>Technicians spend less time guessing past issues and more time delivering accurate, efficient fixes.</li>
            <li>From raising the first service ticket to logging the final fix, every step is recorded for long-term peace of mind.</li>
            <li>Completion OTP security ensures the customer confirms work before tickets are permanently recorded.</li>
          </ul>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section white-section" id="contact">
        <div className="container two-columns">
          <div>
            <p className="small-heading">Direct Contact</p>
            <h2>Questions about RepairPass?</h2>
            <p>
              RepairPass is designed as an academic software engineering project for appliance lifecycle tracking and verified service history.
            </p>
            <p style={{ marginTop: '16px' }}>
              <b>Institutional Affiliation:</b><br />
              Department of Computer Applications<br />
              KIET Deemed To Be University, Ghaziabad, Uttar Pradesh
            </p>
            <p style={{ marginTop: '14px' }}>
              <b>Direct Project Email:</b><br />
              <a href="mailto:support@repairpass.example" style={{ fontWeight: 'bold' }}>
                support@repairpass.example
              </a>
            </p>
          </div>
          <div className="card">
            <h3>Support & Project Information</h3>
            <p>
              For technical inquiries, academic evaluation, or feedback regarding the RepairPass system, please reach out directly:
            </p>
            <ul className="simple-list" style={{ marginTop: '15px' }}>
              <li>
                <b>Student / Developer:</b> Sanjana Tiwari
              </li>
              <li>
                <b>Academic Program:</b> Master of Computer Applications (MCA)
              </li>
              <li>
                <b>Office Hours:</b> Monday – Friday, 9:00 AM – 5:00 PM IST
              </li>
              <li>
                <b>Architecture:</b> MERN Stack (MongoDB, Express.js, React.js, Node.js)
              </li>
            </ul>
            <div style={{ marginTop: '20px' }}>
              <a className="button" href="mailto:support@repairpass.example" style={{ display: 'block', textAlign: 'center' }}>
                Email Project Team
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
