---
id: C-003
scope: {kind: objective, id: O-002}
result: NEEDS WORK
checked_by: {role: checker, session: independent-o002-readonly-20261010}
executed_session: unknown
checked_at: '2026-10-10T05:01:12Z'
reviewed:
  base_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  head_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  files:
    - shared/types.ts
    - server/config.ts
    - server/identify.ts
    - server/index.ts
    - server/scan.ts
    - server/discovery.test.ts
    - server/registry.ts
    - server/registry.test.ts
    - client/src/api.ts
    - client/src/model.ts
    - client/src/App.tsx
    - client/src/Card.tsx
    - client/src/ProjectForm.tsx
    - client/src/styles.css
  dependencies: [package.json, package-lock.json]
issues: [I-006, I-007, I-008]
supersedes: null
---

# Objective O-002 — Project registry and ports

Independent read-only Full Objective review (Codex gpt-6.1-sol, low reasoning effort, read-only sandbox). The reviewed implementation is the uncommitted working tree, not HEAD alone. The executor session is not established by the Task records. The review changed no files; this record and the Issues were transcribed from its report.

## Findings

| Ref | Finding | Issue | Materiality |
|---|---|---|---|
| F1 | Migration drops a WSL UNC project when the host infers as plain Linux (`server/config.ts:58`, `:107`). | I-006 | High; fix before clearance (DATA-01). |
| F2 | A previously starred service produces a live card and an Offline favourite (`client/src/model.ts:107`, `:167`). | I-007 | Medium; fix before clearance. |
| F3 | Required verification incomplete: four editor-link clicks pending, no fresh full gate, live and browser cells unexercised. | I-008 | Clearance blocker due to missing evidence. |

## Scope Lock

1. O-002 success conditions 1–6; every Done When criterion in T-002 through T-005; applicable Blocker/Required guardrails; configured gates.
2. Public surfaces: config validation/migration/store, project routes, registry matching/conflicts, scanner refresh, client API, view model, forms/cards and editor links.
3. Dependencies/effects: JSON persistence, discovery/probe results, scan caching, mutation commit then refresh/state response, browser rendering and OS editor URL handlers.
4. Excluded: launch/stop/signal functionality, unsupported platforms, unrelated dependency internals.

## Coverage Matrix

| Row | Classified cells |
|---|---|
| Migration | Normal Windows/WSL/Linux and round trips passed; Linux-host WSL UNC is F1 |
| Validation | Finite port range and malformed classes passed; live request boundary unverified |
| Matching | Tiers, ranking, exclusivity and environment/order cells passed |
| Conflicts | Shared/held/free ports passed under approved matching semantics |
| View model | Status and normal absorption passed; retained service favourite is F2 |
| Editor URLs | Three environments, absent distro/folder and Unicode encoding passed; real handlers unverified |
| Persistence | Virtual operation/failure/retry matrix passed; real filesystem unverified |
| Client API | Header and success/error/refusal mock cells passed; live server matrix unverified |
| UI/platform | Recorded normal scenarios inspected; browser branches and exact T-005 scenario incomplete |
| Gates | Typecheck and diff check passed; build and full tests unverified |

## Acceptance Evidence

"Unverified" means required evidence is incomplete, even where source review and recorded scenarios support the behaviour.

