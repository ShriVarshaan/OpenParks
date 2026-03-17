import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast"

const REPORT_TYPES = ["Damaged equipment", "Litter", "Vandalism", "Unsafe path", "Flooding", "Other"];

export default function ReportPage({ parkName = "this park", onSubmit }) {
  const [form, setForm] = useState({ type: "", description: "", location: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const toastShown = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token && !toastShown.current){
      toastShown.current = true
      toast.error("Please login/signup first")
      navigate("/login")
      return
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.description) return;
    setLoading(true);
    
    //Cannot connect this to the backend without park location data
    // try{  

    // } catch (err){

    // }
    //setTimeout(() => { setLoading(false); setSubmitted(true); if (onSubmit) onSubmit(form); }, 1000);
    setLoading(false)
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>OpenParks</h1>
          <p style={styles.success}>Report submitted. Thank you!</p>
          <button style={styles.button} onClick={() => { setSubmitted(false); setForm({ type: "", description: "", location: "" }); }}>
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🌿 OpenParks</h1>
        <h2 style={styles.heading}>Report an issue</h2>
        <p style={styles.sub}>at {parkName}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Issue type</label>
          <select
            style={styles.input}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          >
            <option value="">Select a type...</option>
            {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>

          <label style={styles.label}>Location hint <span style={styles.optional}>(optional)</span></label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Near the north entrance"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, resize: "vertical" }}
            rows={4}
            placeholder="Describe the issue..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { margin: "0 0 24px", fontSize: 20, color: "#2d6a4f" },
  heading: { margin: "0 0 4px", fontSize: 22, color: "#111" },
  sub: { margin: "0 0 24px", fontSize: 14, color: "#666" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: "bold", color: "#333", marginTop: 8 },
  optional: { fontWeight: "normal", color: "#999" },
  input: {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  button: {
    marginTop: 12,
    padding: "11px",
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    cursor: "pointer",
  },
  success: { fontSize: 18, color: "#2d6a4f", margin: "0 0 20px" },
};
