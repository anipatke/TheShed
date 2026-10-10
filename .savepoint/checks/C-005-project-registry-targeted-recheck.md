---
id: C-005
scope: {kind: objective, id: O-002}
result: NEEDS WORK
checked_by: {role: checker, session: independent-o002-targeted-20261010-0534}
executed_session: unknown
checked_at: '2026-10-10T05:34:17Z'
reviewed:
  files: [shared/types.ts, server/config.ts, server/registry.ts, server/registry.test.ts, server/index.ts, server/scan.ts, client/src/model.ts, client/src/api.ts, client/src/ProjectForm.tsx, client/src/App.tsx, client/src/Card.tsx, .savepoint/Design.md]
  dependencies: [package.json, package-lock.json]
issues: []
supersedes: C-004
---

# O-002 targeted recheck

## Prior Issue Closure Map

| Issue | Result |
|---|---|
| I-006 | Original reproduction and adjacent host/UNC round trips pass; remains open because verified resolution requires CLEAR. |
| I-007 | Original reproduction and environment/status/fromKey matrix pass; remains open for the same reason. |
| I-008 | Still open. Gates pass and the recorded owner waiver is acknowledged. Design reconciliation remains incomplete. |

This is an independent session that did not build the reviewed implementation. The only repair performed in this conversation corrected I-008's invalid history schema on the owner's instruction; implementation was unchanged. Executor session identity is unknown. Review covers the current working tree. No prior Check, Task status, router selection, Design, or owner acceptance was changed.

## Scope and Admission Ledger

C-003's frozen scope and C-004's classifications govern this permitted targeted recheck. No new axis or blocking perimeter is admitted. The admission ledger was written before probes at `/tmp/o002-recheck-0534-ledger.md`.

| Item | Prior issue/claim | Exact frozen cell | Result |
|---|---|---|---|
| UNC migration and round trips | I-006 | Migration: Linux-host WSL UNC; normal hosts/round trips | Pass |
| Favourite absorption | I-007 | View model: retained favourite/status/normal absorption | Pass |
| Ports/editor encoding | I-008 | Validation finite range/malformed; editor environments/Unicode | Pass |
| Gates | I-008 | Gates build/full tests/typecheck | Pass |
| Design | I-008/C-004 | Original integration scope and Design reconciliation | Still incomplete |
| Waived gaps | I-008 owner_decision | C-004 remaining browser/race/failure-timing/exact-platform cells | Owner waiver acknowledged; not technical proof |

## Frozen Matrix Reconciliation

| C-003 row | Classification in this run |
|---|---|
| Migration | Passed: regression suite and six independent host × UNC round trips. |
| Validation | Passed: project-validation suite, all 65,535 valid ports and nine invalid port classes. Original text/mutable-input classes not freshly replayed: Unverified. |
| Matching | Named tier/ranking/exclusivity/environment/override tests pass; independent three-environment integration passes. Original full order matrix not freshly replayed: Unverified. |
| Conflicts | Six named findPortConflicts tests pass; approved matching semantics unchanged. |
| View model | Thirty independent environment/status/registration-path cells pass. Remaining browser branches covered by recorded waiver, not asserted proven. |
| Editor URLs | Three environments and Unicode encoding pass; absent folder/distro pass; T-005's dated four owner confirmations retained. |
| Persistence | Named real-file migration, broken-file preservation, capacity/write-failure tests pass. Full timing matrix is waived; not asserted replayed. |
| Client API | Source confirms X-Shed and replacement routes; previous live evidence remains partial (C-004 harness cleanup failure). Complete original mock replay remains Unverified. |
| UI/platform | Existing recorded scenarios and owner clicks retained. Remaining browser/exact-platform cells waived. |
| Gates | Fresh build/typecheck/full tests/diff check pass. |

Every frozen row is classified. This targeted run does not claim a complete fresh Full matrix replay. Unverified cells and Design prevent technical CLEAR; no new Issue is allocated for already captured I-008.

## Workflow, External Boundaries and Adversarial Review

The frozen workflow remains load/read/parse/migrate → validate/clone/capacity → mkdir/temp write/rename/memory commit → project refresh/state/favourite tracking → response → browser rendering/editor handler. Gates exercise real file replacement, failed write preserving memory/disk, broken-file move-aside, source isolation and bounded real-socket probes. Post-commit refresh failures, overlap and browser timing remain waived rather than proven. No new runtime target or external boundary was introduced. Recorded Windows/WSL evidence is retained with its explicit stand-in/Vite variation; exact-platform gaps are waived.

