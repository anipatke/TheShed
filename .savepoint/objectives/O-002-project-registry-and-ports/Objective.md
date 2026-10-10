---
id: O-002
title: Project registry and ports
status: done
depends_on: []
release: G-002
priority: high
rank: 1
owner_validation:
  required: true
  accepted_check: C-006
  accepted_by: {role: owner, session: owner-o002-completion-20261010-054734}
exception:
  requirements: [TEST-01, TEST-03, 'T-002 evidence timing/browser cells', 'T-003 refresh race evidence', 'T-004 browser evidence branches', 'T-005 exact-platform migration/matching evidence']
  reason: Owner explicitly renewed the existing browser, race, failure-timing and exact-platform evidence waivers against C-006 and approved O-002 completion by exception after independent Design verification. No additional requirement or product defect is waived.
  owner: owner-o002-completion-20261010-054734
  recorded_at: '2026-10-10T05:47:34Z'
  check: C-006

---

# O-002: Project registry and ports

## Outcome

The developer keeps a list of projects that exists whether or not they are running. Each project has a name, an optional folder with its environment (Windows, WSL or Linux) in that environment's own path form, an optional preferred port and an optional URL. The Shed shows which registered projects are running by matching them to discovered services, flags port conflicts, and links each project's folder into VS Code or Cursor. Existing manual projects become registered projects with nothing lost; one without a folder keeps working exactly as before.

## Why

The registry is useful before anything is launched, adds no command-execution risk, and is the foundation the launch Objective (O-003) builds on. The owner agreed to receive it first (2026-10-10).

## Success Conditions

1. A registered project, its folder and its preferred port survive a server restart, including a restart that moves the server between WSL Node and Windows Node.
2. A V1 config file migrates to the new format with every manual project, favourite, hide rule and override kept; a broken file is still moved aside, never deleted (DATA-01).
3. A running service in a registered project's folder (or on its preferred port, in the same environment) is shown as that project, on one card, with no separate discovered card for it; a project not running is shown as not running.
4. Two projects with the same preferred port, or a preferred port held by an unrelated listener, are flagged. Nothing changes a port automatically.
5. "Open in VS Code" and "Open in Cursor" open the right folder for one Windows and one WSL project on a real Windows + WSL machine.
6. Configured gates (`npm run typecheck`, `npm run build`, `npm test`) pass; the implementation meets every Blocker and Required rule in `.savepoint/Guardrails.md`.

## Architectural Considerations

- **Data:** `Config` moves to `version: 2` with a `projects` list replacing `manual`. A project is `{ id, name, env?, folder?, port?, url? }`; `env` is required exactly when `folder` is set. Favourites, hide rules and overrides are unchanged. Migration happens on load in `server/config.ts`; validation keeps dropping bad entries rather than failing the file. A migrated project keeps its id; favourites keyed `manual:<id>` are rewritten to `project:<id>`.
- **Migration environment:** a V1 folder's environment is inferred from its form: a Windows drive or non-WSL UNC path → `windows`; a `\\wsl.localhost\<distro>\…` or `\\wsl$\<distro>\…` path → `wsl`, stored in POSIX form; an absolute POSIX path → `wsl` when the server host is Windows or WSL, `linux` on a plain Linux host. A V1 project without a folder migrates without one.
- **Folder rules:** the folder's form must match its environment (Windows drive or UNC path for `windows`; absolute POSIX path for `wsl`/`linux`). A `\\wsl.localhost\<distro>\…` path for a WSL project is normalised to its POSIX form. Reuse the existing cross-boundary translation in `server/identify.ts`; do not duplicate it (STYLE-04).
- **Matching and conflicts** are pure server functions, so they get `node:test` coverage (the client has no test suite). Match by environment + normalised folder first (Windows case-insensitive), then environment + preferred port. A project takes at most one service: a folder match on its preferred port first, then a port match, then a folder match ranked web > http > other and lowest port. Other services in the same folder (editor helpers) keep their own cards. Windows and WSL are treated as one port space for conflicts, because under mirrored networking they share localhost ports. A preferred port held by a listener not matched to that project is a conflict.
- **Status:** a matched project takes the service's status. An unmatched project with a URL is probed as manual projects are today; an unmatched project without one is not running.
- **API:** `/api/projects` create, update and delete routes replace `/api/manual`; responses stay the full `State`, extended with matches and conflicts. Creating a project from a discovered card names that card's identity key, and its favourite and override move to the project in the same write. Mutations gain a required `X-Shed` request header, which forces a CORS preflight that the server never grants.
- **Editor links** are built in the client as `vscode://` / `cursor://` URLs (WSL folders use the `vscode-remote/wsl+<distro>` form, so the distro name is exposed in scan state). The server runs nothing for this. SEC-02 and SCOPE-02 are unchanged in this Objective.
- **Platform evidence for the Full Check:** a recorded run on a real Windows 11 + WSL2 machine naming the networking mode and which side hosted the server (TEST-03), covering migration, the restart, matching and editor links.

## Confirmed Decisions

Owner, 2026-10-10 ("rest of scope approved"), adopting the planner's recommendations:

- Manual projects are folded into the registry (one concept) instead of being kept as a separate list.
- Ports are preferences: conflicts are warnings, never auto-resolved.
- Editor opening uses browser URL schemes, not a server subprocess.
- Automatic port suggestion from a range is left out for now.

Owner, 2026-10-10, Objective decision interview and design confirmation:

- A folder is optional. A V1 manual project without one migrates unchanged and works as before; it has no editor links (and, in O-003, cannot be launched) until a folder is added.
- A running registered project shows as one card. The discovered card for that service is not shown separately; registering from a discovered card moves its favourite and rename to the project.
- The design above (outcome, success conditions, boundaries, technical decisions) is confirmed for Task planning.

## Boundaries

**In scope:**
- Config v2 schema, validation and migration
- Projects API routes and request hardening header
- Matching registered projects to discovered services; port-conflict detection
- Registry UI: register from scratch, from a discovered card, or from a former manual project; edit port; conflict warnings; editor links

**Out of scope:**
- Launching, stopping or signalling any process (O-003)
- Launch commands (the field arrives with O-003)
- Automatic port suggestion or reservation
- Editing project configuration files

## Owner Completion Decision

Owner, 2026-10-10T05:47:34Z, explicitly answered “YES” to applying existing waivers and acceptance to C-006 and marking O-002 complete. All owned Tasks are done. C-006 independently verified the final Design repair and passing gates; no actionable unwaived repair remains. Completion is by exception, not technical CLEAR. I-006, I-007 and I-008 are resolved by owner acceptance against C-006; previous Check records remain immutable.
