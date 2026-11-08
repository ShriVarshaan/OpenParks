// Downloads parks, trails and amenities from OpenStreetMap (Overpass API) for every
// area in parks.config.json and writes GeoJSON snapshots to prisma/data/.
// Usage: npm run parks:fetch
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import osmtogeojson from "osmtogeojson";
import { buildQueries, fetchOverpass } from "./osm/overpass.js";
import { toParkFeatures, toTrailFeatures, toAmenityFeatures } from "./osm/transform.js";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.join(SCRIPTS_DIR, "parks.config.json");
const DEFAULT_OUT_DIR = path.join(SCRIPTS_DIR, "..", "prisma", "data");

const keyOf = (f) => `${f.properties.osm_type ?? "way"}/${f.properties.osm_id}`;

function dedupe(features) {
  const seen = new Map();
  for (const f of features) seen.set(keyOf(f), f);
  return [...seen.values()];
}

// One feature per line keeps git diffs readable when the data is re-fetched.
function toGeoJsonText(features) {
  const lines = features.map((f) => JSON.stringify(f));
  return `{"type":"FeatureCollection","features":[\n${lines.join(",\n")}\n]}\n`;
}

export async function runFetch({ config, outDir = DEFAULT_OUT_DIR, fetchImpl = fetch, overpassOptions = {}, log = () => {} }) {
  const query = (q) => fetchOverpass(q, fetchImpl, overpassOptions);
  const parks = [];
  const trails = [];
  const amenities = [];

  // Sequential on purpose: the public Overpass server rate-limits parallel requests.
  for (const area of config.areas) {
    const queries = buildQueries(area.bbox);
    log(`Fetching ${area.name}: parks…`);
    parks.push(...toParkFeatures(osmtogeojson(await query(queries.parks)), config.exclude));
    log(`Fetching ${area.name}: trails…`);
    trails.push(...toTrailFeatures(osmtogeojson(await query(queries.trails))));
    log(`Fetching ${area.name}: amenities…`);
    amenities.push(...toAmenityFeatures((await query(queries.amenities)).elements));
  }

  const result = { parks: dedupe(parks), trails: dedupe(trails), amenities: dedupe(amenities) };

  // Only write once every request has succeeded, so a failed fetch never leaves partial snapshots.
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, features] of Object.entries(result)) {
    fs.writeFileSync(path.join(outDir, `${name}.geojson`), toGeoJsonText(features));
  }

  return { parks: result.parks.length, trails: result.trails.length, amenities: result.amenities.length };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const config = JSON.parse(fs.readFileSync(DEFAULT_CONFIG, "utf8"));
    const counts = await runFetch({ config, log: console.log });
    console.log(`Wrote snapshots to ${DEFAULT_OUT_DIR}:`, counts);
  } catch (err) {
    console.error(`parks:fetch failed — existing snapshots left unchanged. ${err.message}`);
    process.exit(1);
  }
}
