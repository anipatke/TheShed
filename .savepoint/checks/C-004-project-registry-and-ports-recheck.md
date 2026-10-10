---
id: C-004
scope: {kind: objective, id: O-002}
result: NEEDS WORK
checked_by: {role: checker, session: independent-o002-recheck-20261010-0521}
executed_session: unknown
checked_at: '2026-10-10T05:28:56Z'
reviewed:
  base_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  head_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  files: [shared/types.ts, server/config.ts, server/identify.ts, server/index.ts, server/scan.ts, server/discovery.test.ts, server/registry.ts, server/registry.test.ts, client/src/api.ts, client/src/model.ts, client/src/App.tsx, client/src/Card.tsx, client/src/ProjectForm.tsx, client/src/styles.css]
  dependencies: [package.json, package-lock.json]
issues: []
supersedes: C-003
---

# O-002 full recheck

## Prior Issue Closure Map

| Issue | Result |
|---|---|
| I-006 | Original reproduction and neighbouring hosts/UNC spellings pass; named regression passes. Remediation proven for this defect. Status stays open: issue-capture requires a CLEAR Check for verified resolution, and this Objective Check is NEEDS WORK. |
| I-007 | Original reproduction, all five probe statuses, all three environments, and fromKey transfer pass. Named regression passes. Remediation proven for this defect; status stays open for the same resolution rule. |
| I-008 | Still open. Fresh gates and recorded owner editor clicks address part of the missing evidence. Remaining frozen verification cells and Design reconciliation remain incomplete. |

This session did not implement the reviewed work. The current uncommitted working tree was reviewed, rather than HEAD alone. Executor session identity is unknown. No implementation, Task status, router, owner acceptance, or prior Check was changed.

## Frozen Scope and Admission Ledger

C-003's Scope Lock and Coverage Matrix govern this recheck unchanged. O-002 success conditions 1–6, T-002 through T-005, applicable guardrails and configured gates remain the boundary. Launch/stop/signal features and dependency internals remain excluded. Before independent probes, the ledger was written at `/tmp/o002-ledger.md`:

| Recheck item | Prior claim | Exact C-003 matrix cell | Allowed classification |
|---|---|---|---|
| UNC, hosts, round trips | I-006 | Migration: Linux-host WSL UNC; normal Windows/WSL/Linux and round trips | Pass / I-006 |
| Port/malformed validation | T-002 | Validation: finite port range and malformed classes | Pass / unverified |
| Matching/conflicts | T-003 | Matching: tiers/ranking/exclusivity/environment/order; Conflicts: shared/held/free | Pass / in-scope Issue |
| Retained favourite, statuses, fromKey | I-007 | View model: retained service favourite, normal absorption/every probe status | Pass / I-007 |
| Editor construction | T-004/005 | Editor URLs: three environments, absent distro/folder, Unicode encoding | Pass / unverified |
| Persistence/API/browser/races | I-008 | Persistence real filesystem; live request boundary and live server; UI/platform/browser; overlapping scans/post-commit failure | Pass / unverified I-008 |
| Fresh gates/health | I-008 | Gates: build/full tests/typecheck/diff | Pass / unverified I-008 |
| Platform/acceptance/Design | I-008 | UI/platform exact T-005 scenario; scope item 1 and Design reconciliation | Proven / unverified I-008 |

No new blocking perimeter or new Issue was introduced.

## Coverage Matrix Reconciliation

