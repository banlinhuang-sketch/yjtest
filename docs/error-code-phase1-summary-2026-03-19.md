# Error Code Phase 1 Summary

## Completed

- Standardized backend error payloads with `code`, `message`, and nested `error`.
- Added stable backend error codes for the main phase-1 flows.
- Extended frontend `ApiError` to carry `status`, `code`, and `details`.
- Updated global empty/error state mapping to prefer backend error codes.
- Extended smoke verification to assert permission-related error codes.

## Backend Error Codes

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_UNAUTHORIZED`
- `AUTH_FORBIDDEN`
- `INVALID_JSON`
- `VALIDATION_FAILED`
- `CASE_REVIEW_NOTE_REQUIRED`
- `CASE_NOT_FOUND`
- `EXPORT_TASK_NOT_FOUND`
- `EXPORT_FILE_NOT_READY`
- `ROUTE_NOT_FOUND`
- `INTERNAL_ERROR`
- `REQUEST_FAILED`

## Frontend Handling

- `401` / `AUTH_UNAUTHORIZED` -> session expired state
- `403` / `AUTH_FORBIDDEN` -> no permission state
- `422` / validation codes -> validation error state
- `404` / not-found codes -> no data state
- `409` / `EXPORT_FILE_NOT_READY` -> export processing state
- client timeout / network failure -> network state

## Files

- `server/index.mjs`
- `server/store.mjs`
- `src/api/client.ts`
- `src/globalStates.ts`
- `scripts/api-smoke.mjs`

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
- temporary API on port `8794`
- `npm.cmd run smoke:api`

## Notes

- Existing long-running local API processes need restart to pick up the new error-code responses.
- This phase standardizes protocol behavior; it does not add a dedicated admin UI for error monitoring.
