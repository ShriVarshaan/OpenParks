import { useEffect, useRef, useState} from 'react'
import {useNavigate} from "react-router"
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import API from "../api/axiosInstance.js"

const TRAIL_TYPES = [
  { label: 'Footpath',       color: '#5a9e4f' },
  { label: 'Mud / Informal', color: '#a0724a', dashed: true },
  { label: 'Cycleway',       color: '#e8a020' },
  { label: 'Road',           color: '#888880' },
  { label: 'Bridge',         color: '#4a9ebe', thick: true },
  { label: 'Bridleway',      color: '#9b6fce', dashed: true },
]

const REPORT_CATEGORIES = [
  'Damaged equipment', 'Litter', 'Vandalism', 'Unsafe path', 'Flooding', 'Other'
]

export default function MapRenderer() {
  const navigate = useNavigate()
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [trailData, setTrailData] = useState(null)
  const [isLoggedIn, setLoggedIn] = useState(false)

  const reportsMarkersRef = useRef([])
  const amenityMarkersRef = useRef([])
  const userMarkerRef = useRef(null)

  const AMENITY_ICONS = {
    toilet:       { emoji: '🚻', color: '#4a9ebe', label: 'Toilets' },
    bench:         { emoji: '🪑', color: '#a0724a', label: 'Bench' },
    cafe:          { emoji: '☕', color: '#c8701a', label: 'Café' },
    restaurant:    { emoji: '🍽️', color: '#e84040', label: 'Restaurant' },
    drinking_water:{ emoji: '💧', color: '#2196f3', label: 'Drinking Water' },
    playground:    { emoji: '🛝', color: '#f5a623', label: 'Playground' },
    parking:       { emoji: '🅿️', color: '#607d8b', label: 'Parking' },
    bicycle_parking:{ emoji:'🚲', color: '#8bc34a', label: 'Bike Parking' },
    waste_basket:  { emoji: '🗑️', color: '#78909c', label: 'Bin' },
    shelter:       { emoji: '⛺', color: '#6d8b3a', label: 'Shelter' },
  }

  const DEFAULT_AMENITY = { emoji: '📍', color: '#888', label: 'Amenity' }

  function buildReportPopupHTML(report) {
    return `
      <div style="padding: 5px; font-family: sans-serif;">
        <b style="color: #2d6a4f;">${report.heading}</b>
        <p style="margin: 4px 0 6px; font-size: 12px; color: #444;">${report.description}</p>
        ${isLoggedIn ? 
          `<button
            onclick="window.__resolveReport('${report.id}', this)"
            style="
              background: #f0faf0; border: 1.5px solid #5a9e4f; color: #2d5a27;
              font-size: 11px; font-weight: 600; padding: 5px 12px;
              border-radius: 20px; cursor: pointer;
            "
          >✓ Mark as resolved</button>`
        : ""
        }
      </div>
    `
  }

  useEffect(() => {
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
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
            'raster-saturation':     -0.25,
            'raster-brightness-min':  0.05,
            'raster-contrast':        0.05,
          },
        }],
      },
      center: [-1.9050, 52.4484],
      zoom: 15.4,
      minZoom: 13,
      maxZoom: 19,
      maxBounds: [[-1.96, 52.42], [-1.86, 52.48]],
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')


    map.on('load', () => {
      API.get('/api/parks')
        .then(r => {
          map.addSource('park-boundary', {
            type: 'geojson',
            data: r.data,
          })
          map.addLayer({
            id: 'park-fill',
            type: 'fill',
            source: 'park-boundary',
            paint: { 'fill-color': '#5a9e4f', 'fill-opacity': 0.15 },
          })
          map.addLayer({
            id: 'park-outline',
            type: 'line',
            source: 'park-boundary',
            paint: { 'line-color': '#2d5a27', 'line-width': 2.5 },
          })
        })
      .catch(err => console.error(err))

      API.get('/api/trails').then(r => {
        map.addSource('trails', { type: 'geojson', data: r.data })
        map.addLayer({
          id: 'trails-layer',
          type: 'line',
          source: 'trails',
          paint: {
            'line-color': ['match', ['get', 'highway'],
              'footway',    '#5a9e4f',
              'cycleway',   '#e8a020',
              'bridleway',  '#9b6fce',
              'path',       '#a0724a',
              'track',      '#a0724a',
              'road',       '#888880',
              'residential','#888880',
              'service',    '#888880',
              '#a0724a'
            ],
            'line-width': 2
          }
        })
      })

      API.get('/api/safetyreport').then(reports => {
        const geojson = {
          type: 'FeatureCollection',
          features: reports.data.map(r => ({
            type: 'Feature',
            geometry: r.location,
            properties: { heading: r.heading }
          }))
        }
        map.addSource('heatmap-reports', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'reports-heatmap',
          type: 'heatmap',
          source: 'heatmap-reports',
          paint: {
              'heatmap-weight': 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 19, 2],
              'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(0,0,0,0)',
                0.2, 'rgba(255,235,0,0.5)',
                0.5, 'rgba(255,140,0,0.8)',
                0.8, 'rgba(255,50,0,0.9)',
                1, 'rgba(200,0,0,1)'
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 13, 15, 19, 40],
              'heatmap-opacity': 0.8
            }
          })
      }).catch(err => console.error('Heatmap fetch failed:', err.message))

      API.get("/api/amenities").then(r => {
        map.addSource('amenities', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: r.data }
        });

        r.data.forEach(feature => {
        const { name } = feature.properties
        const [lng, lat] = feature.geometry.coordinates
        const config = AMENITY_ICONS[name] ?? DEFAULT_AMENITY

        const el = document.createElement('div')
        el.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${config.color};
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          cursor: pointer;
        `
        el.textContent = config.emoji

        const popup = new maplibregl.Popup({ offset: 20, maxWidth: '220px' })
          .setHTML(`
            <div style="
              font-family: inherit;
              padding: 6px 4px 2px;
              min-width: 160px;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
              ">
                <div style="
                  width: 36px; height: 36px;
                  border-radius: 50%;
                  background: ${config.color}22;
                  border: 2px solid ${config.color};
                  display: flex; align-items: center;
                  justify-content: center;
                  font-size: 18px; flex-shrink: 0;
                ">${config.emoji}</div>
                <div>
                  <div style="
                    font-weight: 700;
                    font-size: 13px;
                    color: #2d5a27;
                    line-height: 1.2;
                  ">${name ?? config.label}</div>
                  <div style="
                    font-size: 10px;
                    font-weight: 500;
                    color: ${config.color};
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 1px;
                  ">${config.label}</div>
                </div>
              </div>
            </div>
          `)

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)

        amenityMarkersRef.current.push({ marker, el })
      })

      const updateMarkerVisibility = () => {
        const zoom = map.getZoom()
        amenityMarkersRef.current.forEach(({ marker, el }) => {
          if (zoom >= 14.5) {
            marker.addTo(map)
            el.style.display = 'flex'
          } else {
            marker.remove()
          }
        })
      }
      updateMarkerVisibility()
      map.on('zoom', updateMarkerVisibility)

      
      })
      
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    window.__resolveReport = async (reportId, btn) => {
      try {
        btn.disabled = true
        btn.textContent = 'Resolving…'
        await API.patch(`/api/safetyreport/${reportId}/resolve`)
        btn.textContent = 'Resolved ✓'
        btn.style.background = '#d4edda'
        setTimeout(() => {
          const entry = reportsMarkersRef.current.find(m => m.reportId === reportId)
          if (entry) { entry.marker.remove(); reportsMarkersRef.current = reportsMarkersRef.current.filter(m => m.reportId !== reportId) }
        }, 800)
      } catch { btn.disabled = false; btn.textContent = '✓ Mark as resolved' }
    }
    return () => { delete window.__resolveReport }
  }, [])


  
  useEffect(() => {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
 
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { longitude, latitude } = coords
 
        if (!userMarkerRef.current) {
          const el = document.createElement('div')
          el.style.cssText = `
            width:18px; height:18px; border-radius:50%;
            background:#4285f4; border:3px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);`
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map)
        } else {
          userMarkerRef.current.setLngLat([longitude, latitude])
        }
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true }
    )
 
    return () => {
      navigator.geolocation.clearWatch(watchId)
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [mapRef.current]) 

  useEffect(() => {
    const map = mapRef.current;
    
    if (!map) return;

    reportsMarkersRef.current.forEach(entry => entry.marker.remove());
    reportsMarkersRef.current = [];
    
    if (!activeCategory) return;

    const fetchReports = async () => {
      try {
        const response = await API.get(`/api/safetyreport/${activeCategory}`);
        const allReports = response.data;

        const filtered = allReports.filter(r => r.heading === activeCategory);

        filtered.forEach(report => {
          const [lng, lat] = report.location.coordinates;

          console.log(report)
          
          const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(buildReportPopupHTML(report))

          const marker = new maplibregl.Marker({ color: "#e63946" })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          reportsMarkersRef.current.push({ marker, reportId: String(report.id) });
        });
      } catch (err) {
        console.error("Failed to fetch safety reports:", err.response?.status || err.message);
      }
    };

    if (map.isStyleLoaded()) {
      fetchReports();
    } else {
      map.once('idle', fetchReports);
    }

  }, [activeCategory]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && trailData && map.isStyleLoaded()) {
      const source = map.getSource('trails');
      if (source) source.setData(trailData);
    }
  }, [trailData])


  // useEffect(() => {
  //   const map = mapRef.current
  //   if (!map) return

  //   const addHeatmap = async () => {
  //     try {
  //       const response = await API.get('/api/safetyreport')
  //       const reports = response.data
  //       const geojson = {
  //         type: 'FeatureCollection',
  //         features: reports.map(r => ({
  //           type: 'Feature',
  //           geometry: r.location,
  //           properties: { heading: r.heading }
  //         }))
  //       }
  //       if (!map.getSource('heatmap-reports')) {
  //         map.addSource('heatmap-reports', { type: 'geojson', data: geojson })
  //         map.addLayer({
  //           id: 'reports-heatmap',
  //           type: 'heatmap',
  //           source: 'heatmap-reports',
  //           paint: {
  //             'heatmap-weight': 1,
  //             'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 19, 2],
  //             'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
  //               0, 'rgba(0,0,0,0)',
  //               0.2, 'rgba(255,235,0,0.5)',
  //               0.5, 'rgba(255,140,0,0.8)',
  //               0.8, 'rgba(255,50,0,0.9)',
  //               1, 'rgba(200,0,0,1)'
  //             ],
  //             'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 13, 15, 19, 40],
  //             'heatmap-opacity': 0.8
  //           }
  //         })
  //       } else {
  //         map.getSource('heatmap-reports').setData(geojson)
  //       }
  //     } catch (err) {
  //       console.error('Heatmap fetch failed:', err.message)
  //     }
  //   }

  //   if (map.isStyleLoaded()) {
  //     addHeatmap()
  //   } else {
  //     map.once('load', addHeatmap)
  //   }
  // }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>

      {/* Header */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: '#2d5a27',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: '#5a9e4f', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🌿</div>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', letterSpacing: '-0.3px', margin: 0 }}>
              OpenParks
            </h1>
            <span style={{ fontSize: 12, fontWeight: 300, color: '#c8e6c0', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginTop: -4 }}>
              Cannon Hill · Birmingham
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>

          { !isLoggedIn && (
            <button key="Login" 
            onClick={() => navigate("/login")}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit',
          }}>
            Login
          </button>)
          }
          <button key="Review" style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 13, fontWeight: 500,
            padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Review
          </button>
          <button key="Report" 
            onClick={() => navigate("/report")}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit',
          }}>
            Report
          </button>
        </div>
      </nav>

      {/* Report category bar */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0, zIndex: 90,
        display: 'flex', justifyContent: 'center', padding: '8px 16px',
      }}>
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
          background: 'rgba(245,240,232,0.97)', padding: '7px 10px',
          borderRadius: 32, boxShadow: '0 8px 32px rgba(26,46,24,0.18)',
          backdropFilter: 'blur(12px)',
        }}>
          {REPORT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{
                background: activeCategory === cat ? '#2d5a27' : 'transparent',
                border: `1.5px solid ${activeCategory === cat ? '#2d5a27' : 'transparent'}`,
                color: activeCategory === cat ? '#fff' : '#4a6648',
                fontSize: 12, fontWeight: 500, padding: '5px 12px',
                borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Trail key */}
      <div style={{
        position: 'absolute', bottom: 40, left: 16, zIndex: 80,
        background: 'rgba(245,240,232,0.97)', borderRadius: 12,
        padding: '12px 14px', boxShadow: '0 8px 32px rgba(26,46,24,0.18)',
        fontSize: 12, minWidth: 158,
      }}>
        <div style={{
          fontWeight: 600, fontSize: 10, letterSpacing: 1.5,
          textTransform: 'uppercase', color: '#5a9e4f', marginBottom: 8,
        }}>
          Trail Types
        </div>
        {TRAIL_TYPES.map(({ label, color, dashed, thick }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#4a6648' }}>
            {dashed ? (
              <div style={{
                width: 22, height: 4, flexShrink: 0, borderRadius: 2,
                background: `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)`,
              }} />
            ) : thick ? (
              <div style={{ width: 22, height: 6, borderRadius: 2, flexShrink: 0, background: color }} />
            ) : (
              <div style={{ width: 22, height: 4, borderRadius: 2, flexShrink: 0, background: color }} />
            )}
            {label}
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="map-container-wrapper"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      />
    </div>
  )
}
