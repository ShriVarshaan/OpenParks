# Test Plan: Parks Web Application
## Unit & Integration Testing

| | |
|---|---|
| **Project** | OpenParks web app |
| **Backend Framework** | Nodejs, Express, Prisma (ORM) |
| **Test Framework** | Jest  |
| **Status** | All Tests Passing |

---

## 1. Introduction & Objectives

This document defines the Test Plan for the OpenParks backend API. The application provides REST endpoints for managing parks, user authentication, amenities, reviews, and safety reports. Data persistence is handled by Prisma ORM to a PostgreSQL database with PostGIS hosted on Supabase

The testing strategy is divided into two phases:

1. **Unit Testing:** each controller is tested in complete isolation by mocking all external dependencies (Prisma, bcrypt, JWT, nodemailer).
2. **Integration Testing:** after all the features are developed, the system is tested end-to-end using a real database.

Test objectives include:

- Verify each API endpoint returns correct HTTP status codes and response bodies.
- Ensure authentication, authorisation, CRUD, error handling work as intended.
- Confirm error paths (404 Not Found, 401 Unauthorised, 403 Forbidden, 409 Conflict, 500 Server Error) behave as specified.
- Validate that integration of auth middleware, database layer, and controllers produces consistent behaviour.

---

## 2. Scope

### 2.1 Modules Under Test

| Controller | Source File | Responsibility |
|---|---|---|
| authController | src/controllers/authController.js | User signup, login, JWT issuance |
| parkController | src/controllers/parkController.js | GeoJSON FeatureCollection retrieval, park lookup by ID |
| amenityController | src/controllers/amenityController.js | Retrieve amenities for a given park |
| reviewController | src/controllers/reviewController.js | CRUD for park reviews, authorisation checks |
| safetyReportController | src/controllers/safetyReport.js | Create/retrieve/update safety reports with spatial data |
| trailController | src/controllers/trailController.js | Retrieve trails |
| accountController | src/controllers/accountController.js | retrieve/delete user and associated details |

### 2.2 Out of Scope

- Third-party email provider reliability (nodemailer / sendVerification is mocked).
- Database migration scripts and Prisma schema validation.

---

## 3. Test Environment & Tooling

| Item | Detail |
|---|---|
| **Runtime** | Node.js (ESM support required) |
| **Test Runner** | Jest `--experimental-vm-modules` flag |
| **Mocking Strategy** | `jest.unstable_mockModule()` for ESM-compatible module replacement |
| **ORM (mocked)** | Prisma database calls replaced with `jest.fn()` mocks |
| **Auth (mocked)** | bcrypt (`hash` / `compare`) and jsonwebtoken (`sign`) both mocked |
| **Email (mocked)** | `nodemailer.createTransport().sendMail` — mocked, never sends real mail |
| **Integration DB** | PostgreSQL 15 + PostGIS 3 (Docker container seeded with fixture data) |

---

## 4. Unit Tests

Each controller is tested in complete isolation. Database, crypto, JWT, and email dependencies are replaced with Jest mock functions. The `res` object is a minimal stub with chained `status()` and `json()` methods. Tests assert both the mock calls made (interaction testing) and the response sent (state testing).

---

### 4.1 authController

**File:** `tests/unit/authController.test.js`

#### 4.1.1 `signup()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AU-01 | Returns 409 if user already exists | `email: test@example.com`, `findUnique` returns existing user | `status 409`, body: `{ message: 'User exists already' }` | status 409 | PASS |
| UT-AU-02 | Creates new user and returns JWT | Valid email/password/username, `findUnique` returns null | `status 201`, body includes `token` and `user {id, email}` | status 201 with `fake-jwt-token` | PASS |
| UT-AU-03 | Returns 500 if signup throws | `findUnique` rejects with DB error | `status 500`, body: `{ message: 'Sign up unsuccessful' }` | status 500 | PASS |

#### 4.1.2 `login()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AU-04 | Returns 401 if user not found | `findUnique` returns null | `status 401`, body: `{ message: 'Invalid credentials' }` | status 401 | PASS |
| UT-AU-05 | Returns 401 if password is wrong | `bcrypt.compare` returns false | `status 401`, body: `{ message: 'Invalid credentials' }` | status 401 | PASS |
| UT-AU-06 | Logs in and returns JWT on valid credentials | User found, `bcrypt.compare` returns true | `status 200`, body includes `token` and `user {id, email}` | status 200 with `login-token` | PASS |
| UT-AU-07 | Returns 401 if login throws | `findUnique` rejects with DB failure | `status 401`, body: `{ message: 'Invalid credentials' }` | status 401 | PASS |

---

