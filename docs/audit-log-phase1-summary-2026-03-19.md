# Audit Log Phase 1 Summary

## Completed

- Added persistent `audit_logs` storage in SQLite.
- Added backend audit write points for:
  - successful login
  - case create
  - case update
  - draft generation
  - case review approve/reject
  - export task creation
- Added admin-only query API:
  - `GET /api/v1/audit-logs?limit=100`
- Extended storage metadata with `auditLogs` count.
- Extended smoke regression to verify audit log generation.

## Files

- `server/database.mjs`
- `server/store.mjs`
- `server/index.mjs`
- `scripts/api-smoke.mjs`

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
- temporary fresh API on port `8793`
- `npm.cmd run smoke:api`

## Notes

- Audit logs are backend-only in phase 1; no dedicated UI page yet.
- Current access policy for audit logs is `admin` only.
- Existing local API processes may need restart to pick up the new route and write points.

## Next

- add audit log viewer UI or admin page
- add failed-login and download-complete audit events if needed
- add pagination/filtering for audit log queries
