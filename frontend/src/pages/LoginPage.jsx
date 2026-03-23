import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast"
import API from "../api/axiosInstance";
import { useNavigate } from "react-router";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [digits, setDigits] = useState(Array(8).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);

  const toastShown = useRef(false)
  const inputRefs = useRef([]);

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (token && !toastShown.current){
      toastShown.current = true
      toast.error("You are already logged in")
      navigate("/")
      return
    }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isRegister){
      try{
        const res = await API.post("/api/auth/login", {email: form.email, password: form.password})
        
        
        toast.success("Logged in successfully")
        localStorage.setItem("token", res.data.token)
        navigate("/")

      } catch (err) {
        if (err.response?.status === 403){
          toast.error("Please verify your email before logging in")
          setPendingEmail(form.email)
          setOtpStep(true)
        }else {
          toast.error("Invalid credentials")
        }
        
      }
    }else{
      try{
        const res = await API.post("/api/auth/signup", {username: form.username, email: form.email, password: form.password})
        setPendingEmail(form.email)
        setOtpStep(true)
        toast.success("Check your email for verification code")
        localStorage.setItem("token", res.data.token)

      } catch (err){
        if (err.response && err.response.status === 409){
          toast.error("User exists already, login")
        }else if (err.response?.data?.error){
          console.log(err.response.data.error)
          toast.error(err.response.data.error)
        }
        else{
          console.log(err.response)
          toast.error("Invalid user/email/password fields")
        }
      }
    }
    setLoading(false)
  }

  const handleDigitChange = (index, value) => {
    // Handle paste of full code into first box
    if (value.length > 1) {
      const pasted = value.replace(/[^0-9a-f]/gi, "").slice(0, 8);
      const next = Array(8).fill("");
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, 7)]?.focus();
      return;
    }
    if (!/^[0-9a-f]?$/i.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 7) inputRefs.current[index + 1]?.focus();
  };
 
  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
 
  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < 8) {
      toast.error("Please enter the full 8-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/api/auth/verify-otp", { email: pendingEmail, otp })
      toast.success("Account verified!")
      localStorage.setItem("token", res.data.token)
      navigate("/")
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Invalid code, please try again")
      setDigits(Array(8).fill(""))
      inputRefs.current[0]?.focus();
    }
    setLoading(false)
  };
 
  const handleResend = async () => {
    setLoading(true);
    try {
        await API.post("/api/auth/resend-otp", { email: pendingEmail });
        setDigits(Array(8).fill(""));
        setResendCooldown(60);
        inputRefs.current[0]?.focus();
        toast.success("New code sent");
    } catch {
        toast.error("Failed to resend code, please try again");
    }
    setLoading(false);
};

  if (otpStep) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1.5" fill="#2d6a4f"/>
          </svg>
        </div>

        <h1 style={styles.title}>OpenParks</h1>
        <h2 style={styles.heading}>Check your email</h2>
        <p style={styles.sub}>
          We sent an 8-character code to<br />
          <strong style={{ color: "#2d6a4f" }}>{pendingEmail}</strong>
        </p>

        <div style={styles.digitRow}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              maxLength={8}
              value={d}
              disabled={loading}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleDigitKeyDown(i, e)}
              style={{
                ...styles.digitInput,
                borderColor: d ? "#2d6a4f" : "#e0e0e0",
                background: d ? "#f0f7f4" : "#fafafa",
                transform: d ? "scale(1.08)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <p style={styles.expiry}>⏱ Expires in 5 minutes</p>

        <button
          style={{
            ...styles.button,
            opacity: digits.join("").length < 8 || loading ? 0.6 : 1,
            cursor: digits.join("").length < 8 || loading ? "not-allowed" : "pointer",
          }}
          onClick={handleVerify}
          disabled={loading || digits.join("").length < 8}
        >
          {loading ? "Verifying..." : "Verify email →"}
        </button>

        <div style={styles.footer}>
          <p style={styles.toggle}>
            Didn't receive it?{" "}
            <button
              style={{ ...styles.link, opacity: resendCooldown > 0 ? 0.4 : 1 }}
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
          <button style={styles.backBtn} onClick={() => setOtpStep(false)}>
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>OpenParks</h1>
        <h2 style={styles.heading}>{isRegister ? "Create account" : "Sign in"}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <input
              style={styles.input}
              type="text"
              placeholder="Full name"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Loading..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p style={styles.toggle}>
          {isRegister ? "Already have an account? " : "No account? "}
          <button style={styles.link} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
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
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { margin: "0 0 24px", fontSize: 20, color: "#2d6a4f" },
  heading: { margin: "0 0 20px", fontSize: 22, color: "#111" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 15,
    outline: "none",
  },
  button: {
    padding: "11px",
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 4,
  },
  toggle: { marginTop: 20, fontSize: 14, color: "#666", textAlign: "center" },
  link: {
    background: "none",
    border: "none",
    color: "#2d6a4f",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    padding: 0,
  },
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f7f4 0%, #e8f5e9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "48px 36px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 4px 32px rgba(45,106,79,0.10)",
    textAlign: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#f0f7f4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: { margin: "0 0 4px", fontSize: 13, color: "#2d6a4f", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial, sans-serif" },
  heading: { margin: "0 0 12px", fontSize: 24, color: "#111", fontWeight: "bold" },
  sub: { margin: "0 0 28px", fontSize: 14, color: "#666", lineHeight: 1.6 },
  digitRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginBottom: 12,
  },
  digitInput: {
    width: 38,
    height: 48,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    outline: "none",
    transition: "all 0.15s ease",
    color: "#2d6a4f",
    fontFamily: "'Courier New', monospace",
  },
  expiry: { fontSize: 12, color: "#aaa", margin: "0 0 20px" },
  button: {
    width: "100%",
    padding: "13px",
    background: "#2d6a4f",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
    transition: "background 0.2s",
    marginBottom: 8,
  },
  footer: { marginTop: 24, borderTop: "1px solid #f0f0f0", paddingTop: 20 },
  toggle: { margin: "0 0 12px", fontSize: 14, color: "#888" },
  link: { background: "none", border: "none", color: "#2d6a4f", cursor: "pointer", fontSize: 14, fontWeight: "bold", padding: 0 },
  backBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13, padding: 0 },
};
