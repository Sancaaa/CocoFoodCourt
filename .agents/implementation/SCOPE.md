# Scope: Implementation

## Architecture
- Web App: Next.js application (App Router) using Tailwind CSS and shadcn components.
- Backend / Integration: Odoo server communicating via XML-RPC.
- Authentication: Next-Auth client-side and server-side session management using a custom Credentials Provider.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 2 | Environment & Odoo Client | Implement `.env.local` parsing and update `odoo-client.ts` to support XML-RPC call with real credentials and dynamic mock control via `USE_MOCK_ODOO`. | None | DONE |
| 3 | Next-Auth Integration | Implement Next-Auth Credentials provider with Odoo XML-RPC verification, saving `uid` in session, and updating Login UI / Navbar to use Next-Auth session. | M2 | PLANNED |
| 4 | Odoo Registration Flow | Implement `/register` page and server action/API route creating Portal group users in Odoo via XML-RPC. | M2 | PLANNED |
| 5 | E2E Verification & Hardening | Pass E2E tests, perform adversarial testing, audit code with Forensic Auditor. | M2, M3, M4 | PLANNED |

## Interface Contracts
- Refer to PROJECT.md for interface contracts between Next-Auth ↔ OdooClient and Registration API ↔ OdooClient.
