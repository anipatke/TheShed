---
id: T-006
title: Find out how starting and stopping really works on this machine
objective: O-003
status: done
depends_on: []
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-006
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T06:59:01Z"
---

# Find out how starting and stopping really works on this machine

## Outcome

A decision record, `docs/SPIKE-LAUNCH.md`, measured on the real Windows 11 + WSL2 machine, that says for WSL→WSL, Windows→Windows, WSL→Windows and Windows→WSL (Shed host → project environment) how The Shed should spawn a launch command, which PID it holds, how a stop reaches the whole process tree, what survives The Shed exiting, and how readiness on the assigned port is detected — and states which of those pairs Goal 02 supports.

## User Check

Read the summary table at the top of `docs/SPIKE-LAUNCH.md`: one row per host/project pair with Supported yes/no, the spawn and stop mechanism, and the orphan result.

## Done When

- Each of the four pairs answers, with the exact commands run and their observed output:
  1. Spawn: which shell form runs a stored command (for example `sh -c` detached in its own process group; `cmd.exe /d /s /c` for Windows, including how `npm.cmd`/`.cmd` launchers must be run under current Node), and what process tree results for `npm run dev -- --port <N> --strictPort` on a Vite project (npm → node → esbuild…).
  2. Held PID: which PID/process group/handle Node's `ChildProcess` gives The Shed, and whether that is enough to reach the whole tree.
  3. Stop: the stop mechanism (for example SIGTERM to the group then SIGKILL after a timeout; `taskkill /PID <pid> /T /F`), the time it takes, and an orphan check (`ps`/`tasklist` for npm/node/esbuild, plus the port free) after each stop.
  4. Leader exit and PID reuse: what happens when the leader exits while children live on, and whether a stop after that can ever touch a process The Shed did not start (SCOPE-02).
  5. Survival: what remains after The Shed exits via Ctrl+C, SIGTERM, closing the terminal/window, and SIGKILL/Task Manager end-task; which of these a shutdown handler can cover.
  6. Readiness and port check: how quickly the assigned port shows as listening (TCP connect to `127.0.0.1`/`::1` versus a fresh discovery scan), and whether a pre-start check can name the holder of a busy port across the shared Windows/WSL port space.
  7. Output: that piped stdout/stderr arrives without a TTY, and what ANSI/colour sequences need stripping.
- The record names the networking mode, Windows build, WSL distro, Node versions on both sides, and which side hosted each run (TEST-03).
- A decision section gives the chosen spawn/stop mechanism per supported pair, the readiness method, the port pre-check method, known limitations, and a yes/no recommendation on planning a cross-environment launch Task.
- No product code under `server/`, `client/` or `shared/` changes. Throwaway scripts live outside the repository; the record quotes what they ran.

## Context Files

`docs/SPIKE.md`, `docs/SPIKE-LAUNCH.md`, `server/discovery/run.ts`.

## Design References

Design Architecture 2–3, Decisions (server on either side, PowerShell `-EncodedCommand`, stdin closed), Current Technical State.

## Guardrails

SCOPE-01, SCOPE-02, SEC-02, TEST-01, TEST-03.

## Implementation Plan

1. Prepare a minimal Vite project on each side (or reuse an existing one) and record versions and networking mode.
2. For each pair, spawn with the candidate shell form from a small Node script; dump the process tree.
3. Exercise stop, leader-exit and survival scenarios; run an orphan and port check after each.
4. Measure readiness and the busy-port pre-check, including a port held from the other side.
5. Write `docs/SPIKE-LAUNCH.md`: summary table, evidence per question, decision section, limitations.

## Boundaries

Research only: no supervisor, routes or UI. Does not decide product scope beyond which pairs are supported. Never signals a process the spike scripts did not start.

## Technical Verification

The record itself is the deliverable; a Check evaluates it against `agent-skills/references/check-method.md` for completeness of the seven questions and real-machine evidence per TEST-03. No gate change is expected; run the configured gates to show nothing else moved.

## Technical Evidence

Executor session: T-006 start. Deliverable: `docs/SPIKE-LAUNCH.md`.

**Per criterion**
1. Seven questions x four pairs: answered with commands and observed output in the record. Partial: Windows Ctrl+C/window close and non-SIGKILL signals on Windows-hosted and cross pairs were not exercised (stated in Limitations).
2. Environment (networking mode, Windows build, distro, Node versions, host side per run): recorded at the top of the record.
3. Decision section (mechanism per supported pair, readiness, port pre-check, limitations, cross-environment recommendation): present. WSL->Windows not supported; no separate cross-environment Task recommended.
4. No product code changed by this Task: only `docs/SPIKE-LAUNCH.md` and Savepoint records were written (other modified files in `git status` predate this Task). Throwaway scripts lived in the session scratchpad and `C:\Users\User\shed-spike-scripts`, outside the repository. The test projects (`C:\Users\User\shed-spike-win` and a scratchpad copy) are also outside it.

**Commands run:** harness runs per pair (spawn, tree dump, stop, orphan/port check, leader-only kill, host SIGINT/SIGTERM/SIGHUP/SIGKILL, taskkill /F); `npm run typecheck`, `npm run build`, `npm test` (84 pass, 0 fail). No lint gate configured.

**Files read:** Context Files `docs/SPIKE.md`, `server/discovery/run.ts` (`docs/SPIKE-LAUNCH.md` did not exist beforehand). **Extra reads:** none in the repo; `~/.wslconfig` and OS/Node versions on the machine for the TEST-03 environment section. **Files changed:** `docs/SPIKE-LAUNCH.md`, this Task, `Objective.md` status.

**Cleanup:** every process the spike started was stopped by hand and verified gone on both sides; no unrelated process was signalled.

**Limitations:** see the record's Limitations. Notes for the supervisor Task: Windows stop only while the leader lives; verify PID creation time; `dash` `kill` rejects `--`; Windows Vite binds `::1` only.

## Drift Notes

If any pair cannot be stopped cleanly or the held PID cannot reach the tree, record it here and return REPLAN REQUIRED for the supervisor Task rather than inventing a workaround.