| Frozen row | Current classification |
|---|---|
| Migration | Passed: named config version 2 tests, six independent host × UNC spelling cells and serialization round trips. |
| Validation | Passed pure cells: all 65,535 valid ports and nine invalid port classes; named project validation suite covers env/folder/URL. Other original text/mutable-input cells not independently recreated: Unverified. Live cells recorded below. |
| Matching | Passed named normaliseFolder/matchProjects/resolveProjects tests and independent three-environment integration. Original full order permutations not recreated: Unverified. |
| Conflicts | Passed six named findPortConflicts tests, including shared Windows/WSL ports, held/free/own ports. |
| View model | Passed independent 3 environments × 5 statuses × 2 registration paths (30 cells): exactly one project card, retained favourite, expected status. Unmatched/browser cells remain partly Unverified. |
| Editor URLs | Passed all three environments with space/hash/Unicode encoding, no folder, absent WSL distro. Real handlers supported by owner's four recorded successful clicks in T-005. |
| Persistence | Named real-file upgrade, broken-file preservation, capacity and write-failure tests pass. Original virtual mkdir/write/rename timing matrix not fully recreated: Unverified. |
| Client API | Source confirms X-Shed on every mutation and server routes. Original complete mocked success/error/refusal matrix not recreated: Unverified. Live results below. |
| UI/platform | T-004 normal recorded browser run supports forms/transfer/warnings. Remaining browser branches and exact T-005 Windows Vite/card-inspection scenario: Unverified. |
| Gates | Passed fresh typecheck/build/test/diff check. |

Every row is classified; Unverified cells prevent clearance, rather than silently reducing the scope. The original scratch harnesses behind C-003's 75 cells and virtual matrix are not available as repository artifacts. Their recorded outcomes are not asserted as fresh replay evidence.

## Workflow and External Boundary Lock

| Real workflow | Order and effects | Failure/final state and evidence |
|---|---|---|
| Load/migrate | Read → parse → sanitize; no eager upgrade write | Named disk migration and broken-file move-aside tests pass. |
| Persist mutation | Validate → cloned config → capacity guard → mkdir → temp write → rename → in-memory commit | Named capacity/write-failure tests confirm original disk/memory retained on failure. Full before/during/after rename and cleanup timing remains Unverified. |
| API mutation | Host/Origin/X-Shed/JSON guards → persist → refresh projects → state/track favourites → response | Normal/error live scenarios below; post-commit refresh failure and all retry timing remain Unverified. |
| Scan/reuse | Parallel fixed sources → identify/probe → project probes → resolve; Scanner shares inflight/cache | Named source isolation/probe tests pass; overlap live results below. Mutation during inflight scan remains Unverified. |
| Browser | API response → state → model → cards/forms; editor URLs handed to browser | Pure model and recorded normal UI evidence pass. Browser failure/retry and remaining branches not rerun. |

Configured and actual live target are localhost with disposable config. Real-socket suite covers successful/non-success probes, refusal, timeout, redirects, bounded/unexpected responses and source failure. Browser runner/provider boundary is unavailable in this session; Windows/WSL host switching and OS handlers use the existing recorded evidence, with exact-scenario gaps retained. No secret-bearing input is in scope. No unsupported boundary behavior was added as a blocker.

## Gates and Independent Evidence

Run 2026-10-10 around 05:21–05:29 UTC, Node v22.22.2:

- `npm run typecheck`: pass.
- `npm run build`: pass (typecheck and Vite production build).
- `npm test`: initial sandbox attempt failed because local listeners received EPERM; rerun with socket access passed **84 tests, 0 failed, 0 skipped**. This was an environment restriction, not a reproduced product failure.
- `node server/registry.test.ts`: 22 passed.
- `node /tmp/o002-probes.mts`: 51 independent matrix groups passed, including exhaustive valid-port range. Expected outputs were explicit assertions, not recalculated by implementation helpers.
- `git diff --check`: pass.
- `savepoint health check O-002`: Code Health not configured; no snapshot collected.

Named regression evidence: discovery suite “keeps a V1 project with a WSL UNC folder when the host is plain Linux (I-006)”; registry suite “shows one live favourite card, not a live card plus an Offline one”. Neighbouring named evidence includes config version 2, project validation, registering a discovered card, normaliseFolder, matchProjects and findPortConflicts suites.

## Live API and Filesystem Evidence

