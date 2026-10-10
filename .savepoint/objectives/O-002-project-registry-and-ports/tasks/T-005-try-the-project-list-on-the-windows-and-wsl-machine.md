---
id: T-005
title: Try the project list on the Windows and WSL machine
objective: O-002
status: done
depends_on: [{task: T-004, requires: clear}]
owner_validation:
    required: true
    accepted_check: C-006
    accepted_by: {role: owner, session: owner-o002-completion-20261010-054734}
planned_by: {role: planner, session: planning-o002-2026-10-10}
check_waiver:
    task: T-005
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T04:56:40Z"
---

# Try the project list on the Windows and WSL machine

## Outcome

Recorded real-machine evidence (TEST-03) that the project registry works on Windows 11 + WSL2: a real V1 settings file upgrades with nothing lost, projects and ports survive a restart that moves the server between WSL Node and Windows Node, running Windows and WSL projects are matched and conflicts flagged, and the editor links open the right folders.

## User Check

Click Open in VS Code and Open in Cursor on one Windows project and one WSL project and confirm each opens the right folder (WSL in a WSL remote window).

## Done When

- Evidence names the networking mode and which side hosted the server for every run.
- Migration: a copy of the owner's real V1 `data/config.json` (original kept untouched) upgrades with every manual project, favourite, hide rule and override present; before/after listings recorded.
- Restart: register a Windows project and a WSL project with ports, restart under WSL Node, then under Windows Node; both survive with folders and ports unchanged.
- Matching: a running Windows Vite project and a running WSL Vite project each show as one lit project card; stopping one shows it not running.
- Conflicts: two projects on the same port, and a port held by an unrelated listener, are flagged; nothing changed a port.
- Editor links: the owner confirms the four link clicks above.
- Any defect found is recorded with its failing scenario and handed back as a REPLAN or Issue, not patched inside this Task.

## Context Files

`docs/V1-DESIGN.md` (acceptance-run format to follow), `README.md` (run instructions).

## Design References

Design: Current Technical State; Decisions (server on either side, refused probe ⇒ unverified). Objective O-002: Success Conditions 1–5 and Platform evidence.

## Guardrails

TEST-01, TEST-02, TEST-03, DATA-01, SCOPE-01.

## Implementation Plan

1. Back up the real config; run The Shed against a copy.
2. Run the migration, restart, matching and conflict scenarios from WSL Node and Windows Node, recording each step and result.
3. Ask the owner to click the four editor links and record the answer.
4. Record evidence in this Task.

## Boundaries

Verification only: no code changes. No launch, stop or signal of any process by The Shed (dev servers are started by hand in a terminal).

## Technical Verification

Platform evidence produced by the executor on the owner's machine, with owner clicks for editor links; gates per AGENTS.md Verification Policy. This is the platform evidence the Full Objective Check needs; evaluated through `agent-skills/references/check-method.md`.

## Technical Evidence

Run 2026-10-10, Windows 11 + WSL2 (Ubuntu), **mirrored networking**. Test server on :4790 with a scratch config; the real :4777 server was not touched. Hosts used: WSL Node (v22) and Windows Node (v24.14, server run from `\\wsl.localhost\Ubuntu\...`). No code changed.

| Done When | Result |
|---|---|
| Migration | PASS with a **stand-in**: the owner has never had a real V1 `data/config.json` (owner, 2026-10-10: "Never created one"), so a V1 file was generated from what is running now (4 manual projects incl. one without folder, one Windows path, one `\\wsl.localhost` path; 2 favourites; 2 hide rules; 1 override). Original kept (sha256 verified unchanged); a copy loaded under WSL Node: all 4 projects, favourites (`manual:` key → `project:`), both hide rules and the override present; UNC folder became `/home/user/code/sea-level` (env `wsl`); no-folder project stayed folderless. |
| Restart | PASS. Registered Windows project (`C:\Users\User\Documents\t005win`, :5300) and WSL project (`/home/user/code/galaxy`, :5173) under WSL Node; restarted under Windows Node, then back under WSL Node on the same config file. Config byte-identical across both restarts; folders and ports unchanged. |
| Matching | PASS, with a variation. WSL Vite (galaxy, :5173) and a Windows **plain Node HTTP server** (:5300, not Vite; same folder/port matching path) each matched their project, from both a WSL-hosted and a Windows-hosted Shed. Stopping the Windows server removed its match. The browser card view was checked through the API (`matches`), not by eye. |
| Conflicts | PASS. Two projects on :5173 flagged `{port:5173, 2 projects}`. A WSL project on :5037, held by Windows `adb.exe`, flagged with the holder named. No port was changed (config ports identical afterwards). |
| Editor links | **PASS (owner, 2026-10-10)**: all four clicks confirmed - Open in VS Code and Open in Cursor on one WSL project (Test1) and on one Windows project. First WSL attempt failed only because the typed folder did not exist; it worked once the folder was created. |
| Defects | See below. |

Finding (for owner/planner, not patched here): a WSL project registered on :4777 with folder `aquaglobe` was shown as matched to the unrelated Shed server on :4777 (same environment, port match), so it reads as running and raises no conflict. This follows the Objective's rule "folder, then same-environment preferred port", but means the "port held by an unrelated listener" warning only appears across environments (Windows vs WSL) or when another project already owns the service. Needs an owner decision on whether a port match to a service in a different known folder should count as a conflict.

Files read: AGENTS.md, task, Objective, `docs/V1-DESIGN.md` (acceptance format), `README.md`, router; extra reads (verification only): `server/config.ts` and `server/index.ts` routes, HEAD `server/config.ts` and `shared/types.ts` (V1 file shape). Files changed: this Task only. Gates (typecheck/build/test) were not run: no code changed. Limitations: stand-in V1 file instead of the owner's real one; Windows server was plain Node, not Vite; editor-link clicks not yet done.

## Drift Notes

None yet.

## Renewed Owner Acceptance

2026-10-10T05:47:34Z: Owner explicitly renewed the recorded validation against C-006 and approved O-002 completion by exception. Previous acceptance of C-005 remains recorded in I-008 history; no editor clicks or User Check were requested again.
