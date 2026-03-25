Frontend Unit Testing

1. Introduction & Objectives
This document defines the Test Plan for the OpenParks frontend application. The application provides a web-based interface for discovering and reporting on urban green spaces, including an interactive map, park reviews, safety reports, and user account management.
The testing strategy covers unit testing of all frontend page components:

Verify each component renders correctly and displays the right UI elements.
Ensure authentication redirection works when users are not logged in.
Confirm form validation prevents submission with missing required fields.
Validate that API calls are made with the correct parameters.
Confirm error paths (API failures, invalid credentials, missing data) show appropriate feedback.
Verify loading states, success states, and empty states behave as specified.


2. Scope
2.1 Components Under Test
ComponentTest FileResponsibilityLoginPageLoginPage.test.jsxLogin/registration forms, OTP verification, auth redirectionReportPageReportPage.test.jsxReport submission, form validation, map integration, API callsReviewPageReviewPage.test.jsxReview submission, star rating, form validation, map integrationAccountPageAccountPage.test.jsxProfile display, reviews/reports tabs, account deletionParkMapParkMap.test.jsxMap rendering, navigation buttons, logout, category filters, review panelAccessibilityContextAccessibilityContext.test.jsxHigh contrast mode state management, DOM class togglingAccessibilityToggleAccessibilityToggle.test.jsxToggle button rendering, user interaction, feature toggling
2.2 Out of Scope

Backend API reliability (all API calls are mocked).
MapLibre GL JS map rendering (map library is mocked in tests).
Real Supabase authentication (auth calls are mocked).
End-to-end browser testing.


3. Test Environment & Tooling
ItemDetailRuntimeNode.js (ESM support)Test RunnerVitest v2.1.9Mocking Strategyvi.mock() for module replacement, vi.fn() for function mocksAPI (mocked)Axios instance replaced with vi.fn() mocksAuth (mocked)localStorage mocked via setup.js, useNavigate mocked via vi.mock()Map (mocked)maplibre-gl replaced with vi.fn() constructor mocksToast (mocked)react-hot-toast replaced with vi.fn() mocksEnvironmentjsdom (simulated browser)

4. Unit Tests
Each component is tested in complete isolation. API calls, navigation, toast notifications, and map libraries are replaced with Vitest mock functions. Tests assert both the mock calls made (interaction testing) and the UI rendered (state testing).

4.1 LoginPage
File: test/LoginPage.test.jsx
4.1.1 Form Rendering & Navigation
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-LP-01Shows login form with email and password fields by defaultRender LoginPageHeading 'Sign in', email and password inputs visible, no name fieldSign in heading shownPASSUT-LP-02Switches to registration form when register link is clickedClick 'Register' buttonHeading 'Create account', name field visibleCreate account heading shownPASSUT-LP-03Switches back to login form from registration formClick 'Register' then 'Sign in'Heading 'Sign in', no name fieldSign in heading shownPASSUT-LP-04Prevents already logged in users from accessing login pagetoken set in localStoragetoast.error called, navigate called with '/'Redirect triggeredPASS
4.1.2 Login Flow
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-LP-05Submits login request with email and passwordEnter email and password, click Sign inAPI.post called with /api/auth/login and credentialsAPI called correctlyPASSUT-LP-06Stores token in localStorage after successful loginAPI.post resolves with tokenlocalStorage token set, toast.success calledToken storedPASSUT-LP-07Navigates to home page after successful loginAPI.post resolves with tokennavigate called with '/'Navigation triggeredPASSUT-LP-08Shows error message when login fails with invalid credentialsAPI.post rejects with 401toast.error called with 'Invalid credentials'Error toast shownPASS
4.1.3 Registration Flow
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-LP-09Submits registration request with username email and passwordEnter all fields, click Create accountAPI.post called with /api/auth/signup and all fieldsAPI called correctlyPASSUT-LP-10Shows user exists error when registering with existing emailAPI.post rejects with 409toast.error called with 'User exists already, login'Error toast shownPASSUT-LP-11Does not submit registration with invalid fieldsEnter invalid email formatAPI.post not calledSubmission blockedPASS

4.2 ReportPage
File: test/ReportPage.test.jsx
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-RP-01Redirects to login if not logged inNo token in localStoragetoast.error called, navigate to /loginRedirect triggeredPASSUT-RP-02Renders the report form when logged inToken in localStorageIssue type dropdown, description textarea visibleForm renderedPASSUT-RP-03Does not submit if issue type is missingFill description only, click submitAPI.post not calledSubmission blockedPASSUT-RP-04Does not submit if description is missingSelect issue type only, click submitAPI.post not calledSubmission blockedPASSUT-RP-05Submits report with selected type and descriptionSelect type, enter description, click submitAPI.post called with /api/safetyreport and payloadAPI called correctlyPASSUT-RP-06Shows loading state while submittingAPI.post never resolvesButton text changes to 'Submitting...'Loading state shownPASSUT-RP-07Shows success toast after submissionAPI.post resolves with 201toast.success calledSuccess toast shownPASSUT-RP-08Navigates home after successful submissionAPI.post resolves with 201navigate called with '/'Navigation triggeredPASSUT-RP-09Displays error toast when API request failsAPI.post rejects with 500toast.error called with error messageError toast shownPASS

