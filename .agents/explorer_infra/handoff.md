# Handoff Report: E2E Testing Infrastructure Milestone

## 1. Observation

We directly observed the following from the repository inspection:
* **Package Dependencies**:
  * In `package.json` (lines 24 and 31), the `xmlrpc` and `@types/xmlrpc` dependencies are already installed:
    ```json
    "xmlrpc": "^1.3.2"
    "@types/xmlrpc": "^1.3.10"
    ```
  * No testing tools (Playwright, Jest, ts-node, tsx) are listed in `package.json` devDependencies.
* **Odoo Client XML-RPC Call Structure**:
  * In `src/lib/odoo-client.ts` (lines 38-39), the endpoint `/xmlrpc/2/common` and method `authenticate` are used:
    ```typescript
    const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/common` });
    client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
    ```
  * In `src/lib/odoo-client.ts` (lines 84-85), the endpoint `/xmlrpc/2/object` and method `execute_kw` are used:
    ```typescript
    const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/object` });
    client.methodCall('execute_kw', [this.db, this.uid, this.apiKey, model, method, args, kwargs], (error, value) => {
    ```
* **Existing Files**:
  * We ran `find_by_name` and found no existing test files or configs (no `jest.config.js`, `playwright.config.ts`, or files matching `*.test.*` / `*.spec.*`).
  * We found `src/app/payment-mock/page.tsx`, which serves as a mock payment UI on the frontend, rather than a test utility.

---

## 2. Logic Chain

1. **Testing Framework Selection**:
   * E2E testing of authentication (Next-Auth) and registration requires a real browser context to manage cookies, session headers, and redirects.
   * Playwright is the standard E2E testing framework for Next.js and has built-in features (`webServer`) for running dependent servers.
   * Therefore, Playwright (`@playwright/test`) is recommended as the E2E framework.
2. **Mock Server Framework Selection**:
   * Since `xmlrpc` package is already a dependency of the project, the mock XML-RPC server should use the same library to host a server using `xmlrpc.createServer`.
   * A single server instance can listen to both `/common` and `/object` paths because the client method names (`authenticate` vs `execute_kw`) are distinct. Emitting event listeners for these methods is supported by `xmlrpc.createServer`.
3. **Stateful Mock Server Logic**:
   * During E2E test runs, registration creates a new user, and login subsequent steps must authenticate that user.
   * Therefore, the mock server must store newly created users in-memory and read them during authentication, enabling dynamic end-to-end user registration and login validation.
4. **Lifecycle Coordination**:
   * The application must be built (`npm run build`) and started (`npm run start`), and environment variables (such as `USE_MOCK_ODOO=false`, `ODOO_URL=http://localhost:8090`) must be injected into the Next.js process to ensure it points to the mock XML-RPC server instead of actual Odoo or the internal mocks.
   * Playwright's `webServer` config supports an array of servers, allowing it to start both the mock server and the Next.js app in order, wait for both ports to respond, run tests, and automatically shut down both servers upon completion.

---

## 3. Caveats

* We assumed the Node runtime environment supports package installation. The timeout in the user terminal command execution did not allow us to verify the exact Node/NPM version, but the package configs denote compatibility with Node v20+.
* Port collision: The default ports (`3000` for Next.js, `8090` for Mock Server) are assumed to be free. The runner should allow configuring these via environment variables if collisions occur.

---

## 4. Conclusion

We conclude that:
* **Playwright** is the best E2E testing library choice.
* The mock server should be written in TypeScript, using `xmlrpc` package's `xmlrpc.createServer`.
* An in-memory database of users on the mock server is required to test the dynamic registration -> login flow.
* **Playwright Native multi-webServer** configuration is the recommended method to run and clean up the test infrastructure.

The complete proposed files and configurations are detailed in `analysis.md` in the explorer's working directory.

---

## 5. Verification Method

To verify the E2E setup once implemented:
1. Ensure `npm install -D @playwright/test tsx` is run.
2. Run `npx playwright install --with-deps` to download browser binaries.
3. Start the mock server: `npx tsx scripts/mock-odoo-server.ts`.
4. Test the mock server using a simple XML-RPC test script, or run the Next.js build and E2E test commands:
   * Build: `npm run build`
   * Test execution: `npx playwright test`
5. Verify that both mock server and Next.js processes are spawned and correctly terminated after the tests finish.
