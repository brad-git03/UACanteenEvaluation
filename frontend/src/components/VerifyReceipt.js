import React, { useState } from "react";
import { getAllFeedbacks, verifyFeedback } from "../api";
import { Search, ShieldCheck, AlertTriangle, Key, Hash, ArrowLeft, BadgeCheck } from 'lucide-react';

// Import the campus background image
import bgMain from '../Background_img/Screenshot 2026-03-28 165930.png';

export default function VerifyReceipt({ navigate }) {
  const [signatureToVerify, setSignatureToVerify] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | valid | invalid | not_found
  const [targetData, setTargetData] = useState(null);

  // --- CLEAN, MODERN UNIVERSITY COLORS ---
  const colors = {
    navy: '#0C2340',        // Main Brand Color
    gold: '#E5A823',        // Accent Color
    cardBg: '#FFFFFF',      // Pure white for the card
    textMain: '#1E293B',    // Dark slate for readability
    textMuted: '#64748B',   // Gray for secondary text
    inputBg: '#F1F5F9',     // Very light gray for input
    border: '#E2E8F0',
    successBg: '#ECFDF5',
    successText: '#065F46',
    errorBg: '#FEF2F2',
    errorText: '#991B1B'
  };

  const handleVerify = async () => {
    if (!signatureToVerify) return;
    setStatus("checking");
    setTargetData(null);

    try {
      const allData = await getAllFeedbacks();
      const foundRecord = allData.find(f => f.signature === signatureToVerify.trim());

      if (!foundRecord) {
        setTimeout(() => setStatus("not_found"), 1500);
        return;
      }

      setTargetData(foundRecord);
      
      const { valid } = await verifyFeedback(foundRecord);
      setTimeout(() => setStatus(valid ? "valid" : "invalid"), 1500);

    } catch (e) {
      setTimeout(() => setStatus("invalid"), 1500);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif", padding: '40px 20px', position: 'relative'
    }}>
      
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div style={{ 
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url("${bgMain}")`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
      }} />
      
      {/* --- DARK GLASS BLUR OVERLAY --- */}
      <div style={{ 
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: 'rgba(12, 35, 64, 0.8)', // Deep Navy tint (80% opacity)
        backdropFilter: 'blur(16px)',            // Heavy blur effect
        WebkitBackdropFilter: 'blur(16px)'       // Safari support
      }} />

      {/* --- MAIN CONTENT CARD --- */}
      <div style={{ 
        width: '100%', maxWidth: '600px', backgroundColor: colors.cardBg, padding: '48px', 
        borderRadius: '24px', border: `1px solid ${colors.border}`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative',
        zIndex: 1, // Ensures the card sits ABOVE the blurred background
        borderTop: `6px solid ${colors.gold}` 
      }}>
        
        {/* Back Button */}
        <button onClick={() => navigate('landing')} style={{ 
          background: 'transparent', border: 'none', color: colors.textMuted, 
          cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600,
          transition: 'color 0.2s', position: 'absolute', top: '24px', left: '24px'
        }}
        onMouseEnter={(e) => e.target.style.color = colors.navy}
        onMouseLeave={(e) => e.target.style.color = colors.textMuted}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {/* Header Icon */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', 
            borderRadius: '16px', backgroundColor: '#F1F5F9', border: `1px solid ${colors.border}`, marginBottom: '20px',
            color: colors.navy
          }}>
            <BadgeCheck size={32} />
          </div>
          
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: colors.navy, margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
            Verify Receipt
          </h1>
          <p style={{ color: colors.textMuted, margin: '0 0 36px 0', fontSize: '15px', lineHeight: 1.6 }}>
            Paste the Ed25519 signature from your downloaded receipt below to prove your review is secure and unaltered.
          </p>
        </div>

        {/* Input Field */}
        <div style={{ textAlign: 'left', marginBottom: '28px' }}>
          <label style={{ fontSize: '12px', color: colors.navy, fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>
            ED25519 SIGNATURE STRING
          </label>
          <textarea 
            placeholder="Paste your signature here (e.g. jx9A...)" 
            value={signatureToVerify} 
            onChange={(e) => setSignatureToVerify(e.target.value)} 
            style={{ 
              width: '100%', height: '110px', padding: '16px', fontSize: '14px', fontFamily: 'monospace', 
              borderRadius: '12px', border: `2px solid ${colors.border}`, backgroundColor: colors.inputBg, 
              color: colors.textMain, resize: 'none', outline: 'none', transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = colors.navy}
            onBlur={(e) => e.target.style.borderColor = colors.border}
          />
        </div>

        {/* Action Button */}
        <button 
          onClick={handleVerify}
          disabled={status === 'checking' || !signatureToVerify}
          style={{ 
            width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', gap: '10px', backgroundColor: colors.navy, color: '#fff', borderRadius: '12px',
            border: 'none', cursor: (status === 'checking' || !signatureToVerify) ? 'not-allowed' : 'pointer',
            opacity: (status === 'checking' || !signatureToVerify) ? 0.7 : 1, transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(12, 35, 64, 0.15)'
          }}
        >
          {status === 'checking' ? "Auditing Blockchain Math..." : <><Search size={20} color={colors.gold} /> Run Verification</>}
        </button>

        {/* --- DYNAMIC RESULTS --- */}
        {status === "not_found" && (
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: colors.inputBg, border: `2px dashed ${colors.border}`, borderRadius: '16px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <Search size={28} color={colors.textMuted} style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, color: colors.navy, fontSize: '16px', marginBottom: '4px' }}>Record Not Found</div>
            <div style={{ fontSize: '14px', color: colors.textMuted }}>No database entry matches this exact signature.</div>
          </div>
        )}

        {status === "valid" && (
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: colors.successBg, border: '1px solid #A7F3D0', borderRadius: '16px', textAlign: 'left', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: colors.successText }}>
              <ShieldCheck size={24} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Authenticity Verified</h3>
            </div>
            <div style={{ fontSize: '14px', color: '#047857', marginBottom: '16px', lineHeight: 1.5 }}>
              The mathematical hash matches the database perfectly. Your review is intact.
            </div>
            <div style={{ fontSize: '13px', color: '#064E3B', backgroundColor: '#D1FAE5', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', border: '1px solid #6EE7B7' }}>
              <div style={{ marginBottom: '6px' }}><Hash size={14} style={{display:'inline', verticalAlign: 'text-bottom', marginRight: '6px'}}/> Payload: "{targetData?.customer_name || 'Anon'}", Rating: {targetData?.rating}</div>
              <div><Key size={14} style={{display:'inline', verticalAlign: 'text-bottom', marginRight: '6px'}}/> PubKey: {targetData?.public_key?.substring(0, 24)}...</div>
            </div>
          </div>
        )}

        {status === "invalid" && targetData && (
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: colors.errorBg, border: '1px solid #FECACA', borderRadius: '16px', textAlign: 'left', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: colors.errorText }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Integrity Compromised</h3>
            </div>
            <div style={{ fontSize: '14px', color: '#B91C1C', lineHeight: 1.5 }}>
              The database record attached to this signature has been altered. The computed hash does not match your receipt. Data tampering detected.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}