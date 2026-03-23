import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import maplibregl from "maplibre-gl";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import "maplibre-gl/dist/maplibre-gl.css";
import API from "../api/axiosInstance.js";
 
const RATINGS = [1, 2, 3, 4, 5];
 
const normalStyle = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-base",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -0.25,
        "raster-brightness-min": 0.05,
        "raster-contrast": 0.05,
      },
    },
  ],
};
 
export default function ReviewPage({ onSubmit }) {
  const [form, setForm] = useState({ rating: "", title: "", body: "", location: "", coordinates: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toastShown = useRef(false);
 
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const parkPolygonsRef = useRef(null);
 
  // redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !toastShown.current) {
      toastShown.current = true;
      toast.error("Please login/signup first");
      navigate("/login");
    }
  }, []);
 
  // set up map
  useEffect(() => {
    if (!mapContainerRef.current) return;
 
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: normalStyle,
      center: [-1.905, 52.4484],
      zoom: 15.4,
    });
 
    map.addControl(new maplibregl.NavigationControl(), "top-right");
 
    map.on("load", async () => {
      try {
        const response = await API.get("/api/parks");
        const geojsonData = response.data;
 
        parkPolygonsRef.current = geojsonData;
 
        map.addSource("park-boundary", {
          type: "geojson",
          data: geojsonData,
        });
 
        map.addLayer({
          id: "park-fill",
          type: "fill",
          source: "park-boundary",
          paint: { "fill-color": "#5a9e4f", "fill-opacity": 0.2 },
        });
 
        map.addLayer({
          id: "park-outline",
          type: "line",
          source: "park-boundary",
          paint: { "line-color": "#2d5a27", "line-width": 2 },
        });
      } catch (err) {
        console.error("Error loading boundaries:", err);
      }
    });
 
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      const clickedPt = point([lng, lat]);
      const currentData = parkPolygonsRef.current;
 
      if (!currentData) {
        toast.error("Park boundaries are still loading...");
        return;
      }
 
      const matchedPark = currentData.features.find((feature) =>
        booleanPointInPolygon(clickedPt, feature)
      );
 
      if (!matchedPark) {
        toast.error("Location must be inside a park boundary");
        return;
      }
 
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({
          color: "#2d6a4f",
          draggable: false,
        })
          .setLngLat([lng, lat])
          .addTo(map);
      }
 
      // use park name from properties, fall back to coordinates if not found
      const parkLabel = matchedPark?.properties?.name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
 
      setForm((prev) => ({
        ...prev,
        location: parkLabel,
        coordinates: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      }));
    });
 
    mapRef.current = map;
    return () => map.remove();
  }, []);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating || !form.body) return;
    setLoading(true);
 
    try {
      const [lat, lng] = form.coordinates
        ? form.coordinates.split(",").map((c) => parseFloat(c.trim()))
        : [null, null];
 
      const payload = {
        rating: parseInt(form.rating),
        title: form.title,
        body: form.body,
        parkName: form.location,
        ...(lat && lng && {
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
        }),
      };
 
      //backend
      const response = await API.post("/api/reviews", payload);
 
      if (response.status === 201 || response.status === 200) {
        toast.success("Review submitted successfully");
        setSubmitted(true);
        setLoading(false);
        return navigate("/");
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message || "Failed to submit review. Please try again.";
      toast.error(errorMessage);
      setLoading(false);
    }
  };
 
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>OpenParks</h1>
          <p style={styles.success}>Review submitted. Thank you!</p>
          <button
            style={styles.button}
            onClick={() => {
              setSubmitted(false);
              setForm({ rating: "", title: "", body: "", location: "", coordinates: "" });
            }}
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }
 
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>OpenParks</h1>
        <h2 style={styles.heading}>Leave a review</h2>
 
        <form onSubmit={handleSubmit} style={styles.form}>
 
          {/* star rating */}
          <label style={styles.label}>Rating</label>
          <div style={{ display: "flex", gap: 8 }}>
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, rating: r })}
                style={{
                  ...styles.starBtn,
                  color: r <= form.rating ? "#f5a623" : "#ddd",
                }}
              >
                ★
              </button>
            ))}
          </div>
 
          {/* title */}
          <label style={styles.label}>
            Title <span style={styles.optional}>(optional)</span>
          </label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Great place for a walk"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
 
          {/* map pinpoint */}
          <label style={styles.label}>
            Pin location on map{" "}
            <span style={styles.optional}>(click inside a park)</span>
          </label>
          <div ref={mapContainerRef} style={styles.mapContainer} />
 
          {/* shows park name once clicked */}
          <input
            style={{ ...styles.input, color: "#666", background: "#f9f9f9" }}
            type="text"
            placeholder="Click the map to select a park..."
            value={form.location}
            readOnly
          />
 
          {/* review body */}
          <label style={styles.label}>Review</label>
          <textarea
            style={{ ...styles.input, resize: "vertical" }}
            rows={4}
            placeholder="Share your experience of this park..."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            required
          />
 
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit review"}
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
    maxWidth: 480,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { margin: "0 0 24px", fontSize: 20, color: "#2d6a4f" },
  heading: { margin: "0 0 20px", fontSize: 22, color: "#111" },
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
  starBtn: {
    background: "none",
    border: "none",
    fontSize: 28,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    transition: "color 0.1s",
  },
  mapContainer: {
    width: "100%",
    height: 250,
    borderRadius: 6,
    border: "1px solid #ddd",
    overflow: "hidden",
    marginTop: 4,
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