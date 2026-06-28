# Analysis Report: Environment Configuration & Odoo Client (Milestone 2)

## Overview
This report analyzes the current Odoo XML-RPC client and environment variable configuration in the CocoFoodCourt project and outlines the recommended implementation strategy for Milestone 2. 

The primary objectives are:
1. Support standard `.env.local` configuration variables for Odoo integration (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY`).
2. Remove the hardcoded `isMock = true` bypass and dynamically control it via `process.env.USE_MOCK_ODOO === 'true'` (defaulting depending on environment).
3. Ensure the project builds successfully and live XML-RPC connections are established when `isMock === false`.

---

## 1. Current State Assessment

### 1.1 Environment File Check
- No `.env` or `.env.local` files exist in the project root directory.
- The `.gitignore` file contains `.env*` to prevent sensitive credentials from being committed to version control.
- There is no `.env.example` in the root repository.

### 1.2 `src/lib/odoo-client.ts` Analysis
- The `OdooClient` class currently uses hardcoded defaults in the constructor:
  ```typescript
  constructor() {
    this.url = process.env.ODOO_URL || 'http://localhost:8069';
    this.db = process.env.ODOO_DB || 'odoo';
    this.username = process.env.ODOO_USERNAME || 'admin';
    this.apiKey = process.env.ODOO_API_KEY || 'admin';
    this.isMock = true; // forced to true for now as per user request
  }
  ```
- The mock bypass (`isMock`) is hardcoded to `true` on line 31. This bypasses the real XML-RPC client creation and returns static mock data for restaurant tables and menu items.
- If `isMock` is set to `false`, it creates a client using `xmlrpc.createClient({ url: ... })` and issues `authenticate` or `execute_kw` XML-RPC calls.

### 1.3 `xmlrpc` Library & Next.js Builds
- The project has `xmlrpc` and `@types/xmlrpc` installed in `package.json`.
- The production build (`npm run build`) compiles successfully without Odoo credentials present because the client is only loaded at runtime (or dynamically) and has fallback values.
- If we enforce strictly defined variables at constructor time, builds might fail in CI/CD pipelines where `.env.local` is not populated. Therefore, validation should happen at runtime (call time) rather than module-initialization time.

---

## 2. Recommended Strategy

### 2.1 Environment Variable Handling
We propose creating a `.env.example` file in the root directory to define the template for configuration:
```env
# Odoo Client Configuration
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_API_KEY=admin

# Toggle Mock mode (forces mock mode if 'true')
# If not specified, defaults to true in development/test, and false in production
USE_MOCK_ODOO=true
```

In `OdooClient`, the variables should be initialized directly from `process.env` without providing hardcoded credentials as fallback values (except possibly standard defaults in development):
```typescript
this.url = process.env.ODOO_URL || '';
this.db = process.env.ODOO_DB || '';
this.username = process.env.ODOO_USERNAME || '';
this.apiKey = process.env.ODOO_API_KEY || '';
```

### 2.2 Dynamic `isMock` Resolution
To satisfy the condition of dynamic mock control, we should evaluate `isMock` in the constructor:
- If `process.env.USE_MOCK_ODOO` is explicitly defined, parse it:
  - `isMock = process.env.USE_MOCK_ODOO === 'true'`
- If `process.env.USE_MOCK_ODOO` is not defined, fall back to environment-based defaults:
  - If `process.env.NODE_ENV === 'production'`, `isMock = false` (we require a live Odoo database in production).
  - Otherwise, `isMock = true` (to ensure the dev environment functions out-of-the-box without needing a running Odoo instance).

### 2.3 Runtime Validation (Fail-Fast at Call-Time)
To avoid build-time issues while enforcing strict configuration check, we recommend adding a `validateConfig()` helper called before any live connection is initiated (i.e. in `authenticate` and `executeKw`):
```typescript
private validateConfig(): void {
  if (this.isMock) return;

  const missing: string[] = [];
  if (!this.url) missing.push('ODOO_URL');
  if (!this.db) missing.push('ODOO_DB');
  if (!this.username) missing.push('ODOO_USERNAME');
  if (!this.apiKey) missing.push('ODOO_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required Odoo environment variables: ${missing.join(', ')}`);
  }
}
```

### 2.4 Error Handling Hardening
In `authenticate()`, when Odoo authentication fails, the Odoo server returns a boolean `false` rather than throwing an XML-RPC fault. We should explicitly handle this case to provide an informative error message:
```typescript
client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
  if (error) {
    reject(error);
  } else if (value === false) {
    reject(new Error('Odoo authentication failed: Invalid username or API key'));
  } else if (typeof value !== 'number') {
    reject(new Error(`Odoo authentication failed: Returned UID is not a number (received: ${value})`));
  } else {
    this.uid = value;
    resolve(value);
  }
});
```

---

## 3. Reference Artifacts
We have prepared the following files in our agent working directory to guide the implementation:
1. `proposed_odoo_client.ts` - Complete drop-in replacement file containing the proposed structure.
2. `odoo_client.patch` - Git diff patch targeting `src/lib/odoo-client.ts`.
3. `proposed_env.example` - Template structure for configuring environment variables.
