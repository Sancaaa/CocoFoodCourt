# E2E Testing Infrastructure Analysis & Design

This report provides the analysis and design for the E2E testing infrastructure of the CocoFoodCourt Next.js application, including a lightweight mock XML-RPC Odoo server and a proposed E2E test runner workflow.

---

## 1. Testing Tools & Packages Investigation

We analyzed the codebase structure and dependencies in `package.json` to determine the best testing capabilities.

### Current Packages in `package.json`
- **Next.js**: `16.2.9`
- **React**: `19.2.4`
- **Node Type Definitions**: `@types/node` (`^20`)
- **XML-RPC**: `xmlrpc` (`^1.3.2`) and `@types/xmlrpc` (`^1.3.10`)
- **Testing Packages**: None currently present.

### Running TypeScript/Node Scripts
Since Node.js v20+ and TypeScript v5+ are used in the workspace, we can execute TypeScript scripts directly (e.g. for a mock server or custom test runner) using:
- **`tsx`**: A modern, fast runner built on esbuild that runs ES modules and CommonJS TypeScript files with zero configuration. It is highly recommended.
- **`ts-node`**: The classic TypeScript execution engine.
- Both can be run via `npx tsx` or `npx ts-node` or installed as devDependencies.

### Testing Framework Recommendation: Playwright
We recommend **Playwright** (`@playwright/test`) for Milestones 1 and 5.
- **Why Playwright?** Playwright is the industry standard for Next.js E2E testing. It supports cross-browser testing (Chromium, Firefox, WebKit), headless execution, built-in assertion engines, and test recording.
- **Why not Jest?** Jest is optimized for unit/integration tests running in jsdom (virtual browser environment). Testing actual login, registration, and session flows involving Next-Auth cookies and redirects requires a real browser environment. Playwright is much more suitable for this opaque-box testing.

### Test Runner Commands
To set up and run E2E tests:
1. **Install Playwright**: `npm install -D @playwright/test`
2. **Install browsers**: `npx playwright install --with-deps` (downloads required browser binaries).
3. **Execute E2E tests**: `npx playwright test`

---

## 2. Lightweight Mock XML-RPC Server Design

The mock server simulates Odoo's XML-RPC interface so that the Next.js app can interact with a realistic backend under test conditions (`USE_MOCK_ODOO=false` and `ODOO_URL=http://localhost:8090`).

### Supported XML-RPC Endpoints & Methods
1. **`/xmlrpc/2/common`**:
   - Method: `authenticate(db, username, password, env)`
   - Behavior:
     - Check credentials against in-memory user database.
     - Returns `uid: number` on success, or `false: boolean` on failure.
2. **`/xmlrpc/2/object`**:
   - Method: `execute_kw(db, uid, password, model, method, args, kwargs)`
   - Behavior: Performs mock CRUD and specialized method operations for models.

### How it Handles Specific Methods
- **`authenticate`**:
  - Validates `username` (email) and `password` against an in-memory array of user records.
  - Matches the built-in admin credentials (`admin`/`admin`) or any dynamically registered user.
- **`execute_kw`**:
  - **`res.groups`**:
    - Supports `search` and `search_read` with name filter `'Portal'`. Returns a mock group ID of `10`.
  - **`res.users`**:
    - **`create`**: Parses attributes `{ name, login, email, password, groups_id }`. Validates uniqueness of `login`. Generates a new `uid`, saves the record in-memory, and returns the `uid`. This makes dynamically registered users authenticatable in subsequent steps!
    - **`read` / `search_read`**: Returns mock user details (`id`, `name`, `email`, `login`). This is required by Next-Auth to build session info after authentication.
  - **`restaurant.table` & `foodcourt.reservation` (`get_available_tables_api`)**:
    - Return the standard mock tables list: Table A1, Table A2, Table B1, Table B2.
  - **`foodcourt.reservation` (`create`, `action_confirm`, `write`)**:
    - Mock creation (returns reservation ID) and state changes (returns `true`).
  - **`product.product` (`search_read`)**:
    - Returns standard mock menu items (Nasi Goreng Spesial, Mie Ayam Bakso, Es Teh Manis, Kopi Susu Gula Aren).
  - **`res.partner` (`create`)**:
    - Returns a new partner ID.

### Mock Server Code Proposal
Below is the TypeScript implementation for `scripts/mock-odoo-server.ts`. It uses the `xmlrpc` package which is already part of the project dependencies.

```typescript
import xmlrpc from 'xmlrpc';

interface MockUser {
  id: number;
  name: string;
  login: string;
  email: string;
  password?: string;
  groups_id?: number[];
}

const PORT = parseInt(process.env.MOCK_XMLRPC_PORT || '8090', 10);
const HOST = process.env.MOCK_XMLRPC_HOST || 'localhost';

// Stateful in-memory stores
const users: MockUser[] = [
  { id: 1, name: 'Administrator', login: 'admin', email: 'admin@example.com', password: 'admin', groups_id: [1] }
];

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

let nextUserId = 2;
let nextReservationId = 500;
let nextPartnerId = 1000;

const server = xmlrpc.createServer({ host: HOST, port: PORT });

console.log(`[Mock Odoo Server] Starting XML-RPC server on http://${HOST}:${PORT}`);

