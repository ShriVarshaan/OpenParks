# Frontend Unit Testing

## 1 Introduction & Objectives
This document defines the Test Plan for the OpenParks frontend application. The application provides a web-based interface for discovering and reporting on urban green spaces, including an interactive map, park reviews, safety reports, and user account management.
The testing strategy covers unit testing of all frontend page components:

Verify each component renders correctly and displays the right UI elements.
Ensure authentication redirection works when users are not logged in.
Confirm form validation prevents submission with missing required fields.
Validate that API calls are made with the correct parameters.
Confirm error paths (API failures, invalid credentials, missing data) show appropriate feedback.
Verify loading states, success states, and empty states behave as specified.

---

## Scope

### 2.1 Components Under Test

ComponentTest FileResponsibilityLoginPageLoginPage.test.jsxLogin/registration forms, OTP verification, auth redirectionReportPageReportPage.test.jsxReport submission, form validation, map integration, API callsReviewPageReviewPage.test.jsxReview submission, star rating, form validation, map integrationAccountPageAccountPage.test.jsxProfile display, reviews/reports tabs, account deletionParkMapParkMap.test.jsxMap rendering, navigation buttons, logout, category filters, review panelAccessibilityContextAccessibilityContext.test.jsxHigh contrast mode state management, DOM class togglingAccessibilityToggleAccessibilityToggle.test.jsxToggle button rendering, user interaction, feature toggling


### 2.2 Out of Scope

Backend API reliability (all API calls are mocked).
MapLibre GL JS map rendering (map library is mocked in tests).
Real Supabase authentication (auth calls are mocked).
End-to-end browser testing.

---

## 3 Test Environment & Tooling
ItemDetailRuntimeNode.js (ESM support)Test RunnerVitest v2.1.9Mocking Strategyvi.mock() for module replacement, vi.fn() for function mocksAPI (mocked)Axios instance replaced with vi.fn() mocksAuth (mocked)localStorage mocked via setup.js, useNavigate mocked via vi.mock()Map (mocked)maplibre-gl replaced with vi.fn() constructor mocksToast (mocked)react-hot-toast replaced with vi.fn() mocksEnvironmentjsdom (simulated browser)

---

## Unit Tests
Each component is tested in complete isolation. API calls, navigation, toast notifications, and map libraries are replaced with Vitest mock functions. Tests assert both the mock calls made (interaction testing) and the UI rendered (state testing).

### 4.1 LoginPage

**File:** `test/LoginPage.test.jsx`

### 4.1.1 Form Rendering & Navigation

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-LP-01 | Shows login form with email and password fields by default | Render LoginPage | Heading 'Sign in', email and password inputs visible, no name field | Sign in heading shown | PASS |
| UT-LP-02 | Switches to registration form when register link is clicked | Click 'Register' button | Heading 'Create account', name field visible | Create account heading shown | PASS |
| UT-LP-03 | Switches back to login form from registration form | Click 'Register' then 'Sign in' | Heading 'Sign in', no name field | Sign in heading shown | PASS |
| UT-LP-04 | Prevents already logged in users from accessing login page | token set in localStorage | toast.error called, navigate called with '/' | Redirect triggered | PASS |

### 4.1.2 Login Flow

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-LP-05 | Submits login request with email and password | Enter email and password, click Sign in | API.post called with /api/auth/login and credentials | API called correctly | PASS |
| UT-LP-06 | Stores token in localStorage after successful login | API.post resolves with token | localStorage token set, toast.success called | Token stored | PASS |
| UT-LP-07 | Navigates to home page after successful login | API.post resolves with token | navigate called with '/' | Navigation triggered | PASS |
| UT-LP-08 | Shows error message when login fails with invalid credentials | API.post rejects with 401 | toast.error called with 'Invalid credentials' | Error toast shown | PASS |

### 4.1.3 Registration Flow

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-LP-09 | Submits registration request with username email and password | Enter all fields, click Create account | API.post called with /api/auth/signup and all fields | API called correctly | PASS |
| UT-LP-10 | Shows user exists error when registering with existing email | API.post rejects with 409 | toast.error called with 'User exists already, login' | Error toast shown | PASS |
| UT-LP-11 | Does not submit registration with invalid fields | Enter invalid email format | API.post not called | Submission blocked | PASS |

