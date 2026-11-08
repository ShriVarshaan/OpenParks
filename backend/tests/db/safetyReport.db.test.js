// Runs against the real Docker PostGIS test database (openparks_test), never the dev DB.
// Requires `docker compose up -d --wait`. Run with: npm run test:db
import { jest } from "@jest/globals";
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
const { createNewReport } = await import("../../src/controllers/safetyReport.js");

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

test("createNewReport stores the point and answers 201 with the new row, location as GeoJSON", async () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const req = {
    user: { id: userId },
    body: {
      park_id: parkId,
      description: "Broken fence",
      heading: "Hazard",
      location: { type: "Point", coordinates: [-1.905, 52.445] },
    },
  };

  await createNewReport(req, res);

  expect(res.status).toHaveBeenCalledWith(201);
  const body = res.json.mock.calls[0][0];
  expect(body).toMatchObject({
    id: expect.any(Number),
    park_id: parkId,
    description: "Broken fence",
    status: "OPEN",
    location: { type: "Point", coordinates: [-1.905, 52.445] },
  });
  const [row] = await prisma.$queryRaw`
    SELECT ST_SRID(location::geometry) AS srid FROM "SafetyReport" WHERE id = ${body.id}`;
  expect(row.srid).toBe(4326);
});
