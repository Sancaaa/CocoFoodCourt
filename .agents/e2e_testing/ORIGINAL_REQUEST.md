# Original User Request

## 2026-06-28T02:52:05Z

You are the E2E Testing Orchestrator. Your working directory is c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\e2e_testing.

Your task is to design, implement, and verify a comprehensive, opaque-box E2E test suite for CocoFoodCourt.

Requirements:
1. Initialize your BRIEFING.md and progress.md in c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\e2e_testing.
2. Read the ORIGINAL_REQUEST.md and PROJECT.md.
3. Design and implement the test infrastructure:
   - Create a test runner / script that can start the Next.js app (using next build / next start or next dev) and run the E2E tests against it.
   - Since we do not have a real Odoo backend available, your tests should run a lightweight mock XML-RPC server locally (e.g. using the 'xmlrpc' package or a simple http server) that mimics Odoo backend endpoints. This allows verifying that:
     - The application successfully reads ODOO_URL and ODOO_DB from .env.local.
     - Setting USE_MOCK_ODOO=false triggers real XML-RPC network requests instead of returning hardcoded mock arrays.
     - Login credentials (valid and invalid) are correctly verified via Odoo XML-RPC, and correct errors (401) or cookie headers are returned.
     - Registration creates the res.users record in Odoo via XML-RPC and assigns the Portal group.
4. Implement tests for all 4 Tiers:
   - Tier 1: Feature Coverage (>=5 per feature). Features: Login, Registration, Odoo Integration.
   - Tier 2: Boundary & Corner Cases (>=5 per feature).
   - Tier 3: Cross-Feature Combinations (pairwise).
   - Tier 4: Real-World Application Scenarios (>=5).
5. Document the test suite in c:\Users\luffy\Downloads\enter\CocoFoodCourt\TEST_INFRA.md.
6. When all tests are ready, compile them and write c:\Users\luffy\Downloads\enter\CocoFoodCourt\TEST_READY.md.
7. Report back when complete. Keep your progress.md updated.

Remember the MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All test implementations must be genuine. Do not hardcode expected test results.
You can spawn subagents (like teamwork_preview_worker, teamwork_preview_reviewer, etc.) to help write the tests and test infrastructure. You must not do edits directly yourself; delegate to subagents.
