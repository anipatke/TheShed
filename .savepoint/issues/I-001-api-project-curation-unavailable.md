---
id: I-001
title: API projects cannot be renamed or favourited in the UI
type: defect
status: resolved
source:
  kind: check
  check: C-001
  actor: {role: checker, session: check-o001-20261010}
  at: '2026-10-10T03:01:50Z'
tasks: [T-001]
checks: [C-001, C-002]
guardrail_ids: []
resolution:
  disposition: verified
  check: C-002
  actor: {role: checker, session: check-o001-recheck-20261010}
  at: '2026-10-10T03:37:31Z'
  reason: "Independent 18/18 UI scenarios, original model/row cells and current screenshot/source review verify API/Other curation and named neighbours."
history:
  - at: '2026-10-10T03:01:50Z'
    actor: {role: checker, session: check-o001-20261010}
    kind: observed
    check: C-001
    note: Initial independent Objective Check; frozen U curation cell.
  - at: '2026-10-10T03:31:00Z'
    actor: {role: executor, session: session_01WG6Lxf82CULEbTwEk9Keqb}
    kind: repair_attempted
    note: "Repair: client/src/Card.tsx Row now renders Star and passes ItemMenu an onEdit callback that opens EditForm inside the row (.row__edit, styles.css). Proof (headless Windows Edge over CDP against WSL-hosted server :4799, mirrored networking; .savepoint/repair-evidence/O-001-2026-10-10/ui-scenario.mjs, ui-results.json, 01-04 png), JSON-serving fixture on :4811: row in Other listeners with star (kind API); menu offers Rename / set folder; invalid folder keeps form with message; failed save with server stopped keeps form and fields; retry after restart saves override name+folder; star moves it to Favourites; after server restart name, folder and star retained; unstar returns renamed unstarred row; hidden row keeps star and menu has Rename + Unhide; unhide works; offline favourite stays visible starred; website card keeps star + Rename. 18/18 PASS. Gates 2026-10-10T03:30:04Z, Node v22.22.2, tsc 7.0.2: npm run typecheck 0, npm run build 0, npm test 0 (46 pass, 0 fail, 0 skipped); git diff --check 0. Not run: Windows-hosted UI, NAT mode. Executor evidence only; not verified."
  - at: '2026-10-10T03:37:31Z'
    actor: {role: checker, session: check-o001-recheck-20261010}
    kind: rechecked
    check: C-002
    note: "Independent 18/18 UI scenarios, original model/row cells and current screenshot/source review verify API/Other curation and named neighbours."
---

# I-001: API projects cannot be renamed or favourited in the UI

## Summary

Violates T-001 AC6 and O-001 success condition 2. A discovered project serving JSON is rendered in Other listeners; it has no star and no rename/folder action. The API implements these operations, but the normal UI cannot initiate them for that project.

## Evidence

Smallest supported scenario: run a project returning `application/json`; refresh, expand Other listeners and open its menu. Expected: favourite and rename/folder controls. Actual: only hide actions. `client/src/model.ts:119` routes non-website projects into `other`; `client/src/App.tsx:353` selects rows; `client/src/Card.tsx:293`–313 has no Star and passes ItemMenu no onEdit callback. ItemMenu only emits editing controls with that callback (`Card.tsx:111`).

Independent U model probe confirms API/Other placement; U curation probe confirms missing Star. Source trace independently confirms the absent edit callback. Existing server tests and API acceptance never exercise row controls.

## Proof Needed

Within frozen U API/Other curation cells: show a JSON-serving project can be renamed, associated with a folder, starred/unstarred and retains those changes after restart. Also verify website cards, hidden/unhidden rows, offline favourites and error-retaining edit forms. Recorded UI scenarios are sufficient; browser automation is not required.
