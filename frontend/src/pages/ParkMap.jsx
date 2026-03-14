import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function MapRenderer() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)

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
          {['Login', 'Review', 'Report'].map(label => (
            <button key={label} style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Map */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}