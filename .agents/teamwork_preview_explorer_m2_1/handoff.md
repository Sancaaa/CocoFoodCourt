# Handoff Report — Explorer 1 (Milestone 2)

## 1. Observation
I directly observed the following in the repository:
- **Hardcoded Mock Bypass**: In `src/lib/odoo-client.ts` (line 31), `this.isMock = true;` is hardcoded, preventing dynamic control.
- **Falsy Auth Return**: In `src/lib/odoo-client.ts` (lines 39–45):
  ```typescript
        client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
          if (error) reject(error);
          else {
            this.uid = value;
            resolve(value);
          }
        });
  ```
  Odoo XML-RPC returns `false` (boolean) when authentication fails. Resolving `false` directly violates the `Promise<number>` contract and can lead to authentication bypasses in Next-Auth.
- **Singleton Cache Conflict**: `odooClient` is exported as a singleton in `src/lib/odoo-client.ts` (line 93). If user credentials are used in `authenticate()`, they overwrite `this.uid`, which is shared globally for all queries.
- **ESLint Warnings**: Running `npm run lint` produced ESLint errors on `src/lib/odoo-client.ts` (lines 49):
  ```
  C:\Users\luffy\Downloads\enter\CocoFoodCourt\src\lib\odoo-client.ts
    49:56  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    49:71  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    49:90  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  ```
- **Gitignore ignored env files**: In `.gitignore` (line 34), `.env*` is ignored.

---

## 2. Logic Chain
1. **Dynamic Mocking**: Because `isMock` is hardcoded to `true` (Observation 1), it must be refactored to check `process.env.USE_MOCK_ODOO === 'true'`. To support developer ergonomics, if it's undefined, it should default to `true` in development/test and `false` in production.
2. **Strict Env Configuration**: Because the default variables fall back to local dev values (Observation 1), we should remove default credentials from the client, fallback to empty strings, and check for their presence dynamically.
3. **Validation Timing**: If we throw configuration errors in the constructor, the module load will fail at Next.js build-time (static generation / route pre-compilation) when env variables are not present. Therefore, configuration validation must be deferred to call time (e.g. `authenticate` and `executeKw`).
4. **Security Fix**: Because Odoo returns `false` on bad credentials (Observation 2), the promise must reject with an error if the returned value is `false`, ensuring that Next-Auth does not mistake a falsy response for a valid `uid`.
5. **State Isolation**: Because the client is a singleton (Observation 3), user-supplied authentication must not overwrite the cached `this.uid` used for admin operations. We should modify `authenticate` to accept optional `username` and `apiKey` credentials, and only cache `this.uid` when authenticating with default admin credentials.
6. **Linting Compliance**: Because ESLint blocks `any` (Observation 4), we must suppress typescript-eslint rules for the generic `executeKw` parameters since the raw Odoo XML-RPC payload uses arbitrary types.

---

## 3. Caveats
- This investigation assumes that the Next-Auth provider will handle rejection errors from `authenticate()` correctly.
- This investigation assumes that the Next.js runtime environment correctly loads `.env.local` (as verified via the internal Next.js environment documentation).

---

## 4. Conclusion
We recommend updating `src/lib/odoo-client.ts` to:
- Load variables strictly from `.env.local` (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY`).
- Control mocking dynamically via `process.env.USE_MOCK_ODOO` (defaulting to `process.env.NODE_ENV !== 'production'`).
- Validate presence of variables only when mock is disabled, throwing dynamic errors at call time rather than constructor instantiation time.
- Expose an `authenticate(username?, apiKey?)` signature that rejects on `false` value and caches `this.uid` only for the admin user.
- Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments on `executeKw`.
- Provide a `.env.example` file in the workspace root.

---

## 5. Verification Method
1. **ESLint / Type Verification**: Run `npm run lint` and `npm run build` within `c:\Users\luffy\Downloads\enter\CocoFoodCourt` to verify compilation and linting success.
2. **Mock Toggle Verification**: Set `USE_MOCK_ODOO=true` and confirm that all pages load with mock data. Set `USE_MOCK_ODOO=false` and verify that the client throws connection/config errors unless a mock/real Odoo XML-RPC server is running.
3. **State Isolation & Security Verification**: Write a unit/integration test to call `authenticate()` with invalid credentials (expecting a rejection) and valid user credentials (expecting a uid without polluting `odooClient.uid`).