---

## 4.2 ReportPage

**File:** `test/ReportPage.test.jsx`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RP-01 | Redirects to login if not logged in | No token in localStorage | toast.error called, navigate to /login | Redirect triggered | PASS |
| UT-RP-02 | Renders the report form when logged in | Token in localStorage | Issue type dropdown, description textarea visible | Form rendered | PASS |
| UT-RP-03 | Does not submit if issue type is missing | Fill description only, click submit | API.post not called | Submission blocked | PASS |
| UT-RP-04 | Does not submit if description is missing | Select issue type only, click submit | API.post not called | Submission blocked | PASS |
| UT-RP-05 | Submits report with selected type and description | Select type, enter description, click submit | API.post called with /api/safetyreport and payload | API called correctly | PASS |
| UT-RP-06 | Shows loading state while submitting | API.post never resolves | Button text changes to 'Submitting...' | Loading state shown | PASS |
| UT-RP-07 | Shows success toast after submission | API.post resolves with 201 | toast.success called | Success toast shown | PASS |
| UT-RP-08 | Navigates home after successful submission | API.post resolves with 201 | navigate called with '/' | Navigation triggered | PASS |
| UT-RP-09 | Displays error toast when API request fails | API.post rejects with 500 | toast.error called with error message | Error toast shown | PASS |

---

## 4.3 ReviewPage

