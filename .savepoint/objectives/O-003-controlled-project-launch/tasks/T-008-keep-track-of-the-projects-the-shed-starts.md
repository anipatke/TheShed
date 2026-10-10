---
id: T-008
title: Keep track of the projects The Shed starts
objective: O-003
status: done
depends_on: [{task: T-006, requires: clear}, {task: T-007, requires: clear}]
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-008
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T07:07:17Z"
---

# Keep track of the projects The Shed starts

## Outcome

A server-side supervisor that starts a registered project's launch command on its preferred port, keeps an in-memory run record and recent output for it, refuses to start when the port is taken or the project cannot be launched, and stops the whole process tree of a run it holds — and has no way to stop anything else.

## User Check

None directly; the supervisor is exercised through the launch API and UI Tasks. Its tests are the evidence here.

## Done When

- `server/supervisor.ts` exposes start, stop, restart, run summaries, log text and stop-all, with spawning, the port check and the clock injectable for tests.
- Start refuses, with a named reason and nothing spawned, when: the project has no launch command, folder, environment or preferred port; the project's environment is not the Shed host's own environment (until a cross-environment Task exists); the project already has an active run; or the port pre-check finds the port held (the reason names the holder's environment and process when known).
- Spawn uses the mechanism chosen in `docs/SPIKE-LAUNCH.md`: the stored command as one shell argument, working directory = project folder, `{port}` replaced by the validated integer port, `PORT` set; stdin closed. No other value is joined into the command (SEC-02).
- Run record: project id, PID/process group as the spike requires, start time, port, state (`starting`, `running`, `stopping`, `stopped`, `exited`, `failed`), exit code/signal, and a message. `running` means the assigned port is listening by the spike's readiness method.
- A spawn error or exit records `failed`/`exited` with the code and the last output lines.
- Output: a per-run ring buffer of about 64 KB combining stdout and stderr, ANSI sequences stripped, plain text only.
- Stop acts only through a run record held in this server session, using the spike's tree-stop mechanism with a bounded escalation; a run whose process has exited cannot be signalled again unless the spike shows that is safe (SCOPE-02). No function accepts a raw PID from outside the supervisor.
- Restart is stop, wait for exit, then start.
- `node:test` cases (fake spawn): port and `PORT` substitution; each refusal reason; early exit with code and last lines; spawn error; ring-buffer cap and ANSI stripping; stop of an unknown project refused with no signal; stop after exit sends no signal; restart order; stop-all. One real-process case on the Linux side starts a small process tree and proves the stop leaves none of it running (skipped on Windows if the spike's mechanism differs there).

## Context Files

`server/supervisor.ts`, `server/supervisor.test.ts`, `shared/types.ts`, `server/config.ts`, `server/scan.ts`, `docs/SPIKE-LAUNCH.md`.

## Design References

Design Architecture 2–4, Interfaces and Data Flow (Scan pipeline, Data ownership), Decisions (stdin closed, server on either side).

## Guardrails

SEC-02, SEC-04, SCOPE-01, SCOPE-02, SCOPE-03, TEST-01, TEST-02, STYLE-01..05.

## Implementation Plan

1. Read `docs/SPIKE-LAUNCH.md`; if its decision contradicts this plan (for example no reliable tree stop for same-environment pairs), return REPLAN REQUIRED.
2. Define the run record and summary types.
3. Implement launch eligibility and the port pre-check (using the spike's method, via a fresh scan or connect test injected from `server/scan.ts`).
4. Implement spawn, output buffer, readiness and exit handling.
5. Implement stop, restart and stop-all with bounded escalation.
6. Add the named tests; run gates.

## Boundaries

No HTTP routes, no UI, no persistence of runs or logs, no re-adoption, no automatic restart, no cross-environment launch, no environment-variable editor.

## Technical Verification

Focused `node:test` runs during iteration; handoff runs `npm run build` and `npm test`. Real-machine evidence for both environments comes from the trial Task; later evaluation follows `agent-skills/references/check-method.md`.

## Technical Evidence

Executor session: Sonnet 5.5, 2026-10-10. Not a worktree lane.

**Per criterion**
- Module surface (start, stop, restart, runs, log, stopAll; spawn, port check, clock injectable): `server/supervisor.ts` `Supervisor` with `SupervisorDeps` (`spawn`, `checkPort`, `isListening`, `killTree`, `now`). Met.
- Refusals with named reason and nothing spawned: tests "refuses no launch command / no folder / no environment / no preferred port / an unknown project / a project in another environment", "refuses a second start…", "refuses a busy port and names the holder", "says the holder is unknown", "refuses a port that another run… is already using". Met.
- Spawn per spike, one shell argument, `{port}` and `PORT`, stdin closed: tests "runs the command as one shell argument…", "uses cmd.exe with a verbatim, quoted command on Windows", `withPort`. Met.
- Run record and states, `running` = port listening: tests "becomes running once the port is listening", exit/failure group. Met.
- Spawn error / exit with code and last lines: tests "records failed with the code and last output lines…", "records exited…", "records a spawn error…", "records a spawn that throws…". Met.
- 64 KB ring buffer, ANSI stripped: `LogBuffer` tests (cap; split-chunk escape). Met.
- Stop only via run record, bounded escalation, no signal after exit: tests "refuses an unknown project and signals nothing", "sends no signal after the process has exited", "terminates…", "escalates to a forced kill…", "reports failed when even the forced kill does not end…". No function takes an outside PID. Met.
- Restart = stop, wait for exit, start: test "stops, waits for exit, then starts again". Met.
- Named tests incl. stop-all and one real-process case: "stop-all stops every active run…" and "real process tree / stop leaves no process of the tree running" (sh + node + sleep in one group; `ps -g` empty after stop). Met on Linux/WSL.

**Commands run:** `npx tsc -p tsconfig.server.json`; `node --test server/supervisor.test.ts` (31 tests, 3 repeat runs, all pass); `npm run build` (typecheck + vite build, ok); `npm test` (120 pass, 0 fail). `lint` is not configured (config.yml null).

**Files read:** the six Context Files (`server/supervisor.ts` and its test did not exist), plus `.savepoint/Guardrails.md` rule rows, `server/registry.ts` and `server/discovery/run.ts` (extra reads: to match code style and confirm `run()` is discovery-only so the supervisor does not reuse it), `package.json` and `.savepoint/config.yml` (gate commands). **Files changed:** `server/supervisor.ts` (new), `server/supervisor.test.ts` (new), `shared/types.ts` (added `RunState`, `RunSummary`, `RefusalCode`, `Refusal`), this Task, the owning Objective was already `in_progress`.

**Limitations**
- Windows paths (cmd.exe spawn, `taskkill /T /F`) are covered only by fake-spawn tests and the spike; not run on a real Windows host here. Real-machine proof is T-011 (TEST-03).
- Windows PID reuse: instead of comparing process creation time, stop is only possible while Node still holds the live child (an exited run is refused), so the PID cannot have been reused. The spike suggested a creation-time check; this is a simpler equivalent for a held child — flag for the Check.
- The default port check is a bind on 127.0.0.1; holder naming is supplied by an optional `findHolder` callback that T-009 must wire to a fresh scan. Not wired here (no routes allowed).
- Windows→WSL is refused as `wrong-environment` per this Task's Done When, although the spike marks that pair supported. Needs a later decision.
- A run that never listens within 60 s is stopped and marked `failed` (my choice; the plan was silent).

## Drift Notes

- Second subprocess entry point beside `server/discovery/run.ts` (as already anticipated). Also, the Windows stop spawns `taskkill` (fixed arguments plus the run record's integer PID), which SEC-02's current wording ("a registered project's launch command" or discovery scripts) does not name; Design/Guardrails reconciliation should list it.