Adversarial pass considered validation bypass, environment/representation changes, duplicate absorption, status transitions, persistence failure/retry and port/Unicode boundaries. Fresh independent probes cover the original defect reproductions and their named adjacent cases. Remaining unrun cases are classified above; no credible new blocker was found or scope expansion attempted.

## Commands and Evidence

Run 2026-10-10 approximately 05:33–05:35 UTC, Node v22.22.2:

- `npm run build`: PASS, including configured TypeScript server/client checks and Vite production build.
- `npm test`: initial sandbox run failed in discovery suite; rerun with approved local socket access PASS: 84 tests, 21 suites, zero failed/skipped.
- `node /tmp/o002-probes.mts`: PASS, 51 independent matrix groups including exhaustive valid ports, six UNC migration round trips, thirty favourite/status/fromKey cells, Unicode links and absent-folder/distro cases. Explicit expected assertions were inspected before execution.
- `git diff --check`: PASS.
- `savepoint health check O-002`: Code Health not configured; no snapshot collected. Lint is not configured.

Exact regressions: “keeps a V1 project with a WSL UNC folder when the host is plain Linux (I-006)” and “shows one live favourite card, not a live card plus an Offline one”. Adjacent suites: config version 2, project validation, registering a discovered card, normaliseFolder, matchProjects, findPortConflicts and resolveProjects.

## Acceptance Coverage and Design

| Task | Criteria in listed order |
|---|---|
| T-002 | 1–2 Proven; 3 pure validation supported but original full replay Unverified; 4–6 normal/named cases supported, waived timing and unreplayed API cells classified above; 7 recorded UI evidence plus waiver; 8 named cases pass with partial recorded API evidence; 9 Proven. |
| T-003 | 1–3 named rules Proven, full order replay Unverified; 4 source integration supported, race cells waived; 5–6 Proven. |
| T-004 | 1 defect remediation Proven; 2–5 recorded UI/model evidence plus waived browser gaps; 6 construction Proven and owner clicks recorded; 7 recorded scenario plus waived branches, gates Proven. |
| T-005 | 1 recorded context Proven; 2 stand-in/listing gaps waived; 3 recorded restart evidence retained; 4 exact scenario gaps waived; 5 recorded conflicts and pure logic supported; 6 dated owner confirmations Proven; 7 reporting Proven. |

O-002 conditions 1 and 5 retain recorded platform/owner evidence; 2–4 have passing regression/pure evidence; 6 gates pass. Integration reconciliation is still incomplete: `.savepoint/Design.md:52` promises `/api/manual`, while `server/index.ts:123`, `:134`, `:154` implement `/api/projects`; Design line 59 retains `manual:` identities while config rewrites them to `project:` (`server/config.ts:165`). Design line 44 retains the old scan description. Expected: architecture describes the delivered registry/matching/conflicts/editor flow. Actual: unchanged V1 architecture. This is the existing I-008 finding, not a new requirement. The recorded waiver explicitly leaves Design reconciliation outstanding.

## Guardrails, File Reality and Materiality

Scoped source retains fixed localhost binding, request guards, loopback-only project probing, browser editor links, plain-text rendering and no process controls or new server runtime dependency. DATA-01 defect remediation passes; TEST-02 regressions pass. TEST-01 coverage limitations remain explicit. Reviewed source/test files exist; T-004 screenshots are explicitly discarded scratch evidence. Existing C-004 live harness cleanup failure remains partial evidence, not a clean command result.

| Issue | Likelihood | Impact | Materiality | Recommendation |
|---|---|---|---|---|
| I-008 | High (Design drift exists now) | Medium (integration architecture and verification incomplete) | Medium | Reconcile Design; address or explicitly dispose of remaining unreplayed evidence. |

No new product defect established. I-006/I-007 need no further code repair on current evidence.

## Code Style Review

- [x] STYLE-01 **One job per file and function**
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth**
- [x] STYLE-05 **Comments explain why**

## Owner Validation and Handoff

T-004 and T-005 still have empty accepted_check. That is a closure requirement, not a product defect; no acceptance is inferred from the Task-check waivers. Four editor confirmations need not be repeated. Result NEEDS WORK; no technical clearance or Objective closure is granted.

The convergence limit is reached (initial C-003, full recheck C-004, targeted C-005). Stop autonomous review cycles. Owner disposition is required for remaining reconciliation/evidence: fix now, approve a permitted explicit exception, or select follow-up work. Checker does not repair Design or record an owner decision on the owner's behalf.
