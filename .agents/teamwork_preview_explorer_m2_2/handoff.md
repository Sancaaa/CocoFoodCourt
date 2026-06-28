# Handoff Report: Environment Configuration & Odoo Client (Milestone 2)

## 1. Observation
- **`src/lib/odoo-client.ts` (lines 26-32)**: The constructor currently contains a hardcoded `isMock = true` bypass and provides default credentials:
  ```typescript
  constructor() {
    this.url = process.env.ODOO_URL || 'http://localhost:8069';
    this.db = process.env.ODOO_DB || 'odoo';
    this.username = process.env.ODOO_USERNAME || 'admin';
    this.apiKey = process.env.ODOO_API_KEY || 'admin';
    this.isMock = true; // forced to true for now as per user request
  }
  ```
- **`.gitignore` (line 34)**: The `.env*` pattern is specified, meaning all environment-specific files like `.env.local` are correctly ignored from git tracking.
- **`package.json` (lines 24 and 31)**: The `xmlrpc` and `@types/xmlrpc` dependencies are installed:
  ```json
  "xmlrpc": "^1.3.2"
  ...
  "@types/xmlrpc": "^1.3.10"
  ```
- **Build Execution**: Running `npm run build` succeeds locally, generating pages such as `/api/menu`, `/api/reservations`, and `/api/tables` as dynamic routes.

---

## 2. Logic Chain
1. To dynamicize `isMock` based on the user request, we must check if `process.env.USE_MOCK_ODOO` is explicitly provided.
2. If `USE_MOCK_ODOO` is provided, we should set `isMock` to true if it equals `'true'`, and false otherwise.
3. If `USE_MOCK_ODOO` is omitted, the default state should be environment-aware: `false` in production (e.g. `process.env.NODE_ENV === 'production'`) and `true` in other environments (e.g. development and test) to ensure smooth local startup.
4. To strictly respect `.env.local` variables, we must load `process.env.ODOO_*` variables without fallback defaults.
5. If live calls are made with missing environment variables, it will cause XML-RPC connection or authentication failures.
6. However, validating environment variables at constructor time will crash the application during builds in environment configurations where live parameters are not present.
7. Therefore, a call-time validation function `validateConfig()` should be invoked within `authenticate` and `executeKw` before making any actual network calls.
8. When XML-RPC authentication fails, Odoo returns a boolean `false` instead of raising an XML-RPC error. Therefore, adding a check for `value === false` is required to catch incorrect credential setups.

---

## 3. Caveats
- No real Odoo server connection was tested because we are in read-only investigation mode and do not have live credentials or a local Odoo instance running.
- We assume that `process.env.NODE_ENV` is set to `'production'` automatically by Next.js during production builds/starts, which is standard Next.js behavior.

---

## 4. Conclusion
We recommend modifying the `OdooClient` constructor to:
- Resolve `isMock` dynamically via `process.env.USE_MOCK_ODOO` and `process.env.NODE_ENV`.
- Read Odoo connection values directly from `process.env` with no default credentials.
- Implement a lazy `validateConfig()` method called on `authenticate` and `executeKw` entry points to avoid build-time crashes.
- Improve the authentication callback to detect Odoo authentication failures when `value === false`.

---

## 5. Verification Method
1. **Mock Mode Verification**:
   - Set `USE_MOCK_ODOO=true` in `.env.local`.
   - Start the dev server (`npm run dev`) or run a build (`npm run build`).
   - Run requests against the API endpoints (`/api/menu`, `/api/tables`) and verify that they return mock data instead of trying to hit an XML-RPC endpoint.
2. **Live Mode Failure Verification**:
   - Set `USE_MOCK_ODOO=false` and leave `ODOO_URL` empty in `.env.local`.
   - Access `/api/menu` or `/api/tables` and verify that the server throws a descriptive error message indicating missing required Odoo environment variables.
3. **Compile Verification**:
   - Run `npm run build` and ensure that it compiles successfully without any TypeScript or static build issues.
