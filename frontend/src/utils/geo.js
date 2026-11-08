// Bounding box of every Polygon / MultiPolygon in a GeoJSON FeatureCollection,
// widened by `padding` degrees on each side. Returns null when there is nothing to bound.
export function computeBounds(fc, padding = 0.01) {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const addRing = (ring) => {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }

  for (const feature of fc?.features ?? []) {
    const geometry = feature?.geometry
    if (geometry?.type === 'Polygon') geometry.coordinates.forEach(addRing)
    else if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach((polygon) => polygon.forEach(addRing))
  }

  if (minLng === Infinity) return null
  return [[minLng - padding, minLat - padding], [maxLng + padding, maxLat + padding]]
}
