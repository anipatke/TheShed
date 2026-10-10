---
id: I-003
title: Preference capacity silently drops valid entries
type: defect
status: resolved
source:
  kind: check
  check: C-001
  actor: {role: checker, session: check-o001-20261010}
  at: '2026-10-10T03:01:50Z'
tasks: [T-001]
checks: [C-001, C-002]
guardrail_ids: [DATA-01]
resolution:
  disposition: verified
  check: C-002
  actor: {role: checker, session: check-o001-recheck-20261010}
  at: '2026-10-10T03:37:31Z'
  reason: "Fresh four-list capacity regressions and 16/16 API scenarios verify 499/500/501 preservation, explicit rejection and restart."
history:
  - at: '2026-10-10T03:01:50Z'
    actor: {role: checker, session: check-o001-20261010}
    kind: observed
    check: C-001
    note: Initial independent Objective Check; frozen V list limits and A persistence cells.
  - at: '2026-10-10T03:31:00Z'
    actor: {role: executor, session: session_01WG6Lxf82CULEbTwEk9Keqb}
    kind: repair_attempted
    note: "Repair: server/config.ts sanitizeConfig no longer slices lists (load keeps every valid entry; malformed still dropped); ConfigStore.update throws ConfigFullError before writing when a list would grow past MAX_ITEMS=500; server/index.ts maps it to 409 with message. node:test 'preference capacity' (8 cases over manual/favourites/hidden/overrides): 499->500 add saved; 501st add throws, memory and file byte-identical, restart keeps 500; 501 saved valid + malformed loads 501 and shrinking still saves; plus write failure (read-only dir) leaves file and memory unchanged. API (.savepoint/repair-evidence/O-001-2026-10-10/api-results.json): POST at 500 -> 409 'Can't save more than 500 manual entries; remove some first', file still 500; load 501+1 malformed -> 501; DELETE at 501 -> 500; POST at 500 -> 409; restart keeps 500; POST at 499 -> 200 and present after restart. Regression check: reverting the fix makes all 8 capacity cases fail. Gates 2026-10-10T03:30:04Z, Node v22.22.2, tsc 7.0.2: npm run typecheck 0, npm run build 0, npm test 0 (46 pass, 0 fail, 0 skipped); git diff --check 0. Executor evidence only; not verified."
  - at: '2026-10-10T03:37:31Z'
    actor: {role: checker, session: check-o001-recheck-20261010}
    kind: rechecked
    check: C-002
    note: "Fresh four-list capacity regressions and 16/16 API scenarios verify 499/500/501 preservation, explicit rejection and restart."
---

# I-003: Preference capacity silently drops valid entries

## Summary

Violates DATA-01 and T-001 AC6/AC7. A valid new project can be reported as successfully saved while being discarded. Valid entries past 500 in an existing JSON file are also discarded on load without a warning.

## Evidence

Seed an isolated config with 500 valid manual entries, start the server and POST /api/manual `{name:"new-501",url:"http://example.com"}`. Expected: retained save or explicit capacity error without loss. Actual: HTTP 200, count 500, newEntryPresent false. Exact supplemental output: `.savepoint/check-evidence/C-001/final-results.json`, V3 supported API at capacity.

`server/config.ts:92` slices every list before validation; `ConfigStore.update` at line 139 uses the same lossy sanitization on writes. `server/index.ts:119` appends the project then returns success without checking retention. Direct 499/500/501 store probes reproduce the boundary. The existing `config validation › drops invalid entries instead of failing` test does not cover capacity or preservation of valid entries.

## Proof Needed

Frozen V 499/500/501 cells for manual/favourite/hidden/override lists, with API persistence/restart: keep valid existing preferences and ensure an addition is either durably retained or explicitly rejected. Malformed entries still drop safely. No format change may silently discard existing valid entries.
