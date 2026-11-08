// Runs against the real Docker PostGIS test database (openparks_test), never the dev DB.
// Requires `docker compose up -d --wait`. Run with: npm run test:db
import { jest } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { fixtureData, PARK_A, PARK_B, BOWTIE, COLLAPSED, CROSSING_TRAIL_ID, BENCH_ID } from "./fixtures/data.js";
import { emptyTestDatabase } from "./resetTestDb.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://openparks:openparks@localhost:5433/openparks_test";

// Must be set before prisma.js is imported; loadEnv does not override existing env vars.
process.env.DATABASE_URL = testUrl;
process.env.DB_SSL = "false";

const { default: prisma } = await import("../../src/config/prisma.js");
const { seed, DEMO_USER } = await import("../../scripts/seed.js");

const one = async (sql) => (await prisma.$queryRawUnsafe(sql))[0];

beforeAll(async () => {
  // Non-destructive: applies any pending migrations to the test DB.
  execSync("npx prisma migrate deploy", {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
  await emptyTestDatabase(prisma);
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

test("seeds fixture parks, trails and amenities in SRID 4326", async () => {
  const counts = await seed({ prisma, data: fixtureData() });

  expect(counts).toEqual({ parks: 3, trails: 1, amenities: 1, demoUser: true });
  const srids = await prisma.$queryRawUnsafe(`SELECT DISTINCT ST_SRID(location::geometry) AS srid FROM "Park"`);
  expect(srids).toEqual([{ srid: 4326 }]);
});

test("seed is idempotent", async () => {
  const first = await seed({ prisma, data: fixtureData() });
  const second = await seed({ prisma, data: fixtureData() });
  expect(second).toEqual(first);

  const renamed = fixtureData();
  renamed.parks.features[1].properties.name = "Park B (renamed)";
  await seed({ prisma, data: renamed });

  const { count } = await one(`SELECT count(*)::int AS count FROM "Park"`);
  expect(count).toBe(3);
  const park = await one(`SELECT name FROM "Park" WHERE osm_id = ${PARK_B.osm_id}`);
  expect(park.name).toBe("Park B (renamed)");
});

test("repairs invalid park polygons", async () => {
  await seed({ prisma, data: fixtureData() });

  const row = await one(
    `SELECT ST_IsValid(location::geometry) AS valid FROM "Park" WHERE osm_type = '${BOWTIE.osm_type}' AND osm_id = ${BOWTIE.osm_id}`
  );
  expect(row.valid).toBe(true);
});

test("assigns a trail crossing two parks to exactly one park — the one it overlaps most", async () => {
  await seed({ prisma, data: fixtureData() });

  const rows = await prisma.$queryRawUnsafe(
    `SELECT p.osm_id::text AS park_osm_id FROM trails t JOIN "Park" p ON p.id = t.park_id WHERE t.osm_id = ${CROSSING_TRAIL_ID}`
  );
  expect(rows).toEqual([{ park_osm_id: PARK_B.osm_id }]);
});

test("skips a park whose geometry collapses to nothing, with a warning", async () => {
  const warn = jest.fn();

  await seed({ prisma, data: fixtureData(), warn });

  const { count } = await one(`SELECT count(*)::int AS count FROM "Park" WHERE osm_id = ${COLLAPSED.osm_id}`);
  expect(count).toBe(0);
  const { empty } = await one(`SELECT count(*)::int AS empty FROM "Park" WHERE ST_IsEmpty(location::geometry)`);
  expect(empty).toBe(0);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(COLLAPSED.name));
});

test("assigns an amenity to the park that contains it", async () => {
  await seed({ prisma, data: fixtureData() });

  const row = await one(
    `SELECT p.osm_id::text AS park_osm_id FROM "ParkAmenity" a JOIN "Park" p ON p.id = a.park_id WHERE a.osm_id = ${BENCH_ID}`
  );
  expect(row.park_osm_id).toBe(PARK_A.osm_id);
});

test("moves a trail when a new snapshot changes which park it overlaps most", async () => {
  await seed({ prisma, data: fixtureData() }); // crossing trail starts in Park B

  const shrunk = fixtureData();
  // Park B now spans only lng -1.900..-1.899, so the trail overlaps Park A (0.005°) more than B (0.001°)
  shrunk.parks.features[1].geometry.coordinates = [
    [[-1.9, 52.44], [-1.899, 52.44], [-1.899, 52.45], [-1.9, 52.45], [-1.9, 52.44]],
  ];
  await seed({ prisma, data: shrunk });

  const rows = await prisma.$queryRawUnsafe(
    `SELECT p.osm_id::text AS park_osm_id FROM trails t JOIN "Park" p ON p.id = t.park_id WHERE t.osm_id = ${CROSSING_TRAIL_ID}`
  );
  expect(rows).toEqual([{ park_osm_id: PARK_A.osm_id }]);
});

const withoutPark = (data, park) => {
  data.parks.features = data.parks.features.filter((f) => f.properties.osm_id !== park.osm_id);
  return data;
};

test("removes a park dropped from the snapshot and moves its trail to the remaining park", async () => {
  await seed({ prisma, data: fixtureData() });

  await seed({ prisma, data: withoutPark(fixtureData(), PARK_B) });

  const { count } = await one(`SELECT count(*)::int AS count FROM "Park" WHERE osm_id = ${PARK_B.osm_id}`);
  expect(count).toBe(0);
  const trail = await one(
    `SELECT p.osm_id::text AS park_osm_id FROM trails t JOIN "Park" p ON p.id = t.park_id WHERE t.osm_id = ${CROSSING_TRAIL_ID}`
  );
  expect(trail.park_osm_id).toBe(PARK_A.osm_id);
});

test("keeps a dropped park that has reviews, warns, and assigns it no trails or amenities", async () => {
  await seed({ prisma, data: fixtureData() }); // demo reviews are on Park A
  const warn = jest.fn();

  const counts = await seed({ prisma, data: withoutPark(fixtureData(), PARK_A), warn });

  const { count } = await one(`SELECT count(*)::int AS count FROM "Park" WHERE osm_id = ${PARK_A.osm_id}`);
  expect(count).toBe(1);
  expect(counts.amenities).toBe(0); // the only in-park amenity sits in Park A
  const trail = await one(
    `SELECT p.osm_id::text AS park_osm_id FROM trails t JOIN "Park" p ON p.id = t.park_id WHERE t.osm_id = ${CROSSING_TRAIL_ID}`
  );
  expect(trail.park_osm_id).toBe(PARK_B.osm_id);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(PARK_A.name));
});

test("creates the demo user once, verified, with three reviews of Cannon Hill Park", async () => {
  await seed({ prisma, data: fixtureData() });
  await seed({ prisma, data: fixtureData() });

  const users = await prisma.user.findMany({ where: { email: DEMO_USER.email } });
  expect(users).toHaveLength(1);
  expect(users[0].Verified).toBe(true);
  await expect(bcrypt.compare(DEMO_USER.password, users[0].password)).resolves.toBe(true);

  const reviews = await prisma.review.findMany({ where: { user_id: users[0].id }, include: { park: true } });
  expect(reviews).toHaveLength(3);
  expect(new Set(reviews.map((r) => r.park.name))).toEqual(new Set([PARK_A.name]));
});
