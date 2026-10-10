---
id: I-011
title: Design and SEC-02 still describe The Shed as launching nothing
type: drift
status: resolved
source:
  kind: check
  check: C-007
  actor: {role: checker, session: independent-o003-full-20261010-0732}
  at: '2026-10-10T07:32:24Z'
tasks: [T-008, T-009, T-010, T-011]
checks: [C-007, C-008]
guardrail_ids: [SEC-02]
severity: medium
resolution:
  disposition: verified
  check: C-008
  actor: {role: checker, session: independent-o003-recheck-20261010-0756}
  at: '2026-10-10T07:56:22Z'
  reason: Repair proven by CLEAR Check C-008.
history:
  - at: '2026-10-10T07:32:24Z'
    actor: {role: checker, session: independent-o003-full-20261010-0732}
    kind: observed
    check: C-007
    note: Design reconciliation for O-003 was never done; every Task's Drift Notes deferred it to the Check.
  - at: '2026-10-10T08:50:00Z'
    actor: {role: executor, session: o003-repair-20261010}
    kind: owner_decision
    note: Owner chose option A and approved the SEC-02 wording naming the Windows taskkill stop helper.
  - at: '2026-10-10T08:50:00Z'
    actor: {role: executor, session: o003-repair-20261010}
    kind: repair_attempted
    note: >-
      Design.md reconciled to O-003 (architecture, components, API, schema, launch and stop section, boundaries,
      decisions, current state, unknowns) and SEC-02 reworded in Guardrails.md. A Check must re-read both against the code.
  - at: '2026-10-10T07:56:22Z'
    actor: {role: checker, session: independent-o003-recheck-20261010-0756}
    kind: rechecked
    check: C-008
    note: 'Design.md and SEC-02 re-read against supervisor.ts, index.ts and shared/launch.ts; consistent; owner SEC-02 sign-off recorded. See C-008.'
---

# I-011: Design and SEC-02 still describe The Shed as launching nothing

## Summary

The Full Objective Check includes Design reconciliation, and O-003's Boundaries put "Guardrail and Design changes for launching" in scope. `.savepoint/Design.md` was not updated for any O-003 delivery and now contradicts the code:

- Line 8: "implemented reality … through O-002"; line 85: "Controlled launch belongs to O-003 and is not implemented here".
- Line 76 Boundaries: "Does not: start, stop or signal processes".
- Line 31: `server/discovery/run.ts` is "The only subprocess entry point"; `server/supervisor.ts` spawns launch commands and `taskkill`.
- Line 71: "the server launches nothing".
- Components map lacks `server/supervisor.ts`, `shared/launch.ts`, `client/src/runs.ts`, `client/src/LogPanel.tsx`, `server/supervisor.test.ts`, `server/runs.test.ts`.
- API table lacks `POST /api/projects/:id/start|stop|restart`, `GET /api/projects/:id/log`, delete-while-running 409; `GET /api/state` is shown as `{ scan, config }` without `runs`.
- Project schema (line 66) lacks `launch.command`; no Decisions for spawn/stop mechanisms, readiness, 60 s readiness timeout, shutdown signals and 10 s bound, Windows→WSL refusal; Current Technical State has no T-006..T-011 evidence.

Separately, SEC-02 (Blocker) says subprocesses are "either fixed discovery scripts or a registered project's launch command … No API route can run anything else", but `POST /stop` on a Windows host runs `taskkill /PID <run pid> /T /F` (`server/supervisor.ts:296-299`). The substance is safe (fixed arguments, integer PID from a live run record), but the Blocker rule's text does not allow it; T-008's Drift Notes flagged this and it was not reconciled.

## Evidence

Line references above are from `.savepoint/Design.md` and `.savepoint/Guardrails.md` as of C-007. Drift Notes in T-007, T-008, T-009, T-010 and T-011 each list deltas "for Design reconciliation before Check".

## Proof Needed

`savepoint-design` reconciles Design.md to the delivered launch behaviour (components, API, State, schema, decisions, current technical state with T-006..T-011 evidence and the known limitations), and the owner approves a SEC-02 wording that names the stop helper (or the code is changed to fit the current wording). A Check re-reads both against the code.