| Task | Criterion | Classification and evidence |
|---|---:|---|
| T-002 | 1 | **Issue I-006.** Normal migration, IDs, favourite rewriting, hide rules and overrides passed; Linux-host UNC migration drops the project. |
| | 2 | **Issue I-006.** Windows/WSL UNC normalization works; plain-Linux inference violates the specified rule. |
| | 3 | Proven for pure validation: all valid ports, invalid numeric/type classes, env/folder mismatches, missing input and text boundaries. |
| | 4 | Unverified for real storage. Virtual filesystem verified deferred upgrade, atomic replacement and broken-file preservation. |
| | 5 | Unverified for live API/persistence. Pure transfer and capacity probes passed. |
| | 6 | Unverified live; supported by source. Mocked client requests consistently supplied `X-Shed`. |
| | 7 | Unverified independently in browser. T-004 records add/edit/remove scenarios. |
| | 8 | Unverified overall. F1 lacks coverage and the complete suite did not run. |
| | 9 | Unverified. Typecheck passed; build and full test gate not run. |
| T-003 | 1 | Proven for pure matching; environment/order matrix passed. |
| | 2 | Proven under the approved matching rule; shared-port and holder-warning probes passed without mutation. |
| | 3 | Proven. "uses an override folder instead of the inferred one" passed; source confirms precedence. |
| | 4 | Unverified orchestration. Both scan paths carry matches/conflicts/distro; live refresh/race workflows not exercised. |
| | 5 | Proven. All 21 registry tests passed. |
| | 6 | Unverified. Full gates incomplete. |
| T-004 | 1 | **Issue I-007.** Normal absorption and every probe status passed; an existing service favourite creates an extra Offline card. |
| | 2 | Unverified browser behaviour. Recorded error/retry scenario and mocked API failures support it. |
| | 3 | Unverified browser behaviour; pure transfer proven. |
| | 4 | Unverified browser behaviour. Folderless model and URL fallback checked independently. |
| | 5 | Proven in model. Shared-project and holder-process warnings passed; no port mutation. |
| | 6 | Proven for URL construction; launches unverified. |
| | 7 | Unverified. Recorded UI run leaves branches unexercised; full gates incomplete. |
| T-005 | 1 | Proven as recorded context (Windows 11, WSL2 Ubuntu, mirrored networking, both server hosts). |
| | 2 | Unverified literal criterion. A generated stand-in config was used; before/after listings not retained. |
| | 3 | Unverified independently. Both-host restart preservation recorded, not rerun. |
| | 4 | Unverified exact scenario. Windows plain Node HTTP substituted for Windows Vite; API matches substituted for card inspection. |
| | 5 | Supported by recorded platform scenario and proven pure logic. |
| | 6 | Unverified. Four owner editor-link clicks pending. |
| | 7 | Proven reporting behaviour. Task recorded its matching ambiguity and did not patch the implementation. |

O-002 success conditions: 2 (I-006) and 3 (I-007) have Issues; 1, 5 and 6 are Unverified; 4 is supported under the approved matching semantics (see observations).

## Gates and Commands

Node v22.22.2.

- `npm run typecheck`: passed.
- `git diff --check`: passed.
- `node server/registry.test.ts`: 21 passed, 0 failed, 0 skipped.
- Independent in-memory probes: 14 passing groups (all 65,535 port values, malformed inputs, migration round trips, status handling, warnings, link encoding, preference transfer).
- Deterministic matrix: 75 passing cells across environments, matching order, status transitions, folder validation, Unicode link segments and mocked client API failures.
- Virtual filesystem probes: 6 passing groups (migration, atomic replacement order, mkdir/write/rename failures, retry, broken-file preservation, 500/501 capacity).
- `npm run build`: not run (writes `dist/`). `npm test`: not run (creates `.test-scratch-*` in the repo). Earlier Task gate claims were not reused as current Full evidence.

No Code Health configuration was found; no health command ran and `health_snapshot` is omitted.

## Guardrails and Adversarial Pass

DATA-01 fails for F1. TEST-01 and Full-gate evidence remain incomplete. Changed paths retain localhost binding, fixed discovery commands, plain-text rendering, loopback-only project probing, browser-only editor links and no process-control functionality.

Adversarial probes covered malformed inputs, cross-environment bypass, representation round trips, status transitions, ownership/order, pre-existing favourites, failure/retry and boundary/Unicode classes. Live boundary, browser, race and platform cells are explicitly Unverified, not silently excluded.

## File Reality and Design Reconciliation

All scoped implementation and test files exist. T-004 screenshots are scratchpad artifacts, not repository files. Design still describes the V1 `/api/manual` API, `manual:` identities and the old scan/schema and has not been reconciled with O-002.

## Code Style Review

- [x] STYLE-01 **One job per file and function**
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth**
- [x] STYLE-05 **Comments explain why**

Style findings are advisory and do not determine this verdict.

## Owner Validation Still Needed

T-004 and T-005 declare required owner validation but have empty `accepted_check`. The four T-005 editor-link clicks are pending. A Task-check waiver does not establish that acceptance.

## Nonblocking Observations

- A same-environment listener in a different known folder is accepted by preferred-port fallback and produces no conflict. This follows the approved tier rule and matches T-005's recorded observation; the broader "unrelated listener" wording needs reconciliation.
- A stopped URL-less project's Star action sends `url: ''`; `parseFavourite` rejects it and the route would return 400. The listed criteria do not explicitly require starring newly created URL-less projects.

## Handoff

Repair I-006 and I-007 with regression evidence. Complete the Full matrix, fresh configured gates, Design reconciliation, exact platform evidence and the four editor-link confirmations (I-008). Preserve every completed Task's status. Verify remediation in a later independent Check, which sets `supersedes: C-003`. This record grants no clearance or closure.
