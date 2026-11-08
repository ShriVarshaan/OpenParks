# OpenParks: Data Rebuild & One-Command Local Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone can clone OpenParks, run a few commands, and get the full app working locally. The local database will hold every named park, trail and amenity inside the original map bounds, rebuilt from OpenStreetMap.

**Architecture:** Docker Compose runs PostGIS and Mailpit. A Prisma migration creates the schema. An Overpass fetch script writes committed GeoJSON snapshots, and an idempotent seed script loads them with PostGIS SQL. Config that changes per environment (DB SSL, SMTP auth, CORS, API URL) moves into small, pure, tested helpers so the same code can be hosted later.

**Tech Stack:** Node 24 (ESM), Express 5, Prisma 7.5 + `@prisma/adapter-pg`, PostgreSQL 16 + PostGIS 3.4, Jest 30, React 19 + Vite 7 + Vitest 2, MapLibre GL, `osmtogeojson`, Docker Compose, Mailpit.

**Spec:** `docs/superpowers/specs/2026-11-08-openparks-local-setup-design.md`

## Global Constraints

- Do all work on branch `feature/local-setup`. Never commit to `master` directly.
- The backend is ESM (`"type": "module"`). Run backend Jest only through `node --experimental-vm-modules node_modules/jest/bin/jest.js` (the existing `test:*` scripts).
- Mock ESM modules with `jest.unstable_mockModule(...)` before `await import(...)`, matching the existing tests.
- DB image: `postgis/postgis:16-3.4`. User, password and database are all `openparks`, on host port `5433` (override with `OPENPARKS_DB_PORT`; container port 5432).
- Mail image: `axllent/mailpit`. SMTP on `1025`, web inbox on `8025`.
- Local `DATABASE_URL`: `postgresql://openparks:openparks@localhost:5433/openparks`
- Backend port defaults to `3000`. Default CORS origins are `http://localhost:5173` and `http://localhost:5174`.
- All coordinates use SRID `4326`.
- The seed area is the original map bounds. In Overpass order (south, west, north, east) that is `52.42,-1.96,52.48,-1.86`.
- Trail `highway` values: `footway`, `path`, `cycleway`, `bridleway`, `track`, `pedestrian`.
- Amenity `name` values must be keys of `AMENITY_ICONS` (`frontend/src/pages/ParkMap.jsx:182`): `toilet`, `bench`, `cafe`, `restaurant`, `drinking_water`, `playground`, `parking`, `bicycle_parking`, `waste_basket`, `shelter`. OSM `amenity=toilets` maps to `toilet`, and `leisure=playground` maps to `playground`.
- Only parks with a `name` tag are included.
- Overpass endpoint: `https://overpass-api.de/api/interpreter`. User-Agent: `OpenParks-seed/1.0`.
- Demo account: `demo@openparks.local`, password `openparks-demo`, username `demo`, `Verified = true`, hashed with `bcrypt.hash(pw, 10)` (the same as `authController.js`).
- Attribution text, shown in the README and in `prisma/data/README.md`: `Park, trail and amenity data © OpenStreetMap contributors, available under the Open Database License (ODbL).`

## Review Focus

1. **Seed runs twice, or runs after the snapshot changes.** Row counts must be identical after a second run, and a renamed park must be updated, not duplicated. Covered by Task 2.3 `seed is idempotent`.
2. **Invalid OSM geometry** (for example a self-intersecting multipolygon). The seed must repair it with `ST_MakeValid`, not abort the whole transaction. Covered by Task 2.3 `repairs invalid park polygons`.
3. **A trail crossing two parks.** It must be stored exactly once, under the park it overlaps most. Covered by Task 2.3 `assigns a trail to exactly one park`.
4. **Overpass is down or rate-limited** (HTTP 429/504). The fetch must fail with a non-zero exit and must not overwrite the existing snapshots with partial data. Covered by Task 2.2 `does not write snapshots when any query fails`.
5. **Blank env values copied straight from `.env.example`** (`EMAIL_USER=`, `DB_SSL` unset). These must mean "no SMTP auth" and "no SSL", not `auth: {user: ""}` or forced SSL. Covered by Task 1.2 tests.

