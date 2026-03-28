import React, { useState } from "react";
import { getAllFeedbacks, verifyFeedback } from "../api";
import { Lock, Search, ShieldCheck, AlertTriangle, Key, Hash } from 'lucide-react';

export default function VerifyReceipt({ navigate }) {
  const [signatureToVerify, setSignatureToVerify] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | valid | invalid | not_found
  const [targetData, setTargetData] = useState(null);

  const handleVerify = async () => {
    if (!signatureToVerify) return;
    setStatus("checking");
    setTargetData(null);

    try {
      // Find the record by its signature
      const allData = await getAllFeedbacks();
      const foundRecord = allData.find(f => f.signature === signatureToVerify.trim());

      if (!foundRecord) {
        setTimeout(() => setStatus("not_found"), 1500);
        return;
      }

      setTargetData(foundRecord);
      
      // Prove if it's still cryptographically valid
      const { valid } = await verifyFeedback(foundRecord);
      setTimeout(() => setStatus(valid ? "valid" : "invalid"), 1500);

    } catch (e) {
      setTimeout(() => setStatus("invalid"), 1500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', backgroundColor: '#f9f7f1' }}>
      
      <div className="card animate-in" style={{ width: '100%', maxWidth: '600px', padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(10, 27, 63, 0.1)', marginBottom: '20px' }}>
          <Lock size={30} color="var(--bg-dark-green)" />
        </div>
        
        <h1 className="serif" style={{ fontSize: '2.2rem', color: 'var(--bg-dark-green)', marginBottom: '10px' }}>
          Verify <span style={{ color: 'var(--accent-gold)' }}>Receipt</span>
        </h1>
        <p style={{ color: '#666', marginBottom: '40px', fontSize: '15px' }}>
          Paste the Ed25519 signature from your PDF receipt below to cryptographically prove your review has not been altered.
        </p>

        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Ed25519 SIGNATURE</label>
          <textarea 
            placeholder="Paste your 128-character signature here..." 
            value={signatureToVerify} 
            onChange={(e) => setSignatureToVerify(e.target.value)} 
            style={{ width: '100%', height: '100px', padding: '16px', fontSize: '14px', fontFamily: 'monospace', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', resize: 'none' }}
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleVerify}
          disabled={status === 'checking' || !signatureToVerify}
          style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: 'var(--bg-dark-green)' }}
        >
          {status === 'checking' ? "Auditing Blockchain Math..." : <><Search size={18} /> Run Cryptographic Verification</>}
        </button>

        <button onClick={() => navigate('landing')} style={{ marginTop: '20px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px' }}>
          ← Back to Home
        </button>

        {/* --- DYNAMIC RESULTS --- */}
        {status === "not_found" && (
          <div className="animate-in" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '12px' }}>
            <AlertTriangle size={32} color="#999" style={{ marginBottom: '10px' }} />
            <div style={{ fontWeight: 'bold', color: '#666' }}>Record Not Found</div>
            <div style={{ fontSize: '14px', color: '#999' }}>No database entry matches this signature.</div>
          </div>
        )}

        {status === "valid" && (
          <div className="animate-in" style={{ marginTop: '30px', padding: '25px', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '12px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--success)' }}>
              <ShieldCheck size={28} />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Authenticity Verified</h3>
            </div>
            <div style={{ fontSize: '14px', color: '#444', marginBottom: '15px' }}>
              The mathematical hash matches the database payload perfectly. <strong>Your review is intact and unmodified.</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#666', backgroundColor: 'white', padding: '12px', borderRadius: '8px', fontFamily: 'monospace' }}>
              <div><Hash size={12} style={{display:'inline'}}/> Payload Data: "{targetData?.customer_name}", Rating: {targetData?.rating}</div>
              <div style={{marginTop: '5px'}}><Key size={12} style={{display:'inline'}}/> Public Key: {targetData?.public_key?.substring(0, 20)}...</div>
            </div>
          </div>
        )}

        {status === "invalid" && targetData && (
          <div className="animate-in" style={{ marginTop: '30px', padding: '25px', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '12px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--danger)' }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0, fontSize: '18px' }}>Integrity Compromised</h3>
            </div>
            <div style={{ fontSize: '14px', color: '#444' }}>
              The database record attached to this signature has been altered since submission. The computed hash does not match your receipt.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}