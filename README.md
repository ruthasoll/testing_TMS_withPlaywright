# Garri TMS Playwright tests

Small Chromium suite for the React frontend in `C:\Users\minal\ws\garri\garri-new-tms\fe`.

## Setup

Use Node.js 24. From this repository:

```powershell
npm.cmd install
npx.cmd playwright install chromium
Copy-Item .env.example .env
```

Edit `.env` with the frontend and API URLs, test account, and organization IDs. Credentials and reports are ignored by Git. The supplied account is configured only in the local `.env`; the example contains no secrets.

For local testing, start the frontend separately with `npm.cmd run dev` in its repository. Start its isolated test backend as well. The frontend defaults to port 3000. Ensure **both** `VITE_API` and `VITE_WEB_URL` use your local/test environment. This suite does not start or modify the application.

For deployed staging, set `PLAYWRIGHT_BASE_URL`, `TMS_API_URL`, and `TEST_ENV=staging`. Known production domains and their subdomains are blocked in local/staging mode. Add other production API domains to `TMS_PRODUCTION_HOSTS`.

The user-authorized production setup uses `PLAYWRIGHT_BASE_URL=https://garritms.com`, `TMS_API_URL=https://api.garritms.com/tmsv2`, and `TEST_ENV=production-smoke`. It starts in organization **7** and tests switching to **18**. Organization names are read from the authenticated API response rather than guessed.

All modes block business-changing API requests, including creates, edits, deletions, payments, approvals, PDF generation, and printing. Only email sign-in, sign-out, assigned-organization lookup, and organization switching may use POST. Third-party writes such as analytics are suppressed. Production runs use one worker and no retries. Session actions still create/revoke sessions and may appear in audit logs.

## Run

```powershell
npm.cmd run test:public  # No account needed: redirects, required fields, mocked login rejection
npm.cmd run test:auth    # Requires the test data below
npm.cmd test            # Run the full suite; unavailable role/data checks report skips
npm.cmd run test:ui     # Interactive runner
npm.cmd run report      # Last HTML report
npm.cmd run typecheck
```

## Required test data

| Variables | Purpose |
| --- | --- |
| `TMS_EMAIL`, `TMS_PASSWORD` | Operations account that can read dispatches |
| `TMS_ORG_ID` | Initial organization assigned to the account |
| `TMS_SECOND_ORG_ID` | A different organization assigned to the same account |
| `TMS_RESTRICTED_EMAIL`, `TMS_RESTRICTED_PASSWORD` | Optional account with only Maintenance Viewer (`MV`) role |
| `TMS_RESTRICTED_ORG_ID` | Organization assigned to the restricted account |
| `TMS_DISPATCH_ID`, `TMS_DISPATCH_FO_NUMBER` | Optional existing dispatch ID and unique visible FO number |

Without seeded dispatch settings, the test discovers a shipment with a unique FO number on the first visible list page. If none exists, it reports a skip after checking the list response. A configured dispatch must be visible on that page under the account's default filters, including the created-by filter. The suite reads records and does not create or delete them.

## Coverage and structure

- `tests/public/authentication.spec.ts`: signed-out redirect, required fields, simulated credential rejection.
- `tests/authenticated/session.spec.ts`: real login and reload, logout, simulated API session expiry.
- `tests/authenticated/access.spec.ts`: organization switching and outgoing organization header; Maintenance Viewer redirect to `/vehicles`.
- `tests/authenticated/dispatch.spec.ts`: real list response, search for an existing FO number, open detail, verify the matching record.
- `tests/helpers/login.ts`: shared UI login helper, including organization selection.
- `tests/fixtures.ts`: environment and business-request protection.

Every test gets a fresh browser context and authenticated tests log in independently. One worker avoids account/session contention. Missing required credentials/organization IDs fail with a configuration message. The Maintenance Viewer check is skipped until that separate account is supplied. Login rejection and session expiry use mocked responses; the other authenticated checks use the real configured backend.

The dispatch test checks the initial organization header; the switching test checks the second organization header. Switching is skipped if the supplied account is not assigned to the requested second organization. These tests do **not** yet prove cross-organization data isolation or backend permission enforcement. Those need separately seeded records and confirmed backend access policies. Filters/pagination beyond shipment search are future additions.

The app's sign-out icon and Ant Design organization dropdown have limited accessible labels, so selectors use their icon or dropdown markup. No frontend source files are changed by this repository.

Traces and screenshots on failure may include account information and application data. Keep reports private.

## Initial production verification (2026-10-06)

- Passed: signed-out redirect, required fields, login/reload, logout, simulated session expiry, and existing shipment search/detail.
- Deferred: organization 18 switching (not assigned to the supplied account), and Maintenance Viewer access (separate account not supplied).
- Failing: the simulated rejected-login response reaches the browser, but the login form stays loading instead of showing `Wrong Password`. This reproduces with both request routing and an in-browser simulated response. The test remains enabled to expose the failure; the app/client error path needs investigation before claiming real invalid-credential handling works.
