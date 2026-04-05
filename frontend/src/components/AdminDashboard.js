import React, { useEffect, useState, useRef } from "react";
import { getAllFeedbacks, verifyFeedback, deleteFeedback, quarantineFeedback } from "../api";
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts';
import { Camera, LayoutDashboard, FileText, LogOut, ShieldCheck, X, Star, Key, Hash, ShieldAlert, Search, Download, AlertTriangle, Clock, Terminal, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminDashboard({ navigate }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [verifyState, setVerifyState] = useState({});
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [traceModal, setTraceModal] = useState(null);
  const [traceStatus, setTraceStatus] = useState('loading');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  const isAuditingRef = useRef(isAuditing);
  useEffect(() => { isAuditingRef.current = isAuditing; }, [isAuditing]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeMenu]);

  useEffect(() => {
    const fetchAndAudit = async () => {
      if (isAuditingRef.current) return;
      try {
        const data = await getAllFeedbacks();
        setFeedbacks(data);
        const results = await Promise.all(data.map(async (f) => {
          try {
            const { valid } = await verifyFeedback(f);
            return { id: f.id, status: valid ? "valid" : "invalid" };
          } catch {
            return { id: f.id, status: "invalid" };
          }
        }));

        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setVerifyState(prev => {
          const nextState = { ...prev };
          results.forEach(res => {
            const existing = nextState[res.id] || {};
            if (existing.status !== 'checking') {
              nextState[res.id] = {
                status: res.status,
                tamperTime: res.status === 'invalid' ? (existing.tamperTime || now) : null
              };
            }
          });
          return nextState;
        });
      } catch (error) {
        console.error("Live sync error:", error);
      }
    };

    fetchAndAudit(); 
    const intervalId = setInterval(fetchAndAudit, 3000); 
    return () => clearInterval(intervalId); 
  }, []);

  // --- CORE LOGIC: DYNAMIC DATA ISOLATION ---
  const isCompromised = (f) => f.is_quarantined || verifyState[f.id]?.status === 'invalid';
  
  const safeFeedbacks = feedbacks.filter(f => !isCompromised(f));
  const compromisedFeedbacks = feedbacks.filter(f => isCompromised(f));
  const activeBreachCount = compromisedFeedbacks.length;

  // --- PAGINATION & VIEW ROUTING ---
  let displayedFeedbacks = [];
  if (activeMenu === 'dashboard' || activeMenu === 'records') displayedFeedbacks = safeFeedbacks;
  else if (activeMenu === 'verify') displayedFeedbacks = feedbacks; 
  else if (activeMenu === 'quarantine') displayedFeedbacks = compromisedFeedbacks;

  const searchedFeedbacks = displayedFeedbacks.filter(f =>
    (f.customer_name || 'Anonymous').toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toString().includes(searchTerm)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchedFeedbacks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedFeedbacks.length / itemsPerPage);

  // --- GRAPH CALCULATIONS (USING ONLY SAFE DATA) ---
  const total = safeFeedbacks.length;
  const avgValue = total > 0 ? Number((safeFeedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2)) : 0;
  const avgPercent = Math.round((avgValue / 5) * 100);
  const avgLabel = avgValue >= 4.5 ? "Excellent" : avgValue >= 3.5 ? "Good" : avgValue >= 2.5 ? "Fair" : "Needs Improvement";

  const pieData = [5, 4, 3, 2, 1].map(star => ({
    star, name: `${star} Stars`,
    value: safeFeedbacks.filter(f => f.rating === star).length,
    percentage: total > 0 ? Number(((safeFeedbacks.filter(f => f.rating === star).length / total) * 100).toFixed(1)) : 0
  })).filter(d => d.value > 0);
  const dominantRating = pieData.length > 0 ? pieData.reduce((best, current) => current.value > best.value ? current : best, pieData[0]) : { star: 'N/A' };

  const COLORS = ['#0a1b3f', '#4169e1', '#d4a017', '#e6c25a', '#c93b3b'];
  const categoryTotals = { Food: 0, Service: 0, Staff: 0, Clean: 0, Value: 0 };
  let count = 0;

  safeFeedbacks.forEach(f => {
    const match = f?.comment?.match(/\[Scores -> Food: (\d)\/5 \| Service: (\d)\/5 \| Staff: (\d)\/5 \| Clean: (\d)\/5 \| Value: (\d)\/5\]/);
    if (match) {
      categoryTotals.Food += parseInt(match[1]); categoryTotals.Service += parseInt(match[2]);
      categoryTotals.Staff += parseInt(match[3]); categoryTotals.Clean += parseInt(match[4]);
      categoryTotals.Value += parseInt(match[5]); count++;
    }
  });

  const barData = [
    { name: 'Food', score: count ? Number((categoryTotals.Food / count).toFixed(1)) : 0 },
    { name: 'Service', score: count ? Number((categoryTotals.Service / count).toFixed(1)) : 0 },
    { name: 'Staff', score: count ? Number((categoryTotals.Staff / count).toFixed(1)) : 0 },
    { name: 'Clean', score: count ? Number((categoryTotals.Clean / count).toFixed(1)) : 0 },
    { name: 'Value', score: count ? Number((categoryTotals.Value / count).toFixed(1)) : 0 },
  ];
  const topCategory = count > 0 ? [...barData].sort((a, b) => b.score - a.score)[0] : { name: "N/A", score: 0 };

  // --- ACTIONS ---
  const handleVerify = async (feedback) => {
    setVerifyState(prev => ({ ...prev, [feedback.id]: { status: "checking" } }));
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      const { valid } = await verifyFeedback(feedback);
      setVerifyState(prev => ({ ...prev, [feedback.id]: { status: valid ? "valid" : "invalid", tamperTime: valid ? null : now } }));
    } catch (e) {
      setVerifyState(prev => ({ ...prev, [feedback.id]: { status: "invalid", tamperTime: now } }));
    }
  };

  const runSystemAudit = async () => {
    setIsAuditing(true);
    for (let f of feedbacks) {
      await handleVerify(f);
      await new Promise(res => setTimeout(res, 150));
    }
    setIsAuditing(false);
  };

  const runDetailedTrace = async (f) => {
    setTraceModal(f);
    setTraceStatus('loading');
    setVerifyState(prev => ({ ...prev, [f.id]: { status: "checking" } }));

    setTimeout(async () => {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      try {
        const { valid } = await verifyFeedback(f);
        setVerifyState(prev => ({ ...prev, [f.id]: { status: valid ? "valid" : "invalid", tamperTime: valid ? null : now } }));
        setTraceStatus(valid ? 'pass' : 'fail');
      } catch (e) {
        setVerifyState(prev => ({ ...prev, [f.id]: { status: "invalid", tamperTime: now } }));
        setTraceStatus('fail');
      }
    }, 1500);
  };

  const handleQuarantineRecord = async (id) => {
    if (window.confirm(`SECURITY ALERT: Move Record #${id} to the Quarantine Zone?`)) {
      try {
        await quarantineFeedback(id);
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_quarantined: true } : f));
      } catch (err) {
        alert("Failed to quarantine record. Check backend server.");
      }
    }
  };

  const handlePurgeRecord = async (id) => {
    if (window.confirm(`FINAL WARNING: Are you sure you want to permanently delete Record #${id}? This action cannot be undone.`)) {
      try {
        await deleteFeedback(id);
        setFeedbacks(prev => prev.filter(f => f.id !== id));
      } catch (err) {
        alert("Failed to permanently delete record.");
      }
    }
  };

  const exportToCSV = () => {
    const headers = ["ID,Date,Time,Customer Name,Rating,Ed25519 Signature,Public Key,Integrity Check,Tamper Detected At"];
    const rows = feedbacks.map(f => {
      const state = verifyState[f.id] || {};
      const status = state.status === 'valid' ? 'Authentic' : (state.status === 'invalid' ? 'TAMPERED' : 'Pending');
      const tamperTime = state.tamperTime || 'N/A';
      const dateStr = f.created_at ? new Date(f.created_at).toLocaleString() : 'N/A';
      return `${f.id},${dateStr},"${f.customer_name || 'Anonymous'}",${f.rating},${f.signature},${f.public_key},${status},${tamperTime}`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ua_crypto_audit_log.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const parseFeedbackData = (text) => {
    if (!text) return { metrics: null, text: "No comment provided." };
    const match = text.match(/\[Scores -> Food: (\d)\/5 \| Service: (\d)\/5 \| Staff: (\d)\/5 \| Clean: (\d)\/5 \| Value: (\d)\/5\]/);
    if (match) {
      const parts = text.split('\n\n');
      return {
        metrics: { Food: match[1], Service: match[2], Staff: match[3], Cleanliness: match[4], Value: match[5] },
        text: parts.slice(1).join('\n\n').trim() || "No written comment provided."
      };
    }
    return { metrics: null, text: text };
  };

  const formatPrecisionDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: '' };
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const MenuItem = ({ id, icon: Icon, label, badge }) => {
    const isActive = activeMenu === id;
    return (
      <div onClick={() => setActiveMenu(id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '10px', color: isActive ? 'var(--accent-gold)' : '#a0aab2', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Icon size={22} /> <span style={{ fontWeight: isActive ? 500 : 400 }}>{label}</span>
        </div>
        {badge > 0 && (
          <span style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>{badge}</span>
        )}
      </div>
    );
  };

  const PaginationControls = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '15px 0', borderTop: '1px solid #eee' }}>
      <span style={{ fontSize: '14px', color: '#888' }}>
        Showing <strong>{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</strong> to <strong>{Math.min(indexOfLastItem, searchedFeedbacks.length)}</strong> of <strong>{searchedFeedbacks.length}</strong> records
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button className="btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: currentPage === 1 ? 0.5 : 1 }}>
          <ChevronLeft size={16} /> Prev
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--bg-dark-green)', padding: '0 10px' }}>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button className="btn-secondary" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1 }}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9f7f1', position: 'relative' }}>
      
      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* SIDEBAR */}
      <div className="admin-sidebar" style={{ width: '280px', background: 'linear-gradient(180deg, var(--bg-dark-green) 0%, #050d21 100%)', color: 'white', padding: '40px 25px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '45px' }}>
          <img src="/ua-logo.png" alt="University Logo" style={{ width: '46px', height: '46px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="serif" style={{ color: 'white', fontSize: '1.7rem', margin: 0, lineHeight: '1.1' }}>UA <span style={{ color: 'var(--accent-gold)' }}>Canteen</span></h2>
            <p style={{ fontSize: '11px', color: '#a0aab2', margin: 0, marginTop: '4px', letterSpacing: '0.3px' }}>EdDSA Secured • Admin</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00ff00', marginBottom: '45px', paddingLeft: '60px', opacity: 0.8 }}>
          <div style={{ width: '6px', height: '6px', backgroundColor: '#00ff00', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
          LIVE SYNC ACTIVE
        </div>

        <MenuItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
        <MenuItem id="records" icon={FileText} label="Safe Records" />
        <MenuItem id="verify" icon={ShieldCheck} label="Crypto Logs" />
        <div style={{ margin: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
        <MenuItem id="quarantine" icon={ShieldAlert} label="Quarantine" badge={activeBreachCount} />

        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.05)', padding: '18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '16px' }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>UA Admin</div>
            <div style={{ fontSize: '13px', color: '#a0aab2' }}>admin@ua.edu.ph</div>
          </div>
          <LogOut size={20} color="#a0aab2" style={{ cursor: 'pointer' }} onClick={() => navigate('landing')} title="Logout" />
        </div>
      </div>

      <div className="admin-content" style={{ flex: 1, padding: '50px 60px', overflowY: 'auto' }}>

        {/* ---------------- VIEW 1: DASHBOARD ---------------- */}
        {activeMenu === "dashboard" && (
          <div className="animate-in">
            {activeBreachCount > 0 && (
              <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '15px 25px', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 8px 24px rgba(201, 59, 59, 0.3)' }}>
                <AlertTriangle size={28} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>SECURITY COMPROMISED</h3>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{activeBreachCount} record(s) have failed cryptographic integrity checks. They have been isolated from your metrics.</p>
                </div>
                <button onClick={() => setActiveMenu('quarantine')} style={{ backgroundColor: 'white', color: 'var(--danger)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>View Quarantine</button>
              </div>
            )}

            <h1 className="serif" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Dashboard <span style={{ color: 'var(--accent-gold)' }}>Overview</span></h1>
            <p style={{ color: '#666', marginBottom: '40px', fontSize: '16px' }}>Real-time verified insights from PostgreSQL.</p>

            <div className="admin-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
              <div className="card" style={{ borderTop: '5px solid var(--bg-dark-green)', padding: '30px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Verified Records</div>
                <div className="serif" style={{ fontSize: '2.8rem', color: 'var(--bg-dark-green)' }}>{total}</div>
                <div style={{ fontSize: '14px', color: '#999' }}>Safe submissions</div>
              </div>
              <div className="card" style={{ borderTop: `5px solid ${activeBreachCount > 0 ? 'var(--danger)' : 'var(--success)'}`, padding: '30px', backgroundColor: activeBreachCount > 0 ? 'var(--danger-bg)' : 'white' }}>
                <div style={{ fontSize: '14px', color: activeBreachCount > 0 ? 'var(--danger)' : '#666', fontWeight: 600, textTransform: 'uppercase' }}>System Integrity</div>
                <div className="serif" style={{ fontSize: '2.2rem', color: activeBreachCount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeBreachCount > 0 ? <><ShieldAlert size={28} /> ISOLATED</> : <><ShieldCheck size={28} /> Active</>}
                </div>
                <div style={{ fontSize: '14px', color: activeBreachCount > 0 ? 'var(--danger)' : '#999', fontWeight: activeBreachCount > 0 ? 600 : 400 }}>
                  {activeBreachCount > 0 ? `${activeBreachCount} tampered records hidden` : "Ed25519 Secured"}
                </div>
              </div>
              <div className="card" style={{ borderTop: '5px solid var(--accent-gold)', padding: '30px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Average Rating</div>
                <div className="serif" style={{ fontSize: '2.8rem', color: 'var(--bg-dark-green)' }}>{avgValue.toFixed(2)} <span style={{ fontSize: '1.2rem', color: '#999' }}>/ 5</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                  <Star size={15} color="var(--accent-gold)" fill="var(--accent-gold)" /> {avgLabel}
                </div>
                <div style={{ height: '8px', backgroundColor: '#ece8dc', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: `${avgPercent}%`, height: '100%', backgroundColor: 'var(--accent-gold)' }} />
                </div>
                <div style={{ fontSize: '13px', color: '#999' }}>{avgPercent}% of maximum score</div>
              </div>
              <div className="card" style={{ borderTop: '5px solid #c93b3b', padding: '30px' }}>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Top Category</div>
                <div className="serif" style={{ fontSize: '2rem', color: 'var(--bg-dark-green)', marginTop: '12px' }}>{topCategory.name}</div>
                <div style={{ fontSize: '14px', color: '#999', marginTop: '6px' }}>Highest rated ({topCategory.score})</div>
              </div>
            </div>

            <div className="admin-grid-charts" style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '24px', marginBottom: '30px' }}>
              <div className="card" style={{ padding: '35px' }}>
                <h3 style={{ fontSize: '16px', textTransform: 'uppercase', color: '#666', marginBottom: '30px', letterSpacing: '0.5px' }}>Category Averages</h3>
                {count === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '16px' }}>No safe multi-category records available.</div>
                ) : (
                  <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer>
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 14 }} dy={10} />
                        <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 14 }} />
                        <BarTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '14px' }} />
                        <Bar dataKey="score" fill="var(--bg-dark-green)" radius={[6, 6, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '35px' }}>
                <h3 style={{ fontSize: '16px', textTransform: 'uppercase', color: '#666', marginBottom: '30px', letterSpacing: '0.5px' }}>Score Distribution</h3>
                {total === 0 ? (
                  <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '16px' }}>No safe records available.</div>
                ) : (
                  <div className="admin-grid-pie" style={{ display: 'grid', gridTemplateColumns: '58% 42%', alignItems: 'center', gap: '8px' }}>
                    <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={pieData} innerRadius={80} outerRadius={120} paddingAngle={3} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <PieTooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '14px' }}
                            formatter={(value, name, payload) => [`${value} (${payload.payload.percentage}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: '13px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Responses</div>
                        <div className="serif" style={{ fontSize: '2rem', color: 'var(--bg-dark-green)', lineHeight: 1.1 }}>{total}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#666', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>Breakdown</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pieData.map((entry, index) => (
                          <div key={entry.star} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto auto', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#444' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], display: 'inline-block' }} />
                            <span>{entry.star} Star</span>
                            <span style={{ fontWeight: 600 }}>{entry.value}</span>
                            <span style={{ color: '#888' }}>{entry.percentage}%</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '18px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--input-bg)', fontSize: '13px', color: '#555' }}>
                        Most common rating: <strong>{dominantRating.star} Star</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW 2: SAFE RECORDS ---------------- */}
        {activeMenu === "records" && (
          <div className="card animate-in" style={{ minHeight: '80vh', padding: '40px', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
              <div>
                <h1 className="serif" style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Safe Customer Feedback</h1>
                <p style={{ color: '#666', fontSize: '16px' }}>Only cryptographically verified authentic records are shown here.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--input-bg)', borderRadius: '10px', padding: '10px 16px', width: '300px', border: '1px solid var(--border-color)' }}>
                <Search size={18} color="#999" style={{ marginRight: '10px' }} />
                <input type="text" placeholder="Search verified records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', margin: 0, padding: 0 }} />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '8%' }}>ID</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '18%' }}><Clock size={14} style={{ position: 'relative', top: '2px', marginRight: '4px' }} /> TIMESTAMP</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '18%' }}>CUSTOMER</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '34%' }}>FEEDBACK SUMMARY</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '10%' }}>RATING</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '12%', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No safe records found.</td></tr>
                ) : currentItems.map((f, index) => {
                  const parsed = parseFeedbackData(f.comment);
                  const precisionDate = formatPrecisionDate(f.created_at);
                  return (
                    <tr key={f.id} className="animate-in" style={{ borderBottom: '1px solid #eee', animationDelay: `${index * 0.05}s` }}>
                      <td style={{ padding: '24px 12px', color: '#999', fontSize: '14px' }}>#{f.id}</td>
                      <td style={{ padding: '24px 12px', color: '#666', fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{precisionDate.date}</div>
                        <div style={{ color: '#aaa', fontSize: '12px' }}>{precisionDate.time}</div>
                      </td>
                      <td style={{ padding: '24px 12px', fontWeight: 500, fontSize: '15px' }}>{f.customer_name || 'Anonymous'}</td>
                      
                      {/* UPDATED: Displays the [PHOTO] badge if an attachment is present */}
                      <td style={{ padding: '24px 12px', fontSize: '15px', color: '#444' }}>
                        {parsed.metrics ? <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>[Multi-Category Entry]</span> : `"${parsed.text.substring(0, 45)}..."`}
                        {f.attachment && <span style={{fontSize: '11px', color: 'var(--bg-dark-green)', fontWeight: 'bold', marginLeft: '8px'}}>[PHOTO]</span>}
                      </td>

                      <td style={{ padding: '24px 12px', fontWeight: 600, color: 'var(--accent-gold)', fontSize: '15px' }}>{f.rating} / 5</td>
                      <td style={{ padding: '24px 12px', textAlign: 'right' }}>
                        <button className="btn-secondary" onClick={() => setSelectedFeedback(f)} style={{ fontSize: '14px', padding: '8px 16px' }}>View Full</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 'auto' }}>
              <PaginationControls />
            </div>
          </div>
        )}

        {/* ---------------- VIEW 3: SECURITY AUDITOR LOGS ---------------- */}
        {activeMenu === "verify" && (
          <div className="card animate-in" style={{ minHeight: '80vh', padding: '40px', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
              <div>
                <h1 className="serif" style={{ fontSize: '2.2rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={32} color="var(--bg-dark-green)" /> Cryptographic Audit Logs
                </h1>
                <p style={{ color: '#666', fontSize: '16px' }}>Raw Ed25519 signatures and payloads for database integrity verification.</p>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={exportToCSV} className="btn-secondary" style={{ padding: '14px 20px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white' }}>
                  <Download size={20} /> Export CSV
                </button>
                <button onClick={runSystemAudit} disabled={isAuditing} style={{ backgroundColor: 'var(--bg-dark-green)', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, cursor: isAuditing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
                  {isAuditing ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                  {isAuditing ? "Auditing System..." : "Run Global Audit"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--input-bg)', borderRadius: '10px', padding: '10px 16px', width: '300px', border: '1px solid var(--border-color)' }}>
                <Search size={18} color="#999" style={{ marginRight: '10px' }} />
                <input type="text" placeholder="Search all logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', margin: 0, padding: 0 }} />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '7%' }}>ID</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '14%' }}><Clock size={14} style={{ position: 'relative', top: '2px', marginRight: '4px' }} /> TIMESTAMP</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '25%' }}><Hash size={14} style={{ position: 'relative', top: '2px', marginRight: '4px' }} /> SIGNATURE (HEX)</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '22%' }}><Key size={14} style={{ position: 'relative', top: '2px', marginRight: '4px' }} /> PUBLIC KEY</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '18%', textAlign: 'center' }}>INTEGRITY STATUS</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: '#888', width: '14%', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No logs found.</td></tr>
                ) : currentItems.map((f, index) => {
                  const precisionDate = formatPrecisionDate(f.created_at);
                  return (
                    <tr key={f.id} className="animate-in" style={{ borderBottom: '1px solid #eee', animationDelay: `${index * 0.05}s`, backgroundColor: verifyState[f.id]?.status === 'invalid' ? 'var(--danger-bg)' : 'transparent' }}>
                      <td style={{ padding: '24px 12px', color: '#999', fontSize: '15px' }}>#{f.id}</td>
                      <td style={{ padding: '24px 12px', color: '#666', fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{precisionDate.date}</div>
                        <div style={{ color: '#aaa', fontSize: '12px' }}>{precisionDate.time}</div>
                      </td>
                      <td style={{ padding: '24px 12px', fontFamily: 'monospace', fontSize: '14px', color: '#444' }} title={f.signature}>
                        {f.signature ? `${f.signature.substring(0, 20)}...` : 'N/A'}
                      </td>
                      <td style={{ padding: '24px 12px', fontFamily: 'monospace', fontSize: '14px', color: '#444' }} title={f.public_key}>
                        {f.public_key ? `${f.public_key.substring(0, 16)}...` : 'N/A'}
                      </td>
                      
                      <td style={{ padding: '24px 12px', textAlign: 'center' }}>
                        {!verifyState[f.id]?.status && <span style={{ fontSize: '14px', color: '#999' }}>Pending check</span>}
                        {verifyState[f.id]?.status === 'checking' && <span className="badge badge-checking" style={{ fontSize: '13px', padding: '8px 14px' }}>Verifying...</span>}
                        {verifyState[f.id]?.status === 'valid' && <span className="badge badge-valid" style={{ fontSize: '13px', padding: '8px 14px' }}>✓ Valid Signature</span>}
                        {verifyState[f.id]?.status === 'invalid' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-invalid" style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <AlertTriangle size={14} /> TAMPERED
                            </span>
                            {verifyState[f.id]?.tamperTime && <span style={{ fontSize: '11px', color: '#FF8A80', marginTop: '4px' }}>Detected: {verifyState[f.id].tamperTime}</span>}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '24px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                          <button className="btn-secondary" onClick={() => runDetailedTrace(f)} style={{ fontSize: '13px', padding: '8px 14px', backgroundColor: 'var(--bg-dark-green)', color: 'white', border: 'none' }} title="Run Terminal Audit">
                            <Terminal size={14} style={{ display: 'inline', position: 'relative', top: '2px', marginRight: '4px' }} /> Audit
                          </button>

                          {verifyState[f.id]?.status === 'invalid' && !f.is_quarantined && (
                            <button onClick={() => handleQuarantineRecord(f.id)} className="animate-in" style={{ backgroundColor: '#ff8a80', color: '#000', border: 'none', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }} title="Move to Quarantine">
                              <ShieldAlert size={16} /> Quarantine
                            </button>
                          )}
                          
                          {f.is_quarantined && (
                            <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 'bold' }}>QUARANTINED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 'auto' }}>
              <PaginationControls />
            </div>
          </div>
        )}

        {/* ---------------- VIEW 4: THE QUARANTINE ZONE ---------------- */}
        {activeMenu === "quarantine" && (
          <div className="card animate-in" style={{ minHeight: '80vh', padding: '40px', display: 'flex', flexDirection: 'column', border: '1px solid var(--danger)' }}>
            <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
              <div>
                <h1 className="serif" style={{ fontSize: '2.2rem', marginBottom: '10px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={32} /> Quarantine Zone
                </h1>
                <p style={{ color: '#666', fontSize: '16px' }}>Isolated records detected with tampered signatures. These are hidden from your metrics.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--danger-bg)', borderRadius: '10px', padding: '10px 16px', width: '300px', border: '1px solid #ffcdd2' }}>
                <Search size={18} color="var(--danger)" style={{ marginRight: '10px' }} />
                <input type="text" placeholder="Search quarantined..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', margin: 0, padding: 0, color: 'var(--danger)' }} />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ffcdd2' }}>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '8%' }}>ID</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '18%' }}><Clock size={14} style={{ position: 'relative', top: '2px', marginRight: '4px' }} /> TIMESTAMP</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '18%' }}>CUSTOMER</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '34%' }}>TAMPERED PAYLOAD</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '10%' }}>RATING</th>
                  <th style={{ padding: '16px 12px', fontSize: '14px', color: 'var(--danger)', width: '12%', textAlign: 'right' }}>DANGER</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No records in quarantine.</td></tr>
                ) : currentItems.map((f, index) => {
                  const parsed = parseFeedbackData(f.comment);
                  const precisionDate = formatPrecisionDate(f.created_at);
                  return (
                    <tr key={f.id} className="animate-in" style={{ borderBottom: '1px solid #ffebee', animationDelay: `${index * 0.05}s`, backgroundColor: 'var(--danger-bg)' }}>
                      <td style={{ padding: '24px 12px', color: 'var(--danger)', fontSize: '14px', fontWeight: 'bold' }}>#{f.id}</td>
                      <td style={{ padding: '24px 12px', color: '#666', fontSize: '13px' }}>
                        <div style={{ fontWeight: 500 }}>{precisionDate.date}</div>
                        <div style={{ color: '#aaa', fontSize: '12px' }}>{precisionDate.time}</div>
                      </td>
                      <td style={{ padding: '24px 12px', fontWeight: 500, fontSize: '15px' }}>{f.customer_name || 'Anonymous'}</td>
                      
                      {/* UPDATED: Displays the [PHOTO] badge if an attachment is present */}
                      <td style={{ padding: '24px 12px', fontSize: '15px', color: '#444' }}>
                        {parsed.metrics ? <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>[Multi-Category Entry]</span> : `"${parsed.text.substring(0, 45)}..."`}
                        {f.attachment && <span style={{fontSize: '11px', color: 'var(--danger)', fontWeight: 'bold', marginLeft: '8px'}}>[PHOTO]</span>}
                      </td>

                      <td style={{ padding: '24px 12px', fontWeight: 600, color: 'var(--danger)', fontSize: '15px' }}>{f.rating} / 5</td>
                      <td style={{ padding: '24px 12px', textAlign: 'right' }}>
                        <button onClick={() => handlePurgeRecord(f.id)} style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 'auto' }}>
              <PaginationControls />
            </div>
          </div>
        )}

      </div>

      {/* ---------------- 1. VIEW FEEDBACK MODAL (For Manager) ---------------- */}
      {selectedFeedback && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(10, 27, 63, 0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card animate-in modal-content" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '45px' }}>
            <button onClick={() => setSelectedFeedback(null)} style={{ position: 'absolute', top: '25px', right: '25px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#999' }}><X size={28} /></button>
            <h2 className="serif" style={{ fontSize: '2rem', color: 'var(--bg-dark-green)', marginBottom: '8px' }}>Feedback Report</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '35px' }}>ID #{selectedFeedback.id} • Submitted via EdDSA Portal</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '18px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>CUSTOMER NAME</span>
              <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '16px' }}>{selectedFeedback.customer_name || 'Anonymous'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '25px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL RATING</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '20px' }}>{selectedFeedback.rating} / 5</span>
                <Star size={18} fill="var(--accent-gold)" color="var(--accent-gold)" />
              </div>
            </div>
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>CATEGORY BREAKDOWN</span>
              {parseFeedbackData(selectedFeedback.comment).metrics ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Object.entries(parseFeedbackData(selectedFeedback.comment).metrics).map(([cat, val]) => (
                    <div key={cat} style={{ fontSize: '14px', backgroundColor: 'var(--input-bg)', padding: '8px 16px', borderRadius: '25px', border: '1px solid var(--border-color)' }}>{cat}: <strong style={{ color: 'var(--accent-gold)' }}>{val}/5</strong></div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#999', fontStyle: 'italic', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>Legacy feedback. No multi-category data available.</div>
              )}
            </div>
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>WRITTEN COMMENT</span>
              <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '12px', fontSize: '16px', color: '#333', fontStyle: 'italic', border: '1px solid #eee', lineHeight: '1.5' }}>"{parseFeedbackData(selectedFeedback.comment).text}"</div>
            </div>
            
            {/* NEW ATTACHMENT SECTION */}
            {selectedFeedback.attachment && (
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Camera size={14} /> EVIDENCE ATTACHMENT
                </span>
                <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
                  <img src={selectedFeedback.attachment} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 2. CYBER TERMINAL MODAL (For Auditor) ---------------- */}
      {traceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(5, 13, 33, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="animate-in modal-content" style={{ width: '90%', maxWidth: '700px', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>

            <div style={{ backgroundColor: '#1a1a1a', padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={16} /> Ed25519 VERIFICATION TRACE // TASK_ID: {traceModal.id}
              </div>
              <button onClick={() => setTraceModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '30px', color: '#00ff00', fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ color: '#aaa', marginBottom: '20px' }}>&gt; Initializing audit protocol...</div>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ color: '#fff' }}>[1] Target Payload Extracted:</span><br />
                <span style={{ color: '#888' }}>&#123; customer_name: "{traceModal.customer_name}", rating: {traceModal.rating}, comment: "{traceModal.comment.substring(0, 30)}..." &#125;</span>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ color: '#fff' }}>[2] Retrieving EdDSA Public Key:</span><br />
                <span style={{ color: '#888' }}>{traceModal.public_key}</span>
              </div>
              <div style={{ marginBottom: '25px' }}>
                <span style={{ color: '#fff' }}>[3] Comparing computed hash against provided signature...</span><br />
                <span style={{ color: '#888' }}>Expected: {traceModal.signature ? `${traceModal.signature.substring(0, 64)}...` : 'NULL'}</span>
              </div>

              {traceStatus === 'loading' && (
                <div style={{ color: '#00ff00', animation: 'blink 1s infinite' }}>&gt; Validating elliptic curve constraints...</div>
              )}

              {traceStatus === 'pass' && (
                <div className="animate-in" style={{ backgroundColor: 'rgba(0, 255, 0, 0.1)', borderLeft: '4px solid #00ff00', padding: '15px', marginTop: '20px', color: '#00ff00' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>[OK] SIGNATURE VERIFIED</div>
                  Data integrity mathematically proven. No tampering detected.
                </div>
              )}

              {traceStatus === 'fail' && (
                <div className="animate-in" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid #ff0000', padding: '15px', marginTop: '20px', color: '#ff0000' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={20} /> [FATAL ERROR] HASH MISMATCH</div>
                  Computed payload hash does not match the Ed25519 signature. Data has been altered post-submission.
                </div>
              )}

              {traceStatus !== 'loading' && (
                <button onClick={() => setTraceModal(null)} style={{ marginTop: '30px', backgroundColor: 'transparent', color: '#888', border: '1px solid #555', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace' }}>
                  &gt; EXIT_TRACE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}