import React, { useState } from 'react';
import { loginUser, registerUser } from '../api';
import { Lock, User, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import bgMain from '../Background_img/wmremove-transformed.png'; 

export default function Login({ navigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [uaId, setUaId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student'); 

  const colors = {
    navy: '#0C2340', 
    gold: '#E5A823', 
    red: '#C8102E', 
    bg: '#F8FAFC', 
    white: '#FFFFFF', 
    text: '#1E293B', 
    textMuted: '#64748B', 
    border: '#E2E8F0'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await loginUser({ ua_id: uaId, password });
        localStorage.setItem('ua_token', data.token);
        localStorage.setItem('ua_user', JSON.stringify(data.user));

        if (data.user.role === 'admin') {
          navigate('admin');
        } else {
          navigate('feedback');
        }
      } else {
        await registerUser({ ua_id: uaId, full_name: fullName, role, password });
        setIsLogin(true);
        setPassword('');
        alert('Account created successfully! Please log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container" style={{ 
      minHeight: '100vh', display: 'flex', backgroundColor: colors.navy, 
      fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    }}>
      
      {/* ─── RESPONSIVE CSS & GEIST FONT ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        .split-container { flex-direction: row; }
        .left-panel { padding: 60px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .right-panel { padding: 40px; flex: 1; display: flex; align-items: center; justify-content: center; }
        .form-box { padding: 40px; }
        .title-text { font-size: 52px; }
        .desc-text { font-size: 17px; }
        .back-btn { bottom: 40px; left: 60px; top: auto; }
        .brand-header { position: absolute; top: 40px; left: 60px; display: flex; align-items: center; gap: 16px; }
        .univ-title { font-size: 15px; }
        .univ-subtitle { font-size: 12px; }
        .logo-img { width: 54px; }

        /* Tablets & Large Phones */
        @media (max-width: 900px) {
          .split-container { flex-direction: column; }
          /* Increased top padding to 80px so it perfectly clears the absolute Back Button */
          .left-panel { padding: 80px 20px 40px 20px; flex: none; align-items: center; text-align: center; }
          .right-panel { padding: 20px; align-items: flex-start; }
          .form-box { padding: 24px; }
          .title-text { font-size: 36px; }
          .brand-header { position: relative; top: 0; left: 0; justify-content: center; margin-bottom: 24px; }
          .back-btn { top: 20px; left: 20px; bottom: auto; }
        }

        /* Small Mobile Phones (Galaxy S8, iPhone Mini, etc.) */
        @media (max-width: 480px) {
          .left-panel { padding-top: 70px; } /* Fine-tuned for small screens */
          .title-text { font-size: 30px; } /* Shrunk title */
          .desc-text { font-size: 15px; } /* Shrunk paragraph */
          .logo-img { width: 44px; } /* Shrunk logo */
          /* Shrunk University text so it fits on one line */
          .univ-title { font-size: 12px; } 
          .univ-subtitle { font-size: 10px; }
          .brand-header { gap: 12px; }
        }
      `}</style>

      {/* Left Side: Image / Branding */}
      <div className="left-panel" style={{ 
        backgroundImage: `linear-gradient(rgba(12, 35, 64, 0.85), rgba(12, 35, 64, 0.92)), url(${bgMain})`, 
        backgroundSize: 'cover', backgroundPosition: 'center', color: colors.white,
        position: 'relative' 
      }}>
        
        {/* Back Button */}
        <button 
            className="back-btn"
            onClick={() => navigate('landing')} 
            style={{ 
              position: 'absolute',
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'transparent', border: 'none', 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s', fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
        >
            <ArrowLeft size={18} /> Return Home
        </button>

        {/* 1. TOP BRANDING */}
        <div className="brand-header">
          <img src="/ua-logo.png" alt="UA Logo" className="logo-img" />
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span className="univ-title" style={{ fontWeight: 600, letterSpacing: '0.08em', color: colors.white, lineHeight: 1.2 }}>
              UNIVERSITY OF THE ASSUMPTION
            </span>
            <span className="univ-subtitle" style={{ fontWeight: 500, color: colors.gold, letterSpacing: '0.15em', marginTop: '2px' }}>
              SECURE PORTAL
            </span>
          </div>
        </div>

        {/* 2. CENTER CONTENT */}
        <div style={{ maxWidth: '480px', marginTop: '10px' }}>
          <h1 className="title-text" style={{ fontWeight: 700, margin: '0 0 16px 0', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            Secure Identity<br/>
            <span style={{ color: colors.gold }}>Verification</span>
          </h1>
          <p className="desc-text" style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Log in with your official University of the Assumption credentials to securely sign and submit encrypted data.
          </p>
        </div>

      </div>

      {/* Right Side: Login Card */}
      <div className="right-panel" style={{ backgroundColor: colors.bg }}>
        
        <div className="form-box" style={{ 
          width: '100%', maxWidth: '440px', backgroundColor: colors.white, borderRadius: '16px', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: `1px solid ${colors.border}`, 
          borderTop: `4px solid ${colors.gold}`, borderBottom: `4px solid ${colors.red}` 
        }}>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            <button onClick={() => {setIsLogin(true); setError('');}} style={{ flex: 1, padding: '12px', background: isLogin ? colors.navy : 'transparent', color: isLogin ? colors.white : colors.text, border: `1px solid ${isLogin ? colors.navy : colors.border}`, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              Sign In
            </button>
            <button onClick={() => {setIsLogin(false); setError('');}} style={{ flex: 1, padding: '12px', background: !isLogin ? colors.navy : 'transparent', color: !isLogin ? colors.white : colors.text, border: `1px solid ${!isLogin ? colors.navy : colors.border}`, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              Create Account
            </button>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' }}>
            <ShieldCheck size={26} color={colors.gold} />
            {isLogin ? 'Authentication Gateway' : 'Register New Identity'}
          </h2>

          {error && (
            <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, marginBottom: '24px', border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>UA ID NUMBER</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input required type="text" placeholder="e.g. 2024123456" value={uaId} onChange={(e) => setUaId(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>FULL NAME</label>
                  <input required type="text" placeholder="Maria Santos" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>ACCOUNT ROLE</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', outline: 'none', backgroundColor: colors.white, boxSizing: 'border-box', fontFamily: 'inherit' }}>
                    <option value="student">Student</option>
                    <option value="staff">Staff / Faculty</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>

            <button disabled={loading} type="submit" style={{ marginTop: '12px', width: '100%', padding: '16px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Processing...' : (isLogin ? 'Authenticate & Enter' : 'Register Identity')} 
              {!loading && <ArrowRight size={18} />}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}