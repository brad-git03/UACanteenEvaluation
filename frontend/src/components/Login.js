import React, { useState } from 'react';
import { loginUser, registerUser } from '../api';
import { Lock, User, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import bgMain from '../Background_img/wmremove-transformed.png'; 

export default function Login({ navigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [failureModal, setFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');

  // Form State
  const [uaId, setUaId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await registerUser({ ua_id: uaId, full_name: fullName, role, password });
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setUaId('');
        setFullName('');
        setRole('student');
        setSuccessModal(true);
      }
    } catch (err) {
      if (isLogin) {
        setError(err.message);
      } else {
        setFailureMessage(err.message);
        setFailureModal(true);
      }
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
          .left-panel { padding: 80px 20px 40px 20px; flex: none; align-items: center; text-align: center; }
          .right-panel { padding: 20px; align-items: flex-start; }
          .form-box { padding: 24px; }
          .title-text { font-size: 36px; }
          .brand-header { position: relative; top: 0; left: 0; justify-content: center; margin-bottom: 24px; }
          .back-btn { top: 20px; left: 20px; bottom: auto; }
        }

        /* Small Mobile Phones */
        @media (max-width: 480px) {
          .left-panel { padding-top: 70px; }
          .title-text { font-size: 30px; } 
          .desc-text { font-size: 15px; } 
          .logo-img { width: 44px; } 
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
            <button onClick={() => {setIsLogin(true); setError('');}} style={{ flex: 1, padding: '12px', background: isLogin ? colors.navy : 'transparent', color: isLogin ? colors.white : colors.navy, border: `1px solid ${colors.navy}`, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              Sign In
            </button>
            <button onClick={() => {setIsLogin(false); setError('');}} style={{ flex: 1, padding: '12px', background: !isLogin ? colors.navy : 'transparent', color: !isLogin ? colors.white : colors.navy, border: `1px solid ${colors.navy}`, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
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
                <input required type="number" placeholder="e.g. 2024123456" value={uaId} onChange={(e) => setUaId(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>FULL NAME</label>
                  <input required type="text" placeholder="Maria Santos" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>ACCOUNT ROLE</label>
                  
                  {/* 👉 FIX 2: Beautiful custom toggle buttons instead of ugly <select> native dropdown! */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setRole('student')} style={{ flex: 1, padding: '14px 10px', borderRadius: '8px', border: `1px solid ${role === 'student' ? colors.navy : colors.border}`, background: role === 'student' ? colors.navy : colors.bg, color: role === 'student' ? colors.white : colors.textMuted, fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                      Student
                    </button>
                    <button type="button" onClick={() => setRole('staff')} style={{ flex: 1, padding: '14px 10px', borderRadius: '8px', border: `1px solid ${role === 'staff' ? colors.navy : colors.border}`, background: role === 'staff' ? colors.navy : colors.bg, color: role === 'staff' ? colors.white : colors.textMuted, fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                      Staff / Faculty
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', paddingRight: !isLogin ? '44px' : '16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                {!isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.navy}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </div>

            {!isLogin && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>CONFIRM PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', paddingRight: '44px', borderRadius: '8px', border: confirmPassword && password !== confirmPassword ? `1px solid #EF4444` : `1px solid ${colors.border}`, fontSize: '15px', color: colors.text, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.navy}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>Passwords do not match</span>
                )}
              </div>
            )}

            <button disabled={loading} type="submit" style={{ marginTop: '12px', width: '100%', padding: '16px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
              {loading ? 'Processing...' : (isLogin ? 'Authenticate & Enter' : 'Register Identity')} 
              {!loading && <ArrowRight size={18} />}
            </button>
            
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'inherit' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✓</div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, marginBottom: '12px' }}>Account Created Successfully!</h3>
            <p style={{ fontSize: '15px', color: colors.textMuted, marginBottom: '28px', lineHeight: '1.6' }}>Your account has been registered successfully. Please log in with your credentials to continue.</p>
            <button 
              onClick={() => {
                setSuccessModal(false);
              }}
              style={{ width: '100%', padding: '14px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s', fontFamily: 'inherit' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {failureModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'inherit' }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '40px', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✕</div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.red, marginBottom: '12px' }}>Account Creation Failed</h3>
            <p style={{ fontSize: '15px', color: colors.textMuted, marginBottom: '28px', lineHeight: '1.6' }}>{failureMessage || 'An error occurred while creating your account. Please try again.'}</p>
            <button 
              onClick={() => {
                setFailureModal(false);
              }}
              style={{ width: '100%', padding: '14px', backgroundColor: colors.red, color: colors.white, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s', fontFamily: 'inherit' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}