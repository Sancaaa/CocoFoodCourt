# Scope: E2E Testing Suite for CocoFoodCourt

## Architecture
- **Mock XML-RPC Server**: A lightweight Node.js HTTP/XML-RPC server simulating Odoo `/xmlrpc/2/common` (authenticate) and `/xmlrpc/2/object` (execute_kw) endpoints.
- **E2E Test Runner**: A script to build/start or dev run Next.js with test environment variables, start the mock server, execute E2E test suites, and clean up.
- **Test Clients**: We will use Playwright (if installed/available) or a custom Node/TypeScript fetch-based client simulating browser flows/API requests to perform opaque-box validation of Next.js endpoints and page behaviors.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Test Infrastructure Setup | Create mock XML-RPC server, test runner script, and verify they start/stop correctly. | None | PLANNED |
| 2 | Tier 1 & Tier 2 E2E Tests | Implement Tier 1 (Feature Coverage: Login, Registration, Odoo Integration) and Tier 2 (Boundary & Corner cases). | M1 | PLANNED |
| 3 | Tier 3 & Tier 4 E2E Tests | Implement Tier 3 (Cross-Feature Combinations) and Tier 4 (Real-World Application scenarios). | M2 | PLANNED |
| 4 | E2E Suite Verification & Document | Run full suite, output reports, write TEST_INFRA.md and TEST_READY.md. | M3 | PLANNED |

## Interface Contracts
### E2E Tests ↔ Next.js Web App
- `POST /api/register` with `{ name, email, password }` -> returns `{ success: true, userId }` or error.
- `POST /api/auth/callback/credentials` (Next-Auth credentials login API) or standard browser login at `/login`.
- Odoo client parses `.env.local` or environment overrides to communicate with mock XML-RPC server at `http://localhost:8069`.

### E2E Tests ↔ Mock XML-RPC Server
- Server receives XML-RPC POST requests at `/xmlrpc/2/common` for `authenticate(db, username, password, {})`.
- Server receives XML-RPC POST requests at `/xmlrpc/2/object` for `execute_kw(db, uid, password, model, method, args, kwargs)`.
