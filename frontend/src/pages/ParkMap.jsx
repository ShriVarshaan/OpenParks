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
      zoom:    15.4,
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
              'footway',   '#5a9e4f',
              'cycleway',  '#e8a020',
              'bridleway', '#9b6fce',
              /* default */ '#a0724a'
            ],
            'line-width': 2
          }
        })
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>

      {/* Header */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: '#2d5a27',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
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

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button key="Login" 
            onClick = {() => navigate("/login")}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit',
          }}>
            Login
          </button>
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
          {/* {['Login', 'Review', 'Report'].map(label => (
            <button key={label} style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))} */}
        </div>
      </nav>

      {/* ── Report category bar ── */}
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

        {/* ── Trail key ── */}
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
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}