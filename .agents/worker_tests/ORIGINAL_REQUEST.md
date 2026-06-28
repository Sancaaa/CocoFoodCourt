## 2026-06-28T02:59:20Z

You are the Worker subagent for the E2E test implementation milestone (worker_tests).
Your working directory is: c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\worker_tests.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the comprehensive, opaque-box E2E test suite for CocoFoodCourt.
You must implement the tests for all 4 Tiers, both as browser-based Playwright tests (in `tests/e2e/`) and as API-level fallback integration tests (in `scripts/run-e2e.ts`):

1. **Playwright E2E Tests**:
   Create the following files under `tests/e2e/`:
   - `tests/e2e/login.spec.ts`:
     - Tier 1: Happy path credential login redirects to dashboard. Invalid credentials return 401. Logged-in user's name visible on Navbar.
     - Tier 2: Boundary/corner cases: empty fields, extremely long inputs, special/unicode characters, logout (clearing cookie/session) and checking redirection back to login page.
   - `tests/e2e/register.spec.ts`:
     - Tier 1: Happy path registration (name, email, password) works, user is created in the Odoo mock database with Portal group assigned.
     - Tier 2: Boundary/corner cases: mismatched passwords, email format validation, duplicate registration (returns conflict error), inputs with SQL-injection-like characters.
   - `tests/e2e/booking.spec.ts`:
     - Tier 4 (Real-World Application Scenarios):
       - E2E Booking Flow: visits /book, selects date/time, selects Table A1, pre-orders Nasi Goreng Spesial, enters customer details, submits, redirected to payment / dashboard.
       - Multi-item pre-order: selects multiple menu items, verifies total price matches, submits.
       - Table Reservation Conflict: tries to reserve an already reserved table, verify error or unavailability, then books another table.
       - Booking payment webhook flow: creates reservation, triggers webhook payment confirmation, verify reservation state becomes confirmed.
       - E2E Booking with Registration: anonymous user selects table, tries to confirm, prompted to register, registers, booking completes successfully.
     - Tier 3 (Cross-Feature Combinations):
       - Register new user -> immediately log in as that user -> check booking page/dashboard session state.
       - Register -> wrong password login fails -> correct password login succeeds.

2. **Fallback Integration / API Tests**:
   Update `scripts/run-e2e.ts` to execute equivalent API-level tests for all 4 Tiers against the running Next.js app and stateful mock server:
   - Make it start the Mock Odoo Server (port 8090) and the Next.js App (port 3000) with `USE_MOCK_ODOO=false` and correct Odoo environment variables.
   - Add tests simulating requests to `/api/auth/` credentials login, `/api/register`, `/api/menu`, `/api/tables`, `/api/reservations`, and `/api/webhooks/payment` to verify feature coverage (Tier 1), boundaries/corners (Tier 2), cross-features (Tier 3), and application workloads (Tier 4) without requiring a browser.
   - Ensure it cleans up all spawned processes on Windows (using taskkill) and Unix.

3. **Documentation**:
   - Write the comprehensive test suite documentation to `c:\Users\luffy\Downloads\enter\CocoFoodCourt\TEST_INFRA.md` (following the template in PROJECT-specific instructions).
   - Write the completion signal file to `c:\Users\luffy\Downloads\enter\CocoFoodCourt\TEST_READY.md` containing the E2E test runner commands, expected exit codes, and coverage matrix.

Write a handoff report in your working directory `handoff.md` summarizing the implemented tests and document files. Send a message to the caller (id: 0f36f75f-5cb5-48c7-8f6a-55bb31ec5658) when complete.
