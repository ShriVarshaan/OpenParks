import { useState, useEffect, useRef } from "react";
import API from "../api/axiosInstance.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
 
function Stars({ rating }) {
  return (
    <span style={{ color: "#f5a623", fontSize: 14 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}
 
export default function AccountPage() {
  const [tab, setTab] = useState("reviews");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const toastShown = useRef(false);
  const navigate = useNavigate();
 
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !toastShown.current) {
      toastShown.current = true;
      toast.error("You must be logged in");
      navigate("/login");
    }
  }, []);
 
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const u = await API.get("/api/user");
        setUser(u.data);
      } catch { toast.error("Failed to load profile"); }
      setUserLoading(false);
 
      try {
        const r = await API.get("/api/reviews/userreviews");
        setReviews(r.data);
      } catch { toast.error("Failed to load reviews"); }
      setReviewsLoading(false);
 
      try {
        const r = await API.get("/api/safetyreport/userreports");
        setReports(r.data);
      } catch { toast.error("Failed to load reports"); }
      setReportsLoading(false);
    };
    fetchAll();
  }, []);
 
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await API.delete("/api/user/delete");
      localStorage.removeItem("token");
      setDeleting(false);
      navigate("/");
    } catch {
      setDeleting(false);
      toast.error("Failed to delete account");
    }
  };
 
  return (
    <div style={styles.page}>
      <div style={styles.container}>
 
        {/* Profile card */}
        <div style={styles.card}>
          <h1 style={styles.title}>OpenParks</h1>
          {userLoading ? (
            <p style={styles.muted}>Loading...</p>
          ) : (
            <>
              <h2 style={styles.heading}>{user?.username}</h2>
              <p style={styles.muted}>{user?.email}</p>
            </>
          )}
        </div>
 
        {/* Tabs */}
        <div style={styles.card}>
          <div style={styles.tabRow}>
            {["reviews", "reports"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  ...styles.tab,
                  borderBottom: tab === t ? "2px solid #2d6a4f" : "2px solid transparent",
                  color: tab === t ? "#2d6a4f" : "#666",
                  fontWeight: tab === t ? "bold" : "normal",
                }}
              >
                {t === "reviews" ? "My Reviews" : "My Reports"}
                <span style={styles.tabCount}>
                  {t === "reviews"
                    ? (reviewsLoading ? "·" : reviews.length)
                    : (reportsLoading ? "·" : reports.length)}
                </span>
              </button>
            ))}
          </div>
 
          {/* Reviews tab */}
          {tab === "reviews" && (
            reviewsLoading ? (
              <p style={styles.muted}>Loading...</p>
            ) : reviews.length === 0 ? (
              <p style={styles.empty}>You haven't left any reviews yet.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} style={styles.item}>
                  <div style={styles.itemTop}>
                    <div>
                      <p style={styles.itemTitle}>{r.park?.name}</p>
                      <p style={styles.itemSub}>{r.created_at}</p>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  <p style={styles.itemBody}>{r.content}</p>
                </div>
              ))
            )
          )}
 
          {/* Reports tab */}
          {tab === "reports" && (
            reportsLoading ? (
              <p style={styles.muted}>Loading...</p>
            ) : reports.length === 0 ? (
              <p style={styles.empty}>You haven't filed any reports yet.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} style={styles.item}>
                  <div style={styles.itemTop}>
                    <div>
                      <p style={styles.itemTitle}>{r.Park?.name}</p>
                      <p style={styles.itemSub}>Filed {r.created_at}</p>
                    </div>
                    <span style={{
                      ...styles.statusPill,
                      background: r.heading === "resolved" ? "#e9f7ef" : "#eaf2fa",
                      color: r.heading === "resolved" ? "#1e8449" : "#2980b9",
                    }}>
                      {r.heading}
                    </span>
                  </div>
                  <p style={styles.itemBody}>{r.description}</p>
                </div>
              ))
            )
          )}
        </div>
 
        {/* Delete account */}
        <div style={styles.card}>
          <h2 style={{ ...styles.heading, fontSize: 16, marginBottom: 6 }}>Delete account</h2>
          <p style={styles.muted}>Permanently delete your account and all associated data. This cannot be undone.</p>
          <button
            style={{ ...styles.button, background: "#fff", color: "#c0392b", border: "1px solid #c0392b", marginTop: 12 }}
            onClick={() => setShowModal(true)}
          >
            Delete my account
          </button>
        </div>
 
      </div>
 
      {/* Confirm modal */}
      {showModal && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !deleting) setShowModal(false); }}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "#111" }}>Delete your account?</h3>
            <p style={{ ...styles.muted, marginBottom: 24 }}>
              This will permanently delete your account and all your data. This cannot be reversed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{ ...styles.button, background: "#fff", color: "#666", border: "1px solid #ddd" }}
                onClick={() => setShowModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, background: "#c0392b", border: "none" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
    padding: "40px 16px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 560,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: "28px 28px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  title: { margin: "0 0 16px", fontSize: 20, color: "#2d6a4f" },
  heading: { margin: "0 0 4px", fontSize: 22, color: "#111" },
  muted: { margin: "0 0 8px", fontSize: 14, color: "#666" },
  empty: { padding: "32px 0", textAlign: "center", fontSize: 14, color: "#999" },
  tabRow: {
    display: "flex",
    borderBottom: "1px solid #eee",
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    padding: "12px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabCount: {
    background: "#eee",
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: 12,
    color: "#666",
  },
  item: {
    borderBottom: "1px solid #f0f0f0",
    padding: "16px 0",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  itemTitle: { margin: "0 0 2px", fontWeight: "bold", fontSize: 14, color: "#111" },
  itemSub: { margin: 0, fontSize: 12, color: "#999" },
  itemBody: { margin: 0, fontSize: 13, color: "#555", lineHeight: 1.5, wordWrap: "break-word", overflowWrap: "break-word" },
  statusPill: {
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 12,
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  button: {
    padding: "10px 20px",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    background: "#fff",
    borderRadius: 8,
    padding: "32px",
    maxWidth: 400,
    width: "calc(100% - 40px)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
  },
};