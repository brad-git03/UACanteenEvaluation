import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function StudentLogin(props) {
  const [schoolId, setSchoolId] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    const idRegex = /^[0-9]{8,10}$/; 
    if (!idRegex.test(schoolId)) {
      alert("Please enter a valid School ID number.");
      return;
    }
    props.onLoginSuccess(schoolId);
  }

  function handleIdChange(e) {
    setSchoolId(e.target.value.replace(/[^0-9]/g, ''));
  }

  function goBack() {
    props.navigate('landing');
  }

  return (
    <div className="portal-style-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0c2340' }}>
      <form onSubmit={handleLogin} style={{ padding: '40px', maxWidth: '400px', width: '100%', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Lock size={24} color="var(--accent-gold)" /> Student Verification
        </h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', letterSpacing: '0.5px' }}>SCHOOL ID NUMBER</label>
          <input 
            type="text" 
            placeholder="e.g. 20241029"
            value={schoolId} 
            onChange={handleIdChange} 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '8px', fontSize: '16px' }} 
            required 
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', marginBottom: '12px' }}>
          Verify ID
        </button>
        
        <button type="button" onClick={goBack} className="btn btn-secondary" style={{ width: '100%', padding: '14px', fontSize: '16px', backgroundColor: 'transparent', color: '#666', border: '1px solid #ccc' }}>
          Cancel
        </button>
      </form>
    </div>
  );
}