---
id: T-009
title: Start, stop and restart projects through the server
objective: O-003
status: done
depends_on: [{task: T-008, requires: clear}]
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-009
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T07:10:17Z"
---

# Start, stop and restart projects through the server

## Outcome

The local API can start, stop and restart a registered project and return its recent output; every state response carries the current runs; and when The Shed shuts down it stops everything it started, leaving earlier runs to appear as External after a restart.

## User Check

With The Shed running, start a project through the API, fetch its output, stop it, and confirm the dev server is gone; start it again and press Ctrl+C on The Shed, then confirm the dev server is gone too.

## Done When

- Routes: `POST /api/projects/:id/start`, `POST /api/projects/:id/stop`, `POST /api/projects/:id/restart` (body `{}`), and `GET /api/projects/:id/log`. Mutations keep the existing Host, `X-Shed`, JSON content-type, Origin and body-size checks. Requests name a project id only; no route accepts a PID, command or port.
- Start/restart refusals return 409 (port taken, already running, environment mismatch) or 400 (project not launchable) with the supervisor's reason; unknown project returns 404; stop with no active run returns 409 and signals nothing.
- `State` gains `runs` (per project: state, port, start time, exit code/signal, message); start/stop/restart return the full `State` like other mutations; the log route returns plain text from the ring buffer.
- Deleting a project with an active run is refused with 409 ("stop it first"); editing a running project's command applies on its next start.
- Shutdown: SIGINT, SIGTERM and SIGHUP (and the Windows console equivalents the spike identified) call stop-all with a bounded wait, then exit. Runs are never persisted or re-adopted; after a restart, a still-running earlier process is just a discovered (External) service.
- `client/src/api.ts` has typed calls for the new routes.
- Evidence: `node:test` cases for request validation/refusals where routes are testable in-process; otherwise recorded API runs (`curl` with and without `X-Shed`, unknown id, stop with no run, start with port held, delete while running) as TEST-01 scenarios. A recorded shutdown scenario for the Shed's own host environment, with an orphan check.

## Context Files

`server/index.ts`, `server/supervisor.ts`, `shared/types.ts`, `client/src/api.ts`, `server/supervisor.test.ts`, `docs/SPIKE-LAUNCH.md`.

## Design References

Design Architecture 1, 4, Interfaces and Data Flow (API, Data ownership).

## Guardrails

SEC-01, SEC-02, SEC-04, SCOPE-02, TEST-01, TEST-03, STYLE-02.

## Implementation Plan

1. Confirm the supervisor API from the preceding Task exists as planned; return REPLAN REQUIRED if not.
2. Add the routes behind the existing request checks.
3. Add `runs` to state responses and the delete-while-running refusal.
4. Install shutdown handling that awaits stop-all with a bounded timeout.
5. Add typed client calls.
6. Record tests and API/shutdown scenarios; run gates.

## Boundaries

No UI controls, no persisted or streamed logs (polling only), no re-adoption, no automatic restart, no cross-environment launch.

## Technical Verification

Focused tests and recorded API runs during iteration; handoff runs `npm run build` and `npm test`. Later evaluation follows `agent-skills/references/check-method.md`.

## Technical Evidence

Executor evidence (2026-10-10). Claims for a Check to verify, not proof.

**Per criterion**
- Routes: `POST /api/projects/:id/{start,stop,restart}` and `GET /api/projects/:id/log` added in `server/index.ts` behind the existing Host/Origin/`X-Shed`/JSON/body-size checks; they take only a project id. Met (API run below: start without `X-Shed` → 403).
- Refusals: unknown id 404; `p2` with no launch command 400; stop with no run 409; start while running 409 ("already running"); port held by another process 409 ("in use, holder unknown"). Status mapping in `refusalStatus` (unit-tested). Environment-mismatch 409 is covered by the supervisor's existing unit test and the mapping test; not run through HTTP.
- `State.runs`: `RunSummary[]` added to `State`; every state response carries it; start/stop/restart return the full State. Log route returns `text/plain` from the ring buffer (empty for a known project with no run). Met.
- Delete while running: 409 "This project is running; stop it first." Met. Editing a running project's command: not changed here; the supervisor reads the project when it starts, so the new command applies next start (not separately exercised).
- Shutdown: SIGINT, SIGTERM, SIGHUP and SIGBREAK call `stopAll` raced against a 10 s limit, then exit. Real run: restart → `sh -c node srv.js` + `node srv.js` running → SIGINT to the Shed → both gone, Shed exited. Runs are not persisted. SIGTERM/SIGHUP/SIGBREAK use the same handler but were not each sent.
- `client/src/api.ts`: `startProject`, `stopProject`, `restartProject`, `projectLog`. Met (typecheck).
- Evidence: unit tests added in `server/supervisor.test.ts` (refusal→status mapping, `isActive`, no log before a start); API/shutdown scenarios recorded below.

**Commands run**
- `npm run typecheck` pass; `npm run build` pass; `npm test` 123 pass, 0 fail.
- API scenario: server started with `SHED_PORT=4799` and a throwaway config (WSL project running a 1-line Node HTTP server on port 5871); curl runs with and without `X-Shed`: 403 / 404 / 400 / 409 / 409 as above; start → state `running`, log `listening 5871`; stop → `stopped` (SIGTERM), no `node srv.js` left; port held by another Node listener → refused; restart then SIGINT → no orphan, Shed exited.

**Files read:** Context Files (`server/index.ts`, `server/supervisor.ts`, `shared/types.ts`, `client/src/api.ts`, `server/supervisor.test.ts`, `docs/SPIKE-LAUNCH.md`).
**Extra reads (logged):** `server/scan.ts` (Scanner API, to name a port holder from a recent scan); `server/registry.test.ts` (its `State` fixture needed `runs: []` to compile); `package.json`, `.savepoint/config.yml` (gate commands); `.savepoint/Guardrails.md` STYLE-02 line.
**Files changed:** `server/index.ts`, `server/supervisor.ts`, `server/supervisor.test.ts`, `server/registry.test.ts`, `shared/types.ts`, `client/src/api.ts`, this Task.

**Limitations**
- Only the WSL-hosted environment was exercised; no Windows-hosted run (shutdown via Ctrl+C / console close, `taskkill`) — that belongs to T-011.
- The port-held refusal said "holder unknown" because the scan did not know the holder; naming a holder from a scan was not seen working.
- Routes are not tested in-process (`server/index.ts` starts listening on import); coverage is the recorded curl run above, not an automated test.
- Not measured: the SIGKILL/End Task case (cannot be caught by design).


## Drift Notes

Record new routes and the `State.runs` shape for Design reconciliation.

New for Design: `POST /api/projects/:id/start|stop|restart` (body `{}`, return State), `GET /api/projects/:id/log` (text/plain), `State.runs: RunSummary[]`, refusal statuses 404/400/409, delete-while-running 409, shutdown on SIGINT/SIGTERM/SIGHUP/SIGBREAK with a 10 s bound.
