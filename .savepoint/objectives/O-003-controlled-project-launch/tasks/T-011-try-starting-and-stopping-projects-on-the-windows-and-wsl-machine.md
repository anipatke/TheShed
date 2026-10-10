---
id: T-011
title: Try starting and stopping projects on the Windows and WSL machine
objective: O-003
status: done
depends_on: [{task: T-010, requires: clear}]
owner_validation:
    required: true
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-011
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T07:25:24Z"
---

# Try starting and stopping projects on the Windows and WSL machine

## Outcome

Recorded real-machine evidence (TEST-03) that controlled launch works on Windows 11 + WSL2 for every host/project pair the spike supports: a Windows Vite project and a WSL Vite project start on their assigned ports, show as Managed with output, stop with no orphaned process and the port free; refusals, failures, shutdown and restart behave as the Objective requires.

## User Check

Start and stop one Windows Vite project and one WSL Vite project from their cards (each from a Shed hosted on its own side unless a cross-environment Task has landed) and confirm each comes up on its port and disappears when stopped.

## Done When

- Evidence names the networking mode, Windows build, WSL distro, Node versions and which side hosted the server for every run.
- Launch: each supported pair starts a Vite project on its preferred port, shows Running and Managed, and shows output.
- Stop: after Stop, `tasklist`/`ps` show no npm/node/esbuild process from that run and the port is free; same after Restart then Stop.
- Refusals: a port held by another process is refused naming the holder; a bad command shows the exit code and last lines; a project in the other environment is refused (or launched, if a cross-environment Task landed).
- No stop for others: a Vite server started by hand shows External with no Stop, and an API stop for that project returns a refusal while the server keeps running (SCOPE-02).
- Shutdown/restart: Ctrl+C on The Shed stops what it started (orphan check recorded); after a hard kill of The Shed, record what survives as a limitation; after restarting The Shed, a still-running earlier process appears as External and is not stoppable.
- Any defect found is recorded with its failing scenario and handed back as REPLAN REQUIRED or an Issue, not patched inside this Task.
- The owner confirms the User Check.

## Context Files

`docs/SPIKE-LAUNCH.md`, `.savepoint/Design.md`.

## Design References

Design Current Technical State, Decisions (server on either side).

## Guardrails

SCOPE-02, SEC-02, TEST-01, TEST-02, TEST-03.

## Implementation Plan

1. Prepare one Vite project per side, registered with launch commands and preferred ports.
2. Run each scenario per supported pair and record commands, outputs and orphan checks.
3. Run the shutdown, hard-kill and restart scenarios.
4. Ask the owner to perform the User Check and record the result.

## Boundaries

Evidence only: no product code changes in this Task.

## Technical Verification

This Task produces the platform evidence the Full Objective Check needs (TEST-03), produced by the executor on the owner's machine with the owner confirming the User Check. Handoff runs `npm run build` and `npm test` fresh. Later evaluation follows `agent-skills/references/check-method.md`.

## Technical Evidence

Executor claims, to be verified by a Check. Logs and harness are in `docs/evidence/T-011/`: `wsl-hosted.log`, `windows-hosted.log`, `windows-ctrlc.log`, `scenarios.mjs`, `ctrlc-windows.ps1`. Summary table: `docs/SPIKE-LAUNCH.md`, "T-011 real-machine results".

- **Environment named (criterion 1):** Windows 11 build 10.0.26300.9457; WSL Ubuntu 24.04.4, kernel 6.18.33.2; `networkingMode=mirrored`; Node 22.22.2 (WSL-hosted) and 24.14.0 (Windows-hosted); npm 10.9.7 / 11.9.0. Each log opens with the host side. Test projects: throwaway Vite 5.4.21 apps, one in the session scratchpad (WSL) and one in `C:\Users\User\shed-t011\winvite` (Windows), each started with `npm run dev -- --port {port} --strictPort`.
- **Launch (2):** pass on both supported pairs (WSL→WSL, Windows→Windows): Running on the preferred port (5611 / 5621), run recorded and matched service seen (Managed), output returned with no ANSI bytes, HTTP 200 from the dev server.
- **Stop (3):** pass on both. The full process tree recorded before Stop was gone afterwards and the port refused connections, for Stop and for Restart then Stop. The one "stray" `cmd.exe` in `windows-hosted.log` is the harness's own wrapper (its command line contains the folder name); a final machine-wide process query found nothing left.
- **Refusals (4):** port held by another process, refused 409 (holder named only after a fresh scan, see Issue I-009); bad command shows `failed`, exit code 7 and last lines; a project in the other environment is refused 409 `wrong-environment` (no cross-environment Task landed).
- **No stop for others (5):** hand-started Vite has no run record (External); API stop returned 409 "no running process" and the server kept listening, on both sides.
- **Shutdown and restart (6):** WSL SIGINT stops the tree, exit 0, port free. Windows real console Ctrl+C: Shed exit 0, tree gone, port free, with the caveat that Vite shares the console and also received the Ctrl+C. Hard kill: WSL leaves the whole tree and port; Windows leaves `node`, `cmd`, `conhost` and the port (leader `cmd.exe` died). After restarting the Shed, the survivor appears as External with no run record and API stop is refused 409, on both sides. Survivors were removed by the harness.
- **Defects (7):** one, I-009 (low severity, refusal wording), recorded as an Issue and not patched. No other defect found; no REPLAN REQUIRED.
- **Owner confirms the User Check (8):** pending.

Commands run: `npm run build` pass; `npm test` 137 pass, 0 fail (fresh, after the runs). Scenarios: `node scenarios.mjs wsl …` (WSL) and `node.exe scenarios.mjs windows …` (Windows), `powershell.exe -File ctrlc-windows.ps1`. No linter configured.

Files read: `docs/SPIKE-LAUNCH.md`, `.savepoint/Design.md` (size only; not needed for the scenarios). Extra reads, with reason: `server/index.ts` and `server/supervisor.ts` (grep for where the refusal text and holder lookup come from, for I-009); `agent-skills/references/issue-capture.md` and `.savepoint/issues/I-008*.md` (Issue format).
Files changed: no product code. Added `docs/evidence/T-011/*`, `.savepoint/issues/I-009-port-busy-refusal-may-not-name-holder.md`, and an appended section in `docs/SPIKE-LAUNCH.md`. Outside the repository: `C:\Users\User\shed-t011\` (test project, Shed copy, harness) and temp configs.

Limitations: Windows→WSL and WSL→Windows launches are not product-supported and were not run (only the refusal was); NAT networking and other Vite versions were not tried; the Windows Ctrl+C test cannot separate the Shed's handler from Vite's own Ctrl+C handling; closing the Windows console window was not tried; one machine. Owner User Check not yet done.

## Drift Notes

Record differences from `docs/SPIKE-LAUNCH.md` and update it with new evidence.

- Spike document updated with a "T-011 real-machine results" section. Differences: Windows→WSL is refused by the shipped supervisor (spike found it workable); Windows hard kill left fewer survivors than the spike run. Design (Current Technical State) still needs the same reconciliation.
