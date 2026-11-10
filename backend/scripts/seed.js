// Loads the committed OpenStreetMap snapshots (prisma/data/*.geojson) into the database,
// plus a demo account. Safe to run repeatedly. Usage: npm run db:seed
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { Prisma } from "../src/generated/index.js";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma", "data");

export const DEMO_USER = { username: "demo", email: "demo@openparks.local", password: "openparks-demo" };

const DEMO_REVIEWS = [
  { title: "Lovely lake walk", rating: 5, content: "A gentle loop around the boating lake, plenty of benches." },
  { title: "Great for kids", rating: 4, content: "Big playground and lots of space to run around." },
  { title: "Busy at weekends", rating: 5, content: "Popular on sunny weekends, but there is room for everyone." },
];
const DEMO_REVIEW_PARK = "Cannon Hill Park";

// Parks are upserted (reviews and reports reference them). Trails and amenities have no
// dependents, so OSM-sourced rows are replaced wholesale — this also drops features
// that disappeared from the snapshot.

// Parks in the current snapshot, for this transaction only. Trails and amenities are only
// assigned to these (or to parks that never came from OSM).
async function recordSnapshotParks(tx, parks) {
  await tx.$executeRaw`
    CREATE TEMP TABLE snapshot_parks ON COMMIT DROP AS
    SELECT f->'properties'->>'osm_type' AS osm_type, (f->'properties'->>'osm_id')::bigint AS osm_id
    FROM jsonb_array_elements(${JSON.stringify(parks)}::jsonb->'features') AS f`;
}

// Removes OSM parks that left the snapshot (e.g. added to `exclude`). Parks that users have
// reviewed or reported on are kept so that history survives; they are returned for a warning.
async function removeStaleParks(tx) {
  await tx.$executeRaw`
    DELETE FROM "Park" p
    WHERE p.osm_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM snapshot_parks s WHERE s.osm_type = p.osm_type AND s.osm_id = p.osm_id)
      AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r.park_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM "SafetyReport" sr WHERE sr.park_id = p.id)`;
  return tx.$queryRaw`
    SELECT p.name FROM "Park" p
    WHERE p.osm_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM snapshot_parks s WHERE s.osm_type = p.osm_type AND s.osm_id = p.osm_id)
    ORDER BY p.name`;
}

async function loadParks(tx, parks, warn) {
  // Repair invalid rings and keep only the polygon parts. A shape with no area left
  // (e.g. all points on one line) would become an invisible, unclickable park, so skip it.
  const repaired = Prisma.sql`
    SELECT
      f->'properties'->>'name' AS name,
      f->'properties'->>'osm_type' AS osm_type,
      (f->'properties'->>'osm_id')::bigint AS osm_id,
      ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326)), 3)) AS geom
    FROM jsonb_array_elements(${JSON.stringify(parks)}::jsonb->'features') AS f`;

  const skipped = await tx.$queryRaw`SELECT name FROM (${repaired}) r WHERE ST_IsEmpty(r.geom) ORDER BY name`;
  for (const { name } of skipped) {
    warn(`Skipped "${name}": its outline has no area after repair.`);
  }

  await tx.$executeRaw`
    INSERT INTO "Park" (name, osm_type, osm_id, location)
    SELECT r.name, r.osm_type, r.osm_id, r.geom::geography
    FROM (${repaired}) r
    WHERE NOT ST_IsEmpty(r.geom)
    ON CONFLICT (osm_type, osm_id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location`;
}

// Only parks in the current snapshot (or non-OSM parks) can receive trails and amenities.
const CURRENT_PARK = Prisma.sql`(p.osm_id IS NULL OR EXISTS (
  SELECT 1 FROM snapshot_parks s WHERE s.osm_type = p.osm_type AND s.osm_id = p.osm_id))`;

