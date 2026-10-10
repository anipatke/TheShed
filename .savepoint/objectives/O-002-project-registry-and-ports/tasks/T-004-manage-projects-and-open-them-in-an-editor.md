---
id: T-004
title: Manage projects and open them in an editor
objective: O-002
status: done
depends_on: [{task: T-003, requires: clear}]
owner_validation:
    required: true
    accepted_check: C-006
    accepted_by: {role: owner, session: owner-o002-completion-20261010-054734}
planned_by: {role: planner, session: planning-o002-2026-10-10}
check_waiver:
    task: T-004
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T04:39:45Z"
---

# Manage projects and open them in an editor

## Outcome

The page shows registered projects as cards that light up when running and absorb their matched discovered service, lets the developer register a project from scratch or from a discovered card, edit its folder, environment and preferred port, shows port-conflict warnings, and offers Open in VS Code / Open in Cursor links for projects with a folder.

## User Check

Register one project from a discovered running card and one from scratch with a folder and port. Confirm the running one shows as a single lit card (no duplicate discovered card) keeping its star and name, the other shows as not running, a clashing port shows a warning on both cards, and the editor links appear only on projects with a folder.

## Done When

- `client/src/model.ts` builds project items from config + matches; a matched service is not also shown as its own card; unmatched projects show not running (or their URL-probe status).
- Register-from-scratch form: name, optional folder with environment (Windows / WSL / Linux, defaulted from folder form), optional preferred port, optional URL; server errors are shown and the form can be retried.
- Register-from-discovered: a discovered card's menu offers "Register as project", prefilled with its name, environment, folder and port, and sends its identity key so its star and rename move over.
- Edit and remove work for every project; a V1 project without a folder looks and behaves as before.
- Conflict warnings name the other project or the holding process; nothing changes a port.
- Editor links: `vscode://file/<path>` and `cursor://file/<path>` for Windows; `vscode://vscode-remote/wsl+<distro>/<path>` and the `cursor://` equivalent for WSL (hidden when the distro is unknown); local file form for Linux. Paths are URL-encoded per segment. The server runs nothing.
- Recorded UI scenario (screenshots or scripted headless browser run) covering each item above; configured gates pass.

## Context Files

`client/src/model.ts`, `client/src/App.tsx`, `client/src/Card.tsx`, `client/src/api.ts`, `client/src/styles.css`, `shared/types.ts` (read only).

## Design References

Design: Architecture 7; Components/Codebase Map (client rows); Interfaces and Data Flow (Kind vs status). Objective O-002: Architectural Considerations (Status, API, Editor links) and Confirmed Decisions.

## Guardrails

SEC-03, SEC-04, SCOPE-02, TEST-01, STYLE-01, STYLE-03, STYLE-04.

## Implementation Plan

1. Confirm T-003's matches, conflicts and distro are in `State`; return REPLAN REQUIRED if not.
2. Extend the view model with project items, absorbed services and conflicts.
3. Replace the add form with the registry form; add "Register as project" to discovered cards.
4. Add the conflict warning and editor links to project cards, in the existing Atari-Noir styles.
5. Record the UI scenario.

## Boundaries

No server changes except a REPLAN if an API gap appears. No launch controls or launch-command field. No automatic port changes.

## Technical Verification

Recorded UI scenario per TEST-01 (no client test suite exists); handoff gates per AGENTS.md Verification Policy. Evaluated later through `agent-skills/references/check-method.md`. Owner validation: the owner tries the User Check on the page.

## Technical Evidence

**Per-criterion outcomes** (scripted headless Chromium run against the built app: Shed on WSL2 Ubuntu, `SHED_PORT=4790` with a throwaway config, a demo HTTP service on :5301 started from a folder holding a `package.json`; 15 checks, all PASS):
- View model: `buildSections` now builds project items from config + `scan.matches`; matched services are skipped as their own cards. Run: after registering the discovered `demo-app`, exactly one `demo-app` card, live, one `:5301` card. Unmatched projects with no URL show Offline / "Not running" (Scratch, NoFolder, WinProj); unmatched with a URL use the URL probe (code path, not exercised in the run).
- Register from scratch: name, folder, env (Detect / Windows / WSL / Linux), port, URL. Run: Windows env + a POSIX folder showed the server error "Folder is not a windows path" and kept the form open; switching env to Detect and resubmitting succeeded.
- Register from discovered: "Register as project…" menu item prefilled name, port 5301, URL and folder/env; star kept on the new card (favourite moved via `fromKey`).
- Edit / remove: edited Scratch's port to 5302 and its warning (and demo-app's) disappeared; removed NoFolder. The no-folder project behaved like a V1 project (URL-less card, no editor links).
- Conflicts: with Scratch and demo-app both on 5301 each card showed "Port 5301 is also set for <other>". The holder-process wording is built from `PortConflict.holder` but not exercised in the run. Nothing changes a port.
- Editor links: Windows `C:\dev\my app` → `vscode://file/C:/dev/my%20app`, `cursor://file/C:/dev/my%20app`; WSL → `vscode://vscode-remote/wsl+Ubuntu/<path>` and `cursor://` form; none on the folderless project. The Linux and unknown-distro-hidden branches are in `editorLinks` but not exercised. The server runs nothing.
- Screenshots (scratchpad, not committed): 1-register-from-discovered, 2-error-shown, 3-cards, 4-final.

**Commands run:** `npm run typecheck` (clean), `npm run build` (pass), `npm test` (82 pass, 0 fail) after the last code change; no linter is configured.

**Files read:** the six Context Files except `Card.tsx`/`styles.css` read in full. **Extra reads (outside Context Files):** `server/index.ts` (project routes and `fromKey` handling) and `server/config.ts` (`validateProject`, env inference), to match the request shape and avoid duplicating env inference (STYLE-04); `server/scan.ts` lines 105-125 (found it reports "No URL to probe" as unverified, so the client treats URL-less unmatched projects as not running); `server/registry.ts` head; `.savepoint/Guardrails.md` rule lines; `.savepoint/config.yml`.
**Files changed:** `client/src/model.ts`, `client/src/Card.tsx`, `client/src/App.tsx`, `client/src/api.ts`, `client/src/styles.css`; new `client/src/ProjectForm.tsx`. No server changes.

**Limitations:** run was WSL-hosted only, so Windows-hosted server and a real VS Code/Cursor launch are not verified (that is T-005 / the Full Check). The link-opening itself was not clicked. Holder-process warning text, Linux links and hidden-when-distro-unknown were not exercised. Env "Detect from folder" relies on the server's inference. Owner validation (User Check) is still required.

## Drift Notes

None yet.

## Renewed Owner Acceptance

2026-10-10T05:47:34Z: Owner explicitly renewed the recorded validation against C-006 and approved O-002 completion by exception. Previous acceptance of C-005 remains recorded in I-008 history; no editor clicks or User Check were requested again.
