---
id: C-008
scope: {kind: objective, id: O-003}
result: CLEAR
checked_by: {role: checker, session: independent-o003-recheck-20261010-0756}
executed_session: o003-repair-20261010 (repairs for I-009, I-010, I-011); T-006..T-011 executor sessions
checked_at: '2026-10-10T07:56:22Z'
reviewed:
  base_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  head_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7 (plus uncommitted working tree)
  files: [server/supervisor.ts, server/supervisor.test.ts, server/index.ts, .savepoint/Design.md, .savepoint/Guardrails.md]
  dependencies: []
issues: []
supersedes: C-007
---

# O-003 Full Objective re-check: Controlled project launch

Independence: this session wrote C-007 and none of the O-003 implementation or the I-009/I-010/I-011 repairs (made by `o003-repair-20261010`). Owner requested this re-check. It is the one full re-check the convergence limit allows, under C-007's frozen scope lock and matrix; no new axis was added.

**Result: CLEAR.** All three C-007 Issues are repaired and proven through their original reproductions and their Proof Needed scenarios on both host sides. Every other C-007 cell was replayed and still passes.

## Prior Issue Closure Map

| Issue | Disposition |
|---|---|
| I-010 Stop ends on leader exit | **Closed (verified).** Restart 5/5 for plain, Vite and SIGTERM-ignoring servers on WSL; 5/5 plain and Vite on a Windows-hosted Shed; SIGTERM-ignoring server forced and gone, port free. |
| I-009 holder not named | **Closed (verified).** Named when just bound, same side and other side, from both a WSL-hosted and a Windows-hosted Shed. |
| I-011 Design / SEC-02 drift | **Closed (verified).** Design.md and SEC-02 re-read against the code; owner sign-off for the SEC-02 wording recorded in Guardrails.md line 18. |

## What Changed Since C-007

Files newer than C-007: `server/supervisor.ts` (`groupAlive`, `leaderExit`, polled `escalate`, `waitPortFree`), `server/index.ts` (holder lookup: `scanner.get(0)`, either environment), `server/supervisor.test.ts` (3 new cases), `.savepoint/Design.md`, `.savepoint/Guardrails.md`, Issue files. No client, shared or config code changed, so C-007's UI, launch-command-field and shared-rule cells carry over unchanged.

## Admission Ledger

| Re-check item | Prior claim | Frozen C-007 cell | Allowed result |
|---|---|---|---|
| Restart while running | I-010 | "Restart while running" | blocking |
| Stop of slow / SIGTERM-ignoring server | I-010 | "Stop: server slow to exit / ignoring SIGTERM" | blocking |
| Windows Restart then Stop | I-010 Proof Needed | Windows→Windows row (I-010 race unverified) | blocking |
| Holder just bound, same side | I-009 | "Port held, same side, just bound" | blocking |
| Holder on other side | I-009 | "Port held, Windows side, after fresh scan" | blocking |
| Holder naming from a Windows-hosted Shed | I-009 Proof Needed ("both host sides") | Windows→Windows row, refusals | blocking |
| Design and SEC-02 text | I-011 | "Design reconciliation"; SC7 | blocking |
| All other C-007 rows | — | same rows | regression only |