`node /tmp/o002-live.mjs` completed 17 assertions using a disposable Linux-hosted server on 127.0.0.1:49872: deferred V1 migration; missing X-Shed 403, hostile Origin 403, non-JSON 415; five malformed requests 400; retired manual route 404; create/edit; concurrent refresh reuse; restart persistence; favourite removal on delete; forced temp-write failure leaves memory/disk unchanged followed by successful retry; broken-file preservation. Expected disk content and HTTP statuses were asserted independently. An initial harness Host override was ignored by Node fetch; that assertion was removed rather than reported as a server defect. The final harness printed all assertions passed, then exited 13 due to awaiting an already exited child during cleanup. This is harness cleanup failure, not successful overall harness execution; its 17 completed assertions are partial evidence only. The remaining scratch directory was explicitly removed. No host-boundary bypass is claimed.

## Acceptance Coverage

| Task | Done When classifications (numbered in listed order) |
|---|---|
| T-002 | 1–2 Proven; 3 supported by pure/live tests but full frozen malformed-class replay Unverified; 4–6 normal/tested paths proven with failure timing gaps above; 7 Unverified browser replay; 8 named cases and API scenarios support criterion; 9 Proven. |
| T-003 | 1–3 Proven by named tests, with full frozen order replay Unverified; 4 Unverified race paths; 5–6 Proven. |
| T-004 | 1 pure remediation Proven, unmatched browser branch Unverified; 2–4 recorded normal scenario supports behavior, remaining browser cells Unverified; 5 pure warning logic Proven/browser holder text Unverified; 6 Proven construction plus recorded owner clicks; 7 Unverified complete UI scenario. |
| T-005 | 1 Proven as recorded context; 2 Unverified literal criterion (stand-in config, no retained before/after listing); 3 supported by recorded cross-host restart; 4 Unverified exact Windows Vite/card scenario; 5 supported by recorded/pure evidence; 6 Proven recorded owner confirmations; 7 Proven reporting. |

O-002 success conditions 2–4 have passing pure/regression evidence; 1 has recorded cross-host evidence; 5 now has the owner confirmations; 6 gates pass, but required verification coverage remains incomplete. Overall result NEEDS WORK because I-008 remains material.

## Guardrails, Adversarial Pass and File Reality

Scoped sources retain fixed localhost binding, fixed discovery invocation, loopback project probes, plain-text React rendering, browser-only editor links, and no process control or new server runtime dependency. Source guards support SEC-01–04, SCOPE-01–03 and DISC-01–02; full behavioral replay gaps remain as classified above. DATA-01 migration defect no longer reproduces. TEST-02 named regressions exist; TEST-01 full coverage remains incomplete.

Adversarial review considered parser bypass, environment/representation switching, duplicate/card absorption, status transitions, source failure, persistence failure/retry and port/Unicode boundaries. Unrun overlapping/post-failure/browser paths remain Unverified. All named scoped source/test files exist. T-004 screenshots are explicitly scratch artifacts. Design still describes `/api/manual`, `manual:` identities and the old scan/config, so Objective integration reconciliation remains outstanding. T-005's final limitations sentence still says clicks pending despite its updated PASS row; the dated owner PASS row is the applicable evidence.

## Materiality

| Issue | Likelihood | Impact | Materiality | Recommendation |
|---|---|---|---|---|
| I-008 remaining evidence | High (gaps exist now) | Medium (integration/platform promise incompletely demonstrated) | Medium | Complete the named frozen verification cells and Design reconciliation; owner may explicitly except applicable requirements. |

I-006 and I-007 remediation passed; no further defect repair is requested here. No new product defect was established.

## Code Style Review

- [x] STYLE-01 **One job per file and function**
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth**
- [x] STYLE-05 **Comments explain why**

## Owner Validation and Handoff

Four editor clicks are recorded as successful; do not ask the owner to repeat them. T-004/T-005 still have empty accepted_check; owner acceptance naming the eventual current Check is a closure requirement, not itself a product defect. No owner decision is recorded on the owner's behalf. This is the first full recheck after C-003. Complete only the remaining frozen verification/Design work, then use the permitted targeted recheck; do not broaden the review or repair implementation here.
