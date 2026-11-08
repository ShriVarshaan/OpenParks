# Plan: Rebuild OpenParks data + one-command local setup

## Context
Supabase paused and then deleted the project's database, so the app has no data, no schema migrations and no way to run locally. The README admits it "will not work". The project is on the user's resume, so anyone cloning it should be able to run it in a few commands. Goals, in order:
1. Rebuild the park data from OpenStreetMap. The user chose **all named parks inside the map's current `maxBounds`** (`[-1.96,52.42]–[-1.86,52.48]`, about 47 parks including Cannon Hill and Highbury).
2. Make local setup easy: **Docker Compose** (PostGIS + **Mailpit** to catch OTP emails).
3. Build the data pipeline so mapping more parks later only means editing a config file.
4. Hosting comes later and is out of scope. The env-driven config below prepares for it.

How the data was originally stored (from `backend/prisma/schema.prisma` and the controllers): `Park.location` is `geography` (polygon). `trails.geom` is `geometry` (line) with `highway` values footway/path/cycleway/bridleway/track. `ParkAmenity.location` is a point whose `name` must match the `AMENITY_ICONS` keys in `frontend/src/pages/ParkMap.jsx:182` (`toilet`, `bench`, `cafe`, `restaurant`, `drinking_water`, `playground`, `parking`, `bicycle_parking`, `waste_basket`, `shelter`).

## Step 1: Make the schema migratable on plain Postgres
`backend/prisma/schema.prisma`:
- Remove the `spatial_ref_sys` model, because PostGIS owns that table and a migration would clash with it.
- Change `extensions` to `[postgis]`. The current `uuid_ossp` entry in the `extensions` schema is Supabase-only.
- Add OSM identity so seeding can be re-run safely:
  - `Park.osm_type String?` and `Park.osm_id BigInt?`, with `@@unique([osm_type, osm_id])`
  - `ParkAmenity.osm_id BigInt?`, unique
  - `@@unique([park_id, osm_id])` on `trails`
- Generate the first migration, `prisma/migrations/<ts>_init`, against the Docker DB. Append GiST indexes on the geometry columns by hand.
- In `.gitignore`, change `/src/generated/prisma` to `/src/generated`. That rule never matched before.

## Step 2: OSM data pipeline (`backend/scripts/`)
- **`parks.config.json`**: holds the `bbox`, plus optional `include` and `exclude` lists of OSM ids. This is the file you edit to map more parks.
- **`fetch-parks.js`** (`npm run parks:fetch`) sends three Overpass queries over the bbox:
  1. Named `leisure=park` ways and relations, using `out geom`.
  2. `highway~footway|path|cycleway|bridleway|track|pedestrian` ways.
  3. Amenity nodes and way centres for `bench`, `toilets`, `cafe`, `restaurant`, `drinking_water`, `parking`, `bicycle_parking`, `waste_basket` and `shelter`, plus `leisure=playground`.

  Converting relations to GeoJSON needs proper multipolygon handling, so the script uses the `osmtogeojson` dev dependency. It renames tags to match the frontend icon keys (`toilets`→`toilet`, `leisure=playground`→`playground`). Output goes to committed snapshots in `backend/prisma/data/{parks,trails,amenities}.geojson`, so cloners never need Overpass. Requests send a generic User-Agent.
- **`seed.js`** (`npm run db:seed`, also set as the Prisma `migrations.seed` in `prisma.config.ts`) runs one transaction using `prisma.$executeRaw`:
  - Upserts parks with `ST_Multi(ST_MakeValid(ST_GeomFromGeoJSON(...)))::geography`, using `ON CONFLICT (osm_type, osm_id)`.
  - Inserts trails, assigning `park_id` with `ST_Intersects` against the park polygons. Trails that touch no park are dropped.
  - Inserts amenities whose point is `ST_Within` a park.
  - Creates a demo user (`demo@openparks.local`, already verified, password documented) and a few sample reviews, so visitors can try the logged-in pages immediately.
