---
id: I-002
title: DELETE mutations bypass the JSON content-type requirement
type: guardrail
status: resolved
source:
  kind: check
  check: C-001
  actor: {role: checker, session: check-o001-20261010}
  at: '2026-10-10T03:01:50Z'
tasks: [T-001]
checks: [C-001, C-002]
guardrail_ids: [SEC-04]
resolution:
  disposition: verified
  check: C-002
  actor: {role: checker, session: check-o001-recheck-20261010}
  at: '2026-10-10T03:37:31Z'
  reason: "Independent both-route content-type/Origin preservation and JSON deletion API/UI probes verify guard repair; original raw HTTP matrix passed."
history:
  - at: '2026-10-10T03:01:50Z'
    actor: {role: checker, session: check-o001-20261010}
    kind: observed
    check: C-001
    note: Initial independent Objective Check; frozen A DELETE bypass cell.
  - at: '2026-10-10T03:31:00Z'
    actor: {role: executor, session: session_01WG6Lxf82CULEbTwEk9Keqb}
    kind: repair_attempted
    note: "Repair: server/index.ts DELETE /api/manual/:id and /api/hidden/:id call readJson before mutating (415 for absent/non-JSON content type); client/src/api.ts sends DELETE as JSON body {}. Proof (.savepoint/repair-evidence/O-001-2026-10-10/api-scenario.mjs, api-results.json; real server on scratch SHED_CONFIG): both DELETE routes with absent, text/plain and form-urlencoded content types return 415 and keep the entry; JSON from remote Origin 403 and kept; JSON {} with localhost Origin 200 and removed (both routes); PUT override still 200. curl (.savepoint/repair-evidence/O-001-2026-10-10/host-curl.txt): Host evil.example 421 for GET and DELETE; DELETE without content type 415. Windows-hosted server (Windows Node v24.14.0, .savepoint/repair-evidence/O-001-2026-10-10/windows-host.txt): DELETE text/plain 415, JSON {} 200. Client DELETE paths (Unhide, Remove project) pass in the UI run. Design.md, V1-DESIGN.md, README document the {} body. Gates 2026-10-10T03:30:04Z, Node v22.22.2, tsc 7.0.2: npm run typecheck 0, npm run build 0, npm test 0 (46 pass, 0 fail, 0 skipped); git diff --check 0. Executor evidence only; not verified."
  - at: '2026-10-10T03:37:31Z'
    actor: {role: checker, session: check-o001-recheck-20261010}
    kind: rechecked
    check: C-002
    note: "Independent both-route content-type/Origin preservation and JSON deletion API/UI probes verify guard repair; original raw HTTP matrix passed."
---

# I-002: DELETE mutations bypass the JSON content-type requirement

## Summary

Violates SEC-04, T-001 AC10 and the Design API contract requiring JSON mutations. Both DELETE handlers skip the check implemented by readJson. The client itself sends DELETE without a Content-Type.

## Evidence

Create a process hide rule with POST /api/hidden, then DELETE /api/hidden/{id} with `Content-Type: text/plain` and no Origin. Expected: 415 with the rule retained. Actual: 200 and the rule removed (frozen A DELETE probe). The Windows-host supplemental probe also returns 200 for a non-JSON DELETE /api/manual/missing. Source: `server/index.ts:144`–152 and 172–175 never call readJson; the content-type check is at line 52. `client/src/api.ts:20` and 25 omit the header for DELETE.

Remote Origin still returns 403. This is a contract gap with existing Origin protection, not a demonstrated remote-site exploit. Existing tests do not cover route content-type enforcement.

## Proof Needed

Frozen A DELETE cells: both manual and hidden DELETE reject absent/non-JSON content types before mutation, preserve state on rejection, accept the documented JSON deletion format, and work from the client. Repeat Host/Origin checks and ordinary create/edit/delete workflows.
