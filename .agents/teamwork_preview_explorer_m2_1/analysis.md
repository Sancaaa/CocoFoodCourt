# Milestone 2 Analysis: Environment Configuration & Odoo Client

## Executive Summary
This analysis outlines the strategy to refactor the Odoo client integration (`src/lib/odoo-client.ts`) and environment configuration to meet production-ready specifications for Milestone 2. 

Our investigation revealed critical issues in the current client design:
1. **Hardcoded Mock Bypass**: The client forces mock mode (`isMock = true`) regardless of environment variables.
2. **Falsy Auth Return Vulnerability**: If XML-RPC authentication fails, Odoo returns `false` (boolean) instead of raising an XML-RPC error. The current client resolves this value directly, which could lead to security authentication bypasses in Next-Auth.
3. **Singleton State Conflict**: `odooClient` is exported as a singleton. Overwriting `this.uid` during user-level authentication would contaminate the instance for subsequent concurrent server operations (which expect admin privileges).
4. **ESLint Errors**: The type annotations on `executeKw` trigger TypeScript-ESLint errors due to forbidden `any` usages.

We propose a robust implementation plan to resolve these issues safely.

---

## Current Implementation Review

### 1. Constructor Configuration
*Location*: `src/lib/odoo-client.ts` (lines 26–32)
```typescript
  constructor() {
    this.url = process.env.ODOO_URL || 'http://localhost:8069';
    this.db = process.env.ODOO_DB || 'odoo';
    this.username = process.env.ODOO_USERNAME || 'admin';
    this.apiKey = process.env.ODOO_API_KEY || 'admin';
    this.isMock = true; // forced to true for now as per user request
  }
```
*Observation*:
- Env variables fall back to hardcoded localhost/admin values, which prevents strict validation of `.env.local` values when actual network requests are desired.
- `isMock` is hardcoded to `true`.

### 2. Authentication Flow
*Location*: `src/lib/odoo-client.ts` (lines 34–47)
```typescript
  async authenticate(): Promise<number> {
    if (this.isMock) return 1;

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/common` });
      client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
        if (error) reject(error);
        else {
          this.uid = value;
          resolve(value);
        }
      });
    });
  }
