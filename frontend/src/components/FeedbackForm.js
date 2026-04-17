import React, { useState, useRef, useEffect } from "react";
import { submitFeedback, fetchStalls } from "../api";
import { Star, CheckCircle2, Loader2, Lock, ShieldCheck, UploadCloud, Image as ImageIcon, X, Copy, LogOut, UserCheck, Store, ArrowRight, ArrowLeft } from 'lucide-react';

// Client-Side Cryptography
import naclUtil from 'tweetnacl-util';
import { generateKeyPair, signData } from '../utils/crypto';

// Background image
import bgMain from '../Background_img/wmremove-transformed.png';

export default function FeedbackForm({ navigate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ comment: "" });

  const [selectedStall, setSelectedStall] = useState("");
  const [availableStalls, setAvailableStalls] = useState([]);
  const [loadingStalls, setLoadingStalls] = useState(true);

  const [ratings, setRatings] = useState({ Food: 5, Service: 5, Staff: 5, Cleanliness: 5, Value: 5 });
  const [hoverRating, setHoverRating] = useState({ category: '', val: 0 });

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [signMessage, setSignMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [receiptData, setReceiptData] = useState(null);
  const [copied, setCopied] = useState(false);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('ua_user');
    const storedToken = localStorage.getItem('ua_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('login');
      return;
    }

    const loadStalls = async () => {
      try {
        setLoadingStalls(true);
        const data = await fetchStalls();
        if (data && Array.isArray(data)) {
          // 👉 Keep the full objects so we have access to stall.image later!
          setAvailableStalls(data);

          // 👉 NEW: QR AUTO-ROUTING LOGIC
          const params = new URLSearchParams(window.location.search);
          const autoStall = params.get('stall');
          
          if (autoStall) {
             const matched = data.find(s => s.name.toLowerCase() === autoStall.toLowerCase());
             if (matched) {
                setSelectedStall(matched.name);
                setStep(2); // 🔥 Instantly skip step 1 for QR code users to maximize UX speed!
             } else {
               setSelectedStall("General Feedback");
             }
          } else if (data.length === 0) {
            setSelectedStall("General Feedback");
          }
        }
      } catch (err) {
        console.error("Failed to fetch stalls from DB:", err);
        setAvailableStalls([]);
        setSelectedStall("General Feedback");
      } finally {
        setLoadingStalls(false);
      }
    };

    loadStalls();
  }, [navigate]);

  const colors = {
    navy: '#0C2340',
    gold: '#E5A823',
    bg: '#F1F5F9',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    red: '#C8102E'
  };

  const modernFont = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleRatingChange = (category, value) => setRatings(prev => ({ ...prev, [category]: value }));

  const totalScore = Object.values(ratings).reduce((sum, val) => sum + val, 0);
  const overallRating = Math.round(totalScore / 5);

  // 👉 FIX: Prevents white screen on logout
  const handleLogout = () => {
    localStorage.removeItem('ua_token');
    localStorage.removeItem('ua_user');
    window.location.href = '/'; 
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const MAX_WIDTH = 800;
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImagePreview(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setStep(4); // Move progress bar to final step
    setStatus("signing");
    setSignMessage("Initializing Ed25519 Curve...");

    const payloadText = `[Stall: ${selectedStall}] [Scores -> Food: ${ratings.Food}/5 | Service: ${ratings.Service}/5 | Staff: ${ratings.Staff}/5 | Clean: ${ratings.Cleanliness}/5 | Value: ${ratings.Value}/5]\n\n${form.comment}`;

    // 👉 FIX: Exclude the image attachment from the cryptographic signature calculation!
    const payloadToSign = {
      customer_name: user.full_name,
      rating: overallRating,
      comment: payloadText
    };

    try {
      setSignMessage("Generating random Ed25519 keypair on device...");
      await new Promise(resolve => setTimeout(resolve, 400));

      const { publicKey, secretKey } = generateKeyPair();
      const publicKeyBase64 = naclUtil.encodeBase64(publicKey);

      setSignMessage(`Signing payload as ${user.full_name}...`);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Sign the smaller payload
      const clientSignature = signData(secretKey, payloadToSign);

      setSignMessage("Transmitting signature & public key to server...");
      await new Promise(resolve => setTimeout(resolve, 400));

      // Construct the full payload containing everything (including the massive image)
      const fullPayload = {
        rating: overallRating,
        comment: payloadText,
        attachment: imagePreview,
        signature: clientSignature,
        public_key: publicKeyBase64
      };

      await submitFeedback(fullPayload);

      setReceiptData({
        signature: clientSignature,
        public_key: publicKeyBase64
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
      setStep(3); // Send them back to Review if there's an error
    }
  };

  const copyToClipboard = () => {
    if (receiptData?.signature) {
      navigator.clipboard.writeText(receiptData.signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, fontFamily: modernFont, position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        
        .top-nav { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 900px; margin-bottom: 40px; }
        .hero-title { font-size: 38px; }
        .hero-desc { font-size: 16px; }
        .card-inner { padding: 40px; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .action-buttons { display: flex; gap: 16px; justify-content: space-between; }
        .stall-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
        
        .desktop-only { display: inline; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .card-inner { padding: 24px; }
          .form-grid { grid-template-columns: 1fr; gap: 24px; }
          /* 👉 Make Action Buttons side-by-side & identical size on Mobile */
          .action-buttons { flex-direction: row !important; gap: 12px !important; margin-top: 24px !important; }
          .action-buttons button { width: 50% !important; max-width: 100% !important; flex: 1 !important; padding: 14px 8px !important; font-size: 14px !important; justify-content: center !important; }
        }

        @media (max-width: 480px) {
          .top-nav { margin-bottom: 24px; }
          .desktop-only { display: none !important; }
          .mobile-only { display: inline !important; }
          .hero-title { font-size: 30px; margin-top: 10px; }
          .hero-desc { font-size: 14px; }
          .card-inner { padding: 20px 16px; }
          .stall-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '340px',
        backgroundImage: `url("${bgMain}")`, backgroundSize: 'cover', backgroundPosition: 'center',
        borderBottom: `4px solid ${colors.gold}`, zIndex: 0
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12, 35, 64, 0.85)' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <div className="top-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '8px 14px', borderRadius: '10px', border: `1px solid rgba(16, 185, 129, 0.3)` }}>
            <UserCheck size={18} color={colors.success} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="desktop-only" style={{ color: '#A7F3D0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Authenticated as</span>
              <span className="mobile-only" style={{ color: '#A7F3D0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Logged In</span>
              <span style={{ color: colors.gold, fontSize: '14px', fontWeight: 700 }}>
                {user.full_name} <span className="desktop-only">({user.ua_id})</span>
              </span>
            </div>
          </div>

          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: colors.white, padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <LogOut size={16} />
            <span className="desktop-only" style={{ fontSize: '13px', fontWeight: 600 }}>Secure Logout</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', color: colors.white, marginBottom: '32px' }}>
          <h1 className="hero-title" style={{ fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Rate Your <span style={{ color: colors.gold }}>Experience</span>
          </h1>
          <p className="hero-desc" style={{ opacity: 0.9, margin: 0, maxWidth: '500px', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            Help us improve the UA Canteen. Your submission is mathematically sealed and linked to your verified identity.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '900px', backgroundColor: colors.white, borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '24px 0', borderBottom: `1px solid ${colors.border}`, backgroundColor: '#FAFAFA' }}>
            {[1, 2, 3, 4].map((num, idx) => (
              <React.Fragment key={num}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, transition: 'all 0.3s', border: `2px solid ${step >= num ? colors.navy : colors.border}`, color: step >= num ? (step === num ? colors.white : colors.navy) : '#94A3B8', backgroundColor: step === num ? colors.navy : colors.white }}>{num}</div>
                {idx < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: step > num ? colors.navy : colors.border, transition: 'all 0.3s' }}></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="card-inner">

            {/* --- STEP 1: SELECT LOCATION --- */}
            {step === 1 && status !== "signing" && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <h2 style={{ fontSize: '26px', fontWeight: 800, color: colors.navy, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>Where did you eat?</h2>
                  <p style={{ color: colors.textMuted, fontSize: '16px', margin: 0 }}>Select the food stall you would like to review to begin.</p>
                </div>

                <div style={{ marginBottom: '48px' }}>
                  {loadingStalls ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.textMuted, fontSize: '15px', padding: '40px 0', justifyContent: 'center', backgroundColor: colors.bg, borderRadius: '16px' }}>
                      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color={colors.navy} /> Loading available stalls...
                    </div>
                  ) : availableStalls.length === 0 ? (
                    <div style={{ padding: '40px', backgroundColor: colors.bg, borderRadius: '16px', border: `2px dashed ${colors.border}`, color: colors.textMuted, fontSize: '16px', textAlign: 'center' }}>
                      <Store size={40} color="#CBD5E1" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                      No specific stalls are listed right now.<br />Your review will be submitted as <strong style={{ color: colors.navy }}>General Feedback</strong>.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                      {availableStalls.map((stall, index) => {
                        const isSelected = selectedStall === stall.name;

                        // A beautiful array of different food images for variety
                        const fallbackImages = [
                          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80", // BBQ
                          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80", // Pizza
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80", // Healthy Bowl
                          "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=400&q=80", // Pancakes
                          "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80"  // Burger
                        ];

                        // Pick a unique placeholder based on the stall's position in the list
                        const uniquePlaceholder = fallbackImages[index % fallbackImages.length];

                        // 👉 Checks multiple possible database column names just in case!
                        const stallImage = stall.image || stall.photo || stall.imageUrl || stall.attachment || uniquePlaceholder;

                        return (
                          <div
                            key={stall.name}
                            onClick={() => setSelectedStall(stall.name)}
                            style={{
                              width: '320px',
                              backgroundColor: colors.white,
                              borderRadius: '16px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? `0 0 0 3px ${colors.navy}, 0 12px 24px rgba(12, 35, 64, 0.2)` : '0 4px 12px rgba(0,0,0,0.06)',
                              transform: isSelected ? 'translateY(-4px)' : 'none',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                                e.currentTarget.style.transform = 'none';
                              }
                            }}
                          >
                            {/* Card Image */}
                            <div style={{
                              height: '140px',
                              width: '100%',
                              backgroundImage: `url("${stallImage}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              position: 'relative'
                            }}>
                              {isSelected && (
                                <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: colors.white, borderRadius: '50%', padding: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                  <CheckCircle2 size={24} color={colors.navy} fill={colors.gold} />
                                </div>
                              )}
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text, lineHeight: 1.3, flex: 1, paddingRight: '12px' }}>
                                  {stall.name}
                                </h3>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>Services</div>
                                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Until 5PM</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                                <span style={{ padding: '6px 12px', backgroundColor: '#F8FAFC', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: colors.textMuted }}>Food Service</span>
                                <span style={{ padding: '6px 12px', backgroundColor: '#F8FAFC', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: colors.textMuted }}>Beverages</span>
                              </div>

                              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                <button style={{
                                  flex: 1, padding: '10px 0',
                                  backgroundColor: isSelected ? colors.navy : '#1E40AF',
                                  color: colors.white, border: 'none', borderRadius: '6px',
                                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}>
                                  {isSelected ? 'Selected' : 'Select Stall'}
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '32px' }}>
                  <button
                    type="button"
                    disabled={!selectedStall}
                    style={{
                      padding: '16px 48px', fontSize: '16px', fontWeight: 600,
                      backgroundColor: selectedStall ? colors.navy : '#94A3B8',
                      color: colors.white, border: 'none', borderRadius: '12px',
                      cursor: selectedStall ? 'pointer' : 'not-allowed',
                      transition: 'all 0.25s ease',
                      boxShadow: selectedStall ? '0 8px 20px rgba(12, 35, 64, 0.25)' : 'none',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px',
                      transform: selectedStall ? 'translateY(0)' : 'none'
                    }}
                    onMouseEnter={(e) => { if (selectedStall) { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={(e) => { if (selectedStall) { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'translateY(0)'; } }}
                    onClick={() => setStep(2)}
                  >
                    Continue to Ratings <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 2: RATING & COMMENTS --- */}
            {step === 2 && status !== "signing" && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0' }}>Share your thoughts</h2>
                  <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Reviewing: <strong style={{ color: colors.navy }}>{selectedStall}</strong></p>
                </div>

                <div className="form-grid">
                  {/* Ratings Column */}
                  <div style={{ backgroundColor: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '24px' }}>
                    <label style={{ fontSize: '12px', color: colors.navy, fontWeight: 700, display: 'block', marginBottom: '16px', letterSpacing: '0.05em' }}>CATEGORY SCORING</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.keys(ratings).map((category) => (
                        <div key={category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid transparent` }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>{category}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isHovered = hoverRating.category === category && hoverRating.val >= star;
                              const isActive = ratings[category] >= star;
                              return (
                                <Star
                                  key={star} size={22}
                                  onClick={() => handleRatingChange(category, star)}
                                  onMouseEnter={() => setHoverRating({ category, val: star })}
                                  onMouseLeave={() => setHoverRating({ category: '', val: 0 })}
                                  fill={isHovered || isActive ? colors.gold : 'transparent'}
                                  color={isHovered || isActive ? colors.gold : '#CBD5E1'}
                                  style={{ cursor: 'pointer', transition: 'transform 0.1s', transform: isHovered ? 'scale(1.15)' : 'scale(1)' }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments & Upload Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>ADDITIONAL COMMENTS</label>
                      <textarea
                        name="comment" placeholder="Tell us what you liked or how we can improve..." value={form.comment} onChange={handleChange}
                        style={{ width: '100%', height: '140px', padding: '16px', fontSize: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, resize: 'none', outline: 'none', color: colors.text, fontFamily: 'inherit', transition: 'border 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = colors.navy}
                        onBlur={(e) => e.target.style.borderColor = colors.border}
                      ></textarea>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>PHOTO EVIDENCE (OPTIONAL)</label>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

                      {!imagePreview ? (
                        <div
                          onClick={() => fileInputRef.current.click()}
                          style={{ width: '100%', minHeight: '100px', padding: '24px', border: `2px dashed ${colors.border}`, borderRadius: '8px', backgroundColor: colors.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', boxSizing: 'border-box' }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.navy}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
                        >
                          <UploadCloud size={24} color={colors.textMuted} />
                          <span style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 500, textAlign: 'center' }}>Click to upload photo</span>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                          <img src={imagePreview} alt="Evidence Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => setImagePreview(null)} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="action-buttons" style={{ marginTop: '32px' }}>
                  <button
                    type="button"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.white}
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    type="button"
                    style={{ padding: '16px 40px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(12, 35, 64, 0.2)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'none'; }}
                    onClick={() => { setErrorMessage(""); setStatus("idle"); setStep(3); }}
                  >
                    Review Feedback <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 3: REVIEW --- */}
            {step === 3 && status !== "signing" && status !== "success" && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: colors.navy, margin: '0 0 8px 0' }}>Verify your submission</h2>
                  <p style={{ color: colors.textMuted, fontSize: '15px', margin: 0 }}>Please check your details before we cryptographically seal them.</p>
                </div>

                <div style={{ backgroundColor: colors.bg, borderRadius: '12px', padding: '24px', marginBottom: '32px', border: `1px solid ${colors.border}` }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>SELECTED STALL</span>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: colors.navy, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Store size={16} color={colors.gold} /> {selectedStall}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>VERIFIED IDENTITY</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: colors.success, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> {user.full_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>OVERALL SCORE</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: colors.navy, fontSize: '18px' }}>{overallRating} / 5</span>
                      <Star size={16} fill={colors.gold} color={colors.gold} />
                    </div>
                  </div>

                  <div style={{ borderBottom: form.comment || imagePreview ? `1px solid ${colors.border}` : 'none', paddingBottom: form.comment || imagePreview ? '16px' : '0', marginBottom: form.comment || imagePreview ? '16px' : '0' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '0.05em' }}>CATEGORY BREAKDOWN</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(ratings).map(([cat, val]) => (
                        <div key={cat} style={{ fontSize: '12px', backgroundColor: colors.white, padding: '6px 12px', borderRadius: '20px', border: `1px solid ${colors.border}`, fontWeight: 500, color: colors.text }}>
                          {cat}: <strong style={{ color: colors.navy }}>{val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {form.comment && (
                    <div style={{ borderBottom: imagePreview ? `1px solid ${colors.border}` : 'none', paddingBottom: imagePreview ? '16px' : '0', marginBottom: imagePreview ? '16px' : '0' }}>
                      <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>COMMENTS</span>
                      <p style={{ fontSize: '14px', fontStyle: 'italic', color: colors.text, lineHeight: '1.6', margin: 0 }}>"{form.comment}"</p>
                    </div>
                  )}

                  {imagePreview && (
                    <div>
                      <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', letterSpacing: '0.05em' }}>
                        <ImageIcon size={14} /> ATTACHED EVIDENCE
                      </span>
                      <img src={imagePreview} alt="Evidence Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain', border: `1px solid ${colors.border}`, backgroundColor: colors.white, padding: '8px' }} />
                    </div>
                  )}
                </div>

                {status === "error" && (
                  <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 600, backgroundColor: '#FFE4E6', color: '#E11D48', border: '1px solid #FDA4AF' }}>
                    Error: {errorMessage}
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    type="button"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.white}
                    onClick={() => { setStatus("idle"); setErrorMessage(""); setStep(2); }}
                  >
                    <ArrowLeft size={18} /> Back to Edit
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, maxWidth: '400px', padding: '16px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(12, 35, 64, 0.2)', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17365C'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.navy; e.currentTarget.style.transform = 'none'; }}
                    onClick={handleSubmit}
                  >
                    <Lock size={16} color={colors.gold} /> Sign & Submit
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 4: CRYPTO ANIMATION --- */}
            {status === "signing" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
                <Loader2 size={48} color={colors.navy} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.navy, marginBottom: '12px', letterSpacing: '-0.02em' }}>Securing Data Payload</h3>
                <div style={{ backgroundColor: colors.white, color: colors.navy, padding: '16px 20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '500', width: '100%', maxWidth: '340px', textAlign: 'center', border: `1px solid ${colors.border}`, boxShadow: '0 8px 24px rgba(12, 35, 64, 0.08)', wordBreak: 'break-word', boxSizing: 'border-box', margin: '0 auto' }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>
                    <strong style={{ color: colors.gold, marginRight: '6px' }}>&gt;</strong> 
                    {signMessage}
                  </span>
                </div>
                <style>{`
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
              </div>
            )}

            {/* --- STEP 4: MODERN DIGITAL RECEIPT WITH COPY & SCREENSHOT UX --- */}
            {status === "success" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>

                <div style={{ width: '70px', height: '70px', backgroundColor: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '4px solid #10B981' }}>
                  <ShieldCheck size={36} color="#10B981" />
                </div>

                <h3 style={{ fontSize: '26px', fontWeight: 700, color: colors.navy, marginBottom: '8px', letterSpacing: '-0.02em' }}>Review Secured</h3>
                <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '24px', maxWidth: '400px', lineHeight: 1.6 }}>
                  Your feedback for <strong>{selectedStall}</strong> is now mathematically sealed in the database.
                </p>

                <div style={{ width: '100%', maxWidth: '440px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    YOUR ED25519 RECEIPT SIGNATURE
                  </label>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', color: colors.navy, backgroundColor: colors.white, padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, wordBreak: 'break-all', marginBottom: '12px', lineHeight: 1.4 }}>
                    {receiptData?.signature || 'Generating...'}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      onClick={copyToClipboard}
                      style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600, backgroundColor: copied ? colors.success : colors.white, color: copied ? colors.white : colors.text, border: `1px solid ${copied ? colors.success : colors.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: 'inherit' }}
                    >
                      {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Signature</>}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', margin: '16px 0 0 0' }}>
                    📸 Tip: Take a screenshot of this page for your records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ width: '100%', maxWidth: '440px', padding: '16px', fontSize: '15px', fontWeight: 600, backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#17365C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.navy}
                >
                  Logout & Return Home
                </button>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}