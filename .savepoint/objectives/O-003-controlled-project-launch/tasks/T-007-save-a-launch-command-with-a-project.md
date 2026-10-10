---
id: T-007
title: Save a launch command with a project
objective: O-003
status: done
depends_on: []
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-007
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T07:00:39Z"
---

# Save a launch command with a project

## Outcome

A registered project can carry an optional launch command (for example `npm run dev -- --port {port} --strictPort`), entered and edited in the add/edit project form, validated by the server and kept in `data/config.json` across restarts. Nothing runs it yet.

## User Check

Edit a project, enter a launch command containing `{port}`, save, restart The Shed, and confirm the command is still there; clear it and confirm it is gone.

## Done When

- `Project` gains optional `launch: {command: string}` in `shared/types.ts`; config stays version 2 and existing files load unchanged (DATA-01).
- Server validation: trimmed, non-empty, at most 1000 characters, a single line (no CR, LF or NUL); an invalid command on create/edit returns 400 with a reason and writes nothing; an invalid stored command is dropped on load without dropping the project.
- Saving a command does not require a folder or port; the form explains that launching needs a folder and a preferred port and that `{port}` is replaced by the preferred port.
- The command is stored and returned as entered; nothing in this Task executes, parses or derives it, and it is never filled from discovered data or `package.json`.
- `node:test` cases: valid command round-trip; empty/whitespace, over-length and multi-line commands refused; invalid stored command dropped on load with the project kept; a V2 file without `launch` loads unchanged.
- Recorded UI scenario (screenshot or API run): add, edit, clear, and server-error display.

## Context Files

`shared/types.ts`, `server/config.ts`, `server/index.ts`, `server/discovery.test.ts`, `client/src/ProjectForm.tsx`, `client/src/api.ts`.

## Design References

Design Architecture 6, Interfaces and Data Flow (API, Data ownership → Project schema).

## Guardrails

SEC-02, SEC-04, DATA-01, TEST-01, TEST-02, STYLE-02, STYLE-04.

## Implementation Plan

1. Add the optional field to the shared type.
2. Validate and normalise it in `server/config.ts` alongside the other project fields; keep load-time dropping consistent with existing rules.
3. Accept it on project create/edit routes (no new route).
4. Add the form field with its hint and server-error display.
5. Add the named tests; run gates.

## Boundaries

No spawning, no Start button, no inference of commands, no per-project environment variables.

## Technical Verification

Focused `node:test` runs during iteration; handoff runs `npm run build` (includes typecheck) and `npm test` per AGENTS.md Verification Policy. Later evaluation follows `agent-skills/references/check-method.md`.

## Technical Evidence

**Per criterion**
1. `Project.launch?: {command}` added in `shared/types.ts`; config stays version 2. Test "loads a V2 file without launch unchanged" passes (DATA-01).
2. Validation in `server/config.ts` (`launchCommand`, `validateProject`): trimmed, 1..1000 chars, no CR/LF/NUL; invalid -> 400 "Launch command must be one line of 1 to 1000 characters", nothing written (API run: multi-line and blank PUT both 400, file unchanged). Invalid stored command dropped on load, project kept (`parseProject`).
3. Folder and port are not required to save a command (test "kept as entered… needs neither folder nor port"); form hint says launching needs a folder and preferred port and that `{port}` is replaced.
4. Command is stored and returned as entered; nothing executes, parses or derives it. No new route.
5. `node:test` cases in `server/discovery.test.ts` describe "launch command": kept as entered; refuses empty/whitespace/over-length/multi-line/NUL/non-string/non-object; save-reload-clear through `ConfigStore`; invalid stored command dropped with project kept; V2 without launch unchanged.
6. Scenario (real server on SHED_PORT=4791, temp config, `X-Shed` header, run from WSL-hosted Shed): add with command -> stored; invalid edits -> 400 with reason; restart -> command still present; edit -> new command; PUT without `launch` -> cleared. Error text is shown by the existing form error line. The form's rendering was NOT checked in a browser (no screenshot).

**Commands:** `npm run typecheck`, `npm run build` (ok), `npm test` (89 pass, 0 fail; 5 new). No lint gate.
**Files read:** the six Context Files plus `server/registry.test.ts` head (test style) and `package.json` scripts (how to start the server) - extra reads. **Changed:** `shared/types.ts`, `server/config.ts`, `server/discovery.test.ts`, `client/src/ProjectForm.tsx`. `client/src/api.ts` needed no change (`ProjectDraft` derives from `Project`).
**Limitations:** UI not visually verified; the new form field has no style tweak (reuses existing label layout; a `<small>` hint).

## Drift Notes

Record schema or route deltas for Design reconciliation before Check.

Delta: Project gains optional `launch: {command}`; create/edit routes accept it (no new route). PUT replaces the whole project, so a client that omits `launch` clears it.
