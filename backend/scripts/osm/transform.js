// Pure conversions from OpenStreetMap data (osmtogeojson output / raw Overpass
// elements) into the GeoJSON features the seed script loads.

export const TRAIL_HIGHWAYS = ["footway", "path", "cycleway", "bridleway", "track", "pedestrian"];

// Must match the AMENITY_ICONS keys in frontend/src/pages/ParkMap.jsx
export const AMENITY_TYPES = [
  "toilet",
  "bench",
  "cafe",
  "restaurant",
  "drinking_water",
  "playground",
  "parking",
  "bicycle_parking",
  "waste_basket",
  "shelter",
];

// OSM tag value → icon key, where they differ
const AMENITY_ALIASES = { toilets: "toilet" };

const POLYGON_TYPES = new Set(["Polygon", "MultiPolygon"]);

export function parseOsmId(id) {
  const [osm_type, osm_id] = id.split("/");
  return { osm_type, osm_id };
}

export function normalizeAmenityName(tags = {}) {
  if (tags.leisure === "playground") return "playground";
  const name = AMENITY_ALIASES[tags.amenity] ?? tags.amenity;
  return AMENITY_TYPES.includes(name) ? name : null;
}

const byOsmId = (a, b) => {
  const diff = BigInt(a.properties.osm_id) - BigInt(b.properties.osm_id);
  if (diff !== 0n) return diff < 0n ? -1 : 1;
  return (a.properties.osm_type ?? "").localeCompare(b.properties.osm_type ?? "");
};

export function toParkFeatures(fc, exclude = []) {
  const excluded = new Set(exclude);
  return fc.features
    .filter((f) => POLYGON_TYPES.has(f.geometry?.type) && f.properties?.name && !excluded.has(f.id))
    .map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: { ...parseOsmId(f.id), name: f.properties.name },
    }))
    .sort(byOsmId);
}

export function toTrailFeatures(fc) {
  return fc.features
    .filter((f) => f.geometry?.type === "LineString" && TRAIL_HIGHWAYS.includes(f.properties?.highway))
    .map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        osm_id: parseOsmId(f.id).osm_id,
        highway: f.properties.highway,
        name: f.properties.name ?? null,
        surface: f.properties.surface ?? null,
      },
    }))
    .sort(byOsmId);
}

export function toAmenityFeatures(elements) {
  return elements
    .map((el) => {
      const name = normalizeAmenityName(el.tags);
      const point = el.lat != null ? el : el.center;
      if (!name || !point) return null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lon, point.lat] },
        properties: { osm_type: el.type, osm_id: String(el.id), name },
      };
    })
    .filter(Boolean)
    .sort(byOsmId);
}
