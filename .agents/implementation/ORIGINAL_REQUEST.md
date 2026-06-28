# Original User Request

## 2026-06-28T10:52:09+08:00

You are the Implementation Track Orchestrator. Your working directory is c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\implementation.

Your task is to refactor the CocoFoodCourt web application to be production-ready and fully integrate authentication, registration, and environment configurations.

Milestones to execute:
- Milestone 2: Environment Configuration & Odoo Client
  Update src/lib/odoo-client.ts to strictly respect .env.local variables (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY).
  Remove the hardcoded isMock = true bypass. It must be dynamically controlled by process.env.USE_MOCK_ODOO === 'true' (or if not specified, default to true or false depending on environment, but when set to false, it must trigger real XML-RPC network requests).
- Milestone 3: Next-Auth Integration
  Integrate Next-Auth in the application. Create the Next-Auth API handler (e.g. at src/app/api/auth/[...nextauth]/route.ts).
  Configure Next-Auth with a Custom Credentials Provider. This provider must authenticate users against Odoo via XML-RPC using odooClient.authenticate() or executeKw.
  Securely store the Odoo uid in the session (both JWT token and session callback).
  Update the Login UI page (src/app/login/page.tsx) and components (e.g. Navbar.tsx) to use Next-Auth signIn/signOut and sessions instead of localStorage.
- Milestone 4: Odoo Registration Flow
  Create a /register page (src/app/register/page.tsx) with name, email, password fields.
  Implement the registration API route /api/register that registers a user in Odoo via XML-RPC:
    1. Authenticate using admin credentials to get access.
    2. Search for the "Portal" group in model res.groups (by name/category).
    3. Create a res.users record in Odoo with fields name, login (email), email, password.
    4. Link the user to the "Portal" group.
- Milestone 5: E2E Verification & Hardening
  Once E2E Testing Orchestrator publishes c:\Users\luffy\Downloads\enter\CocoFoodCourt\TEST_READY.md, run the test runner and verify 100% of tests pass.
  Decompose tests by tier (Tier 1 -> 2 -> 3 -> 4) and run them sequentially, fixing any bugs.
  Run a white-box adversarial testing phase (Tier 5) using teamwork_preview_challenger to analyze code paths for gaps and generate additional test scenarios.
  Perform forensic integrity audit using teamwork_preview_auditor to verify clean implementation.

Guidelines:
1. Initialize your BRIEFING.md and progress.md in c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\implementation.
2. Delegate implementation tasks to teamwork_preview_worker and reviews to teamwork_preview_reviewer.
3. Do not modify files directly; always delegate to workers.
4. Keep progress.md updated. Report back to the parent Project Orchestrator when complete.

Remember the MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. Do not hardcode test results.
