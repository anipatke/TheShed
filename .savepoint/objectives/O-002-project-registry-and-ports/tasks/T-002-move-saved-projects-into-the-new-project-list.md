---
id: T-002
title: Move saved projects into the new project list
objective: O-002
status: done
depends_on: []
owner_validation:
    required: false
    accepted_check: ""
planned_by: {role: planner, session: planning-o002-2026-10-10}
check_waiver:
    task: T-002
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T04:26:49Z"
---

# Move saved projects into the new project list

## Outcome

The settings file holds a `version: 2` project registry in place of the V1 manual list. A V1 file upgrades on load with every manual project, favourite, hide rule and override kept. The `/api/projects` routes replace `/api/manual`, every mutation requires the `X-Shed` header, and the existing page keeps adding, editing and removing projects through the new routes.

## User Check

Start The Shed against a copy of a real V1 `data/config.json` that has manual projects with and without folders and a starred manual project. Confirm every project is still listed and starred, and that adding, editing and removing a project from the page still works. Confirm a mutation sent without `X-Shed` is refused.

## Done When

- `sanitizeConfig` turns a V1 config into V2: each manual project becomes a project with the same id, name, URL and folder; folderless ones keep no folder and no environment; `manual:<id>` favourites become `project:<id>`; hide rules and overrides are byte-for-byte the same entries.
- Folder environment inference follows the Objective's Migration environment rule, including `\\wsl.localhost\<distro>\…` and `\\wsl$\<distro>\…` normalised to POSIX form, using a translation that lives beside `toLocalPath` in `server/identify.ts` (STYLE-04).
- Validation: `env` is required exactly when `folder` is set and the folder form must match the environment; `port` is an integer 1–65535; URL rules are unchanged. Invalid entries are dropped on load; invalid requests get 400 with a reason.
- A broken file is still moved aside, never deleted; the upgraded file is written atomically on the next change (DATA-01).
- `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` exist; `/api/manual` is gone. Delete removes the project's favourite. `POST` may name a discovered identity key (`fromKey`); that key's favourite and override move to the new project in the same write. The 500-entry addition limit still applies.
- Every non-GET API request without an `X-Shed` header is refused with 403; the client sends it on every mutation.
- The page's existing add/edit/remove flow works against the new routes (card still labelled as today; new registry UI is a later Task).
- `node:test` cases cover: V1→V2 upgrade (with and without folders, each folder form, both host kinds), favourite key rewrite, env/folder mismatch rejection, port validation, a V2 file loading unchanged, and the `fromKey` move. API behaviour (routes, 403 without header, 400 cases) is a recorded scenario of requests and responses.
- Configured gates pass.

## Context Files

`shared/types.ts`, `server/config.ts`, `server/identify.ts`, `server/index.ts`, `server/scan.ts`, `server/discovery.test.ts`, `client/src/api.ts`, `client/src/model.ts`, `client/src/App.tsx`, `client/src/Card.tsx`.

## Design References

Design: Architecture 6–7; Interfaces and Data Flow (API table, Data ownership, Identity key). Objective O-002: Architectural Considerations (Data, Migration environment, API) and Confirmed Decisions.

## Guardrails

DATA-01, SEC-04, SEC-02, SCOPE-03, TEST-01, TEST-02, STYLE-02, STYLE-04.

## Implementation Plan

1. Replace `ManualProject`/`ManualStatus` with `Project`/`ProjectStatus` and `Config.version: 2` in `shared/types.ts`.
2. Add the UNC-WSL → POSIX translation beside `toLocalPath`; add the env-from-folder inference used only by migration.
3. Add `parseProject` and the V1 upgrade inside `sanitizeConfig`; give `ConfigStore` the server host so POSIX folders get the right environment. Keep the per-list capacity check over `projects`.
4. Swap the manual routes for project routes in `server/index.ts`, add `fromKey`, and add the `X-Shed` check beside the Origin check.
5. Rename the scan's manual probing to project probing (same behaviour: probe a project's URL), without matching — matching is the next Task.
6. Point the client's API wrapper and existing manual-project UI at the new routes and types with the smallest change; send `X-Shed`.
7. Add the named tests; record the API scenario.

## Boundaries

No matching, conflict detection, editor links or new registry UI (later Tasks). No launch fields. No change to discovery, probing rules or hide rules.

## Technical Verification

Focused `node --test` runs while iterating; handoff runs `npm run typecheck`, `npm run build`, `npm test` per AGENTS.md Verification Policy. Evaluated later through `agent-skills/references/check-method.md`. Real-machine migration evidence is collected in the final O-002 Task.

