import React, { useState, useEffect, useRef } from 'react';
import { fetchStalls, addStall, editStall, deleteStall } from '../api';
import { Store, Plus, Trash2, Loader2, AlertCircle, Image as ImageIcon, X, Edit3, Save, QrCode } from 'lucide-react';

export default function StallManager() {
  const [stalls, setStalls] = useState([]);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [editingStallId, setEditingStallId] = useState(null); // 👉 NEW: Tracks which stall is being edited
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const colors = {
    navy: '#0C2340', gold: '#E5A823', bg: '#F1F5F9',
    white: '#FFFFFF', text: '#1E293B', textMuted: '#64748B',
    border: '#E2E8F0', red: '#EF4444', blue: '#3B82F6'
  };

  useEffect(() => {
    loadStalls();
  }, []);

  const loadStalls = async () => {
    try {
      setLoading(true);
      const data = await fetchStalls();
      setStalls(data);
      setError("");
    } catch (err) {
      setError("Failed to load stalls.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const MAX_WIDTH = 600;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setNewImage(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      if (editingStallId) {
        // Edit Existing
        const updated = await editStall(editingStallId, newName.trim(), newImage);
        setStalls(stalls.map(s => s.id === editingStallId ? updated : s));
      } else {
        // Add New
        const newStall = await addStall(newName.trim(), newImage);
        setStalls([...stalls, newStall]);
      }
      
      handleCancelEdit();
      setError("");
    } catch (err) {
      setError(err.message || "Operation failed.");
    }
  };

  const handleEditClick = (stall) => {
    setEditingStallId(stall.id);
    setNewName(stall.name);
    setNewImage(stall.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to the form
  };

  const handleCancelEdit = () => {
    setEditingStallId(null);
    setNewName("");
    setNewImage(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadQR = (stallName) => {
    try {
      const safeStallName = encodeURIComponent(stallName);
      // Hardcode localhost base for development (or process.env in production)
      const targetUrl = `${window.location.origin}/?stall=${safeStallName}`;
      
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(targetUrl)}&margin=20`;
      
      // Fetch the binary data, convert to a Blob so we can force a raw download instead of bouncing the browser tab
      fetch(qrApiUrl)
        .then(res => res.blob())
        .then(blob => {
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.style.display = 'none';
           a.href = url;
           a.download = `QR_${stallName.replace(/\s+/g, '_')}.png`;
           document.body.appendChild(a);
           a.click();
           window.URL.revokeObjectURL(url);
           document.body.removeChild(a);
        })
        .catch(err => {
           alert("Failed to generated QR. Ensure you have an active internet connection.");
        });
    } catch(e) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this stall?")) return;
    try {
      if (editingStallId === id) handleCancelEdit();
      await deleteStall(id);
      setStalls(stalls.filter(s => s.id !== id));
      setError("");
    } catch (err) {
      setError("Failed to delete stall.");
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
      
      {/* ─── LEFT COLUMN: FORM ─── */}
      <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '20px' }}>
          <div style={{ backgroundColor: 'rgba(12, 35, 64, 0.05)', padding: '12px', borderRadius: '12px' }}>
            <Store size={28} color={colors.navy} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', color: colors.navy, fontWeight: 800, letterSpacing: '-0.02em' }}>Stall Configurator</h2>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>Add or edit individual food stalls.</p>
          </div>
        </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEF2F2', color: colors.red, padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid #FECACA' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Form Context */}
      <div style={{ backgroundColor: editingStallId ? '#F0F9FF' : colors.bg, padding: '24px', borderRadius: '12px', border: `1px solid ${editingStallId ? '#BAE6FD' : colors.border}`, transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: editingStallId ? colors.blue : colors.textMuted, letterSpacing: '0.05em', margin: 0 }}>
            {editingStallId ? 'EDITING STALL' : 'ADD NEW STALL'}
          </h3>
          {editingStallId && (
            <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancel Edit</button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.navy, marginBottom: '8px' }}>Stall Name <span style={{ color: colors.red }}>*</span></label>
            <input 
              type="text" 
              placeholder="e.g., Dad Bobs..." 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.navy, marginBottom: '8px' }}>Cover Photo (Optional)</label>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
            
            {!newImage ? (
              <div
                onClick={() => fileInputRef.current.click()}
                style={{ width: '100%', padding: '20px', border: `2px dashed ${colors.border}`, borderRadius: '8px', backgroundColor: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', boxSizing: 'border-box' }}
              >
                <div style={{ backgroundColor: colors.bg, padding: '8px', borderRadius: '50%' }}><ImageIcon size={20} color={colors.textMuted} /></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', color: colors.text, fontWeight: 500 }}>Click to upload cover photo</span>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Recommended ratio 16:9 (JPG/PNG)</span>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                <img src={newImage} alt="Stall Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setNewImage(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={!newName.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: newName.trim() ? (editingStallId ? colors.blue : colors.navy) : '#94A3B8', color: colors.white, border: 'none', padding: '16px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s', marginTop: '8px' }}
          >
            {editingStallId ? <><Save size={18} /> Update Stall</> : <><Plus size={18} /> Add Stall to Database</>}
          </button>
        </form>
      </div>
      </div>

      {/* ─── RIGHT COLUMN: ACTIVE STALLS ─── */}
      <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: colors.navy, letterSpacing: '0.05em', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
          ACTIVE STALLS DIRECTORY
          <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: colors.blue }}>{stalls.length} Total</span>
        </h3>
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '14px', padding: '24px 0', justifyContent: 'center' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
          </div>
        ) : stalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: colors.bg, borderRadius: '12px', border: `1px dashed ${colors.border}`, color: colors.textMuted, fontSize: '14px' }}>
            <Store size={32} color="#CBD5E1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
            No stalls found. Add one above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stalls.map(stall => (
              <div key={stall.id} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: `1px solid ${colors.border}`, backgroundColor: editingStallId === stall.id ? '#F8FAFC' : 'transparent', gap: '16px', transition: 'background-color 0.2s' }} onMouseEnter={e => { if (editingStallId !== stall.id) e.currentTarget.style.backgroundColor = '#F8FAFC'; }} onMouseLeave={e => { if (editingStallId !== stall.id) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: colors.bg, overflow: 'hidden', flexShrink: 0 }}>
                  {stall.image ? (
                    <img src={stall.image} alt={stall.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Store size={20} color="#94A3B8" />
                    </div>
                  )}
                </div>
                
                <span style={{ fontWeight: 600, color: colors.text, fontSize: '15px', flex: 1 }}>{stall.name}</span>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => handleDownloadQR(stall.name)}
                    style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', color: '#9333EA', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                    title="Download Auto-Routing QR Code"
                  >
                    <QrCode size={16} />
                  </button>
                  <button 
                    onClick={() => handleEditClick(stall)}
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: colors.blue, cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                    title="Edit Stall"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(stall.id)}
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: colors.red, cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                    title="Remove Stall"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}