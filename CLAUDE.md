# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OpenParks is a PERN-stack app (PostgreSQL + PostGIS on Supabase, Express 5, React 19, Node) for browsing parks on a map, filing safety/hazard reports, and leaving reviews. It is two independent npm projects, `backend/` and `frontend/`, each with its own `package.json` and test runner. The root `package.json` only holds stray deps and is not a workspace. Park boundaries, trails and amenities were imported from the Overpass API into the database ahead of time; no import script is in the repo.

The app can't run as-is: there are no `.env` files and no SQL dump in the repo.

## Commands

The backend and frontend run in separate terminals.

**Backend** (port 3000, hardcoded in `src/server.js`):
```bash
cd backend
npm install                 # postinstall runs `prisma generate` → src/generated/
cd src && node server.js    # must be launched from src/ (dotenv/relative paths)
npm run test:unit           # Jest, tests/unit
npm run test:integration    # Jest, tests/integration
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/reviewController.test.js   # single file
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit -t "returns all reviews"  # single test by name
```
The `--experimental-vm-modules` flag is required because the backend is ESM (`"type": "module"`). Running plain `npx jest` will fail.

**Frontend** (Vite dev server on 5173/5174):
```bash
cd frontend
npm run dev
npm run build
npm run lint
npx vitest run                         # all tests once (`npm test` runs in watch mode)
npx vitest run test/ReviewPage.test.jsx
npx vitest run -t "test name"
```
Run frontend tests from `frontend/` only. Running them from the repo root collides with the backend Jest suite.

## Backend architecture

- Each request goes through **route → middleware (Joi validation) → controller → Prisma**. Every resource has its own file in `routes/`, `controllers/`, `middleware/` and `models/`. The `models/` files are **Joi schemas, not ORM models**. The Prisma schema lives in `prisma/schema.prisma`.
- **Prisma client** is generated into `backend/src/generated/` (`output = "../src/generated"`) and imported from `src/config/prisma.js` as `../generated/index.js`. It uses the `@prisma/adapter-pg` driver adapter over a `pg.Pool` with SSL (`rejectUnauthorized: false`) for Supabase. After any schema change, run `npx prisma generate`.
- **Spatial data:** `location`/`geom` columns are PostGIS `geography`/`geometry` and appear as `Unsupported(...)` in Prisma. Any read or write that touches geometry therefore uses `prisma.$queryRaw` with `ST_AsGeoJSON`, `ST_MakePoint`, etc. Parks, trails and amenities are returned as GeoJSON `FeatureCollection`s (see `rowToFeature` in `parkController.js`). Non-spatial CRUD uses the normal Prisma client.
- **Auth:** routes are protected with `passport.authenticate("jwt", { session: false })` (strategy in `src/config/passport.js`, Bearer token, `JWT_SECRET`), which sets `req.user`. Signup creates an unverified user and emails an OTP via nodemailer (`sendVerification.js`). The OTPs are stored in the `OneTimePasswords` table, expire after 5 minutes, and are checked in `validateEmail.js`, which then issues a JWT. Controllers import `jsonwebtoken`, but it is **not listed** in `backend/package.json`.
- CORS only allows `http://localhost:5173` and `:5174`.
- Env vars: `DATABASE_URL`, `JWT_SECRET`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`.

## Backend testing conventions

- ESM mocking: call `jest.unstable_mockModule("../../src/config/prisma.js", ...)` **before** `await import(...)`-ing the controller under test. Import `jest` from `@jest/globals`.
- Controllers are called directly with stub `req`/`res` objects (`res.status`/`res.json` are chained `jest.fn()`). There is no supertest or HTTP layer. The integration tests also mock Prisma, despite what the test plan says.
- `backend/tests/testplan.md` lists test IDs and expected results per controller. Update it when you add tests.

## Frontend architecture

- Routing uses `react-router` v7 (`App.jsx`). The pages are `/`, `/report`, `/login`, `/review` and `/account`. Report, review and account require login.
- All HTTP calls go through `src/api/axiosInstance.js`, which has `baseURL` `http://localhost:3000` and attaches `localStorage.token` as a Bearer header.
- Maps use MapLibre GL (`pages/ParkMap.jsx` is the main map: park polygons, report heatmap, zoom-dependent amenity layers). `@turf` does point-in-polygon checks, such as matching a clicked point to a park.
- `context/AccessibilityContext.jsx` and `high-contrast.css` provide a global high-contrast toggle.
- Tests: Vitest + jsdom + Testing Library. `test/setup.js` mocks `localStorage` and `matchMedia`. Tests mock `maplibre-gl`, the axios instance, `react-hot-toast` and `useNavigate` with `vi.mock()`. The test plan is in `frontend/test-plan.md`.
