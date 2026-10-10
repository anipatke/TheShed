---
id: T-010
title: Start and stop projects from their cards
objective: O-003
status: done
depends_on: [{task: T-009, requires: clear}]
owner_validation:
    required: true
    accepted_check: ""
planned_by: {role: planner, session: planning-o003-2026-10-10}
check_waiver:
    task: T-010
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T07:17:19Z"
---

# Start and stop projects from their cards

## Outcome

A launchable project card has Start, Stop and Restart controls, shows whether its run is starting, running, exited or failed, opens a plain-text view of recent output, and explains a failed launch with its exit code and last lines. Running services are labelled Managed when The Shed started them and External otherwise.

## User Check

Start a project from its card, watch it go from Starting to Running with a Managed label, open its output, then stop it. Start a project whose port is already in use and read the refusal. Confirm a dev server you started yourself shows External and offers no Stop.

## Done When

- Start appears only when the project has a launch command, folder, environment and preferred port and The Shed is hosted in that environment; otherwise a short reason says what is missing (owner decision, 2026-10-10).
- Stop and Restart appear only while the project has an active run. Discovered cards and External services never offer Stop.
- The card shows run state; `exited`/`failed` shows exit code or signal, the message, and the last output lines in an error panel; a refused start shows the server's reason.
- An output view shows the ring buffer as plain text (never HTML), refreshed by polling while open and while any run is starting or stopping.
- Managed: a project with an active run, and its matched service. External: any other running service, including a registered project matched without a run. If a running project's matched service is on a different port than assigned, a mismatch warning is shown.
- Pure model logic (eligibility, Managed/External, mismatch) has `node:test` cases; UI behaviour has recorded scenarios (screenshots or headless browser) for Start → Running, Stop, refused start, early exit panel, output view, and an External service without Stop.

## Context Files

`client/src/Card.tsx`, `client/src/model.ts`, `client/src/App.tsx`, `client/src/LogPanel.tsx`, `client/src/styles.css`, `client/src/api.ts`, `server/registry.test.ts`, `shared/types.ts`.

## Design References

Design Architecture 7, Interfaces and Data Flow (Kind vs status, Project cards, Editor links), Components/Codebase Map (client modules).

## Guardrails

SEC-03, SCOPE-02, TEST-01, TEST-02, STYLE-01, STYLE-04.

## Implementation Plan

1. Confirm `State.runs` and the client API calls exist as planned; return REPLAN REQUIRED if not.
2. Add pure model helpers for eligibility, Managed/External and mismatch, with tests.
3. Add card controls, run state and the error panel.
4. Add the output view with polling.
5. Style within the Atari-Noir tokens.
6. Record UI scenarios; run gates.

## Boundaries

No confirmation dialogs beyond what is needed, no log search/download, no environment-variable editor, no cross-environment controls.

## Technical Verification

Focused tests during iteration; handoff runs `npm run build` and `npm test`. Owner validation follows the User Check. Later evaluation follows `agent-skills/references/check-method.md`.

## Technical Evidence

Per criterion (executor claims, to be verified by a Check):

1. Start only when launchable, else a reason: `startBlock` in `client/src/runs.ts` reuses the server's own rules from new `shared/launch.ts` (STYLE-04). Tests `server/runs.test.ts` "startBlock" (5 cases). Scenario: "No command app" showed "Cannot start: ... needs a launch command" with no Start (screenshot 1).
2. Stop/Restart only with an active run; never for discovered or External: only `RunControls` (project cards) renders them, gated on `isActiveRun`. Scenario: External app and Busy port app showed Start only, no Stop (1, 6); running Okay app showed Stop, Restart, Output (3).
3. Run state, error panel, refusal reason: Scenario 2/3 Starting then RUNNING · PORT 5391; scenario 7 Crashing app showed FAILED, "Launch failed (code 3)", message with last output lines; scenario 6 refusal "Port 5392 is in use by node (pid 1142878)." shown on the card.
4. Output view as plain text, polled: `client/src/LogPanel.tsx` (text node in `<pre>`, polls every 1.5 s while open); App polls state every 1 s while a run is starting/stopping or a start/stop request is unanswered. Scenario 4: log line `tick <b>not html</b>` shown literally; DOM check found no `<b>` element.
5. Managed/External/mismatch: `ownershipOf`, `portMismatch` with tests "ownershipOf", "portMismatch", "cards carry run information". Scenarios: Okay app MANAGED while running; External app and discovered services EXTERNAL. The mismatch warning is covered by tests only (no UI scenario).
6. Tests plus scenarios: 14 new `node:test` cases in `server/runs.test.ts`; seven screenshots in `docs/evidence/T-010/`. Not recorded as screenshots: Restart, and the Starting state caught mid-request (the 2-starting shot shows the previous Stopped state plus a Starting… button).

Commands run: `npm run typecheck` pass; `npm run build` pass; `npm test` 137 pass, 0 fail. No linter configured.

Scenario setup: this machine (WSL, mirrored networking, Shed hosted in WSL), throwaway config in the scratchpad, Shed on port 4790, headless Chromium driven over the DevTools protocol. After the Stop scenario port 5391 was free and no `srv.js 5391` process remained.

Files read: the Context Files except `client/src/LogPanel.tsx` (did not exist; created) and `server/registry.test.ts` (read first 25 lines for test conventions).
Extra reads, with reason: `server/supervisor.ts` and `server/index.ts` (what the start/stop/log routes return and refuse, to match the UI); `shared/types.ts` run types; `client/src/ProjectForm.tsx` (grep only, confirm launch field exists); `scripts/dev.mjs`, `tsconfig.client.json`, `package.json` (gate and run setup).
Files changed: `client/src/{Card.tsx,App.tsx,model.ts,styles.css}`; new `client/src/{runs.ts,LogPanel.tsx}`, `shared/launch.ts`, `server/runs.test.ts`, `docs/evidence/T-010/*.png`; `server/supervisor.ts` edited (extra, outside Context Files) to import the shared launch rules instead of its own copies, no behaviour change (`server/supervisor.test.ts` still passes).

Limitations: Windows-hosted and cross-environment starts were not tried (only WSL→WSL); owner validation (User Check) not yet done; a start takes about 3 s to answer because it waits on a fresh scan, so the first Starting frame can lag. No optional Task Check requested yet.

## Drift Notes

Record any change to card status semantics for Design reconciliation.

- Every running discovered service card and row now carries an EXTERNAL tag; project cards carry MANAGED or EXTERNAL. Card Live/Offline status semantics are unchanged.
- Launch eligibility rules now live once in `shared/launch.ts`, used by both server and client.
