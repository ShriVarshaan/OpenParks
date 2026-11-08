// Tiny hand-made snapshot in the same shape as prisma/data/*.geojson.
// Park A and Park B share the edge at lng -1.900.

const square = (west, east, south, north) => ({
  type: "Polygon",
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

export const PARK_A = { osm_type: "way", osm_id: "1001", name: "Cannon Hill Park" };
export const PARK_B = { osm_type: "way", osm_id: "1002", name: "Park B" };
export const BOWTIE = { osm_type: "relation", osm_id: "1003", name: "Bowtie Park" };
export const CROSSING_TRAIL_ID = "2001";

const fc = (features) => ({ type: "FeatureCollection", features });
const feature = (geometry, properties) => ({ type: "Feature", geometry, properties });

export function fixtureData() {
  return {
    parks: fc([
      feature(square(-1.91, -1.9, 52.44, 52.45), { ...PARK_A }),
      feature(square(-1.9, -1.88, 52.44, 52.45), { ...PARK_B }),
      // Self-intersecting "bowtie" ring: invalid as-is, must be repaired by ST_MakeValid
      feature(
        {
          type: "Polygon",
          coordinates: [[[-1.87, 52.44], [-1.86, 52.45], [-1.86, 52.44], [-1.87, 52.45], [-1.87, 52.44]]],
        },
        { ...BOWTIE }
      ),
    ]),
    trails: fc([
      // 0.005° inside Park A, 0.015° inside Park B → belongs to Park B
      feature(
        { type: "LineString", coordinates: [[-1.905, 52.445], [-1.885, 52.445]] },
        { osm_id: CROSSING_TRAIL_ID, highway: "footway", name: "Crossing Path", surface: "gravel" }
      ),
      // Outside every park → skipped
      feature(
        { type: "LineString", coordinates: [[-1.95, 52.43], [-1.94, 52.43]] },
        { osm_id: "2002", highway: "path", name: null, surface: null }
      ),
    ]),
    amenities: fc([
      feature({ type: "Point", coordinates: [-1.905, 52.445] }, { osm_type: "node", osm_id: "3001", name: "bench" }),
      // Outside every park → skipped
      feature({ type: "Point", coordinates: [-1.95, 52.43] }, { osm_type: "node", osm_id: "3002", name: "cafe" }),
    ]),
  };
}