---

# Milestone 1: Local infrastructure boots

**Done when:** `docker compose up -d && cd backend && npm run db:migrate && npm start` gives a running API, and `GET /api/parks` returns `{"type":"FeatureCollection","features":[]}` from the local DB.

### Task 1.1: Branch, housekeeping, and Docker Compose

**Files:**
- Create: `docker-compose.yml`, `docker/initdb/20-test-db.sql`
- Modify: `.gitignore`. Add `.superpowers/` and `.env`. Change `backend/.gitignore`'s `/src/generated/prisma` to `/src/generated`.
- Commit the already-present `.claude/skills/`, `skills-lock.json`, `CLAUDE.md`, and `docs/superpowers/`.

- [ ] **Step 1:** `git checkout -b feature/local-setup`
- [ ] **Step 2: Write `docker-compose.yml`.**
  - Service `db`: `postgis/postgis:16-3.4`. Env `POSTGRES_USER/PASSWORD/DB=openparks`. Port `${OPENPARKS_DB_PORT:-5433}:5432`. Named volume `openparks-db:/var/lib/postgresql/data`. Healthcheck `pg_isready -U openparks -d openparks`, every 5s.
  - Also mount only the file `./docker/initdb/20-test-db.sql` into `/docker-entrypoint-initdb.d/` on `db` (mounting the folder would hide the image's PostGIS init script), with `docker/initdb/20-test-db.sql` containing `CREATE DATABASE openparks_test TEMPLATE template_postgis;`. This is used by Task 2.3.
  - Service `mail`: `axllent/mailpit`. Ports `1025:1025` and `8025:8025`. Env `MP_SMTP_AUTH_ACCEPT_ANY=1` and `MP_SMTP_AUTH_ALLOW_INSECURE=1`.
- [ ] **Step 3: Verify.** Run `docker compose up -d && docker compose ps`. Expected: `db` is `healthy` and `mail` is `running`. Run `docker compose exec db psql -U openparks -c "SELECT postgis_version();"`. Expected: a row starting with `3.4`. Run `docker compose exec db psql -U openparks -lqt | grep openparks_test`. Expected: one line.
- [ ] **Step 4: Commit.** `git add docker-compose.yml docker .gitignore backend/.gitignore .claude skills-lock.json CLAUDE.md docs && git commit -m "chore: add docker compose (postgis + mailpit), skills, plan docs"`

### Task 1.2: Env-driven config helpers (DB SSL, SMTP, CORS, port)

**Files:**
- Create: `backend/src/config/env.js`
- Create: `backend/.env.example`
- Modify: `backend/src/config/prisma.js` (use `buildPoolConfig`)
- Modify: `backend/src/controllers/sendVerification.js:10-18` (use `buildTransportOptions`)
- Modify: `backend/src/server.js` (use `parseCorsOrigins` and `process.env.PORT ?? 3000`)
- Test: `backend/tests/unit/env.test.js`

**Interfaces:**
- Produces (all pure, in `src/config/env.js`):
  - `buildPoolConfig(env = process.env) → { connectionString: string, ssl?: { rejectUnauthorized: false } }`. `ssl` is present only when `env.DB_SSL === "true"`.
  - `buildTransportOptions(env = process.env) → { host, port: number, secure: boolean, auth?: { user, pass } }`. `secure` is `env.EMAIL_PORT === "465"`. `auth` is present only when `env.EMAIL_USER` is non-empty.
  - `parseCorsOrigins(value?: string) → string[]`. Split on commas, trim, and drop empty entries. If `value` is unset or blank, return `["http://localhost:5173","http://localhost:5174"]`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/env.test.js`:
  - `buildPoolConfig({DATABASE_URL:"u"})` → `toEqual({connectionString:"u"})`
  - `buildPoolConfig({DATABASE_URL:"u", DB_SSL:"true"}).ssl` → `toEqual({rejectUnauthorized:false})`
  - `buildPoolConfig({DATABASE_URL:"u", DB_SSL:"false"})` has no `ssl` key
  - `buildTransportOptions({EMAIL_HOST:"localhost", EMAIL_PORT:"1025", EMAIL_USER:"", EMAIL_PASS:""})` → `toEqual({host:"localhost", port:1025, secure:false})`
  - `buildTransportOptions({EMAIL_HOST:"h", EMAIL_PORT:"465", EMAIL_USER:"a", EMAIL_PASS:"b"})` → `toEqual({host:"h", port:465, secure:true, auth:{user:"a", pass:"b"}})`
  - `parseCorsOrigins(undefined)` and `parseCorsOrigins("  ")` → the default two origins
  - `parseCorsOrigins("https://a.com, https://b.com,")` → `["https://a.com","https://b.com"]`
- [ ] **Step 2: Run them.** `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/env.test.js`. Expected: FAIL with "Cannot find module '../../src/config/env.js'".
- [ ] **Step 3: Implement** the three functions in `src/config/env.js`, then wire them into `prisma.js`, `sendVerification.js` and `server.js`.
- [ ] **Step 4: Write `backend/.env.example`** with:
  - `DATABASE_URL` (the local value from Global Constraints)
  - `DB_SSL=false`
  - `JWT_SECRET=change-me-in-production`
  - `EMAIL_HOST=localhost`
  - `EMAIL_PORT=1025`
  - `EMAIL_USER=` and `EMAIL_PASS=` (empty)
  - `EMAIL_FROM="OpenParks <no-reply@openparks.local>"`
  - `CORS_ORIGINS=` (empty)
  - `PORT=3000`
- [ ] **Step 5: Run the full unit suite.** `npm run test:unit`. Expected: all pass, including the existing `authController` tests that mock nodemailer.
- [ ] **Step 6: Commit.** `git commit -m "feat(backend): env-driven DB SSL, SMTP auth, CORS and port"`

### Task 1.3: Migratable schema, missing dependency, npm scripts

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_init/migration.sql` (generated, then edited)
- Modify: `backend/package.json`

**Interfaces:**
- Produces, as schema fields later tasks rely on:
  - `Park.osm_type String? @db.VarChar(16)`, `Park.osm_id BigInt?`, `@@unique([osm_type, osm_id])`
  - `ParkAmenity.osm_type String? @db.VarChar(16)`, `ParkAmenity.osm_id BigInt?`, `@@unique([osm_type, osm_id])`
  - `@@unique([park_id, osm_id])` on `trails`
- Produces these `backend/package.json` scripts:
  - `start`: `node src/server.js`
  - `dev`: `node --watch src/server.js`
  - `db:migrate`: `prisma migrate deploy`
  - `db:seed`: `node scripts/seed.js`
  - `db:reset`: `prisma migrate reset --force`
  - `setup`: `prisma migrate deploy && node scripts/seed.js`
  - `parks:fetch`: `node scripts/fetch-parks.js`
  - `test:db`: `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/db --runInBand`

- [ ] **Step 1: Edit `schema.prisma`.**
  - Delete `model spatial_ref_sys`.
  - Set `extensions = [postgis]`.
  - Add the OSM fields above.
- [ ] **Step 2:** `npm install jsonwebtoken`, then add the scripts above. In `prisma.config.ts`, set `migrations.seed: "node scripts/seed.js"`.
- [ ] **Step 3: Generate the migration.**
  1. `cp .env.example .env`
  2. `npx prisma migrate dev --name init --create-only`
  3. Append GiST indexes to the generated SQL: `CREATE INDEX park_location_gix ON "Park" USING GIST (location);`, and the same for `"ParkAmenity"(location)`, `trails(geom)` and `"SafetyReport"(location)`.
  4. Run `npx prisma migrate dev`.
- [ ] **Step 4: Verify.** `docker compose exec db psql -U openparks -c '\dt'`. Expected tables: `User`, `Park`, `ParkAmenity`, `SafetyReport`, `Review`, `trails`, `OneTimePasswords`, `_prisma_migrations`.
- [ ] **Step 5: Verify the API boots.**
  1. `npm start`. Expected: the log shows `Listening`.
  2. In another terminal, `curl -s localhost:3000/api/parks`. Expected: `{"type":"FeatureCollection","features":[]}`.
  3. `npm run test:unit`. Expected: all pass.
- [ ] **Step 6: Commit.** `git commit -m "feat(db): initial prisma migration for local PostGIS, add jsonwebtoken, npm scripts"`

---

# Milestone 2: Park data rebuilt from OpenStreetMap

**Done when:** `npm run setup` on an empty DB loads about 47 named parks, with their trails and amenities, from the committed snapshots without any network access. Running `npm run db:seed` again changes no counts.

### Task 2.1: Pure OSM transforms

**Files:**
- Create: `backend/scripts/osm/transform.js`
- Test: `backend/tests/unit/osmTransform.test.js`

**Interfaces:**
- Produces:
  - `TRAIL_HIGHWAYS: string[]` and `AMENITY_TYPES: string[]` (values from Global Constraints)
  - `parseOsmId(id: string) → { osm_type: "way"|"relation"|"node", osm_id: string }`. Input looks like `"way/24957779"`, the format `osmtogeojson` uses for `feature.id`.
  - `normalizeAmenityName(tags: object) → string | null`
  - `toParkFeatures(fc: FeatureCollection, exclude: string[] = []) → Feature[]`. Keeps only Polygon or MultiPolygon features that have `properties.name` and whose `"type/id"` is not in `exclude`. Output properties are `{ osm_type, osm_id, name }`.
  - `toTrailFeatures(fc) → Feature[]`. Keeps LineString features whose `highway` is in `TRAIL_HIGHWAYS`. Output properties are `{ osm_id, highway, name: string|null, surface: string|null }`.
  - `toAmenityFeatures(elements: OverpassElement[]) → Feature[]`. Takes raw elements from `out center`. Builds a Point from `lat/lon`, or from `center.lat/lon` for ways. Drops elements where `normalizeAmenityName` returns null. Output properties are `{ osm_type, osm_id, name }`.
  - All outputs are sorted by `osm_id` (numeric) so snapshot diffs stay stable.

- [ ] **Step 1: Write the failing tests:**
  - `parseOsmId("relation/17997717")` → `{osm_type:"relation", osm_id:"17997717"}`
  - `normalizeAmenityName({amenity:"toilets"})` → `"toilet"`
  - `normalizeAmenityName({leisure:"playground"})` → `"playground"`
  - `normalizeAmenityName({amenity:"bench"})` → `"bench"`
  - `normalizeAmenityName({amenity:"atm"})` → `null`
  - `toParkFeatures`, given one named polygon, one unnamed polygon, one named Point and one excluded named polygon, returns exactly the first one, with properties `{osm_type:"way", osm_id:"1", name:"A Park"}`
  - `toTrailFeatures` drops a `highway=residential` line and keeps a `highway=footway` line with `surface:null` when the tag is missing
  - `toAmenityFeatures`, given a node `{type:"node", id:5, lat:52.4, lon:-1.9, tags:{amenity:"cafe"}}` and a way `{type:"way", id:6, center:{lat:52.41, lon:-1.91}, tags:{leisure:"playground"}}`, returns Points `[-1.9,52.4]` and `[-1.91,52.41]` in id order
- [ ] **Step 2: Run them.** `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/osmTransform.test.js`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `scripts/osm/transform.js`.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(data): pure OSM-to-GeoJSON transforms"`

### Task 2.2: Overpass fetch script and committed snapshots

**Files:**
- Create: `backend/scripts/osm/overpass.js`
- Create: `backend/scripts/fetch-parks.js`
- Create: `backend/scripts/parks.config.json`
- Create: `backend/prisma/data/{parks,trails,amenities}.geojson` (generated)
- Create: `backend/prisma/data/README.md` (attribution, plus how to regenerate)
- Test: `backend/tests/unit/overpass.test.js`

**Interfaces:**
- Consumes: Task 2.1 transforms.
- Produces:
  - `parks.config.json`: `{ "areas": [{ "name": "Birmingham south & centre", "bbox": [52.42, -1.96, 52.48, -1.86] }], "exclude": [] }`. To map more parks later, append an area here.
  - `buildQueries(bbox: [s,w,n,e]) → { parks: string, trails: string, amenities: string }`. Each query string uses `[out:json][timeout:120]`. `parks` selects named `leisure=park` ways and relations with `out geom`. `trails` selects `highway~"^(footway|path|cycleway|bridleway|track|pedestrian)$"` ways with `out geom`. `amenities` selects nodes and ways for `AMENITY_TYPES` plus `leisure=playground`, with `out center`.
  - `fetchOverpass(query: string, fetchImpl = fetch) → Promise<object>`. POSTs `data=<query>` with User-Agent `OpenParks-seed/1.0`. Throws `Error("Overpass HTTP <status>")` on any non-2xx response.
  - `runFetch({ config, outDir, fetchImpl }) → Promise<{ parks: number, trails: number, amenities: number }>`, exported from `fetch-parks.js`. Fetches all areas, then dedupes by `osm_type/osm_id`. Writes the three files only after every request succeeds. The CLI entry calls it and exits 1 on error.

- [ ] **Step 1: Write the failing tests** (`fetchImpl` is a `jest.fn()`, and `outDir` is a temp dir from `fs.mkdtempSync`):
  - `buildQueries([52.42,-1.96,52.48,-1.86]).parks` contains `(52.42,-1.96,52.48,-1.86)` and `out geom`
  - `fetchOverpass` rejects with `"Overpass HTTP 429"` when `fetchImpl` resolves `{ok:false, status:429}`
  - `does not write snapshots when any query fails`: pre-write `parks.geojson` with content `"OLD"`, make the third call return status 504, and assert that `runFetch` rejects and the file content is still `"OLD"`
  - On success with small fixtures, the three files exist and `JSON.parse(parks).features.length` equals the fixture count
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `overpass.js`, `fetch-parks.js` and `parks.config.json`. Run `npm i -D osmtogeojson` and use it to convert the `parks` and `trails` responses.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Generate the real snapshots.** `npm run parks:fetch`. Expected: it prints counts with parks ≈ 47, and `grep -c '"name": "Cannon Hill Park"' prisma/data/parks.geojson` → `1`.
- [ ] **Step 6:** Write `prisma/data/README.md` with the attribution line and the regenerate command.
- [ ] **Step 7: Commit.** `git commit -m "feat(data): Overpass fetch script + OSM snapshots for original map area"`

### Task 2.3: Idempotent seed with real-DB tests

**Files:**
- Create: `backend/scripts/seed.js`
- Test: `backend/tests/db/seed.db.test.js` (runs against the Docker DB with `npm run test:db`)
- Create: `backend/tests/db/fixtures/` (tiny GeoJSON: 2 overlapping-edge parks, 1 bowtie polygon, 1 trail crossing both parks, 2 amenities)

**Interfaces:**
- Consumes: the Task 1.3 schema unique keys, and `src/config/prisma.js`.
- Produces: `seed({ prisma, data: { parks, trails, amenities } }) → Promise<{ parks: number, trails: number, amenities: number, demoUser: boolean }>`. The counts are totals in the DB after the run. The CLI entry reads `prisma/data/*.geojson` and logs the counts.
- SQL decisions, all through `prisma.$executeRaw` in a single `prisma.$transaction`:
  - **Parks:** `ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($geojson),4326)),3))::geography`, using `ON CONFLICT (osm_type, osm_id) DO UPDATE SET name, location`.
  - **Trails:** `park_id` is the park with the largest `ST_Length(ST_Intersection(park.location::geometry, trail))`. Skip trails that intersect no park. Use `ON CONFLICT (park_id, osm_id) DO UPDATE`.
  - **Amenities:** `park_id` is the park where `ST_Covers(park.location, point::geography)`. Skip amenities in no park. Use `ON CONFLICT (osm_type, osm_id) DO UPDATE`.
  - **Demo data:** upsert the demo user (Global Constraints). If that user has no reviews, insert 3 reviews on the park named `Cannon Hill Park`, rated 5, 4 and 5, with titles "Lovely lake walk", "Great for kids" and "Busy at weekends".

- **Test DB isolation:** the tests never touch the dev DB. Task 1.1 adds `docker/initdb/20-test-db.sql` (`CREATE DATABASE openparks_test TEMPLATE template_postgis;`), mounted into `/docker-entrypoint-initdb.d/`. The test file builds `testUrl = process.env.TEST_DATABASE_URL ?? "postgresql://openparks:openparks@localhost:5433/openparks_test"`. It sets `process.env.DATABASE_URL = testUrl` before `await import`-ing `src/config/prisma.js`, and runs `execSync("npx prisma migrate reset --force --skip-seed", { env: { ...process.env, DATABASE_URL: testUrl } })` in `beforeAll`.

- [ ] **Step 1: Write the failing DB tests**, using the fixtures:
  - `seeds fixture parks, trails, amenities`: the counts match the fixtures, and `SELECT ST_SRID(location::geometry) FROM "Park"` is all `4326`
  - `seed is idempotent`: running `seed` twice gives the same counts, and after changing a fixture park's name and running again, `SELECT count(*) FROM "Park"` is unchanged and the new name is present
  - `repairs invalid park polygons`: the bowtie park row exists and `ST_IsValid(location::geometry)` is true
  - `assigns a trail to exactly one park`: `SELECT count(*) FROM trails WHERE osm_id = <crossing id>` → `1`
  - `creates demo user once`: there is exactly one `User` with the demo email, `Verified = true`, and `bcrypt.compare("openparks-demo", password)` is true
- [ ] **Step 2: Run them.** `npm run test:db`. Expected: FAIL (`seed` not found).
- [ ] **Step 3: Implement** `scripts/seed.js`.
- [ ] **Step 4: Run again.** `npm run test:db`. Expected: PASS.
- [ ] **Step 5: Verify against the real data.**
  1. `npx prisma migrate reset --force`. This runs the seed through `prisma.config.ts`. Expected log: parks ≈ 47, trails > 0, amenities > 0, demoUser true.
  2. `npm start`, then `curl -s localhost:3000/api/parks | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).features.length))"`. Expected: ≈ 47.
  3. `npm run db:seed` again. Expected: the same counts.
- [ ] **Step 6: Commit.** `git commit -m "feat(data): idempotent PostGIS seed with demo user and DB tests"`

---

# Milestone 3: The whole app works end-to-end locally

**Done when:** a new user can sign up, receive the OTP in Mailpit, log in, post a review, and file a safety report that appears in the right place on the map. The frontend reads its API URL from env.

### Task 3.1: Safety report SRID and insert-return fix

**Files:**
- Modify: `backend/src/controllers/safetyReport.js:41-58`
- Test: `backend/tests/unit/safetyReport.test.js` (extend)

The current insert uses SRID `4236` and calls `$executeRaw`, which returns a row count. That means `report[0]` is `undefined`, so the endpoint returns 201 with an empty body.

- [ ] **Step 1: Write the failing tests** for `createSafetyReport`:
  - The template strings passed to `prisma.$queryRaw` (`mock.calls[0][0].join("")`) contain `4326` and do not contain `4236`
  - With `mockQueryRaw.mockResolvedValue([{id:7}])`, the response is `status(201)` and `json({id:7})`
- [ ] **Step 2: Run them.** `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/safetyReport.test.js`. Expected: FAIL.
- [ ] **Step 3: Fix it.** Switch the insert to `prisma.$queryRaw` and use SRID `4326`. Update any existing test that asserted `$executeRaw` for this insert, and keep the integration test in `tests/integration/safetyReport.int.test.js` consistent.
- [ ] **Step 4: Run** `npm run test:unit && npm run test:integration`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix(reports): store report location as SRID 4326 and return created row"`

### Task 3.2: Frontend API URL from env

**Files:**
- Modify: `frontend/src/api/axiosInstance.js`
- Create: `frontend/.env.example` (contains `VITE_API_URL=http://localhost:3000`)
- Test: `frontend/test/axiosInstance.test.js`

**Interfaces:**
- Produces: `API.defaults.baseURL === (import.meta.env.VITE_API_URL || "http://localhost:3000")`.

- [ ] **Step 1: Write the failing tests:**
  - With no env set, `(await import("../src/api/axiosInstance")).default.defaults.baseURL` → `"http://localhost:3000"`
  - After `vi.stubEnv("VITE_API_URL","https://api.example.test")` and `vi.resetModules()`, the re-imported instance's `baseURL` is `"https://api.example.test"`
- [ ] **Step 2: Run them.** `cd frontend && npx vitest run test/axiosInstance.test.js`. Expected: the second test FAILs.
- [ ] **Step 3: Implement** the change.
- [ ] **Step 4: Run** `npx vitest run && npm run lint`. Expected: all pass, no lint errors.
- [ ] **Step 5: Commit.** `git commit -m "feat(frontend): API base URL from VITE_API_URL"`

### Task 3.3: Manual end-to-end check (no code unless it finds a bug)

- [ ] **Step 1:** Start everything: `docker compose up -d`, `cd backend && npm run dev`, and `cd frontend && npm run dev`.
- [ ] **Step 2: Sign up** as `tester@example.com`. Open http://localhost:8025, where the OTP email should appear. Verify the OTP. Expected: logged in and redirected.
- [ ] **Step 3: Post a review** on Cannon Hill Park. Expected: it appears in the park's review pane on `/`.
- [ ] **Step 4: File a report** by clicking inside Cannon Hill on `/report`. Then run `docker compose exec db psql -U openparks -c 'SELECT ST_SRID(location::geometry), ST_AsText(location) FROM "SafetyReport"'`. Expected: SRID `4326`, and coordinates near `-1.90 52.45`. The heatmap dot appears where you clicked.
- [ ] **Step 5: Log in as the demo user.** Expected: `/account` lists the 3 seeded reviews.
- [ ] **Step 6:** If any step fails, use superpowers:systematic-debugging, add a regression test in the owning task's test file, then fix and commit.

---

# Milestone 4: A new clone works by following the README

**Done when:** a fresh clone in a new directory, following only the README Quick Start, reaches a working map.

### Task 4.1: Root scripts, README, CLAUDE.md

**Files:**
- Modify: root `package.json`. Remove the unused `dotenv-cli` and `nodemailer-otp`. Add scripts:
  - `setup`: `cd backend && npm install && npm run setup && cd ../frontend && npm install`
  - `dev:backend`: `npm --prefix backend run dev`
  - `dev:frontend`: `npm --prefix frontend run dev`
- Modify: `README.md`
  - Remove the "will not work" note.
  - Replace Getting Started with a Quick Start (Docker Desktop prerequisite):
    1. `docker compose up -d`
    2. `cp backend/.env.example backend/.env`
    3. `npm run setup`
    4. Run `npm run dev:backend` and `npm run dev:frontend` in two terminals
  - Add: "OTP emails: http://localhost:8025".
  - Add: "Demo login: `demo@openparks.local` / `openparks-demo`".
  - Add an "Adding more parks" section (edit `backend/scripts/parks.config.json`, run `npm run parks:fetch`, run `npm run db:seed`, commit the snapshots).
  - Add a Testing section with the real commands, including `npm run test:db`.
  - Add the ODbL attribution line.
- Modify: `CLAUDE.md`
  - Commands: `npm start` and `npm run dev` from `backend/`, the `db:*`, `parks:fetch` and `test:db` scripts, and Docker.
  - Note `src/config/env.js` and the snapshot/seed pipeline.
  - Remove the "run from src/" note and the stale jsonwebtoken and integration-test caveats if they are fixed.

- [ ] **Step 1:** Make the edits above.
- [ ] **Step 2: Fresh-clone verification.**
  1. `docker compose down -v`
  2. `git clone . ../openparks-fresh && cd ../openparks-fresh`
  3. Follow the README exactly.
  Expected: the map at http://localhost:5173 shows parks, and `npm run test:unit` passes in `backend/`.
- [ ] **Step 3:** Delete `../openparks-fresh`.
- [ ] **Step 4: Commit.** `git commit -m "docs: one-command local quick start, data attribution, updated CLAUDE.md"`

---

# Milestone 5: Ready to map more parks

**Done when:** adding a new `areas` entry and re-running fetch and seed makes the new parks reachable on the map, with no frontend code change.

### Task 5.1: Map bounds from park data

**Files:**
- Create: `frontend/src/utils/geo.js`
- Modify: `frontend/src/pages/ParkMap.jsx`
  - At `:266-270`, keep the initial `center` and `zoom`, and keep the current `maxBounds` as the fallback.
  - In the `/api/parks` `.then` at `:278`, call `map.setMaxBounds(bounds)` when the bounds are non-null.
  - At `:591`, change "Cannon Hill · Birmingham" to "Birmingham".
- Test: `frontend/test/geo.test.js`

**Interfaces:**
- Produces: `computeBounds(fc: FeatureCollection, padding = 0.01) → [[minLng, minLat], [maxLng, maxLat]] | null`. It walks every coordinate of Polygon and MultiPolygon features, adds `padding` degrees on every side, and returns `null` when there are no coordinates.

- [ ] **Step 1: Write the failing tests:**
  - Two square polygons spanning lng `-1.95..-1.90` and `-1.88..-1.87`, lat `52.43..52.47`, with `padding = 0` → `[[-1.95,52.43],[-1.87,52.47]]`
  - A MultiPolygon is handled the same way
  - `computeBounds({type:"FeatureCollection", features:[]})` → `null`
- [ ] **Step 2: Run them.** `npx vitest run test/geo.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `computeBounds` and wire it into `ParkMap.jsx`. If `test/ParkMap.test.jsx`'s maplibre mock lacks `setMaxBounds`, add it there.
- [ ] **Step 4: Run** `npx vitest run && npm run lint`. Expected: PASS.
- [ ] **Step 5: Manual check.**
  1. Temporarily add an area `[52.40,-1.98,52.42,-1.94]` to `parks.config.json` (it includes Woodlands Park and Manor Farm Park).
  2. Run `npm run parks:fetch && npm run db:seed`.
  3. Reload the map. Expected: you can pan to Manor Farm Park.
  4. Revert the config with `git checkout backend/scripts/parks.config.json backend/prisma/data`, then run `npx prisma migrate reset --force` to restore the committed data set.
- [ ] **Step 6: Commit.** `git commit -m "feat(map): derive pan bounds from loaded parks"`

---

# Milestone 6 (future, not in this plan): Hosting
This plan prepares for hosting but does not cover it. Env-driven DB SSL, CORS, port and API URL (Tasks 1.2 and 3.2), migrations (1.3) and committed seed data (2.2) let a hosted DB be set up with `npm run setup`. Write a separate plan once you choose a platform.
