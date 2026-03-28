import React from 'react';
import { ShieldCheck, Utensils } from 'lucide-react';

export default function LandingPage({ navigate }) {
  return (
    <div className="landing-bg">
      <div className="landing-content">
        <div className="landing-badge animate-in">
          • EdDSA • Ed25519 • Group 1 • Mid Lab 2
        </div>

        <img 
          src="/ua-logo.png" 
          alt="University of the Assumption Logo" 
          className="landing-logo animate-in"
        />

        <h1 className="serif landing-title animate-in">
          University of the Assumption<br/>Canteen Evaluation
        </h1>

        <p className="landing-subtitle animate-in">
          Every feedback submission is digitally signed with a real Ed25519 private key to ensure authenticity.
        </p>

        <div className="portal-grid animate-in" style={{ marginBottom: '30px' }}>
          <button type="button" className="portal-card" onClick={() => navigate('customer')}>
            <div className="portal-card-icon">
              <Utensils color="#f7f4ec" size={28} />
            </div>
            <h3 className="serif portal-card-title">Customer Portal</h3>
            <p className="portal-card-description">Rate your experience with secure digital signing.</p>
          </button>

          <button type="button" className="portal-card" onClick={() => navigate('admin-login')}>
            <div className="portal-card-icon">
              <ShieldCheck color="#5192ff" size={28} />
            </div>
            <h3 className="serif portal-card-title">Admin Portal</h3>
            <p className="portal-card-description">Access records, verification logs, and compliance audit views.</p>
          </button>
        </div>

        {/* OUR RESTORED VERIFY LINK */}
        <button
          className="animate-in"
          onClick={() => navigate('verify_receipt')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--accent-gold)', 
            textDecoration: 'underline', 
            cursor: 'pointer',
            fontSize: '15px',
            marginTop: '10px',
            animationDelay: '0.2s'
          }}
        >
          Verify a PDF Receipt
        </button>

      </div>
    </div>
  );
}