**File:** `test/ReviewPage.test.jsx`

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-RV-01 | Redirects to login if not logged in | No token in localStorage | toast.error called, navigate to /login | Redirect triggered | PASS |
| UT-RV-02 | Renders the review form when logged in | Token in localStorage | 'Leave a review' heading, rating and textarea visible | Form rendered | PASS |
| UT-RV-03 | Renders 5 star buttons | Render ReviewPage | 5 star (★) buttons present | 5 stars rendered | PASS |
| UT-RV-04 | Selects a star rating when clicked | Click 3rd star button | Star turns gold (#f5a623) | Rating selected | PASS |
| UT-RV-05 | Does not submit if rating is missing | Enter review body only, click submit | API.post not called | Submission blocked | PASS |
| UT-RV-06 | Does not submit if review body is missing | Select rating only, click submit | API.post not called | Submission blocked | PASS |
| UT-RV-07 | Shows loading state while submitting | API.post never resolves | Button text changes to 'Submitting...' | Loading state shown | PASS |
| UT-RV-08 | Shows error toast when submission fails | API.post rejects with error message | toast.error called with error message | Error toast shown | PASS |
| UT-RV-09 | Renders the map container | Render ReviewPage | 'Pin location on map' label and read-only input visible | Map container rendered | PASS |

## 4.4 AccountPage

**File:** `test/AccountPage.test.jsx`

### 4.4.1 Authentication & Profile

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AC-01 | Redirects to login if not logged in | No token in localStorage | toast.error called, navigate to /login | Redirect triggered | PASS |
| UT-AC-02 | Renders the account page when logged in | API.get /api/user resolves with user data | Username and email displayed | Profile shown | PASS |

### 4.4.2 Reviews & Reports Tabs

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AC-03 | Shows reviews tab by default | API returns mock reviews | My Reviews tab active, review content visible | Reviews shown | PASS |
| UT-AC-04 | Shows reviews with park names and ratings | API returns reviews with park relation | Park name and review content visible | Review details shown | PASS |
| UT-AC-05 | Switches to reports tab when clicked | Click My Reports tab | Report description visible | Reports shown | PASS |
| UT-AC-06 | Shows empty message when no reviews | API returns empty reviews array | 'You haven't left any reviews yet.' shown | Empty state shown | PASS |
| UT-AC-07 | Shows empty message when no reports | API returns empty reports array, click My Reports | 'You haven't filed any reports yet.' shown | Empty state shown | PASS |

### 4.4.3 Account Deletion

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-AC-08 | Shows delete account button | Render AccountPage | 'Delete my account' button visible | Button shown | PASS |
| UT-AC-09 | Shows confirmation modal when delete button is clicked | Click 'Delete my account' | Modal with 'Delete your account?' heading visible | Modal shown | PASS |
| UT-AC-10 | Closes modal when cancel is clicked | Open modal, click Cancel | Modal no longer visible | Modal closed | PASS |
| UT-AC-11 | Deletes account and navigates home on confirmation | Click confirm delete, API.delete resolves | API.delete called, token removed, navigate to '/' | Account deleted | PASS |

---

## 4.5 ParkMap

**File:** `test/ParkMap.test.jsx`

### 4.5.1 Map & Header Rendering

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PM-01 | Renders the map container | Render MapRenderer | Element with class 'map-container-wrapper' present | Map container rendered | PASS |
| UT-PM-02 | Renders the OpenParks header | Render MapRenderer | 'OpenParks' text visible in header | Header rendered | PASS |
| UT-PM-03 | Renders the trail types key | Render MapRenderer | 'Trail Types', 'Footpath', 'Cycleway' labels visible | Trail key rendered | PASS |

### 4.5.2 Navigation Buttons

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PM-04 | Shows Login button when not logged in | No token in localStorage | Login button visible | Login shown | PASS |
| UT-PM-05 | Shows Logout button when logged in | Token in localStorage | Logout button visible | Logout shown | PASS |
| UT-PM-06 | Navigates to login when Login button is clicked | Click Login button | navigate called with '/login' | Navigation triggered | PASS |
| UT-PM-07 | Navigates to review page when Review button is clicked | Click Review button | navigate called with '/review' | Navigation triggered | PASS |
| UT-PM-08 | Navigates to report page when Report button is clicked | Click Report button | navigate called with '/report' | Navigation triggered | PASS |

### 4.5.3 Logout

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PM-09 | Clears token and hides Logout button after logout | Click Logout button | localStorage token null, Logout hidden, Login visible | Logout successful | PASS |

### 4.5.4 Report Category Filters

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PM-10 | Renders all report category filter buttons | Render MapRenderer | All 6 category buttons visible | All categories shown | PASS |
| UT-PM-11 | Toggles active category when filter button is clicked | Click 'Litter' button | Button background changes to #2d5a27 | Category activated | PASS |
| UT-PM-12 | Deactivates category when same filter button is clicked twice | Click 'Litter' twice | Button background returns to transparent | Category deactivated | PASS |

### 4.5.5 Review Panel

| Test ID | Description | Input / Setup | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UT-PM-13 | Review panel is present in DOM | Render MapRenderer | 'Reviews' label present in DOM | Panel in DOM | PASS |
| UT-PM-14 | Review panel close button is present | Render MapRenderer | Close button (✕) visible | Close button present | PASS |

---

## 4.6 AccessibilityContext

**File:** `test/AccessibilityContext.test.jsx`

Tests the AccessibilityContext including high contrast mode state management and DOM class toggling. Includes 5 test cases, all passing.

---

## 4.7 AccessibilityToggle

**File:** `test/AccessibilityToggle.test.jsx`

Tests the AccessibilityToggle component including button rendering, user interaction, and accessibility feature toggling. Includes 4 test cases, all passing.

---

## 5 Test Execution
Navigate to the frontend directory and run the following command to start the tests:
npx vitest

> Note: Tests must be run from the frontend/ directory, not the project root, to avoid conflicts with the backend Jest test suite.

Test Files7 passedTotal Tests63 passedLoginPage11 passedReportPage9 passedReviewPage9 passedAccountPage11 passedParkMap14 passedAccessibilityContext5 passedAccessibilityToggle4 passedDuration~1.2s

## 6 Bug Fixes During Testing

During test setup, a typo was identified and fixed in the shared test setup file (test/setup.js). The localStorage mock was declared as loaclStorageMock but referenced as localStorageMock, causing all test suites to fail with a ReferenceError. Correcting the spelling resolved the issue and allowed all 63 tests to run successfully.