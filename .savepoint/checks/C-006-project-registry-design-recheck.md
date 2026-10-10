---
id: C-006
scope: {kind: objective, id: O-002}
result: NEEDS WORK
checked_by: {role: checker, session: independent-o002-design-recheck-20261010-0542}
executed_session: unknown
checked_at: '2026-10-10T05:42:54Z'
reviewed:
  files: [.savepoint/Design.md, shared/types.ts, server/config.ts, server/index.ts, server/registry.ts, server/scan.ts, client/src/model.ts, client/src/api.ts, client/src/ProjectForm.tsx, client/src/Card.tsx]
  dependencies: [package.json, package-lock.json]
issues: []
supersedes: C-005
---

# O-002 owner-requested reconciliation re-check

## Prior Issue Closure Map

| Issue | Disposition |
|---|---|
| I-006 | Repair proven again; remains formally open because verified resolution requires CLEAR. |
| I-007 | Repair proven again; same formal restriction. |
| I-008 | Design repair independently verified. No actionable unwaived repair remains. Waived evidence remains unverified; completion is by exception, not technical CLEAR. |

Fresh session: this conversation authored neither implementation nor Design reconciliation. Executor identity unknown. The owner explicitly requested this additional re-check after the convergence limit; this is a bounded reconciliation review, not another autonomous remediation cycle. Previous Checks, Task statuses, owner acceptance and router are preserved.

## Frozen Scope and Admission Ledger

C-003's immutable scope lock and matrix govern this review, with I-008's recorded reconciliation of vague later replay demands. No new axis or interpretation is admitted. `/tmp/o002-c006-ledger.md` records exact original cells and dispositions. Its initial write failed because `python` was unavailable; it was successfully written with `python3`, and all 51 probe groups were replayed after that write. Earlier execution is not counted as the admitted replay.

## Matrix Reconciliation

| Original row | Evidence and classification |
|---|---|
| Migration | Proven for original reproductions: six host × UNC round trips; named I-006 regression passes. |
| Validation | Original pure-validation proof retained; fresh exhaustive 1–65535 and nine invalid port classes pass; live-boundary recorded evidence retained. Vague additional replay requests are process observations. |
| Matching | Original tier/ranking/exclusivity/environment/order proof retained; current named matching suites and three-environment integration pass. |
| Conflicts | Current six named conflict cases pass; source agrees with approved semantics and documented limitation. |
| View model | Original status/absorption cells replayed across 30 environment/status/registration-path groups; I-007 regression passes. |
| Editor URLs | Three environments, Unicode, absent folder/distro pass; four dated real owner clicks retained. |
| Persistence | Original virtual proof retained; current real-file/capacity/write-failure/broken-file tests pass. Remaining timing cells retain owner exception. |
| Client API | Header/routes verified in source; original mock proof and partial C-004 live evidence retained. No invented complete mock replay requirement. |
| UI/platform | Recorded normal UI, restart and platform scenarios retained; original browser/race/exact-platform gaps retain owner exception, not proof. |
| Gates | Fresh typecheck/build/full tests/diff check pass. |
| Design reconciliation | Independently verified against current source and recorded limitations. |

## Design and Acceptance Coverage

Design now correctly describes Config V2 projects, optional folders/environments/ports, host-sensitive POSIX inference and host-independent WSL UNC inference, deferred migration write, favourite identity rewriting, atomic persistence, project routes and X-Shed, fromKey preference transfer, global matching tiers, overrides, one-to-one absorption, conflict warnings, scanner refresh and distro state, shared forms and browser-only editor links. Source anchors: `server/config.ts` inferFolderEnv/validateProject/sanitizeConfig/addProject/ConfigStore; `server/index.ts` project routes and request guards; `server/registry.ts` TIERS/matchProjects/findPortConflicts; `server/scan.ts` probeProjects/Scanner; `client/src/model.ts` buildSections/editorLinks; `client/src/api.ts`, ProjectForm and Card. The earlier V1-only architecture mismatch is repaired.

Design explicitly retains the preferred-port matching limitation, stand-in migration/Windows HTTP variation, recorded exceptions, unknown platforms and absence of health/lint. It does not claim launch controls or new platform proof. Historical evidence statements are historical, not a current clearance claim.

