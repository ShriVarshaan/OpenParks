import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast"
import API from "../api/axiosInstance";
import { useNavigate } from "react-router";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const toastShown = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (token && !toastShown.current){
      toastShown.current = true
      toast.error("You are already logged in")
      navigate("/")
      return
    }
  }, [])

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
        toast.error("Invalid credentials")
      }
    }else{
      try{
        const res = await API.post("/api/auth/signup", {username: form.username, email: form.email, password: form.password})
        
        toast.success("Signed up successfully")
        localStorage.setItem("token", res.data.token)
        navigate("/")

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
};
