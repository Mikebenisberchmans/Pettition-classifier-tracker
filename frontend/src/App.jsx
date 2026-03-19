import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000";

/* ─── Urgency config ─────────────────────────────────────────────────────── */
const URGENCY = {
  "Urgent Action Required": {
    cls: "urgent",
    color: "#C0392B",
    bg: "rgba(192,57,43,0.08)",
    border: "rgba(192,57,43,0.3)",
    icon: "⚡",
    glow: "0 0 24px rgba(192,57,43,0.25)",
  },
  "Fast Action": {
    cls: "fast",
    color: "#D68910",
    bg: "rgba(214,137,16,0.08)",
    border: "rgba(214,137,16,0.3)",
    icon: "🔔",
    glow: "0 0 24px rgba(214,137,16,0.2)",
  },
  "Normal Action": {
    cls: "normal",
    color: "#1A7A4A",
    bg: "rgba(26,122,74,0.08)",
    border: "rgba(26,122,74,0.3)",
    icon: "✓",
    glow: "0 0 24px rgba(26,122,74,0.15)",
  },
};
const getUrgency = (label) =>
  URGENCY[label] || { cls: "unknown", color: "#555", bg: "#f5f5f5", border: "#ccc", icon: "?", glow: "none" };

/* ─── Fonts injection ────────────────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* ─── Global styles ──────────────────────────────────────────────────────── */
const injectStyles = () => {
  const s = document.createElement("style");
  s.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Outfit', sans-serif;
      background: #0A0E1A;
      color: #E8E4DC;
      min-height: 100vh;
      overflow-x: hidden;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0A0E1A; }
    ::-webkit-scrollbar-thumb { background: #2A3050; border-radius: 3px; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes orbFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(40px, -60px) scale(1.1); }
      66%       { transform: translate(-30px, 30px) scale(0.95); }
    }

    .fade-up { animation: fadeUp 0.65s cubic-bezier(.22,.68,0,1.2) both; }
    .fade-up-2 { animation: fadeUp 0.65s 0.1s cubic-bezier(.22,.68,0,1.2) both; }
    .fade-up-3 { animation: fadeUp 0.65s 0.2s cubic-bezier(.22,.68,0,1.2) both; }
    .fade-up-4 { animation: fadeUp 0.65s 0.3s cubic-bezier(.22,.68,0,1.2) both; }
    .fade-up-5 { animation: fadeUp 0.65s 0.4s cubic-bezier(.22,.68,0,1.2) both; }

    input, select, textarea {
      font-family: 'Outfit', sans-serif;
    }
    input:-webkit-autofill,
    input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #141828 inset !important;
      -webkit-text-fill-color: #E8E4DC !important;
    }
  `;
  document.head.appendChild(s);
};
injectStyles();

/* ─── Orb background ─────────────────────────────────────────────────────── */
function OrbBg() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {[
        { w: 600, h: 600, top: "-15%", left: "-10%", c1: "#1B2A6B", c2: "#0A0E1A", dur: "18s" },
        { w: 500, h: 500, top: "40%",  right: "-8%",  c1: "#3B1A5A", c2: "#0A0E1A", dur: "22s" },
        { w: 400, h: 400, bottom:"5%", left: "20%",   c1: "#0D3B2E", c2: "#0A0E1A", dur: "26s" },
      ].map((o, i) => (
        <div key={i} style={{
          position: "absolute",
          width: o.w, height: o.h,
          top: o.top, left: o.left, right: o.right, bottom: o.bottom,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${o.c1} 0%, ${o.c2} 70%)`,
          filter: "blur(80px)",
          opacity: 0.6,
          animation: `orbFloat ${o.dur} ease-in-out infinite`,
          animationDelay: `${i * -5}s`,
        }} />
      ))}
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
    </div>
  );
}