### 4.2 parkController

**File:** `tests/unit/parkController.test.js`

#### 4.2.1 `getAllParks()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PK-01 | Returns all parks as GeoJSON FeatureCollection | `$queryRaw` returns array of 2 parks with geometry | `status 200`, `type: FeatureCollection`, features array length 2 | status 200, correct FeatureCollection | PASS |
| UT-PK-02 | Returns 500 if DB query fails | `$queryRaw` rejects with DB failure | `status 500`, body: `{ error: 'Failed to fetch parks' }` | status 500 | PASS |

#### 4.2.2 `getParkById()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PK-03 | Returns single park as GeoJSON Feature | `parkId: 1`, `$queryRaw` returns one park row | `status 200`, `type: Feature` with correct geometry and properties | status 200, correct Feature | PASS |
| UT-PK-04 | Returns 404 if park not found | `$queryRaw` returns empty array | `status 404`, body: `{ error: 'Park not found' }` | status 404 | PASS |
| UT-PK-05 | Returns 500 on query failure | `$queryRaw` rejects | `status 500`, body: `{ error: 'Failed to fetch park' }` | status 500 | PASS |

---

### 4.3 amenityController

**File:** `tests/unit/amenityController.test.js`

#### 4.3.1 `getAmenities()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AM-01 | Returns amenities for a valid park | `parkId: 1`, `findMany` returns 2 amenities | `status 200`, body: array of 2 amenity objects, `findMany` called with `{ where: { park_id: 1 } }` | status 200 with amenities array | PASS |
| UT-AM-02 | Returns empty list if no amenities | `parkId: 2`, `findMany` returns `[]` | `status 200`, body: `[]` | status 200 with empty array | PASS |
| UT-AM-03 | Returns 500 on query failure | `findMany` rejects with DB error | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.3.2 `getAllAmenities()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AM-04 | Returns GeoJSON FeatureCollection for all amenities | `queryRaw` returns 2 amenity rows with `lng`/`lat` fields | `status 200`, body: array of 2 GeoJSON Feature objects with `type`, `geometry`, and `properties` | status 200 with GeoJSON array | PASS |
| UT-AM-05 | Returns empty array when no amenities exist | `queryRaw` returns `[]` | `status 200`, body: `[]` | status 200 with empty array | PASS |
| UT-AM-06 | Returns 500 on database query failure | `queryRaw` rejects with DB error | `status 500`, body: `{ message: "Internal server error" }` | status 500 | PASS |

---

### 4.4 reviewController

**File:** `tests/unit/reviewController.test.js`

#### 4.4.1 `getAllReviewsPark()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-01 | Returns all reviews for a park | `parkId: 1`, `findMany` resolves with 1 review | `status 200`, body: `[review]`, `findMany` called with `{ where: { park_id: 1 } }` | status 200 with expected body| PASS |
| UT-RV-02 | Returns 500 on database query failure | `findMany` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.4.2 `addReviewPark()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-03 | Returns 404 if park does not exist | `findUnique` returns null for park | `status 404`, body: `{ message: 'Park not found' }` | status 404 | PASS |
| UT-RV-04 | Creates review for valid park | Park found, `create` resolves with new review | `status 201`, body: created review object | status 201 with review data | PASS |
| UT-RV-05 | Returns 500 on database query failure | `create` rejects with DB error | `status 500`, body: `{mrssage: "Internal server error"}` | status 500 | PASS |

#### 4.4.3 `getAllReviewsUser()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-06 | Returns all reviews for logged-in user | `user.id: 10`, `findMany` returns 1 review | `status 200`, body: `[review]`, includes park name select | status 200 | PASS |
| UT-RV-07 | Returns 500 on database query failure | `findMany` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.4.4 `getReviewById()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-08 | Returns 404 if review not found | `id: 99`, `findUnique` returns null | `status 404`, body: `{ message: 'Unavailable' }` | status 404 |  PASS |
| UT-RV-09 | Returns review if found | `id: 1`, `findUnique` returns review | `status 200`, body: review object | status 200 | PASS |
| UT-RV-10 | Returns 500 on database query failure | `findUnique` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.4.5 `updateReview()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-11 | Returns 403 if user not owner | `findUnique` returns null (no matching review + user) | `status 403`, body: `{ message: 'unauthorized' }` | status 403 | PASS |
| UT-RV-12 | Updates review when user is owner | `findUnique` returns review with `user_id: 10`, `update` resolves | `status 200`, body: `{ message: 'Updated successfully' }` | status 200 | PASS |
| UT-RV-13 | Returns 500 on database query failure | `findUnique` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.4.6 `deleteReview()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-14 | Returns 403 if user not owner | `findUnique` returns null | `status 403`, body: `{ message: 'unauthorized' }` | status 403 | PASS |
| UT-RV-15 | Deletes review when user is owner | `findUnique` returns review with matching `user_id` | `status 204` | status 204  | PASS |
| UT-RV-16 | Returns 500 on database query failure | `findUnique` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS
---

### 4.5 safetyReportController

**File:** `tests/unit/safetyReport.test.js`

#### 4.5.1 `getAllReports()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-SR-01 | Returns all safety reports for a park | `$queryRaw` returns array of 1 report | `status 200`, body: `[report]`, `$queryRaw` called once | status 200 | PASS |
| UT-SR-02 | Returns 500 on database query failure | `queryRaw` rejects with DB error` | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS

#### 4.5.2 `createNewReport()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-SR-03 | Creates a new safety report with PostGIS geometry | Valid body with coordinates, `user.id: 5`, `$executeRaw` resolves | `status 201`, body: created report object | status 201  | PASS |
| UT-SR-04 | Returns 500 if creation fails | `$executeRaw` rejects with DB failure | `status 500`, body: `{ error: 'Internal server error' }` | status 500 | PASS |

