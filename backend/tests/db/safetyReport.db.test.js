// Runs against the real Docker PostGIS test database (openparks_test), never the dev DB.
// Requires `docker compose up -d --wait`. Run with: npm run test:db
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { fixtureData } from "./fixtures/data.js";
import { emptyTestDatabase } from "./resetTestDb.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://openparks:openparks@localhost:5433/openparks_test";

// Must be set before prisma.js is imported; loadEnv does not override existing env vars.
process.env.DATABASE_URL = testUrl;
process.env.DB_SSL = "false";

const { default: prisma } = await import("../../src/config/prisma.js");
const { seed } = await import("../../scripts/seed.js");

let userId;
let parkId;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
  await emptyTestDatabase(prisma);
  await seed({ prisma, data: fixtureData() });
  userId = (await prisma.user.findFirstOrThrow()).id;
  parkId = (await prisma.park.findFirstOrThrow({ where: { name: "Cannon Hill Park" } })).id;
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

const insertReport = (srid) => prisma.$executeRaw`
  INSERT INTO "SafetyReport" (user_id, park_id, description, location, heading)
  VALUES (${userId}, ${parkId}, 'test', ST_SetSRID(ST_MakePoint(-1.905, 52.445), ${srid}::int), 'Hazard')`;

test("rejects a report location that is not SRID 4326", async () => {
  await expect(insertReport(4236)).rejects.toThrow(/SRID/i);
});

test("accepts a 4326 report point and can compare it with park outlines", async () => {
  await insertReport(4326);

  const [row] = await prisma.$queryRaw`
    SELECT ST_Covers(p.location, r.location) AS inside
    FROM "SafetyReport" r JOIN "Park" p ON p.id = r.park_id`;
  expect(row.inside).toBe(true);
});
