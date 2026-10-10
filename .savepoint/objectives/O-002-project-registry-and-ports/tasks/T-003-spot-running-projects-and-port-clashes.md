---
id: T-003
title: Spot running projects and port clashes
objective: O-002
status: done
depends_on: [{task: T-002, requires: clear}]
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o002-2026-10-10}
check_waiver:
    task: T-003
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T04:29:39Z"
---

# Spot running projects and port clashes

## Outcome

Each scan reports which discovered service, if any, belongs to each registered project and which ports clash, so the page can show a running project as one card and warn about conflicts. The WSL distro name is exposed in scan state for editor links.

## User Check

With one registered project running and one stopped, plus two projects sharing a preferred port, fetch `/api/state` and confirm the running one is matched to its service, the stopped one is unmatched, and the shared port is listed as a conflict naming both projects.

## Done When

- A pure function maps projects + services to matches using the Objective's Matching rule: same environment; folder compared normalised (Windows case-insensitive, trailing separator ignored); a folder match on the preferred port first, then a port match, then a folder match ranked web > http > other and lowest port; at most one service per project and one project per service.
- A pure function reports conflicts: two or more projects with the same preferred port (Windows and WSL as one port space), and a preferred port held by a listener not matched to that project (naming its environment and process when known). Nothing is changed automatically.
- Folders used for matching come from a service's `projectDir` or its override folder.
- `State` (or `ScanResult`) carries the matches, conflicts and `host.distro`; unmatched projects keep their URL-probe status from T-002.
- `node:test` cases cover each matching rule and tie-break, Windows case-insensitivity, cross-environment non-match, helper process left unmatched, the duplicate-port and held-port conflicts, and Windows/WSL sharing a port space.
- Configured gates pass.

## Context Files

`server/registry.ts` (new), `server/registry.test.ts` (new), `server/scan.ts`, `shared/types.ts`.

## Design References

Design: Interfaces and Data Flow (Scan pipeline, Identity key, Kind vs status). Objective O-002: Architectural Considerations (Matching and conflicts, Status).

## Guardrails

DISC-02, SEC-02, SEC-03, TEST-01, STYLE-01, STYLE-03, STYLE-04.

## Implementation Plan

1. Confirm T-002's `Project` type and project probing exist; return REPLAN REQUIRED if they do not.
2. Write the pure match and conflict functions in `server/registry.ts`.
3. Call them at the end of a scan (and after a project-only refresh) and add the results and distro to the shared types.
4. Add the named tests.

## Boundaries

No client changes (next Task). No new discovery sources, probes or subprocesses; no reading of user-entered folders.

## Technical Verification

Focused `node --test server/registry.test.ts` while iterating; handoff gates per AGENTS.md Verification Policy. Evaluated later through `agent-skills/references/check-method.md`. Real-machine matching evidence is collected in the final O-002 Task.

## Technical Evidence

Dependency T-002 is `done`; `Project` type and `probeProjects` exist, so no replan.

**Per-criterion outcomes**
- Match function: `matchProjects` in `server/registry.ts`. Same environment; `normaliseFolder` (Windows case/separator-insensitive, trailing separator ignored). Three tiers run across all projects in order (folder+port, port, folder ranked web > http > other then lowest port); claimed sets enforce one service per project and one project per service. Tests: `matchProjects` suite (11 cases) and `normaliseFolder` suite.
- Conflict function: `findPortConflicts`. Groups projects by preferred port, one port space across Windows/WSL; reports ≥2 projects, or a listener on the port not matched to any project preferring it (holder carries env and process name). Tests: `findPortConflicts` suite (6 cases).
- Folders come from the override folder (by `favouriteKey`) else `projectDir`. Test: "uses an override folder instead of the inferred one".
- `ScanResult` now carries `matches`, `conflicts`, `host.distro`; `scan()` and `Scanner.refreshProjects()` both call `resolveProjects`. Unmatched projects keep T-002 URL-probe status (`projects` untouched).
- Tests cover: each tier and tie-break, Windows case-insensitivity, cross-environment non-match, helper left unmatched, duplicate-port and held-port conflicts, Windows/WSL shared port space, and the User Check scenario (`resolveProjects` suite).
- Gates: `npm run typecheck` pass; `npm run build` pass; `npm test` 82/82 pass (focused `node --test server/registry.test.ts` 21/21). Lint not configured.

**Files read:** Task, Objective O-002, router, `shared/types.ts`, `server/scan.ts`. **Extra reads (logged):** `server/identify.ts` (to reuse path conventions and host context), `server/index.ts` grep and `server/discovery.test.ts` head (to see how scan results and tests are wired), `.savepoint/Guardrails.md` grep (rule text), `.savepoint/config.yml` head (gates).
**Files changed:** `server/registry.ts` (new), `server/registry.test.ts` (new), `server/scan.ts`, `shared/types.ts`; router `state` set to `task`; this Task set to `in_progress`/`audit`.

**Decisions and limitations**
- A project with no folder has no environment, so its preferred port matches a listener in any environment (the Objective's wording only covers same-environment). Easy to tighten if the owner prefers.
- Because a port match outranks a folder match (per the Matching rule), a project whose preferred port is held by another folder's service in its environment takes that service; the conflict function does not flag that case, as it is a match. Real-machine matching evidence is left to the final O-002 Task.
- No client changes, per Boundaries. The `User Check` via live `/api/state` was not run against a real server; covered by the `resolveProjects` unit test instead.

## Drift Notes

None yet.