```
*Observation*:
- The method accepts no arguments. However, the Next-Auth credentials provider requires verifying user-supplied logins and passwords (or personal API keys).
- If XML-RPC authentication fails due to wrong credentials, Odoo returns `false` rather than generating an error object. The current promise resolves this `false` (boolean) directly. This violates the `Promise<number>` contract and can cause false-positive authentication.

### 3. XML-RPC Operations (`executeKw`)
*Location*: `src/lib/odoo-client.ts` (lines 49–90)
```typescript
  async executeKw(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    ...
    if (!this.uid) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/object` });
      client.methodCall('execute_kw', [this.db, this.uid, this.apiKey, model, method, args, kwargs], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }
```
*Observation*:
- If `!this.uid`, `authenticate()` is called internally.
- `this.uid` and `this.apiKey` are cached and shared across the instance. If `authenticate()` is repurposed to verify user-supplied credentials, it would overwrite the cached `this.uid` singleton state, leading to subsequent queries running under incorrect permissions or failing.

---

## Detailed Findings & Critical Issues

### Issue A: Security Vulnerability (Falsy Auth Return)
In Odoo XML-RPC, `authenticate` does not throw an error on incorrect password; it simply returns the boolean `false`. 
The current code:
```typescript
client.methodCall('authenticate', [this.db, this.username, this.apiKey, {}], (error, value) => {
  if (error) reject(error);
  else {
    this.uid = value;
    resolve(value); // Resolves to false!
  }
});
```
If Next-Auth checks `const uid = await odooClient.authenticate()`, it will receive `false`. If the callback checks `if (uid)`, it might work, but if it checks `if (uid !== null)` or similar, it might incorrectly evaluate `false` as a valid user object or ID, introducing a security flaw. We must explicitly check if `value === false` and throw/reject the Promise.

### Issue B: Singleton State Conflict
`odooClient` is imported globally as a singleton:
```typescript
export const odooClient = new OdooClient();
```
When a user logs in, Next-Auth calls:
```typescript
await odooClient.authenticate(userEmail, userPassword);
```
If we reuse the same `authenticate` method and cache the returned `uid` into `this.uid`, subsequent calls (e.g. `/api/tables` or `/api/menu` or payment webhooks) will execute under that user's `uid`, rather than the administrative `uid` defined in environment variables.
*Solution*: Modify `authenticate(username?, apiKey?)` to:
1. Accept optional credential arguments.
2. Only cache `this.uid = value` if **no custom credentials** were passed (i.e., we authenticated with default admin credentials).

### Issue C: ESLint Type Violations
The project enforces strict ESLint rules that block the `any` type (`@typescript-eslint/no-explicit-any`). Since `executeKw` acts as a generic XML-RPC proxy, using `any` is necessary. We must suppress this ESLint rule for the specific signature line in `src/lib/odoo-client.ts` to prevent lint checks from failing during the build phase.

---

## Proposed Refactoring Strategy

### 1. Environment Variable Setup
A `.env.example` file should be added in the workspace root to document the required environment variables:
```bash
# .env.example
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_API_KEY=admin
USE_MOCK_ODOO=true
```

### 2. Proposed Code Design for `src/lib/odoo-client.ts`
We recommend replacing the entire contents of `src/lib/odoo-client.ts` with the following clean implementation:

```typescript
import xmlrpc from 'xmlrpc';

// Mock data to use when not actually connecting to Odoo
const MOCK_TABLES = [
  { id: 1, name: 'Table A1', floor_id: 1, floor_name: 'Main Hall', seats: 2, state: 'available' },
  { id: 2, name: 'Table A2', floor_id: 1, floor_name: 'Main Hall', seats: 4, state: 'available' },
  { id: 3, name: 'Table B1', floor_id: 2, floor_name: 'Outdoor', seats: 2, state: 'available' },
  { id: 4, name: 'Table B2', floor_id: 2, floor_name: 'Outdoor', seats: 6, state: 'available' },
];

const MOCK_MENU = [
  { id: 101, name: 'Nasi Goreng Spesial', list_price: 35000, category: 'Food' },
  { id: 102, name: 'Mie Ayam Bakso', list_price: 25000, category: 'Food' },
  { id: 103, name: 'Es Teh Manis', list_price: 8000, category: 'Beverage' },
  { id: 104, name: 'Kopi Susu Gula Aren', list_price: 18000, category: 'Beverage' },
];

export class OdooClient {
  private url: string;
  private db: string;
  private username: string;
  private apiKey: string;
  private uid: number | null = null;
  private isMock: boolean;

  constructor() {
    // Strictly respect .env.local variables
    this.url = process.env.ODOO_URL || '';
    this.db = process.env.ODOO_DB || '';
    this.username = process.env.ODOO_USERNAME || '';
    this.apiKey = process.env.ODOO_API_KEY || '';

    // Dynamically controlled by USE_MOCK_ODOO. Default to true in non-production.
    if (process.env.USE_MOCK_ODOO !== undefined) {
      this.isMock = process.env.USE_MOCK_ODOO === 'true';
    } else {
      this.isMock = process.env.NODE_ENV !== 'production';
    }
  }

  private validateConfig(): void {
    if (!this.url || !this.db || !this.username || !this.apiKey) {
      const missing = [];
      if (!this.url) missing.push('ODOO_URL');
      if (!this.db) missing.push('ODOO_DB');
      if (!this.username) missing.push('ODOO_USERNAME');
      if (!this.apiKey) missing.push('ODOO_API_KEY');
      throw new Error(`Missing required Odoo configuration environment variables: ${missing.join(', ')}`);
    }
  }

  async authenticate(username?: string, apiKey?: string): Promise<number> {
    if (this.isMock) return 1;

    this.validateConfig();

    const authUsername = username || this.username;
    const authApiKey = apiKey || this.apiKey;

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/common` });
      client.methodCall('authenticate', [this.db, authUsername, authApiKey, {}], (error, value) => {
        if (error) {
          reject(error);
        } else if (value === false) {
          // Odoo returns false if credentials fail, which should throw/reject
          reject(new Error('Authentication failed: Invalid credentials'));
        } else if (typeof value !== 'number') {
          reject(new Error(`Authentication failed: Unexpected response value ${value}`));
        } else {
          // Only cache uid if authenticating with default admin credentials
          if (!username && !apiKey) {
            this.uid = value;
          }
          resolve(value);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeKw(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    if (this.isMock) {
      console.log(`[Mock Odoo] Executing ${model}.${method} with args:`, args);
      
      if (model === 'restaurant.table' && method === 'search_read') {
        return MOCK_TABLES;
      }
      if (model === 'foodcourt.reservation' && method === 'get_available_tables_api') {
        return MOCK_TABLES;
      }
      if (model === 'product.product' && method === 'search_read') {
        return MOCK_MENU;
      }
      if (model === 'foodcourt.reservation' && method === 'create') {
        return Math.floor(Math.random() * 1000) + 1; // Return mock reservation ID
      }
      if (model === 'res.partner' && method === 'create') {
        return Math.floor(Math.random() * 1000) + 1; // Return mock partner ID
      }
      if (model === 'foodcourt.reservation' && method === 'action_confirm') {
        console.log(`[Mock Odoo] Confirmed reservation IDs:`, args[0]);
        return true;
      }
      if (model === 'foodcourt.reservation' && method === 'write') {
        console.log(`[Mock Odoo] Updated reservation IDs:`, args[0], `with vals:`, args[1]);
        return true;
      }
      return [];
    }

    this.validateConfig();

    if (!this.uid) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({ url: `${this.url}/xmlrpc/2/object` });
      client.methodCall('execute_kw', [this.db, this.uid, this.apiKey, model, method, args, kwargs], (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }
}

export const odooClient = new OdooClient();
```

---

## Verification Plan

### 1. Environment Parsing Verification
1. Create a `.env.local` containing custom credentials.
2. Launch Next.js dev server (`npm run dev`) or test runner.
3. Validate that `odooClient` extracts variables properly without using fallback values.

### 2. Mock Bypass & XML-RPC Trigger Verification
1. Run with `USE_MOCK_ODOO=true` to ensure the application starts and uses mock data correctly.
2. Run with `USE_MOCK_ODOO=false`. If a local Odoo instance or the E2E mock XML-RPC server is running at the configured `ODOO_URL`, confirm the client establishes connection and makes real network calls. If no Odoo instance is present, it must fail with an XML-RPC connection or resolution error instead of silently falling back to mock data.

### 3. Build & Lint Verification
1. Run `npm run lint` and `npm run build` to confirm no ESLint errors (specifically `no-explicit-any`) or TypeScript type issues arise from `odooClient`.