/* ─── Input component ────────────────────────────────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{
        fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.14em",
        textTransform: "uppercase", color: error ? "#e05555" : "#8899BB",
      }}>
        {label}{required && <span style={{ color: "#C0392B", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: "0.75rem", color: "#e05555" }}>{error}</span>}
    </div>
  );
}

const inputStyle = (focus, err) => ({
  width: "100%",
  padding: "12px 16px",
  background: "#141828",
  border: `1.5px solid ${err ? "#C0392B" : focus ? "#4A7BF5" : "#1E2840"}`,
  borderRadius: "8px",
  color: "#E8E4DC",
  fontSize: "0.95rem",
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxShadow: focus ? "0 0 0 3px rgba(74,123,245,0.12)" : "none",
  appearance: "none",
});

function TextInput({ id, value, onChange, placeholder, type = "text", required, error }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      id={id} type={type} value={value} onChange={onChange}
      placeholder={placeholder} required={required}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={inputStyle(focus, error)}
    />
  );
}

function SelectInput({ id, value, onChange, options, placeholder, required, error }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id} value={value} onChange={onChange} required={required}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...inputStyle(focus, error), cursor: "pointer", paddingRight: 40 }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8899BB" }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function TextArea({ id, value, onChange, placeholder, required, error }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      id={id} value={value} onChange={onChange}
      placeholder={placeholder} required={required}
      rows={5}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus, error), resize: "vertical", minHeight: 140, lineHeight: 1.6 }}
    />
  );
}

/* ─── Urgency badge ──────────────────────────────────────────────────────── */
function UrgencyBadge({ label, large }) {
  const u = getUrgency(label);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: large ? 10 : 7,
      padding: large ? "10px 20px" : "6px 14px",
      background: u.bg,
      border: `1.5px solid ${u.border}`,
      borderRadius: 100,
      color: u.color,
      fontSize: large ? "0.95rem" : "0.8rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      boxShadow: large ? u.glow : "none",
    }}>
      <span style={{ fontSize: large ? "1.1rem" : "0.9rem" }}>{u.icon}</span>
      {label}
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────────────── */
function StepDot({ n, label, active, done }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: done ? "#1A7A4A" : active ? "#4A7BF5" : "#1E2840",
        border: `2px solid ${done ? "#1A7A4A" : active ? "#4A7BF5" : "#2A3450"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.78rem", fontWeight: 700,
        color: done || active ? "#fff" : "#556",
        transition: "all 0.3s",
      }}>
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "#4A7BF5" : "#556" }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(5,8,18,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", animation: "fadeIn 0.2s ease",
      }}>
      <div style={{ animation: "scaleIn 0.3s cubic-bezier(.22,.68,0,1.2)", width: "100%", maxWidth: 520 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function NyayaSetu() {
  const STEPS = ["Personal", "Address", "Petition"];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    address: "", city: "", state: "", pincode: "",
    petition_title: "", category: "", description: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [tracking, setTracking] = useState(false);
  const [copied, setCopied] = useState(false);
  const formRef = useRef(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  /* validation per step */
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.full_name.trim()) e.full_name = "Full name is required";
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    }
    if (step === 2) {
      if (!form.petition_title.trim()) e.petition_title = "Petition title is required";
      if (!form.category) e.category = "Please select a category";
      if (!form.description.trim() || form.description.trim().length < 30)
        e.description = "Please describe the issue in at least 30 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validate()) {
      setStep(s => Math.min(s + 1, 2));
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/api/petitions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSuccessData(data);
      setShowSuccess(true);
      setForm({ full_name:"",email:"",phone:"",address:"",city:"",state:"",pincode:"",petition_title:"",category:"",description:"" });
      setStep(0);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) { setTrackError("Please enter a petition ID"); return; }
    setTracking(true); setTrackError(""); setTrackResult(null);
    try {
      const res  = await fetch(`${API}/api/petitions/track/${encodeURIComponent(trackId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setTrackResult(data);
    } catch (err) {
      setTrackError(err.message);
    } finally {
      setTracking(false);
    }
  };

  const copyId = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.petition_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* card style */
  const card = {
    background: "rgba(15,20,38,0.85)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <OrbBg />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,14,26,0.8)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 2rem",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #4A7BF5 0%, #7B4AE2 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(74,123,245,0.4)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}>
                NyayaSetu
              </div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#4A7BF5", fontWeight: 600, lineHeight: 1.4 }}>
                Justice Bridge · Petition Portal
              </div>
            </div>
          </div>

          {/* Track button */}
          <button onClick={() => { setShowTracker(true); setTrackId(""); setTrackResult(null); setTrackError(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 20px",
              background: "rgba(74,123,245,0.12)",
              border: "1.5px solid rgba(74,123,245,0.35)",
              borderRadius: 100, color: "#7BA6F5",
              fontSize: "0.85rem", fontWeight: 500,
              cursor: "pointer", transition: "all 0.2s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,123,245,0.22)"; e.currentTarget.style.borderColor = "rgba(74,123,245,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(74,123,245,0.12)"; e.currentTarget.style.borderColor = "rgba(74,123,245,0.35)"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Track Application
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 2rem 3rem", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div className="fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", background: "rgba(74,123,245,0.1)",
            border: "1px solid rgba(74,123,245,0.25)", borderRadius: 100,
            fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#7BA6F5", marginBottom: "1.5rem",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4A7BF5", boxShadow: "0 0 8px #4A7BF5", animation: "pulse 2s infinite" }} />
            AI-Powered Civic Platform
          </div>

          <h1 className="fade-up-2" style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2.8rem, 6vw, 5rem)",
            fontWeight: 700, lineHeight: 1.08,
            letterSpacing: "-0.02em",
            marginBottom: "1.25rem",
          }}>
            File Your Petition.{" "}
            <span style={{
              background: "linear-gradient(135deg, #4A7BF5 0%, #A78BFA 50%, #F472B6 100%)",
              backgroundSize: "200%",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmer 4s linear infinite",
            }}>
              Let Justice Flow.
            </span>
          </h1>
          <p className="fade-up-3" style={{
            fontSize: "1.05rem", color: "#8899BB", lineHeight: 1.75,
            maxWidth: 520, margin: "0 auto 2rem", fontWeight: 300,
          }}>
            Every petition is automatically assessed by our AI triage system — ensuring urgent matters reach the right authorities without delay.
          </p>

          {/* Stats row */}
          <div className="fade-up-4" style={{ display: "flex", justifyContent: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            {[["⚡", "Instant Triage"], ["🔒", "Secure Filing"], ["📡", "Real-time Tracking"]].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#6677AA" }}>
                <span>{icon}</span>{label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Form Card ── */}
        <div ref={formRef} className="fade-up-5" style={{ ...card, maxWidth: 760, margin: "0 auto" }}>
          {/* Card header */}
          <div style={{
            padding: "1.75rem 2.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "1rem",
          }}>
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>
                Petition Filing Form
              </h2>
              <p style={{ fontSize: "0.8rem", color: "#667", fontWeight: 300 }}>
                Fill in all required fields. Your petition will be AI-triaged on submission.
              </p>
            </div>
            {/* Step indicators */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center" }}>
                  <StepDot n={i + 1} label={label} active={step === i} done={step > i} />
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 28, height: 1, background: step > i ? "#1A7A4A" : "#1E2840", margin: "0 6px 18px" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 0 – Personal */}
          {step === 0 && (
            <div style={{ padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Full Name" required error={errors.full_name}>
                    <TextInput id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="As per official records" required error={errors.full_name} />
                  </Field>
                </div>
                <Field label="Email Address" required error={errors.email}>
                  <TextInput id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required error={errors.email} />
                </Field>
                <Field label="Phone Number" error={errors.phone}>
                  <TextInput id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 00000 00000" />
                </Field>
              </div>
            </div>
          )}

          {/* Step 1 – Address */}
          {step === 1 && (
            <div style={{ padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Street Address" error={errors.address}>
                    <TextInput id="address" value={form.address} onChange={set("address")} placeholder="Door No., Street Name, Area" />
                  </Field>
                </div>
                <Field label="City / Town" error={errors.city}>
                  <TextInput id="city" value={form.city} onChange={set("city")} placeholder="City" />
                </Field>
                <Field label="State" error={errors.state}>
                  <TextInput id="state" value={form.state} onChange={set("state")} placeholder="State" />
                </Field>
                <Field label="PIN Code" error={errors.pincode}>
                  <TextInput id="pincode" value={form.pincode} onChange={set("pincode")} placeholder="600001" />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2 – Petition */}
          {step === 2 && (
            <div style={{ padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Field label="Petition Title" required error={errors.petition_title}>
                <TextInput id="petition_title" value={form.petition_title} onChange={set("petition_title")} placeholder="A clear, concise title for your petition" required error={errors.petition_title} />
              </Field>
              <Field label="Category" required error={errors.category}>
                <SelectInput
                  id="category" value={form.category} onChange={set("category")} required error={errors.category}
                  placeholder="Select a category"
                  options={["Infrastructure & Roads","Water & Sanitation","Public Safety & Emergency","Environment & Pollution","Healthcare","Education","Public Transport","Housing & Land","Governance & Administration","Other"]}
                />
              </Field>
              <Field label="Petition Description" required error={errors.description}>
                <TextArea id="description" value={form.description} onChange={set("description")} required error={errors.description}
                  placeholder="Describe the issue in detail — current situation, how it affects people, and the specific action you are requesting from authorities. The more detail you provide, the more accurately our AI can assess urgency." />
              </Field>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "rgba(74,123,245,0.07)",
                border: "1px solid rgba(74,123,245,0.2)", borderRadius: 8,
                fontSize: "0.78rem", color: "#7BA6F5",
              }}>
                <span>🤖</span>
                Our AI will automatically classify your petition urgency upon submission.
              </div>
            </div>
          )}

          {/* Card footer nav */}
          <div style={{
            padding: "1.5rem 2.5rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <button onClick={prevStep} disabled={step === 0}
              style={{
                padding: "10px 22px",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: step === 0 ? "#333" : "#889",
                fontSize: "0.9rem", fontWeight: 500,
                cursor: step === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}>
              ← Back
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === step ? "#4A7BF5" : i < step ? "#1A7A4A" : "#1E2840",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>

            {step < 2 ? (
              <button onClick={nextStep}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #4A7BF5 0%, #7B4AE2 100%)",
                  border: "none", borderRadius: 8, color: "#fff",
                  fontSize: "0.9rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 4px 16px rgba(74,123,245,0.35)",
                  letterSpacing: "0.03em",
                }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 24px",
                  background: submitting ? "rgba(26,122,74,0.4)" : "linear-gradient(135deg, #1A7A4A 0%, #2AAE6A 100%)",
                  border: "none", borderRadius: 8, color: "#fff",
                  fontSize: "0.9rem", fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: submitting ? "none" : "0 4px 16px rgba(26,122,74,0.35)",
                  transition: "all 0.3s", letterSpacing: "0.03em",
                }}>
                {submitting
                  ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Submitting…</>
                  : <><span>✓</span> File Petition</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Modal ── */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)}>
        <div style={{ ...card, padding: "2.5rem", position: "relative" }}>
          <button onClick={() => setShowSuccess(false)}
            style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "#889", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>

          {/* Success icon */}
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "rgba(26,122,74,0.15)",
            border: "2px solid rgba(26,122,74,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem", marginBottom: "1.25rem",
            boxShadow: "0 0 32px rgba(26,122,74,0.2)",
          }}>✓</div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.9rem", fontWeight: 700, marginBottom: 6 }}>
            Petition Filed!
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#889", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Your petition has been received and AI-triaged. Save your petition ID to track updates.
          </p>

          {successData && <UrgencyBadge label={successData.predicted_label} large />}

          {/* ID box */}
          <div style={{
            margin: "1.25rem 0",
            padding: "1.25rem 1.5rem",
            background: "#080C18",
            border: "1px solid rgba(74,123,245,0.2)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#556", marginBottom: 6, fontWeight: 600 }}>
              Your Petition ID
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.55rem", fontWeight: 700,
                letterSpacing: "0.06em",
                background: "linear-gradient(135deg, #4A7BF5, #A78BFA)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {successData?.petition_id}
              </span>
              <button onClick={copyId}
                style={{
                  padding: "6px 14px", background: copied ? "rgba(26,122,74,0.2)" : "rgba(74,123,245,0.15)",
                  border: `1px solid ${copied ? "rgba(26,122,74,0.4)" : "rgba(74,123,245,0.3)"}`,
                  borderRadius: 6, color: copied ? "#2AAE6A" : "#7BA6F5",
                  fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  letterSpacing: "0.06em",
                }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div style={{
            padding: "12px 16px",
            background: "rgba(74,123,245,0.07)",
            border: "1px solid rgba(74,123,245,0.18)",
            borderRadius: 8, fontSize: "0.82rem", color: "#7BA6F5", lineHeight: 1.6,
          }}>
            📌 Use the <strong style={{ color: "#9BB8F5" }}>"Track Application"</strong> button in the header to check your petition status at any time using this ID.
          </div>
        </div>
      </Modal>

      {/* ── Tracker Modal ── */}
      <Modal open={showTracker} onClose={() => setShowTracker(false)}>
        <div style={{ ...card, padding: "2.5rem", position: "relative" }}>
          <button onClick={() => setShowTracker(false)}
            style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "#889", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>

          <div style={{ marginBottom: "0.5rem", fontSize: "1.4rem" }}>🔍</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.9rem", fontWeight: 700, marginBottom: 6 }}>
            Track Your Petition
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#889", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Enter your petition ID to retrieve its urgency classification and filing details.
          </p>

          {/* Search row */}
          <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                value={trackId}
                onChange={e => setTrackId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleTrack()}
                placeholder="e.g. NS-20240101-ABCD1234"
                style={{
                  ...inputStyle(false, trackError),
                  paddingLeft: 42,
                }}
              />
              <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4A6" }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <button onClick={handleTrack} disabled={tracking}
              style={{
                padding: "12px 22px",
                background: tracking ? "rgba(74,123,245,0.3)" : "linear-gradient(135deg, #4A7BF5 0%, #7B4AE2 100%)",
                border: "none", borderRadius: 8, color: "#fff",
                fontSize: "0.88rem", fontWeight: 600,
                cursor: tracking ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8,
                boxShadow: tracking ? "none" : "0 4px 16px rgba(74,123,245,0.35)",
                transition: "all 0.2s",
              }}>
              {tracking
                ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></>
                : "Search"
              }
            </button>
          </div>

          {/* Track error */}
          {trackError && (
            <div style={{
              padding: "12px 16px", background: "rgba(192,57,43,0.1)",
              border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8,
              fontSize: "0.85rem", color: "#E05555",
            }}>
              ⚠ {trackError}
            </div>
          )}

          {/* Track result */}
          {trackResult && (
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
              {/* Result header */}
              <div style={{
                padding: "1.25rem 1.5rem",
                background: "rgba(74,123,245,0.07)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#556", marginBottom: 4, fontWeight: 600 }}>Petition ID</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 700, color: "#C0D4FF" }}>{trackResult.petition_id}</div>
                </div>
                <UrgencyBadge label={trackResult.predicted_label} large />
              </div>

              {/* Details */}
              <div style={{ padding: "0.5rem 0" }}>
                {[
                  ["👤 Name", trackResult.full_name],
                  ["📋 Title", trackResult.petition_title],
                  ["🏷 Category", trackResult.category],
                  ["📍 Location", [trackResult.city, trackResult.state].filter(Boolean).join(", ") || "—"],
                  ["📅 Submitted", trackResult.submitted_at],
                  ["🌐 Language", trackResult.detected_language?.toUpperCase() || "EN"],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    padding: "10px 1.5rem", gap: 16,
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <span style={{ fontSize: "0.78rem", color: "#667", flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: "0.88rem", color: "#C0D0EE", fontWeight: 400, textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Footer ── */}
      <footer style={{
        position: "relative", zIndex: 1,
        textAlign: "center", padding: "2.5rem 2rem",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: "0.75rem", color: "#445",
        letterSpacing: "0.06em",
      }}>
        © 2024 NyayaSetu — AI-Powered Civic Petition Platform · Empowering Every Voice
      </footer>
    </div>
  );
}