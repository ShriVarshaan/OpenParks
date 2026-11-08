import {
  parseOsmId,
  normalizeAmenityName,
  toParkFeatures,
  toTrailFeatures,
  toAmenityFeatures,
} from "../../scripts/osm/transform.js";

const square = (x) => ({
  type: "Polygon",
  coordinates: [[[x, 52], [x + 0.01, 52], [x + 0.01, 52.01], [x, 52], [x, 52]]],
});

// osmtogeojson output: tags flattened into properties, plus id "type/number"
const feature = (id, geometry, tags) => ({ type: "Feature", id, geometry, properties: { ...tags, id } });

describe("parseOsmId", () => {
  test("splits an osmtogeojson id into type and numeric id string", () => {
    expect(parseOsmId("relation/17997717")).toEqual({ osm_type: "relation", osm_id: "17997717" });
  });
});

describe("normalizeAmenityName", () => {
  test("maps OSM amenity=toilets to the frontend's 'toilet' icon key", () => {
    expect(normalizeAmenityName({ amenity: "toilets" })).toBe("toilet");
  });

  test("maps leisure=playground to 'playground'", () => {
    expect(normalizeAmenityName({ leisure: "playground" })).toBe("playground");
  });

  test("keeps a supported amenity value as-is", () => {
    expect(normalizeAmenityName({ amenity: "bench" })).toBe("bench");
  });

  test("returns null for amenities the map has no icon for", () => {
    expect(normalizeAmenityName({ amenity: "atm" })).toBeNull();
  });
});

describe("toParkFeatures", () => {
  test("keeps only named, non-excluded polygons with OSM identity properties", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        feature("way/1", square(-1.9), { leisure: "park", name: "A Park" }),
        feature("way/2", square(-1.8), { leisure: "park" }),
        feature("node/3", { type: "Point", coordinates: [-1.9, 52] }, { leisure: "park", name: "Point Park" }),
        feature("way/4", square(-1.7), { leisure: "park", name: "Excluded Park" }),
      ],
    };

    const parks = toParkFeatures(fc, ["way/4"]);

    expect(parks).toHaveLength(1);
    expect(parks[0].properties).toEqual({ osm_type: "way", osm_id: "1", name: "A Park" });
    expect(parks[0].geometry).toEqual(square(-1.9));
  });
});

describe("toTrailFeatures", () => {
  test("keeps footpath-type lines and drops roads, with null for missing tags", () => {
    const line = { type: "LineString", coordinates: [[-1.9, 52], [-1.89, 52.01]] };
    const fc = {
      type: "FeatureCollection",
      features: [
        feature("way/10", line, { highway: "residential", name: "Some Road" }),
        feature("way/11", line, { highway: "footway" }),
      ],
    };

    const trails = toTrailFeatures(fc);

    expect(trails).toHaveLength(1);
    expect(trails[0].properties).toEqual({ osm_id: "11", highway: "footway", name: null, surface: null });
  });
});

describe("toAmenityFeatures", () => {
  test("builds points from node lat/lon and way centres, sorted by id", () => {
    const elements = [
      { type: "way", id: 6, center: { lat: 52.41, lon: -1.91 }, tags: { leisure: "playground" } },
      { type: "node", id: 5, lat: 52.4, lon: -1.9, tags: { amenity: "cafe" } },
      { type: "node", id: 7, lat: 52.4, lon: -1.9, tags: { amenity: "atm" } },
    ];

    const amenities = toAmenityFeatures(elements);

    expect(amenities.map((a) => a.geometry.coordinates)).toEqual([[-1.9, 52.4], [-1.91, 52.41]]);
    expect(amenities.map((a) => a.properties)).toEqual([
      { osm_type: "node", osm_id: "5", name: "cafe" },
      { osm_type: "way", osm_id: "6", name: "playground" },
    ]);
  });
});