## Technical Evidence

**Per criterion**

- V1→V2 upgrade: met. `sanitizeConfig(raw, host)` upgrades any non-`version: 2` file; ids, names, URLs and folders kept; folderless projects keep no folder/env; `manual:<id>` favourites become `project:<id>`; hide rules and overrides deep-equal the input. Tests: `config version 2` › "upgrades a V1 file on a WSL host…", "rewrites manual favourites…", "puts a POSIX folder in linux on a plain Linux host, wsl on Windows or WSL".
- Environment inference: met. `wslUncToPosix` sits beside `toLocalPath` in `server/identify.ts`; `inferFolderEnv` in `server/config.ts`. Tests: `WSL UNC paths`, "infers the environment from the folder only when asked to", the six-folder V1 case (drive, POSIX, `\\wsl.localhost`, `\\wsl$`, non-WSL UNC).
- Validation: met. `validateProject` returns the project or a reason; env required exactly when folder set; form must fit env; port integer 1–65535; URL rules unchanged. Dropped on load, 400 on request. Tests: `project validation` (5 cases) and "V2 file loading unchanged".
- Broken file and atomic write: met. Existing move-aside logic untouched; test "moves an unparseable file aside instead of deleting it"; test "upgrades a V1 file on disk and writes V2 on the next change" shows load does not rewrite the file.
- Routes: met. `POST/PUT/DELETE /api/projects`, `/api/manual` gone (404 in scenario below). Delete removes the `project:<id>` favourite. `POST` accepts `fromKey`; `addProject` moves the favourite and override in one write (tests: `registering a discovered card`). The 500-entry limit test now runs over `projects`.
- `X-Shed`: met. Every non-GET `/api/*` request without it gets 403; client sends it on every call.
- Page flow: met at code level (client points at the new routes and `project:` keys; card still labelled MANUAL). Not clicked through in a browser in this session.
- Gates: pass (see commands).

**API scenario** (server run with `SHED_PORT=4791` on WSL, mirrored networking, against a V1 file with a folderless project, a POSIX-folder project, a Windows-folder project and a starred manual project):

- Load: three projects, ids kept, envs `—`/`wsl`/`windows`; favourite `project:a`; hide rule unchanged; file on disk still `version 1` until a change.
- `POST /api/projects` without header → 403 "Missing X-Shed header". `PUT` without header → 403. `PUT /api/overrides` without header → 403.
- `POST` with header and folder `/home/me/new` → 200 (env inferred `wsl`). Folder `rel` → 400 "Folder must be an absolute path". `env: windows` with a POSIX folder → 400 "Folder is not a windows path". `port: 0` → 400 "Port must be a whole number from 1 to 65535".
- `PUT /api/projects/a` → 200; `DELETE /api/projects/a` → 200; file then `version 2` with the project and its favourite gone. `POST /api/manual` → 404.

**Commands run:** `npm run typecheck` (clean), `npm test` (61 tests, 61 pass), `npm run build` (typecheck + vite build, succeeded). Focused runs while iterating were the same `npm test`.

**Files read:** the ten Context Files that exist were read in part or whole (`shared/types.ts`, `server/config.ts`, `server/identify.ts`, `server/index.ts`, `server/scan.ts`, `server/discovery.test.ts`, `client/src/api.ts`, `client/src/model.ts`, `client/src/App.tsx`, `client/src/Card.tsx`). **Extra reads:** `package.json` and `.savepoint/config.yml` (to find the gate commands); `.savepoint/objectives/O-002-…/Objective.md` (owning Objective, for the migration rules).

**Files changed:** `shared/types.ts`, `server/config.ts`, `server/identify.ts`, `server/index.ts`, `server/scan.ts`, `server/discovery.test.ts`, `client/src/api.ts`, `client/src/model.ts`, `client/src/App.tsx`, `.savepoint/router.md` (task selection). No Card.tsx change was needed.

**Limitations**

- The page was not exercised in a browser; the User Check against a real V1 file is still the owner's.
- The page sends no `env`; the server infers it from the folder's form (for requests as well as V1 files). The explicit-env 400s are covered by tests and the scenario above.
- A project saved with no URL shows a card with an empty link and "No URL to probe"; nothing in the page can create one yet (new registry UI is a later Task).
- A config with a `version` above 2 is treated like V1 (its lists would be dropped); not handled, out of scope.
- Real-machine Windows + WSL evidence is left to the final O-002 Task.

## Drift Notes

None yet.
