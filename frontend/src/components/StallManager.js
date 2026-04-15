import React, { useState, useEffect } from 'react';
import { fetchStalls, addStall, deleteStall } from '../api';
import { Store, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function StallManager() {
  const [stalls, setStalls] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const colors = {
    navy: '#0C2340', gold: '#E5A823', bg: '#F1F5F9',
    white: '#FFFFFF', text: '#1E293B', textMuted: '#64748B',
    border: '#E2E8F0', red: '#EF4444'
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const newStall = await addStall(newName.trim());
      setStalls([...stalls, newStall]);
      setNewName("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to add stall. It might already exist.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this stall?")) return;
    try {
      await deleteStall(id);
      setStalls(stalls.filter(s => s.id !== id));
      setError("");
    } catch (err) {
      setError("Failed to delete stall.");
    }
  };

  return (
    <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '24px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
        <div style={{ backgroundColor: '#EEF2FF', padding: '10px', borderRadius: '8px' }}>
          <Store size={24} color={colors.navy} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: colors.navy, fontWeight: 700 }}>Food Stalls</h2>
          <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>Manage the stalls available for student feedback.</p>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEF2F2', color: colors.red, padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #FECACA' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Add New Stall Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
        <input 
          type="text" 
          placeholder="e.g., Pasta Corner..." 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '14px', outline: 'none' }}
        />
        <button 
          type="submit" 
          disabled={!newName.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: newName.trim() ? colors.navy : '#94A3B8', color: colors.white, border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
        >
          <Plus size={16} /> Add
        </button>
      </form>

      {/* Stall List */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: colors.textMuted, letterSpacing: '0.05em', marginBottom: '12px' }}>ACTIVE STALLS ({stalls.length})</h3>
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMuted, fontSize: '14px' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
          </div>
        ) : stalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', backgroundColor: colors.bg, borderRadius: '8px', color: colors.textMuted, fontSize: '14px' }}>
            No stalls found. Add one above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stalls.map(stall => (
              <div key={stall.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                <span style={{ fontWeight: 500, color: colors.text, fontSize: '14px' }}>{stall.name}</span>
                <button 
                  onClick={() => handleDelete(stall.id)}
                  style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.red}
                  onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
                  title="Remove Stall"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}