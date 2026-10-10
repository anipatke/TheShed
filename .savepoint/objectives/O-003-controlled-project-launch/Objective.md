---
id: O-003
title: Controlled project launch
status: done
depends_on: []
release: G-002
priority: high
rank: 2
---

# O-003: Controlled project launch

## Outcome

A registered project with a configured launch command can be started, stopped and restarted from its card. The Shed passes the assigned port, refuses to start when that port is taken, reports launch failures and unexpected exits with recent output, labels the services it started as Managed, and stops the whole process tree of what it started — and nothing else.

## Why

Launching is the owner's main Goal 02 outcome, but it reverses V1's read-only guarantee. It comes after the registry and starts with a platform spike, because the hard parts (which PID The Shed actually holds, whether a stop reaches the whole tree, what survives a crash, how Windows `.cmd` launchers need to be run) have not been measured on this machine.

## Success Conditions

1. A spike record (`docs/SPIKE-LAUNCH.md`) answers launch, stop, tree-cleanup and survival behaviour for WSL→WSL, Windows→Windows, WSL→Windows and Windows→WSL on a real machine, and states which of those Goal 02 supports.
2. `.savepoint/Guardrails.md` replaces SCOPE-02 and rewrites SEC-02 before any launch code lands, with owner sign-off recorded.
3. A registered Windows Vite project and a registered WSL Vite project start on their assigned ports, show as Managed with recent output, and stop with no orphaned npm/node/esbuild process and the port free (in the combinations the spike supports).
4. A launch whose port is held by anything else is refused with what holds it; a failed spawn or early exit is shown with its exit code and last output lines.
5. Stopping is impossible for any service without a Shed run record from the current server session; the API refuses it.
6. When The Shed shuts down it stops what it started; after a restart, earlier runs are not re-adopted and appear as External.
7. Configured gates pass; every Blocker and Required guardrail is met; TEST-03 real-machine evidence names the networking mode and hosting side.

## Architectural Considerations

- **Registry field:** a project gains an optional `launch.command` string with a `{port}` placeholder. The Shed substitutes the port and also sets `PORT`. The command is trusted local user configuration; it is never built from discovered data, and it reaches the shell as one argument with the folder as the working directory — never by string concatenation with other values.
- **Ownership:** an in-memory run record per launch (project, PID, process group, start time, port, state). Stop acts only on a run record. WSL/Linux: detached process group, SIGTERM then SIGKILL. Windows: `taskkill /T /F` on the recorded PID. Final mechanisms come from the spike.
- **Logs:** an in-memory ring buffer per run (about 64 KB of stdout/stderr, ANSI codes stripped), fetched by polling and rendered as plain text. Not persisted.
- **Readiness:** a run is "running" once its assigned port is listening; a different port is flagged as a mismatch. Vite commands are expected to use `--strictPort` so a busy port fails rather than moving.
- **Guardrails:** SCOPE-02 ("never starts, stops or signals processes") and SEC-02 ("only fixed discovery scripts") are Blocker rules that this Objective must rewrite through `savepoint-design`, with owner approval, before implementation Tasks begin. The owner approved the Goal 02 scope that requires this on 2026-10-10.
- **Platform evidence for the Full Check:** a recorded real-machine matrix for each supported host/project environment pair (TEST-03), including the stop-and-check-for-orphans run and the shutdown/restart scenario.

## Confirmed Decisions

Owner, 2026-10-10 ("rest of scope approved"), adopting the planner's recommendations:

- Launch commands are editable from the UI, protected by the `X-Shed` mutation header added in O-002.
- When The Shed shuts down it stops the processes it started; processes are not re-adopted after a restart.
- Same-environment launch comes first; launching across the Windows/WSL boundary is decided by the spike and, if supported, delivered as its own Task.
- Restart means a Restart button (stop then start). Automatic restart after a crash is excluded.

Owner, 2026-10-10 (O-003 planning interview):

- A project can be launched only when it has a folder, an environment and a preferred port; otherwise no Start control is offered and the API refuses.
- Guardrail rewrite approved as worded: SCOPE-02 replaced, SEC-02 and SEC-04 rewritten, TEST-03 extended to launch/stop (Success Condition 2 met at planning time, before any launch code).
- Objective dependency on O-002 removed: the runtime gate held O-003 because O-002 closed by owner exception against C-006 (NEEDS WORK only on owner-waived evidence). The owner states O-002 passed review and the registry it delivers is implemented and accepted, so O-003 proceeds on it.
- Task plan approved: launch spike and launch-command field run side by side; then supervisor, launch API with shutdown, launch UI, and a real-machine trial in sequence. Until a cross-environment Task exists, a project launches only from a Shed hosted in the project's own environment (the API refuses otherwise). Cross-environment launch is planned after the spike, only if it shows a clean stop.

## Boundaries

**In scope:**
- Launch/stop spike and its decision record
- Guardrail and Design changes for launching
- Process supervisor, shutdown behaviour, launch API with port pre-check
- Launch UI: Start/Stop/Restart, state, error panel, log view, Managed/External label
- Cross-environment launch, only if the spike shows a clean stop

**Out of scope:**
- Stopping or signalling discovered processes
- Re-adopting processes after The Shed restarts; auto-restart on crash
- Inferring launch commands from `package.json` or other project files
- Persisted, streamed or searchable logs; per-project environment-variable editors
- Docker, non-default WSL distros, macOS