// Handler: authenticate
server.on('authenticate', (err: any, params: any[], callback: (err: any, res: any) => void) => {
  if (err) {
    console.error('[Mock Odoo Server] Authenticate error:', err);
    return callback(err, null);
  }
  
  const [db, username, password, userAgentEnv] = params;
  console.log(`[Mock Odoo Server] authenticate called with db: ${db}, username: ${username}`);

  const user = users.find(u => u.login === username && u.password === password);
  if (user) {
    console.log(`[Mock Odoo Server] User authenticated. UID: ${user.id}`);
    callback(null, user.id);
  } else {
    console.warn(`[Mock Odoo Server] Authentication failed for: ${username}`);
    callback(null, false); // Odoo standard: return false on failed login
  }
});

// Handler: execute_kw
server.on('execute_kw', (err: any, params: any[], callback: (err: any, res: any) => void) => {
  if (err) {
    console.error('[Mock Odoo Server] execute_kw error:', err);
    return callback(err, null);
  }

  const [db, uid, password, model, method, args, kwargs] = params;
  console.log(`[Mock Odoo Server] execute_kw: ${model}.${method} by UID: ${uid}`);

  const actingUser = users.find(u => u.id === uid);
  if (!actingUser) {
    console.warn(`[Mock Odoo Server] Unauthorized access by UID: ${uid}`);
    return callback(new Error('Access Denied: Invalid UID'), null);
  }

  try {
    switch (model) {
      case 'res.groups':
        if (method === 'search' || method === 'search_read') {
          const domain = args[0] || [];
          const hasPortalFilter = domain.some((cond: any) => cond[0] === 'name' && cond[2] === 'Portal');
          
          if (hasPortalFilter) {
            if (method === 'search') {
              return callback(null, [10]); // Mock Portal group ID = 10
            } else {
              return callback(null, [{ id: 10, name: 'Portal' }]);
            }
          }
          return callback(null, []);
        }
        break;

      case 'res.users':
        if (method === 'create') {
          const userVals = args[0] || {};
          
          // Check login uniqueness
          if (users.some(u => u.login === userVals.login)) {
            return callback(new Error(`Conflict: Login ${userVals.login} already exists`), null);
          }

          const newId = nextUserId++;
          const newUser: MockUser = {
            id: newId,
            name: userVals.name || 'Mock User',
            login: userVals.login || '',
            email: userVals.email || '',
            password: userVals.password || '',
            groups_id: []
          };
          
          // Handle Odoo many2many relationship format: [[6, 0, [group_ids]]]
          if (userVals.groups_id && Array.isArray(userVals.groups_id)) {
            const rel = userVals.groups_id[0];
            if (rel && rel[0] === 6) {
              newUser.groups_id = rel[2] || [];
            }
          }

          users.push(newUser);
          console.log(`[Mock Odoo Server] Created user:`, newUser);
          return callback(null, newId);
        }
        
        if (method === 'read' || method === 'search_read') {
          let userIds: number[] = [];
          if (method === 'read') {
            userIds = args[0] || [];
          } else {
            const domain = args[0] || [];
            const idCond = domain.find((c: any) => c[0] === 'id');
            if (idCond) {
              if (idCond[1] === '=') userIds = [idCond[2]];
              else if (idCond[1] === 'in') userIds = idCond[2];
            } else {
              userIds = users.map(u => u.id);
            }
          }

          const fields = args[1] || ['name', 'email', 'login'];
          const records = users
            .filter(u => userIds.includes(u.id))
            .map(u => {
              const rec: any = { id: u.id };
              fields.forEach((f: string) => {
                if (f in u) rec[f] = (u as any)[f];
              });
              return rec;
            });
            
          return callback(null, records);
        }
        break;

      case 'restaurant.table':
        if (method === 'search_read') {
          return callback(null, MOCK_TABLES);
        }
        break;

      case 'foodcourt.reservation':
        if (method === 'get_available_tables_api') {
          return callback(null, MOCK_TABLES);
        }
        if (method === 'create') {
          return callback(null, nextReservationId++);
        }
        if (method === 'action_confirm') {
          return callback(null, true);
        }
        if (method === 'write') {
          return callback(null, true);
        }
        break;

      case 'product.product':
        if (method === 'search_read') {
          return callback(null, MOCK_MENU);
        }
        break;

      case 'res.partner':
        if (method === 'create') {
          return callback(null, nextPartnerId++);
        }
        break;

      default:
        console.warn(`[Mock Odoo Server] Unhandled model: ${model}, method: ${method}`);
        return callback(null, []);
    }

    console.warn(`[Mock Odoo Server] Fallthrough model: ${model}, method: ${method}`);
    callback(null, []);
  } catch (error: any) {
    console.error(`[Mock Odoo Server] Exception in execute_kw:`, error);
    callback(error, null);
  }
});
```

---

## 3. Proposed Test Runner Script & Execution Design

To run E2E tests, the test environment requires both the Mock Odoo Server and the Next.js app to be started, initialized with correct environment variables, and cleaned up afterwards. 

We propose two options to implement this lifecycle.

### Option A: Playwright Native Multi-WebServer Configuration (Recommended)
This is the cleanest and most robust method. It leverages Playwright's native `webServer` option to manage the lifecycle of both the Next.js app and the mock server.

**`playwright.config.ts` configuration:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: [
    // 1. Start the Mock XML-RPC Server
    {
      command: 'npx tsx scripts/mock-odoo-server.ts',
      url: 'http://localhost:8090', // Wait for this URL to be ready
      reuseExistingServer: !process.env.CI,
      env: {
        MOCK_XMLRPC_PORT: '8090',
        MOCK_XMLRPC_HOST: 'localhost',
      }
    },
    // 2. Build and start the Next.js App in test mode
    {
      command: 'npm run start',
      url: 'http://localhost:3000', // Wait for the Next.js server
      reuseExistingServer: !process.env.CI,
      env: {
        USE_MOCK_ODOO: 'false', // Crucial: force real XML-RPC network calls to the mock server
        ODOO_URL: 'http://localhost:8090',
        ODOO_DB: 'mock_test_db',
        ODOO_USERNAME: 'admin',
        ODOO_API_KEY: 'admin',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'e2e-test-secret-key-1234567890',
      }
    }
  ],
});
```

