# Original User Request

## Initial Request — 2026-06-28T10:51:16+08:00

Refactor the CocoFoodCourt Next.js web application to be production-ready. This includes implementing a robust authentication system (Login & Registration) integrated directly with the Odoo backend via XML-RPC, removing all mock data handling, and fixing environment variable configurations.

Working directory: c:\Users\luffy\Downloads\enter\CocoFoodCourt

Integrity mode: development

## Requirements

### R1. Next-Auth Integration with Odoo
Implement Next-Auth using a custom credentials provider. The provider must authenticate users against Odoo via XML-RPC. Upon successful authentication, the session must securely store the Odoo `uid`.

### R2. Odoo-Backed Registration Flow
Create a `/register` page (name, email, password). The registration process must use XML-RPC to create a real `res.users` record in Odoo. It should dynamically locate the Odoo "Portal" group and assign it to the newly created user to ensure they have the correct access rights.

### R3. Environment Configuration & Mock Removal
Update `odoo-client.ts` to strictly respect the `.env.local` variables (`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY`). Completely remove the hardcoded `isMock = true` bypass so the application can communicate with the real Odoo backend when `USE_MOCK_ODOO=false`.

## Acceptance Criteria

### Authentication
- [ ] Submitting invalid credentials to the login route returns a 401 error.
- [ ] Submitting valid credentials returns a session cookie containing the Odoo `uid`.

### Registration
- [ ] Submitting the registration form successfully creates a `res.users` record in the Odoo database.
- [ ] The newly created Odoo user is assigned to the Portal group.

### Environment & Integration
- [ ] The application successfully reads `ODOO_URL` and `ODOO_DB` from `.env.local`.
- [ ] Setting `USE_MOCK_ODOO=false` triggers real XML-RPC network requests instead of returning hardcoded mock arrays.
