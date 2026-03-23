import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import maplibregl from "maplibre-gl";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import "maplibre-gl/dist/maplibre-gl.css";
import API from "../api/axiosInstance.js"


// report types for menu
const REPORT_TYPES = ["Damaged equipment", "Litter", "Vandalism", "Unsafe path", "Flooding", "Other"];

//how map looks
const normalStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{
    id: 'osm-base',
    type: 'raster',
    source: 'osm',
    paint: {
      'raster-saturation': -0.25,
      'raster-brightness-min': 0.05,
      'raster-contrast': 0.05,
    },
  }],
};

export default function ReportPage({ parkName = "this park", onSubmit }) {
  //current inputted values
  const [form, setForm] = useState({ type: "", description: "", location: "" });
  //submitted or not
  const [submitted, setSubmitted] = useState(false);
  //currently being submitted or not
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toastShown = useRef(false);
  

  const [parkPolygons, setParkPolygons] = useState(null)

  //map refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const parkPolygonsRef = useRef(null);

  //authorise if they are logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !toastShown.current) {
      toastShown.current = true;
      toast.error("Please login/signup first");
      navigate("/login");
      return;
    }
  }, []);

  //show map and allow user to drop marker to select location
  useEffect(() => {
    if (!mapContainerRef.current) return;

    //create map (center at cannon hill park)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: normalStyle,
      center: [-1.9050, 52.4484],
      zoom: 15.4,
    });

    //zoom buttons
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      try {
        const response = await API.get('/api/parks');
        const geojsonData = response.data;
        
        // Save to state for the click handler
        setParkPolygons(geojsonData);
        parkPolygonsRef.current = geojsonData;

        map.addSource('park-boundary', {
          type: 'geojson',
          data: geojsonData,
        });

        map.addLayer({
          id: 'park-fill',
          type: 'fill',
          source: 'park-boundary',
          paint: { 
            'fill-color': '#5a9e4f', 
            'fill-opacity': 0.2 
          }
        });

        map.addLayer({
          id: 'park-outline',
          type: 'line',
          source: 'park-boundary',
          paint: { 
            'line-color': '#2d5a27', 
            'line-width': 2 
          }
        });
      } catch (err) {
        console.error("Error loading boundaries:", err);
      }
    });

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      const clickedPt = point([lng, lat]);
      const currentData = parkPolygonsRef.current

      if (!currentData) {
        toast.error("Park boundaries are still loading...");
        return;
      }

      const isInsideAnyPark = currentData.features.some((feature) =>
        booleanPointInPolygon(clickedPt, feature)
      );

      if (!isInsideAnyPark) {
        toast.error("Location must be inside a park boundary");
        return;
      }

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ 
          color: "#2d6a4f",
          draggable: false 
        })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      setForm((prev) => ({
        ...prev,
        location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      }));
    })

    mapRef.current = map;

    return () => map.remove();
  }, []);

  //submit report button handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    //check fields are filled in before submitting
    if (!form.type || !form.description) return;
    setLoading(true);

    console.log(form)

    try {
    // 1. Split the "lat, lng" string and parse to floats
      const [lat, lng] = form.location.split(",").map(coord => parseFloat(coord.trim()));

      // 2. Construct the payload for the backend
      const payload = {
          heading: form.type, // Renaming type to heading
          description: form.description,
          location: {
            type: "Point",
            coordinates: [lng, lat] // Standard GeoJSON order: [Longitude, Latitude]
          }
        };

      // 3. Execute the POST request
      const response = await API.post("/api/safetyreport", payload);

      if (response.status === 201 || response.status === 200) {
        toast.success("Report submitted successfully");
        setSubmitted(true);
        setLoading(false)
        return navigate("/")
      }
    } catch(err){
      console.error(err);
      const errorMessage = err.response?.data?.message || "Failed to submit report. Please try again.";
      toast.error(errorMessage);
      setLoading(false)
    }
  };

  //form submitted successfully (reset everything to allow for more reports)
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>OpenParks</h1>
          <p style={styles.success}>Report submitted. Thank you!</p>
          <button
            style={styles.button}
            onClick={() => {
              setSubmitted(false);
              setForm({ type: "", description: "", location: "" });
            }}
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  //main UI for report form
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🌿 OpenParks</h1>
        <h2 style={styles.heading}>Report an issue</h2>
        <p style={styles.sub}>at {parkName}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* drop down report type */}
          <label style={styles.label}>Issue type</label>
          <select
            style={styles.input}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          >
            <option value="">Select a type...</option>
            {REPORT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          {/* mapand pinpoint */}
          <label style={styles.label}>
            Pin location on map{" "}
            <span style={styles.optional}>(click to place a marker)</span>
          </label>

          {/* MapLibre map */}
          <div
            ref={mapContainerRef}
            style={styles.mapContainer}
          />

          {/* show coordinates they selected (read-only) */}
          <input
            style={{ ...styles.input, color: "#666", background: "#f9f9f9" }}
            type="text"
            placeholder="Click the map to set a location..."
            value={form.location}
            readOnly
          />

            {/* description of issue box */}
          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, resize: "vertical" }}
            rows={4}
            placeholder="Describe the issue..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          {/* submit button */}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}

//styles for the page
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
