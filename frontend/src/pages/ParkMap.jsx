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
            'raster-saturation':      -0.25,
            'raster-brightness-min':   0.05,
            'raster-contrast':         0.05,
          },
        }],
      },
      center: [-1.9050, 52.4484], // Cannon Hill Park
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
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}