async function loadTrails(tx, trails) {
  // Each trail goes to the single park it overlaps most; trails touching no park are skipped.
  // The `&&` bounding-box test lets Postgres use the geography GiST index; a ::geometry cast alone cannot.
  await tx.$executeRaw`
    INSERT INTO trails (park_id, osm_id, highway, name, surface, geom)
    SELECT best.id, t.osm_id, t.highway, t.name, t.surface, t.geom
    FROM (
      SELECT
        (f->'properties'->>'osm_id')::bigint AS osm_id,
        f->'properties'->>'highway' AS highway,
        f->'properties'->>'name' AS name,
        f->'properties'->>'surface' AS surface,
        ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326) AS geom
      FROM jsonb_array_elements(${JSON.stringify(trails)}::jsonb->'features') AS f
    ) t
    CROSS JOIN LATERAL (
      SELECT p.id
      FROM "Park" p
      WHERE p.location && t.geom::geography AND ST_Intersects(p.location::geometry, t.geom) AND ${CURRENT_PARK}
      ORDER BY ST_Length(ST_Intersection(p.location::geometry, t.geom)::geography) DESC, p.id
      LIMIT 1
    ) best`;
}

async function loadAmenities(tx, amenities) {
  await tx.$executeRaw`
    INSERT INTO "ParkAmenity" (park_id, name, osm_type, osm_id, location)
    SELECT inside.id, a.name, a.osm_type, a.osm_id, a.geom
    FROM (
      SELECT
        f->'properties'->>'name' AS name,
        f->'properties'->>'osm_type' AS osm_type,
        (f->'properties'->>'osm_id')::bigint AS osm_id,
        ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326) AS geom
      FROM jsonb_array_elements(${JSON.stringify(amenities)}::jsonb->'features') AS f
    ) a
    CROSS JOIN LATERAL (
      SELECT p.id FROM "Park" p WHERE ST_Covers(p.location, a.geom::geography) AND ${CURRENT_PARK} ORDER BY p.id LIMIT 1
    ) inside`;
}

async function loadDemoData(tx) {
  const password = await bcrypt.hash(DEMO_USER.password, 10);
  const user = await tx.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: { username: DEMO_USER.username, email: DEMO_USER.email, password, Verified: true },
  });

  const existing = await tx.review.count({ where: { user_id: user.id } });
  const park = await tx.park.findFirst({ where: { name: DEMO_REVIEW_PARK }, select: { id: true } });
  if (existing === 0 && park) {
    await tx.review.createMany({
      data: DEMO_REVIEWS.map((review) => ({ ...review, user_id: user.id, park_id: park.id })),
    });
  }
  return true;
}

async function countRows(prisma) {
  const [row] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM "Park")::int AS parks,
      (SELECT count(*) FROM trails)::int AS trails,
      (SELECT count(*) FROM "ParkAmenity")::int AS amenities`;
  return row;
}

export async function seed({ prisma, data, warn = () => {} }) {
  let demoUser = false;
  await prisma.$transaction(
    async (tx) => {
      await recordSnapshotParks(tx, data.parks);
      // Trails and amenities reference parks, so clear them before removing stale parks.
      await tx.$executeRaw`DELETE FROM trails WHERE osm_id IS NOT NULL`;
      await tx.$executeRaw`DELETE FROM "ParkAmenity" WHERE osm_id IS NOT NULL`;
      const kept = await removeStaleParks(tx);
      for (const { name } of kept) {
        warn(`Kept "${name}": no longer in the snapshot, but it has reviews or reports. It gets no trails or amenities.`);
      }
      await loadParks(tx, data.parks, warn);
      await loadTrails(tx, data.trails);
      await loadAmenities(tx, data.amenities);
      demoUser = await loadDemoData(tx);
    },
    { timeout: 600000 }
  );
  return { ...(await countRows(prisma)), demoUser };
}

export function readSnapshots(dir = DATA_DIR) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.geojson`), "utf8"));
  return { parks: read("parks"), trails: read("trails"), amenities: read("amenities") };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const { default: prisma } = await import("../src/config/prisma.js");
  try {
    const counts = await seed({ prisma, data: readSnapshots(), warn: console.warn });
    console.log("Seeded:", counts);
    console.log(`Demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
