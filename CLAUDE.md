# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OpenParks is a PERN-stack app (PostgreSQL + PostGIS, Express 5, React 19, Node) for browsing parks on a map, filing safety/hazard reports, and leaving reviews. It is two independent npm projects, `backend/` and `frontend/`, each with its own `package.json` and test runner. The root `package.json` only holds convenience scripts (`setup`, `dev:backend`, `dev:frontend`, `test`); it is not a workspace.

Local development runs PostGIS and Mailpit (catches verification emails) in Docker via the root `docker-compose.yml`. The DB is on host port **5433** (not 5432), Mailpit SMTP on 1025 and its inbox UI on http://localhost:8025. An init script also creates the `openparks_test` database.

## Commands

```bash
docker compose up -d --wait   # start PostGIS + Mailpit (always use --wait: the DB needs a few seconds)
npm run setup                 # root: install both projects, create backend/.env, migrate, seed
npm run dev:backend           # = cd backend && npm run dev  (node --watch, port 3000)
npm run dev:frontend          # = cd frontend && npm run dev (Vite, 5173/5174)
```

**Backend** (run from `backend/`):
```bash
npm start / npm run dev        # API on PORT (default 3000)
npm run db:migrate             # prisma migrate deploy
npm run db:seed                # load prisma/data/*.geojson + demo user (idempotent)
npm run setup                  # ensure .env, migrate deploy, seed
npm run parks:fetch            # re-download OSM snapshots per scripts/parks.config.json (network)
npm run test:unit              # Jest, tests/unit
npm run test:integration       # Jest, tests/integration (Prisma mocked)
npm run test:db                # Jest, tests/db, real PostGIS openparks_test DB (needs Docker)
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/reviewController.test.js   # single file
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit -t "returns all reviews"  # single test by name
```
The `--experimental-vm-modules` flag is required because the backend is ESM (`"type": "module"`). Plain `npx jest` fails.

Do not run `prisma migrate reset` / `npm run db:reset` without the user's explicit consent: Prisma blocks it for AI agents, and it wipes the dev DB. DB tests instead run `migrate deploy` and truncate tables through `tests/db/resetTestDb.js`, which refuses to run unless the database name ends in `_test`.

**Frontend** (run from `frontend/`; running Vitest from the repo root collides with the backend Jest suite):
```bash
npm run dev
npm run build
npm run lint                  # note: ~30 pre-existing lint problems in older files
npx vitest run                # all tests once (`npm test` runs in watch mode)
npx vitest run test/ReviewPage.test.jsx
npx vitest run -t "test name"
```

Demo account (seeded): `demo@openparks.local` / `openparks-demo`.

## Backend architecture

- Each request goes through **route → middleware (Joi validation) → controller → Prisma**. Every resource has its own file in `routes/`, `controllers/`, `middleware/` and `models/`. The `models/` files are **Joi schemas, not ORM models**. The Prisma schema is `prisma/schema.prisma`, with migrations in `prisma/migrations/` (`prisma.config.ts` holds the datasource and seed config).
- **Config:** `src/config/loadEnv.js` loads `backend/.env` by absolute path, so the cwd doesn't matter. Import it first in any entry module. Env-dependent settings are pure helpers in `src/config/env.js`: `buildPoolConfig` (SSL only when `DB_SSL=true`), `buildTransportOptions` (SMTP auth only when `EMAIL_USER` is set), and `parseCorsOrigins` (`CORS_ORIGINS`, default 5173/5174).
- **Prisma client** is generated into `backend/src/generated/` (gitignored, created by `postinstall`) and used through `src/config/prisma.js` (`@prisma/adapter-pg` over a `pg.Pool`). After any schema change, run `npx prisma generate`.
- **Spatial data:** `location`/`geom` columns are PostGIS `geography`/`geometry` and appear as `Unsupported(...)` in Prisma. Reads and writes that touch geometry use `prisma.$queryRaw` with `ST_AsGeoJSON`, `ST_MakePoint`, etc. Use `$queryRaw`, not `$executeRaw`, when you need `RETURNING` rows. All SRIDs are **4326**, and `SafetyReport.location` is typed `geography(Point,4326)`. Prisma can't see `Unsupported` type modifiers, so changes to them are hand-written migrations. Parks, trails and amenities are returned as GeoJSON.
- **Park data pipeline:** `scripts/fetch-parks.js` (Overpass → `scripts/osm/transform.js`) writes committed snapshots in `prisma/data/*.geojson`. `scripts/seed.js` loads them in one transaction: it upserts parks on `(osm_type, osm_id)` and repairs geometry with `ST_MakeValid`, assigns each trail to the park it overlaps most, and assigns each amenity to the park containing it. Parks with reviews or reports are never deleted. BigInt `osm_id` values must be converted to strings before `res.json`.
- **Auth:** protected routes use `passport.authenticate("jwt", { session: false })`. The strategy in `src/config/passport.js` (`verifyJwtPayload`) only accepts **verified** users. Signup creates an unverified user and emails an OTP (`sendVerification(email)`) but issues no token. `/api/auth/verify-otp` (`validateEmail.js`) checks the OTP (5-minute expiry, `OneTimePasswords` table), sets `Verified`, and issues the JWT. Login returns 403 and re-sends an OTP for unverified users, 401 for bad credentials, and 500 for server errors.

## Backend testing conventions

- ESM mocking: call `jest.unstable_mockModule("../../src/config/prisma.js", ...)` **before** `await import(...)`-ing the module under test. Import `jest` from `@jest/globals`.
- Unit and integration tests call controllers directly with stub `req`/`res` objects (`res.status`/`res.json` are chained `jest.fn()`) and mock Prisma. There is no supertest or HTTP layer. Mocks must use real column names (e.g. `Verified`), because a mock with the wrong field once hid a login bug. Raw-SQL behaviour belongs in `tests/db/`, which runs against real PostGIS.
- `backend/tests/testplan.md` and `frontend/test-plan.md` list test IDs and expected results. Update them when you add tests.

## Frontend architecture

- Routing uses `react-router` v7 (`App.jsx`). The pages are `/`, `/report`, `/login`, `/review` and `/account`. Report, review and account require login.
- All HTTP calls go through `src/api/axiosInstance.js`: `baseURL` is `import.meta.env.VITE_API_URL || "http://localhost:3000"` (see `frontend/.env.example`), and it attaches `localStorage.token` as a Bearer header.
- Maps use MapLibre GL (`pages/ParkMap.jsx` is the main map: park polygons, report heatmap, zoom-dependent amenity layers keyed by `AMENITY_ICONS`). `@turf` does point-in-polygon checks, such as matching a clicked point to a park.
- `context/AccessibilityContext.jsx` and `high-contrast.css` provide a global high-contrast toggle.
- Tests: Vitest + jsdom + Testing Library. `test/setup.js` mocks `localStorage` and `matchMedia`. Tests mock `maplibre-gl`, the axios instance, `react-hot-toast` and `useNavigate` with `vi.mock()`.