#### 4.5.3 `updateReport()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-SR-05 | Returns 404 if report not found | `findUnique` returns null | `status 404`, body: `{ message: 'report not found' }` | status 404 | PASS |
| UT-SR-06 | Updates report status successfully | `findUnique` returns report, `update` resolves | `status 200`, body: updated report object | status 200 | PASS |
| UT-SR-07 | Returns 400 for Prisma P2002 constraint error | `update` rejects with `error.code P2002` | `status 400`, body: `{ error: 'Invalid error code' }` | status 400  | PASS |
| UT-SR-08 | Returns 500 for unknown update errors | `update` rejects with generic Error | `status 500`, body: `{ error: 'Server error' }` | status 500 |  PASS |

#### 4.5.4 `getUserReports()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-SR-09 | Returns reports for a valid user with parks | `findMany` returns array of 2 reports with `Park` relation | `status 200`, body: reports body | status 200 | PASS |
| UT-SR-10 | Returns empty array when user has no reports | `findMany` returns `[]` | `status 200`, body: `[]` | status 200 | PASS |
| UT-SR-11 | Returns 500 on database query failure | `findMany` rejects with DB error | `status 500`, body: `{message: "Internal server error"}` | status 500 | PASS |
---

### 4.6 accountController

**File:** `tests/unit/accountController.test.js`

#### 4.6.1 `getUser()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AC-01 | Returns user when found | `findUnique` returns user body | `status 200`, body: user body | status 200 | PASS |
| UT-AC-02 | Returns 404 when user is not found | `findUnique` returns `null` | `status 404`, body: `{message: "User not found"}` | status 404 | PASS |
| UT-AC-03 | Returns 500 on database error in getUser | `findUnique` rejects with DB error | `status 500`, body: error object | status 500 | PASS |

#### 4.6.2 `deleteUser()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AC-04 | Returns 200 with confirmation on account deletion | `delete` resolves successfully | `status 200`, body: `{message: "Account deleted"}` | status 200 | PASS |
| UT-AC-05 | Returns 500 on database error in deleteUser | `delete` rejects with DB error | `status 500`, body: error object | status 500 | PASS |
---

### 4.7 trailController

**File:** `tests/unit/accountController.test.js`

#### 4.7.1 `getTrailsByParkId()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-TC-01 | Returns FeatureCollection for a valid park id | `$queryRaw` returns array of 2 trail rows | `status 200`, body: trail body | status 200 | PASS |
| UT-TC-02 | Returns empty FeatureCollection when no trails exist for park | `$queryRaw` returns `[]` | `status 200`, body: `{type: "FeatureCollection", features: []}` | status 200 | PASS |
| UT-TC-03 | Returns 500 on database error in getTrailsByParkId | `$queryRaw` rejects with DB error | `status 500`, body: `{error: "Failed to fetch trails"}` | status 500 | PASS |

#### 4.7.2 `getAllTrails()`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-TC-04 | Returns FeatureCollection of all trails | `$queryRaw` returns array of 2 trail rows | `status 200`, body: trail body | status 200 | PASS |
| UT-TC-05 | Returns empty FeatureCollection when no trails exist | `$queryRaw` returns `[]` | `status 200`, body: `{type: "FeatureCollection", features: []}` | status 200 | PASS |
| UT-TC-06 | Returns 500 on database error in getAllTrails | `$queryRaw` rejects with DB error | `status 500`, body: `{error: "Failed to fetch trails"}` | status 500 | PASS |
---