- Use the existing `src/config/prisma.js` client, so the seed and the app share one DB connection setup.

## Step 3: Make local setup easy
- **Root `docker-compose.yml`**: `postgis/postgis:16-3.4` on 5432 with a named volume and healthcheck, and `axllent/mailpit` on 1025 (SMTP) and 8025 (web inbox).
- **`backend/.env.example`**: `DATABASE_URL` (pointing at Docker), `DB_SSL=false`, `JWT_SECRET`, `EMAIL_HOST=localhost`, `EMAIL_PORT=1025`, empty `EMAIL_USER` and `EMAIL_PASS`, `EMAIL_FROM`, `CORS_ORIGINS`.
- **`backend/src/config/prisma.js`**: only turn on `ssl: { rejectUnauthorized: false }` when `DB_SSL=true`. Local PostGIS has no SSL, so forcing it would fail the connection.
- **`backend/src/controllers/sendVerification.js`**: only pass `auth` when `EMAIL_USER` is set, so Mailpit works.
- **`backend/src/server.js`**: read CORS origins from `CORS_ORIGINS`, falling back to the current 5173/5174. Read the port from `PORT`, defaulting to 3000.
- **Bug fix**: `backend/src/controllers/safetyReport.js:52` uses SRID `4236`, which should be `4326`.
- **`backend/package.json`**:
  - Add the missing `jsonwebtoken` dependency.
  - Add scripts: `start` (`node src/server.js`), `dev` (`node --watch src/server.js`), `db:migrate` (`prisma migrate deploy`), `db:seed`, `db:reset`, `parks:fetch`, and `setup` (migrate + seed).
  - Run from `backend/` from now on, not `backend/src`.
- **Frontend**: `src/api/axiosInstance.js` reads `import.meta.env.VITE_API_URL`, falling back to `http://localhost:3000`. Add `frontend/.env.example`.
- **Root `package.json`**: replace the unused `dotenv-cli` and `nodemailer-otp` dependencies with convenience scripts (`setup`, `dev:backend`, `dev:frontend`).
- **README**: replace Getting Started with a Quick Start:
  1. `docker compose up -d`
  2. `cp backend/.env.example backend/.env`
  3. `cd backend && npm install && npm run setup && npm run dev`
  4. Start the frontend.

  Also mention Mailpit at :8025 and the demo login, add "Adding more parks" instructions, and add the "© OpenStreetMap contributors (ODbL)" attribution. Remove the "will not work" note. Update `CLAUDE.md` to match.

## Step 4: Ready for more parks (light touches now)
- `ParkMap.jsx:266-270` hardcodes the center and `maxBounds`. Compute them from the extent of the `/api/parks` FeatureCollection instead, so newly added areas can be reached. Keep the Cannon Hill center as the initial view.
- Change the header text "Cannon Hill · Birmingham" (`ParkMap.jsx:591`) to "Birmingham".
- Workflow for expanding: edit `parks.config.json`, run `npm run parks:fetch`, run `npm run db:seed`, commit the GeoJSON.

## Verification
1. `docker compose up -d`, then `npm run setup` in `backend/`: the migration applies and the seed reports park, trail and amenity counts (about 47 parks).
2. Run `npm run db:seed` again: counts stay the same (idempotent).
3. `npm run dev` and `curl localhost:3000/api/parks | jq '.features | length'`. Also check `/api/trails` and `/api/amenities`.
4. Frontend `npm run dev`: the map shows Cannon Hill and Highbury polygons, coloured trails, and amenity icons when zoomed in. Visually compare with `image.png`.
5. Sign up as a new user: the OTP appears in Mailpit at localhost:8025, and verifying logs in. Post a review and a safety report, then check that the report heatmap point lands in the right place (SRID fix).
6. Log in as the demo user and confirm the account page lists the seeded reviews.
7. `npm run test:unit` and `npm run test:integration` in `backend/`, and `npx vitest run` in `frontend/`. All should still pass; update the mocks if the `prisma.js` or `axiosInstance` changes affect them.
