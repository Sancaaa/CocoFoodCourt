## 2026-06-28T02:54:56Z
You are the Worker subagent for the E2E testing infrastructure milestone (worker_infra).
Your working directory is: c:\Users\luffy\Downloads\enter\CocoFoodCourt\.agents\worker_infra.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Implement the stateful mock XML-RPC server in `scripts/mock-odoo-server.ts`. Use the `xmlrpc` package. It should run on port 8090 by default. It should:
   - Handle '/xmlrpc/2/common' (authenticate method) using an in-memory users array, supporting 'admin'/'admin' and any new registered user.
   - Handle '/xmlrpc/2/object' (execute_kw method) supporting:
     - 'res.groups' (search/search_read for 'Portal' group returning ID 10)
     - 'res.users' (create: parsing groups_id and adding user to in-memory array; read/search_read)
     - 'restaurant.table' (search_read returning MOCK_TABLES)
     - 'foodcourt.reservation' (get_available_tables_api, create, action_confirm, write)
     - 'product.product' (search_read returning MOCK_MENU)
     - 'res.partner' (create)
3. Check if npm install of `@playwright/test` and `tsx` is possible in the environment. Run `npm install -D @playwright/test tsx` to test it.
4. If it works, try to install playwright browsers `npx playwright install --with-deps chromium`.
5. If playwright install works, set up a basic playwright E2E test skeleton (e.g. `tests/e2e/sanity.spec.ts`) and a `playwright.config.ts` using the multi-webServer configuration.
6. If playwright installation or running fails (e.g. due to offline network restrictions or browser install limits), design and implement a fallback test runner in `scripts/run-e2e.ts` using Node.js built-in `node:test` runner or a custom fetch/http testing script that starts the mock server and next app, runs tests, and exits.
7. Run the Next.js build (`npm run build`) and run your sanity/infrastructure test to verify that the mock server and Next.js app talk to each other correctly.
8. Write a clear handoff report in your working directory `handoff.md` detailing what files you created, whether Playwright or the custom Node.js runner is active, and the test run output.
9. Send a message to the caller (id: 0f36f75f-5cb5-48c7-8f6a-55bb31ec5658) when complete.