4.3 ReviewPage
File: test/ReviewPage.test.jsx
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-RV-01Redirects to login if not logged inNo token in localStoragetoast.error called, navigate to /loginRedirect triggeredPASSUT-RV-02Renders the review form when logged inToken in localStorage'Leave a review' heading, rating and textarea visibleForm renderedPASSUT-RV-03Renders 5 star buttonsRender ReviewPage5 star (★) buttons present5 stars renderedPASSUT-RV-04Selects a star rating when clickedClick 3rd star buttonStar turns gold (#f5a623)Rating selectedPASSUT-RV-05Does not submit if rating is missingEnter review body only, click submitAPI.post not calledSubmission blockedPASSUT-RV-06Does not submit if review body is missingSelect rating only, click submitAPI.post not calledSubmission blockedPASSUT-RV-07Shows loading state while submittingAPI.post never resolvesButton text changes to 'Submitting...'Loading state shownPASSUT-RV-08Shows error toast when submission failsAPI.post rejects with error messagetoast.error called with error messageError toast shownPASSUT-RV-09Renders the map containerRender ReviewPage'Pin location on map' label and read-only input visibleMap container renderedPASS

4.4 AccountPage
File: test/AccountPage.test.jsx
4.4.1 Authentication & Profile
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-AC-01Redirects to login if not logged inNo token in localStoragetoast.error called, navigate to /loginRedirect triggeredPASSUT-AC-02Renders the account page when logged inAPI.get /api/user resolves with user dataUsername and email displayedProfile shownPASS
4.4.2 Reviews & Reports Tabs
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-AC-03Shows reviews tab by defaultAPI returns mock reviewsMy Reviews tab active, review content visibleReviews shownPASSUT-AC-04Shows reviews with park names and ratingsAPI returns reviews with park relationPark name and review content visibleReview details shownPASSUT-AC-05Switches to reports tab when clickedClick My Reports tabReport description visibleReports shownPASSUT-AC-06Shows empty message when no reviewsAPI returns empty reviews array'You haven't left any reviews yet.' shownEmpty state shownPASSUT-AC-07Shows empty message when no reportsAPI returns empty reports array, click My Reports'You haven't filed any reports yet.' shownEmpty state shownPASS
4.4.3 Account Deletion
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-AC-08Shows delete account buttonRender AccountPage'Delete my account' button visibleButton shownPASSUT-AC-09Shows confirmation modal when delete button is clickedClick 'Delete my account'Modal with 'Delete your account?' heading visibleModal shownPASSUT-AC-10Closes modal when cancel is clickedOpen modal, click CancelModal no longer visibleModal closedPASSUT-AC-11Deletes account and navigates home on confirmationClick confirm delete, API.delete resolvesAPI.delete called, token removed, navigate to '/'Account deletedPASS

4.5 ParkMap
File: test/ParkMap.test.jsx
4.5.1 Map & Header Rendering
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-PM-01Renders the map containerRender MapRendererElement with class 'map-container-wrapper' presentMap container renderedPASSUT-PM-02Renders the OpenParks headerRender MapRenderer'OpenParks' text visible in headerHeader renderedPASSUT-PM-03Renders the trail types keyRender MapRenderer'Trail Types', 'Footpath', 'Cycleway' labels visibleTrail key renderedPASS
4.5.2 Navigation Buttons
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-PM-04Shows Login button when not logged inNo token in localStorageLogin button visibleLogin shownPASSUT-PM-05Shows Logout button when logged inToken in localStorageLogout button visibleLogout shownPASSUT-PM-06Navigates to login when Login button is clickedClick Login buttonnavigate called with '/login'Navigation triggeredPASSUT-PM-07Navigates to review page when Review button is clickedClick Review buttonnavigate called with '/review'Navigation triggeredPASSUT-PM-08Navigates to report page when Report button is clickedClick Report buttonnavigate called with '/report'Navigation triggeredPASS
4.5.3 Logout
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-PM-09Clears token and hides Logout button after logoutClick Logout buttonlocalStorage token null, Logout hidden, Login visibleLogout successfulPASS
4.5.4 Report Category Filters
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-PM-10Renders all report category filter buttonsRender MapRendererAll 6 category buttons visibleAll categories shownPASSUT-PM-11Toggles active category when filter button is clickedClick 'Litter' buttonButton background changes to #2d5a27Category activatedPASSUT-PM-12Deactivates category when same filter button is clicked twiceClick 'Litter' twiceButton background returns to transparentCategory deactivatedPASS
4.5.5 Review Panel
Test IDDescriptionInput / SetupExpected ResultActual ResultStatusUT-PM-13Review panel is present in DOMRender MapRenderer'Reviews' label present in DOMPanel in DOMPASSUT-PM-14Review panel close button is presentRender MapRendererClose button (✕) visibleClose button presentPASS

4.6 AccessibilityContext
File: test/AccessibilityContext.test.jsx
Tests the AccessibilityContext including high contrast mode state management and DOM class toggling. Includes 5 test cases, all passing.

4.7 AccessibilityToggle
File: test/AccessibilityToggle.test.jsx
Tests the AccessibilityToggle component including button rendering, user interaction, and accessibility feature toggling. Includes 4 test cases, all passing.

5. Test Execution
Navigate to the frontend directory and run the following command to start the tests:
npx vitest

Note: Tests must be run from the frontend/ directory, not the project root, to avoid conflicts with the backend Jest test suite.

Test Files7 passedTotal Tests63 passedLoginPage11 passedReportPage9 passedReviewPage9 passedAccountPage11 passedParkMap14 passedAccessibilityContext5 passedAccessibilityToggle4 passedDuration~1.2s

6. Bug Fixes During Testing
During test setup, a typo was identified and fixed in the shared test setup file (test/setup.js). The localStorage mock was declared as loaclStorageMock but referenced as localStorageMock, causing all test suites to fail with a ReferenceError. Correcting the spelling resolved the issue and allowed all 63 tests to run successfully.