# OdooClient Verification and Stress Test Report

## Challenge Summary

**Overall risk assessment**: LOW

The `OdooClient` implementation is robust under mock controls. When mocking is disabled (`USE_MOCK_ODOO=false`), it properly attempts connection and configuration validation, preventing accidental fallback to dummy data. Dynamic authentication credentials are also passed correctly to the XML-RPC method call without polluting the class instance state (`uid` remains `null`).

---

## Challenges

### [Low] Challenge 1: Silent failure with custom authenticate credentials

- **Assumption challenged**: Calling `authenticate` with dynamic credentials overwrites or updates the instance's stored state `uid`.
- **Attack scenario**: If dynamic credentials are used to authenticate, one might assume that subsequent calls using `executeKw` would use that dynamic user's permission (or `uid`). However, since `storeUid = !isCustom`, the dynamic credential is not persisted in the class instance (`this.uid` remains null). A subsequent `executeKw` call would then try to run `authenticate()` with default system/static credentials, silently switching authorization back to the configured default API Key.
- **Blast radius**: The application might execute Odoo commands with system administrator credentials instead of the dynamically logged-in user credentials, potentially leading to privilege escalation if not designed carefully.
- **Mitigation**: Ensure that dynamic credentials are used consistently, or document clearly that `OdooClient` instance methods like `executeKw` rely on the class-level static API Key and `uid` unless the instance is specifically configured otherwise.

### [Low] Challenge 2: Network hang or timeout without Odoo connection timeout configured

- **Assumption challenged**: The XML-RPC client connects instantly or throws a connection error.
- **Attack scenario**: If the remote Odoo server goes down or drops packets, the XML-RPC call may hang or timeout slowly, blocking Node.js event loop resources or causing request timeouts on the web application.
- **Blast radius**: Poor user experience, potential server resources exhaustion under load.
- **Mitigation**: Add a custom timeout wrapper to the XML-RPC client instantiation or wrap calls in a promise with a timeout rejection.

---

## Stress Test Results

- **Scenario 1**: Mock mode is disabled (`USE_MOCK_ODOO=false`) and environment variables are missing.
  - *Expected behavior*: Calling `executeKw` triggers a configuration error (`Missing required Odoo environment variables...`).
  - *Actual behavior*: Threw configuration error as expected.
  - *Result*: **PASS**

- **Scenario 2**: Mock mode is disabled (`USE_MOCK_ODOO=false`) and Odoo URL is set to a non-listening address (e.g., `http://localhost:12345`).
  - *Expected behavior*: Calling `authenticate` or `executeKw` triggers a connection error (such as `ECONNREFUSED`) instead of silently returning mock data.
  - *Actual behavior*: Rejected with `ECONNREFUSED` connection error.
  - *Result*: **PASS**

- **Scenario 3**: Dynamic credentials provided to `authenticate`.
  - *Expected behavior*: Dynamic credentials (`dynamic_user`, `dynamic_password`) are passed to the XML-RPC `authenticate` methodCall, and the instance's `uid` remains `null`.
  - *Actual behavior*: Custom username/password were correctly passed in the XML-RPC arguments array, and `client.uid` remained `null`.
  - *Result*: **PASS**

- **Scenario 4**: Default/static credentials provided to `authenticate`.
  - *Expected behavior*: Default credentials are used, and the resolved `uid` is successfully stored in `client.uid`.
  - *Actual behavior*: Stored `uid` matched the returned mock UID.
  - *Result*: **PASS**

---

## Unchallenged Areas

- **Odoo Server-side permission model**: We simulated the XML-RPC API but did not perform stress tests on a live Odoo database to verify ACL/record-level security permissions.
