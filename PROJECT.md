# Project: CocoFoodCourt Refactoring

## Architecture
- **Web App**: Next.js application (App Router) using Tailwind CSS and shadcn components.
- **Backend / Integration**: Odoo server communicating via XML-RPC.
- **Authentication**: Next-Auth client-side and server-side session management using a custom Credentials Provider.
- **API Routes**:
  - `/api/auth/[...nextauth]` handles authentication requests.
  - `/api/register` handles new user registration.
  - Existing API routes (`/api/menu`, `/api/reservations`, `/api/tables`) interact with `OdooClient` to fetch/store data.

## Code Layout
- `src/app/` — Next.js routing pages and API routes.
- `src/app/api/auth/[...nextauth]/route.ts` — Next-Auth configuration and API handler.
- `src/app/api/register/route.ts` — API endpoint for user registration.
- `src/app/login/page.tsx` — Login form component.
- `src/app/register/page.tsx` — Registration form component.
- `src/lib/odoo-client.ts` — Odoo XML-RPC client.
- `src/components/layout/Navbar.tsx` — Updated navbar displaying current session.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E Testing Suite Setup | Setup E2E testing infrastructure and write opaque-box tests covering login, registration, and Odoo XML-RPC mock behavior. | None | PLANNED |
| 2 | Environment & Odoo Client | Implement `.env.local` parsing and update `odoo-client.ts` to support XML-RPC call with real credentials and dynamic mock control via `USE_MOCK_ODOO`. | None | PLANNED |
| 3 | Next-Auth Integration | Implement Next-Auth Credentials provider with Odoo XML-RPC verification, saving `uid` in session, and updating Login UI / Navbar to use Next-Auth session. | M2 | PLANNED |
| 4 | Odoo Registration Flow | Implement `/register` page and server action/API route creating Portal group users in Odoo via XML-RPC. | M2 | PLANNED |
| 5 | E2E Verification & Hardening | Pass E2E tests, perform adversarial testing, audit code with Forensic Auditor. | M1, M3, M4 | PLANNED |

## Interface Contracts
### Next-Auth ↔ OdooClient
- `odooClient.authenticate()`: returns Promise<number> (the user ID `uid`) or throws error on failure.
- Next-Auth credentials provider calls `odooClient.authenticate()` with username and password, then resolves to a user object containing `id` as `uid.toString()`.

### Registration API (`/api/register`) ↔ OdooClient
- Method: `POST`
- Payload: `{ name, email, password }`
- XML-RPC actions:
  1. Authenticate with admin credentials to get admin `uid`.
  2. Search for the "Portal" group `id` using model `res.groups` and name "Portal".
  3. Create a `res.users` record: name, login (email), email, password, and link it to the Portal group.
  4. Returns `{ success: true, userId }` or appropriate error response.
