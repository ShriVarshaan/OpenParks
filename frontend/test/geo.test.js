import { describe, expect, it } from 'vitest'
import { computeBounds } from '../src/utils/geo'

const square = (west, east, south, north) => [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
const fc = (geometries) => ({
  type: 'FeatureCollection',
  features: geometries.map((geometry) => ({ type: 'Feature', geometry, properties: {} })),
})

describe('computeBounds', () => {
  it('spans every polygon in the collection', () => {
    const parks = fc([
      { type: 'Polygon', coordinates: square(-1.95, -1.90, 52.43, 52.47) },
      { type: 'Polygon', coordinates: square(-1.88, -1.87, 52.44, 52.45) },
    ])

    expect(computeBounds(parks, 0)).toEqual([[-1.95, 52.43], [-1.87, 52.47]])
  })

  it('handles MultiPolygon parks the same way', () => {
    const parks = fc([
      { type: 'MultiPolygon', coordinates: [square(-1.95, -1.90, 52.43, 52.47), square(-1.88, -1.87, 52.44, 52.45)] },
    ])

    expect(computeBounds(parks, 0)).toEqual([[-1.95, 52.43], [-1.87, 52.47]])
  })

  it('adds the padding on every side', () => {
    const parks = fc([{ type: 'Polygon', coordinates: square(-1.95, -1.90, 52.43, 52.47) }])

    const [[w, s], [e, n]] = computeBounds(parks, 0.01)

    expect([w, s, e, n].map((v) => Number(v.toFixed(6)))).toEqual([-1.96, 52.42, -1.89, 52.48])
  })

  it('returns null when there are no parks', () => {
    expect(computeBounds({ type: 'FeatureCollection', features: [] })).toBeNull()
  })

  it('ignores features without a polygon geometry', () => {
    const parks = fc([{ type: 'Point', coordinates: [0, 0] }, null])

    expect(computeBounds(parks)).toBeNull()
  })
})