**Running Option A:**
1. Build the Next.js application first: `npm run build`
2. Run Playwright: `npx playwright test`
*Playwright automatically starts both servers, sets the environment, runs the tests, and tears down all processes gracefully.*

---

### Option B: Custom Node.js Test Runner Script (`scripts/run-e2e.ts`)
If a test framework outside Playwright is used, or more custom hooks are needed, a custom Node orchestration script can manage the process.

**`scripts/run-e2e.ts` implementation sketch:**
```typescript
import { spawn, execSync, ChildProcess } from 'child_process';
import http from 'http';

const MOCK_PORT = 8090;
const NEXT_PORT = 3000;
let mockProcess: ChildProcess | null = null;
let nextProcess: ChildProcess | null = null;

function waitPort(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const req = http.request({ host: 'localhost', port, method: 'GET', path: '/' }, (res) => {
        clearInterval(interval);
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for port ${port}`));
        }
      });
      req.end();
    }, 500);
  });
}

function cleanup() {
  console.log('[Runner] Cleaning up child processes...');
  if (mockProcess) mockProcess.kill();
  if (nextProcess) nextProcess.kill();
  process.exit();
}

// Handle exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
  try {
    // 1. Build the Next.js app
    console.log('[Runner] Building Next.js app...');
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Start Mock Odoo Server
    console.log('[Runner] Starting Mock Odoo Server...');
    mockProcess = spawn('npx', ['tsx', 'scripts/mock-odoo-server.ts'], {
      env: { ...process.env, MOCK_XMLRPC_PORT: String(MOCK_PORT) },
      stdio: 'inherit',
      shell: true
    });
    await waitPort(MOCK_PORT);

    // 3. Start Next.js App
    console.log('[Runner] Starting Next.js App...');
    nextProcess = spawn('npm', ['run', 'start'], {
      env: {
        ...process.env,
        USE_MOCK_ODOO: 'false',
        ODOO_URL: `http://localhost:${MOCK_PORT}`,
        ODOO_DB: 'mock_test_db',
        NEXTAUTH_URL: `http://localhost:${NEXT_PORT}`,
        NEXTAUTH_SECRET: 'test-secret-key-12345678',
        PORT: String(NEXT_PORT)
      },
      stdio: 'inherit',
      shell: true
    });
    await waitPort(NEXT_PORT);

    // 4. Run tests
    console.log('[Runner] Running test suite...');
    execSync('npx playwright test', { stdio: 'inherit' });
    
    console.log('[Runner] Tests finished successfully.');
    process.exitCode = 0;
  } catch (err) {
    console.error('[Runner] Error running E2E pipeline:', err);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
```

**Running Option B:**
`npx tsx scripts/run-e2e.ts`

---

## 4. Key Recommendations

1. **Adopt Option A (Playwright webServer array)**: It is robust, works across platforms, is built into the testing framework, and automatically prevents orphaned server processes on test failure.
2. **Directory Structure for tests**: Follow standard Next.js conventions and place all E2E test files in `tests/e2e/` (e.g. `tests/e2e/login.spec.ts`, `tests/e2e/register.spec.ts`).
3. **Dynamic User Database**: The mock server must persist newly created users in-memory during a run so that the registration flow test can immediately verify login works with the newly created user credentials.
