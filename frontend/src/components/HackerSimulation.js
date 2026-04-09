import React, { useState, useEffect } from 'react';
import { getLightFeedbacks, tamperFeedback } from '../api';
import { Terminal, ShieldAlert, Cpu, Database, AlertTriangle } from 'lucide-react';

export default function HackerSimulation({ navigate }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editRating, setEditRating] = useState('');
  const [editComment, setEditComment] = useState('');
  const [logs, setLogs] = useState(["SYSTEM BOOT...", "ESTABLISHING SECURE CONNECTION...", "ACCESSING DATABASE..."]);
  const [status, setStatus] = useState('idle');
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const data = await getLightFeedbacks();
      setFeedbacks(data);
    } catch (e) {
      addLog(`ERROR: Connection refused.`);
    }
  };

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSelect = (fb) => {
    setSelectedId(fb.id);
    setEditRating(fb.rating);
    setEditComment(fb.comment);
    addLog(`TARGET ACQUIRED: ID [${fb.id}] User [${fb.customer_name || 'ANON'}]`);
  };

  const handleExecuteHack = async () => {
    if (!selectedId) {
      addLog("ERROR: NO TARGET SELECTED.");
      return;
    }
    setStatus('hacking');
    addLog(`INJECTING SQL PAYLOAD AT ID [${selectedId}]...`);
    
    try {
      await tamperFeedback(selectedId, Number(editRating), editComment);
      
      addLog("SUCCESS: DATABASE FRACTURED AND RECORD ALTERED.");
      setStatus('success');
      fetchData(); // refresh data
    } catch (err) {
      addLog(`CRITICAL FAILURE: ${err.message}`);
      setStatus('idle');
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '1337') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', color: '#00ff41', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Courier New", Courier, monospace', backgroundImage: 'radial-gradient(#113b11 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <form onSubmit={handlePinSubmit} style={{ border: '1px solid #00ff41', padding: '40px', backgroundColor: '#000', textAlign: 'center', boxShadow: '0 0 15px rgba(0,255,65,0.2)' }}>
          <ShieldAlert size={48} color="#00ff41" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 20px 0', letterSpacing: '2px' }}>RESTRICTED ACCESS</h2>
          <p style={{ marginBottom: '20px', color: pinError ? '#ff0000' : '#00ff41' }}>
            {pinError ? 'ACCESS DENIED. INVALID PIN.' : 'ENTER OVERRIDE PIN:'}
          </p>
          <input 
            type="password" 
            autoFocus
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ backgroundColor: '#050505', color: '#00ff41', border: '1px solid #00ff41', padding: '10px', fontSize: '20px', textAlign: 'center', letterSpacing: '5px', width: '200px', outline: 'none' }}
            maxLength={4}
          />
          <div style={{ marginTop: '20px' }}>
            <button type="submit" style={{ backgroundColor: 'transparent', color: '#00ff41', border: '1px solid #00ff41', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}>
              AUTHENTICATE
            </button>
            <button type="button" onClick={() => navigate('landing')} style={{ marginLeft: '10px', backgroundColor: 'transparent', color: '#005500', border: '1px solid #005500', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
              CANCEL
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#00ff41', minHeight: '100vh', padding: '20px', fontFamily: '"Courier New", Courier, monospace', backgroundImage: 'radial-gradient(#113b11 1px, transparent 1px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #00ff41', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Terminal size={24} color="#00ff41" />
          <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '2px', textShadow: '0 0 5px #00ff41' }}>ROOT@UA-CANTEEN-DB:~#</h1>
        </div>
        <button onClick={() => navigate('landing')} style={{ backgroundColor: 'transparent', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', fontWeight: 'bold' }}>
          Disconnect
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
        
        {/* Left Column: Data Selection & Form */}
        <div style={{ border: '1px solid #008f11', padding: '20px', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px dashed #008f11', paddingBottom: '10px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} /> VULNERABLE RECORDS LIST
          </h2>
          
          <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #003b00', padding: '10px' }}>
            {feedbacks.map((fb) => (
              <div 
                key={fb.id} 
                onClick={() => handleSelect(fb)}
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer', 
                  borderBottom: '1px dotted #003b00',
                  backgroundColor: selectedId === fb.id ? '#003b00' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>ID: {fb.id} | {fb.customer_name || 'ANONYMOUS'}</span>
                <span>⭐ {fb.rating}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '18px', borderBottom: '1px dashed #008f11', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} /> PAYLOAD CONFIGURATION
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#008f11' }}>FORCE RATING (1-5):</label>
              <input 
                type="number" 
                min="1" max="5"
                value={editRating} 
                onChange={(e) => setEditRating(e.target.value)}
                disabled={!selectedId || status === 'hacking'}
                style={{ width: '100%', padding: '10px', backgroundColor: '#050505', border: '1px solid #008f11', color: '#00ff41', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#008f11' }}>ALTER COMMENT/SUMMARY DATA:</label>
              <textarea 
                value={editComment} 
                onChange={(e) => setEditComment(e.target.value)}
                disabled={!selectedId || status === 'hacking'}
                style={{ width: '100%', height: '120px', padding: '10px', backgroundColor: '#050505', border: '1px solid #008f11', color: '#00ff41', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
            
            <button 
              onClick={handleExecuteHack}
              disabled={!selectedId || status === 'hacking'}
              style={{
                padding: '15px',
                marginTop: '10px',
                backgroundColor: (status === 'hacking' || !selectedId) ? '#111' : '#bb0000',
                color: (status === 'hacking' || !selectedId) ? '#333' : '#fff',
                border: '1px solid',
                borderColor: (status === 'hacking' || !selectedId) ? '#333' : '#ff0000',
                cursor: (status === 'hacking' || !selectedId) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontWeight: 'bold',
                fontSize: '16px',
                letterSpacing: '1px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                textShadow: status !== 'hacking' && selectedId ? '0 0 5px #ff0000' : 'none'
              }}
            >
              {status === 'hacking' ? 'INJECTING...' : <><ShieldAlert size={20} /> EXECUTE DIRECT DB OVERRIDE</>}
            </button>
            {status === 'success' && (
              <div style={{ color: '#ffcc00', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                <AlertTriangle size={16} /> Data altered without signature re-generation. Verification will now fail.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Terminal Output */}
        <div style={{ border: '1px solid #008f11', padding: '20px', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', borderBottom: '1px dashed #008f11', paddingBottom: '10px', marginTop: 0 }}>LIVE TERMINAL LOGS</h2>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#050505', border: '1px solid #003b00' }}>
            {logs.map((log, index) => (
              <div key={index} style={{ fontSize: '14px', lineHeight: '1.4' }}>
                {log}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
              <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