| Scope | Acceptance classification |
|---|---|
| T-002 criteria 1–3 | Proven migration/normalisation/validation through original evidence and current regression/probes. |
| T-002 criteria 4–8 | Pure/server and normal recorded API/UI evidence retained; original timing/browser gaps Unverified with recorded owner waiver. |
| T-002 criterion 9 | Proven fresh gates. |
| T-003 criteria 1–3, 5–6 | Proven original pure rules and current named suites/gates. |
| T-003 criterion 4 | Source integration verified; original race evidence Unverified with waiver. |
| T-004 criteria 1, 5–6 | Proven model/conflict/link construction; recorded owner launches retained. |
| T-004 criteria 2–4, 7 | Recorded normal UI and fresh gates; remaining browser branches Unverified with waiver. |
| T-005 criteria 1, 3, 5–7 | Recorded context/restarts/conflicts/editor confirmation/reporting retained. |
| T-005 criteria 2, 4 | Literal exact-platform variations Unverified with waiver. |
| O-002 conditions 1–5 | Recorded and pure evidence supports delivered behavior; waived exact-platform/browser gaps remain explicit. |
| O-002 condition 6 | Fresh configured gates pass; TEST-01 evidence exceptions remain recorded. |

## Workflow, External Boundaries and Adversarial Pass

Frozen order remains load/parse/migrate → validate/clone/capacity → mkdir/temp write/rename/memory commit → scanner project refresh/state/favourite tracking → response → browser rendering/editor handler. Current tests cover real atomic replacement, broken-file preservation, write failure preserving memory/disk, capacity refusal and source isolation; real sockets cover success/refusal, malformed/non-HTTP response, bounded bodies/truncation and TLS retry. Frozen post-commit/race/failure-timing cells are retained exceptions. No new external target, persistence protocol or dependency was introduced by documentation repair. Browser handler evidence is recorded owner validation, not a new handler invocation.

Adversarial review checked validation bypass, environment/serialization changes, favourite absorption, status transitions, port bounds, Unicode link encoding, persistence failure/retry and matching ownership against the same frozen perimeter. No new in-scope defect or credible guardrail blocker found. No unrelated probes or repairs performed.

## Gates and File Reality

2026-10-10 approximately 05:42 UTC, Node v22.22.2:

- `npm run typecheck`: PASS.
- `npm run build`: PASS (includes typecheck and Vite production build).
- `npm test`: first restricted run failed discovery suite; approved rerun with local socket access PASS, 84 tests / 21 suites, zero failed/skipped.
- `node /tmp/o002-probes.mts`: PASS, 51 independent groups including exhaustive valid ports; explicit expected assertions inspected before execution.
- `git diff --check`: PASS.
- `savepoint health check O-002`: Code Health not configured; no snapshot.

Exact regressions: “keeps a V1 project with a WSL UNC folder when the host is plain Linux (I-006)” and “shows one live favourite card, not a live card plus an Offline one”. Named neighbouring suites include config version 2, project validation, registering a discovered card, normaliseFolder, matchProjects, findPortConflicts and resolveProjects. Scoped source/tests exist. T-004 screenshots remain expressly discarded scratch evidence; C-004 cleanup failure remains partial evidence.

## Guardrails and Materiality

Scoped changes retain localhost binding, request guards, fixed discovery commands, loopback-only probing, plain-text rendering, browser-only editor links, atomic preferences, no process control/elevation and no new server runtime dependency. DATA-01 and TEST-02 reproductions pass. TEST-01/Full evidence gaps remain exceptions, not technical proof.

No further implementation or Design repair is warranted. No new Issue allocated. I-008's remaining materiality is procedural: incomplete waived evidence (likelihood High, impact Low for current disposition, materiality Low); recommendation retain the explicit exception and let the owner decide completion. I-006/I-007 require no further code repair.

## Code Style Review

- [x] STYLE-01 **One job per file and function**
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth**
- [x] STYLE-05 **Comments explain why**

## Completion Disposition

Design reconciliation passes; no actionable unwaived repair remains. NEEDS WORK is retained solely because waived mandatory evidence is not technical proof. Closure Rules explicitly say completion by exception is never CLEAR, and an exception applies only to the Check it names. This Check does not invent another verification demand or ask for the four editor clicks again.

The owner already accepted T-004/T-005 against C-005. Superseding it means their Check-specific acceptance must name C-006 for closure; this is renewal of recorded acceptance, not a claim that validation was never performed. The owner must record the permitted evidence exception against C-006 and dispose of linked Issues as accepted for completion by exception. Only the owner closes the Objective. No owner decision or Issue resolution is inferred from the request to re-check.
