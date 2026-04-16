import React from 'react';
import { ClipboardEdit, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';

// Main campus background image
import bgMain from '../Background_img/Screenshot 2026-03-28 165930.png';

export default function LandingPage({ navigate }) {
  // --- UNIVERSITY BRAND COLORS ---
  const colors = {
    navy: '#0C2340', 
    gold: '#E5A823', 
    lightGray: '#F8FAFC', 
    white: '#FFFFFF',
    text: '#334155' 
  };

  const modernFont = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.lightGray, fontFamily: modernFont, display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── FONT & RESPONSIVE MEDIA QUERIES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        /* Default Desktop Sizes */
        .header-pad { padding: 16px 40px; }
        .logo-img { height: 52px; }
        .univ-text { font-size: 22px; display: block; }
        .hero-banner { height: 340px; padding: 70px 20px; }
        .hero-h2 { font-size: 42px; }
        .hero-p { font-size: 18px; }
        .main-card { padding: 48px 40px; margin-top: -50px; }
        .card-h3 { font-size: 26px; }
        .staff-btn-container { display: flex; }

        /* Tablets & Small Laptops */
        @media (max-width: 768px) {
          .header-pad { padding: 16px 24px !important; }
          .logo-img { height: 44px !important; }
          .univ-text { font-size: 18px !important; }
          .hero-banner { padding: 60px 20px 80px 20px !important; height: auto !important; }
          .hero-h2 { font-size: 34px !important; }
          .hero-p { font-size: 16px !important; }
          .main-card { padding: 32px 24px !important; margin-top: -40px !important; }
        }

        /* Mobile Phones */
        @media (max-width: 480px) {
          .header-pad { padding: 12px 16px !important; justify-content: center !important; }
          .logo-img { height: 38px !important; }
          .univ-text { font-size: 16px !important; } 
          .staff-btn-container { display: none !important; }
          .hero-h2 { font-size: 28px !important; }
          .card-h3 { font-size: 22px !important; }
          
          /* 👉 FIX 1: Hide specific elements on mobile */
          .hide-on-mobile { display: none !important; }
        }
      `}</style>

      {/* ─── PREMIUM TOP HEADER ─── */}
      <header className="header-pad" style={{ 
        backgroundColor: colors.white, 
        borderBottom: `4px solid ${colors.gold}`, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 24px rgba(12, 35, 64, 0.08)',
        position: 'relative',
        zIndex: 10
      }}>
        
        {/* Left Side: Official Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/ua-logo.png" 
            alt="UA Logo" 
            className="logo-img"
          />
          <span className="univ-text" style={{ color: colors.navy, fontWeight: 800, letterSpacing: '-0.01em' }}>
            University of the Assumption
          </span>
        </div>

        {/* Right Side: Staff Login (Hidden on Mobile) */}
        <div className="staff-btn-container" style={{ alignItems: 'center' }}>
          <button 
            onClick={() => navigate('admin-login')}
            style={{ 
              backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '10px 16px', 
              borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
              fontWeight: 600, fontSize: '14px', transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(12, 35, 64, 0.2)',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <LogIn size={16} /> Staff Login
          </button>
        </div>
      </header>

      {/* ─── HERO BANNER ─── */}
      <div className="hero-banner" style={{ 
        backgroundImage: `url("${bgMain}")`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        position: 'relative' 
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.85)' }}></div>
        <div style={{ position: 'relative', zIndex: 1, color: colors.white, textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="hero-h2" style={{ fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
            Canteen Evaluation System
          </h2>
          <p className="hero-p" style={{ fontWeight: 400, lineHeight: 1.6, margin: 0, color: '#CBD5E1' }}>
            A secure platform to share your dining experience. All submissions are protected by Ed25519 cryptography.
          </p>
        </div>
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main style={{ maxWidth: '600px', position: 'relative', zIndex: 2, padding: '0 20px', flex: 1, width: '100%', margin: '0 auto 80px' }}>
        
        {/* Primary Action Card */}
        <div className="main-card" style={{ 
          backgroundColor: colors.white, borderRadius: '16px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' 
        }}>
          
          <div style={{ backgroundColor: '#F1F5F9', padding: '18px', borderRadius: '50%', color: colors.navy, marginBottom: '24px' }}>
            <ClipboardEdit size={36} />
          </div>
          
          <h3 className="card-h3" style={{ margin: 0, color: colors.navy, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Submit Your Feedback
          </h3>
          
          <p style={{ color: colors.text, fontSize: '15px', lineHeight: 1.6, marginBottom: '36px', maxWidth: '400px' }}>
            Rate your meal and help us improve campus dining. Your review is digitally signed for authenticity.
          </p>
          
          <button 
            onClick={() => navigate('student-login')}
            style={{ 
              backgroundColor: colors.navy, color: colors.white, border: 'none', padding: '18px 32px', 
              fontSize: '16px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', width: '100%', 
              maxWidth: '350px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 4px 12px rgba(12, 35, 64, 0.2)',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'none'; }}
          >
            Start Evaluation <ArrowRight size={18} />
          </button>
        </div>

        {/* Secondary Action Link */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px' }}>
            Already submitted a review?
          </p>
          <button 
            onClick={() => navigate('verify_receipt')}
            style={{ 
              background: 'none', border: 'none', color: colors.navy, fontSize: '15px', fontWeight: 600, 
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
          >
            <ShieldCheck size={18} /> Verify your receipt
          </button>
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer style={{ backgroundColor: colors.navy, color: colors.white, padding: '40px 20px', textAlign: 'center', fontSize: '14px' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>© 2026 University of the Assumption. All Rights Reserved.</p>
        <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '13px' }}>Cryptographically Secured EdDSA System</p>
        
        {/* 👉 FIX: Added hide-on-mobile class here! */}
        <div className="hide-on-mobile" style={{ marginTop: '32px' }}>
          <button 
            onClick={() => navigate('hacker')}
            style={{ background: 'none', border: 'none', color: '#334155', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.05em', fontFamily: 'inherit' }}
            title="Database Simulation Tool"
          >
            SYSTEM DIAGNOSTICS
          </button>
        </div>
      </footer>

    </div>
  );
}