## Gates

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm test` | 140 pass, 0 fail, 0 skipped (Node v22.22.2, WSL) |
| `git diff --check` | clean |
| lint | not configured |
| `savepoint health check O-003 .` | "Code Health is not configured"; no snapshot; not a finding |

## Matrix Replay (scratch harnesses outside the repo; WSL Ubuntu 24.04, `networkingMode=mirrored`)

C-007 harness replayed unchanged against a WSL-hosted server (Node 22.22.2):

| Cell | C-007 | C-008 |
|---|---|---|
| Guards G1–G7 (X-Shed, Origin, content type, Host, method, unknown id, `..%2F`) | pass | pass (403/403/415/421/404/404×3/404) |
| Not launchable / wrong environment / stop without run / outside PID in body / log before run | pass | pass |
| Double concurrent start | pass | pass (200/409) |
| Start → running, `{port}` and `PORT`, plain-text log, HTML literal | pass | pass (OSC remnant unchanged: observation) |
| Delete while running | pass | pass (409) |
| **Restart while running** | **409 Issue** | **200**, new pid, old group gone |
| Stop: tree gone, port free | pass | pass |
| Bad command / missing folder / exit after running / stop after exit | pass | pass |
| **Port held, same side, just bound** | **"holder unknown"** | "in use by node (pid 1268171)" |
| **Port held, Windows side** | **"holder unknown" even after scan** | "in use by node.exe (pid 38660)", before and after a scan |
| Hand-started: External, stop refused, keeps serving | pass | pass |
| SIGKILL of Shed, restart: not re-adopted, stop refused | pass | pass (separate run, port 4835) |
| SIGTERM / SIGHUP shutdown: exit 0, no leftovers, port free | pass | pass |

I-010 Proof Needed, restart ×5 then stop, orphan check by process tree/group before each step:

| Host → project | Server | Restarts OK | Final stop | Leftovers / port |
|---|---|---|---|---|
| WSL → WSL | `node srv.js {port}` (tree of 3) | 5/5 | stopped, ~3 s (incl. fresh scan) | none / closed |
| WSL → WSL | Vite 5.4.21 `npm run dev -- --port {port} --strictPort` (tree of 5) | 5/5 | stopped | none / closed |
| WSL → WSL | SIGTERM-ignoring `node` under `sh` | 5/5 | stopped after forced kill (5.8 s incl. scan); log shows "ignoring TERM" | none / closed |
| Windows → Windows (Node 24.14.0, fresh copy of current `server/`+`shared/`) | `node srv.js {port}` | 5/5 | stopped | none / closed |
| Windows → Windows | Vite 5.4.21 (`C:\Users\User\shed-t011\winvite`) | 5/5 | stopped | none / closed |

I-009 Proof Needed from a Windows-hosted Shed: Windows `node.exe` holder just bound → "in use by node.exe (pid 3300)"; WSL `node` holder just bound → "in use by node (pid 1323290)".

New unit cases pass: "keeps stopping until the group is empty after the leader has exited", "forces the remaining group when the leader exits but a member ignores the signal", "waits for the port to be released before starting again".

All harness processes were stopped and verified gone on both sides; the temporary Windows copy (`C:\Users\User\shed-c008`) was deleted. Three unrelated user Vite servers (`galaxy`, `aquaglobe`, `Astraeus`) were running throughout and were never touched.

## Design Reconciliation (I-011)

Design.md now states launch in Architecture 3, components (`supervisor.ts`, `shared/launch.ts`, `runs.ts`, `LogPanel.tsx`, tests), API rows for start/stop/restart/log and delete-while-running 409, `State` with `runs`, `launch.command` schema, the "Launch and stop" data-flow section, Boundaries, Decisions for I-009/I-010, and Current Technical State. Each was compared with `server/supervisor.ts`, `server/index.ts` and `shared/launch.ts`; no contradiction found. SEC-02 names the Windows `taskkill` helper exactly as implemented (`supervisor.ts` `defaultKillTree`: fixed args, integer PID from a live run).

## Acceptance Classification

| Criterion | Class |
|---|---|
| SC1 spike record | Proven (unchanged since C-007) |
| SC2 guardrails rewritten before code, owner sign-off | Proven |
| SC3 start, Managed, output, stop with no orphan and port free, restart | Proven (both supported pairs) |
| SC4 busy port refused naming holder; failures show code and last lines | Proven |
| SC5 no stop without a run record | Proven |
| SC6 shutdown stops runs; no re-adoption | Proven |
| SC7 gates, Blocker/Required guardrails, TEST-03 evidence | Proven |
| Design reconciliation | Proven |

## Guardrails

SEC-01..04, SCOPE-01..03, DATA-01 met. SCOPE-02: the forced group signal is sent only after `kill(-pgid, 0)` shows a member remains, and on Windows an unrelated process (OneDrive.Sync.Service, whose parent PID matched a reused number in the tree) survived every `taskkill /T` — independent evidence that the stop did not reach a stranger. TEST-01/02: failing scenarios recorded in C-007, passing re-runs here, new regression tests for I-010. TEST-03: both host sides named above, mirrored networking.

## Materiality

No Issues; no materiality actions required.

## Observations (non-blocking)

- I-009's suggested unit case for the holder lookup was not added (the lookup is wiring in `server/index.ts` with no test seam); the live scenarios above stand in under TEST-01/02.
- `groupAlive` treats `EPERM` as alive; the follow-up `killTree` swallows only `ESRCH`, so an `EPERM` there would surface as a 500 on stop. Only reachable if the group id were reused by another user's process, which cannot happen while a member lives.
- A stop that had to force the remaining group still reports the leader's `signal: SIGTERM`.
- `waitPortFree` uses `Date.now()` rather than the injected clock.
- Design "Unknown / not examined" still lists Windows-hosted Restart/Stop, Vite ×5 and cross-side holder naming as not run; this Check ran them. The planner may update Design from this record.
- Executor history entries in I-009/I-010/I-011 are stamped 08:30Z/08:50Z, later than this Check's wall-clock time; append order is preserved.
- Carried from C-007: OSC remnants in logs; "spawn sh ENOENT" for a missing folder; a leader that exits by itself leaves its children unstoppable (deliberate); readiness accepts any listener; no in-process route tests; Windows Ctrl+C evidence cannot separate The Shed's handler from Vite's.

## Code Style Review

- [ ] STYLE-01 **One job per file and function** — `server/index.ts` `api()` still holds every route (unchanged from C-007).
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth**
- [x] STYLE-05 **Comments explain why**

## Owner Validation Still Needed

T-010 and T-011 declare `owner_validation.required`. Before O-003 closes, the owner performs their User Checks and records acceptance naming **C-008** (`owner_validation.accepted_check: C-008`). This Check does not record it on the owner's behalf.
