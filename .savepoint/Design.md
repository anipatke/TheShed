---
type: project-design
status: active
---

# TheShed — Design

> Describes implemented reality as of 2026-10-10 through O-003's controlled launch (T-006..T-011, repaired for I-009/I-010). Discovery evidence and platform findings live in `docs/SPIKE.md`; V1 acceptance results in `docs/V1-DESIGN.md`. O-002 evidence and exceptions live in its Tasks, Checks and I-008; O-003 evidence in its Tasks, C-007 and `docs/evidence/`; implementation here does not imply Objective clearance.

## Architecture

1. **One local Node process** serves both the JSON API and the built UI. It binds `127.0.0.1` only. The address is a constant, not configuration (`server/index.ts`).
2. **Zero runtime dependencies on the server.** Node built-ins only, run as TypeScript through Node's native type stripping (Node ≥ 22.18). The same checkout runs under WSL Node or Windows Node.
3. **Discovery is read-only and command-fixed.** OS queries run constant scripts through `execFile` (no shell interpolation). No request data and no discovered data ever reach a command line, script body or argument. **Launch is separate and narrow:** only `server/supervisor.ts` starts or stops project processes, and only a registered project's own launch command, on an explicit user action (SEC-02, SCOPE-02).
4. **Sources are isolated.** Each environment's discovery runs in parallel; a failing source becomes a per-source report (`ok: false`, `error`), never a failed scan.
5. **Discovered services are untrusted input.** Probes are bounded (timeout, body cap, no redirects). Service text is reduced to plain text. Open URLs are built by the server from the port, never copied from a service.
6. **Persistence is one JSON file.** Config version 2 holds registered projects, favourites, hide rules and overrides. V1 manual projects migrate on load; the upgraded file is written on the next change. Invalid entries are dropped, an unparseable file is moved aside, and updates use a temp file then rename before committing in-memory state.
7. **The UI is a React SPA** with no routing library and no state library. All writes go through the API, which returns the full new state. Registered projects exist when stopped, absorb a matched service into one card, show conflict warnings and offer browser editor links.

## Components/Codebase Map

| Module | Purpose |
|---|---|
| `server/index.ts` | HTTP server: Host/Origin/X-Shed/content-type checks, project and preference routes, static `dist/` serving with SPA fallback, security headers |
| `server/scan.ts` | Host/distro detection, source orchestration, merge/dedupe, WSL-relay overlap removal, naming, service/project probing, matching/conflicts and `Scanner` cache |
| `server/identify.ts` | Project folder from cwd or command line, marker-file root walk, cross-boundary path translation including WSL UNC to POSIX, `package.json` name read |
| `server/probe.ts` | One bounded HTTP(S) GET, classification, `<title>` extraction, loopback check, concurrency helper |
| `server/config.ts` | V1-to-V2 migration, project/environment/port/URL/folder validation, favourite and override transfer, `ConfigStore` atomic writes |
| `server/registry.ts` | Pure folder normalisation, project/service matching and preferred-port conflict detection |
| `server/registry.test.ts` | Matching tiers, ranking, exclusivity, environments, overrides, conflicts and starred-service absorption regression |
| `server/discovery/run.ts` | The only subprocess entry point for discovery (`execFile` wrapper with timeout, buffer cap, stdin handling) |
| `server/supervisor.ts` | The only code that starts or stops projects: `Supervisor` (start, stop, restart, stop-all, run records, 64 KB `LogBuffer`), readiness, bounded stop escalation, port pre-check |
| `server/supervisor.test.ts` · `server/runs.test.ts` | Fake-spawn tests of start/stop/restart/escalation/readiness; run summaries, refusal statuses and a real process-tree stop |
| `shared/launch.ts` | Pure launch rules shared by server and client: launchable check, wrong-environment refusal, active states |
| `server/discovery/posix.ts` | WSL/Linux discovery script (`ss` + `/proc`) and parser; also run via `wsl.exe` from a Windows host |
| `server/discovery/windows.ts` | Windows discovery (PowerShell `-EncodedCommand`) with `netstat`/`tasklist` fallback, and parsers |
| `server/discovery/listener.ts` | `Listener` type, merge by env+port, text sanitising |
| `server/discovery.test.ts` | `node:test` suite: parsers, inference, folder identification, classification, real-socket probes (body cap, truncation, TLS retry), source orchestration and netstat fallback, wslrelay dedupe, config validation and capacity |
| `shared/types.ts` | Types shared by server and client (`Service`, `Probe`, `Config`, `State`…) |
| `client/src/App.tsx` | Page shell: masthead, refresh/auto, filter, add-project form, sections, discovery notes, hide-rule chips |
| `client/src/Card.tsx` | Card/row, status lamp, menu, discovered-card registration, project edit/remove, conflict warnings and editor links |
| `client/src/runs.ts` · `client/src/LogPanel.tsx` | Run state to Managed/External labels and button availability; recent-output panel |
| `client/src/ProjectForm.tsx` | Shared add/edit/register form for name, optional folder/environment, preferred port and URL; validation, server errors and retry |
| `client/src/model.ts` | Pure view model: overrides, service absorption, favourite retention, kind/status mapping, conflict text, editor URLs, sections and filtering |
| `client/src/api.ts` | Typed fetch wrapper for every API route |
| `client/src/styles.css` | Atari-Noir theme tokens and responsive layout |
| `scripts/dev.mjs` | Runs API (watch) and Vite dev server together |

## Interfaces and Data Flow

**Scan pipeline:** sources (parallel) → `Listener[]` + `SourceReport[]` and optional WSL distro → merge by `env:port` → drop `wslrelay.exe` copies of WSL ports → per listener (16 at a time): identify + probe → `Service[]`. Registered project URLs are probed separately (8 at a time); non-loopback URLs are listed without probing. Pure registry resolution adds `matches` and `conflicts`. The result is cached for 4 s; concurrent requests share one in-flight scan; `?refresh` bypasses the cache. Project mutations re-probe projects and recompute matches/conflicts against cached services before returning state.

**Matching:** use a service's override folder before its inferred folder. Windows comparisons ignore case/separator style; trailing separators are ignored. Across all projects, claim matches in three tiers: folder plus preferred port; preferred port; folder ranked web > http > other then lowest port. Each project and service participates in at most one match. An environment-bearing project matches only its environment; a folderless project has no environment and may match a port in any environment. Helpers left unmatched retain their discovered cards.

**Conflicts:** group registered preferred ports and warn when multiple projects prefer the same port or a listener on it is not matched to one of those projects. Windows/WSL share a port space. Warnings name other projects or the holder's environment/process; no port is changed. Under the implemented matching rule, a same-environment preferred-port match can absorb a service in another known folder without a warning; T-005 records this limitation.

**API** (all requests require loopback `Host`; mutations need `X-Shed`, `Content-Type: application/json` and a localhost or absent `Origin`; no cross-origin preflight is granted; body ≤ 16 KB; `DELETE` takes `{}`; growth past 500 entries in a list is refused with 409 and nothing is written; state and mutation responses return the full `State`, health returns `{ok:true}`):

| Route | Effect |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/state[?refresh]` | `{ scan, config, runs }` |
| `POST /api/projects` · `PUT /api/projects/:id` · `DELETE /api/projects/:id` | Register/edit/remove a project. Optional `fromKey` on create transfers the discovered favourite and override in the same write. Delete removes the project favourite. Invalid requests return 400 with a reason; retired `/api/manual` routes return 404. Deleting a project that is starting, running or stopping returns 409. |
| `POST /api/projects/:id/start` · `/stop` · `/restart` | Launch, stop or restart a registered project. Refusals carry a code and message: 404 unknown project, 400 not launchable (needs folder, environment, port, command), 409 wrong environment, already active, port busy (names the holder from a fresh scan, either side) or not running. |
| `GET /api/projects/:id/log` | Recent plain-text output of the latest run (≤ 64 KB) |
| `PUT /api/favourites` | star/unstar by identity key |
| `POST /api/hidden` · `DELETE /api/hidden/:id` | hide rules: `{kind:'port',env,port}` or `{kind:'process',env,process}` |
| `PUT /api/overrides` | set/clear a user name and folder for an identity key |

**Data ownership:**
- The server owns `data/config.json` (path overridable by `SHED_CONFIG`). Loading keeps every valid entry, however many; the 500-per-list limit applies only to additions. The client never writes storage except the auto-refresh preference in `localStorage`.
- **Project schema:** `{id, name, env?, folder?, port?, url?, launch?: {command}}`. A launch command may contain `{port}`; it is replaced by the validated port integer. Environment is present exactly when folder is present; folder form must fit Windows/WSL/Linux. Preferred port is an integer 1–65535; URL, when supplied, is http(s). Requests may infer a missing environment from the folder. V1 migration retains project IDs, rewrites `manual:<id>` favourites to `project:<id>`, and carries valid hide rules and overrides forward. Windows drive/non-WSL UNC folders infer Windows; WSL UNC folders infer WSL on every host and normalise to POSIX; POSIX folders infer Linux on plain Linux, otherwise WSL. Folderless projects remain folderless.
- **Identity key** (`Service.favouriteKey`): `dir:<env>:<projectDir>#<processName>` when a folder is known, else `port:<env>:<port>`. Favourites and overrides are keyed by it. Registered projects use `project:<id>`.
- **Kind vs status** (client `model.ts`): probe `web`→Website, `http`→API, `tcp`→Other; status is Live for those three, Unverified for `unverified`, Offline for `closed` or a favourite not currently present.
- **Unverified:** a discovered listener whose probe could not connect is reported `unverified`, never `closed`, because the OS has just reported it listening.
- **Project cards:** a matched project's status comes from its service; that service's separate card is suppressed, including any retained favourite fallback. An unmatched project uses its URL probe, or shows Offline / Not running when it has no URL.
- **Editor links:** client-only `vscode://` and `cursor://` URLs. Windows/Linux use the file form; WSL uses `vscode-remote/wsl+<distro>` and is hidden when distro is unknown. Paths are encoded per segment. No folder means no link; the browser builds these; the server is not involved.
- **Launch and stop (O-003):** start passes the stored command to `sh -c` (WSL/Linux, own process group) or `cmd.exe /d /s /c` (Windows) with the project folder as working directory, `PORT` set, and `{port}` substituted. A project can be launched only by a Shed running in its own environment (no Windows-to-WSL launch). Start is refused if the port is busy (bind test; holder named from a fresh scan covering both sides) or held by another run. A run is `starting` until the port accepts connections (60 s limit), then `running`. Stop signals the whole tree: process-group SIGTERM then SIGKILL on WSL/Linux, `taskkill /PID <pid> /T /F` on Windows, and counts as stopped only once the whole group is gone (leader exit alone does not count). Restart is stop, wait for the port to be released (bounded), start. On shutdown The Shed stops its own runs (10 s bound). Runs live in memory only: after a restart The Shed never adopts or stops earlier processes. Cards show Managed (started by The Shed) or External.

## Boundaries

- Does: enumerate TCP listeners on the host and the other WSL/Windows side, probe loopback HTTP, infer folders, persist registered projects/preferences, match projects to services, warn about preferred-port conflicts, and construct editor links in the browser.
- Does: start, stop and restart only registered projects it launched in this server session, on explicit user action.
- Does not: start, stop or signal any other process, adopt processes after a restart, or restart anything automatically; suggest/reserve/reassign ports; probe non-loopback hosts (project URLs elsewhere are listed but not probed); read or execute user-entered folders; require admin/sudo; use a database, network service, account or Docker; support macOS; query WSL distros other than the default.

## Decisions

- **Server can run on either side.** WSL host: `ss`+`/proc` locally, PowerShell via interop for Windows. Windows host: PowerShell locally, `wsl.exe -e sh -c` for WSL. Reason: neither side sees the other's listeners (SPIKE.md).
- **PowerShell runs via `-EncodedCommand`.** `-Command -` on stdin silently broke multi-line blocks (SPIKE.md).
- **Subprocess stdin is always closed and its `EPIPE` swallowed.** A child exiting early otherwise crashed the server (found during build).
- **Refused probe ⇒ unverified.** Mirrored networking does not carry `::1` into WSL; Windows Vite binds `::1`. A WSL-hosted Shed therefore cannot probe Windows Vite. It still lists, identifies and links it.
- **Project `localhost` URLs probe `127.0.0.1` then `::1`**, as a browser would. **A project URL answering non-HTTP counts as closed,** because the WSL mirrored relay can accept-then-reset unused ports.
- **One registry replaces manual projects.** Folders are optional, preferred ports are warnings-only preferences, and editor opening uses browser URL schemes. Controlled launch was added by O-003 (see Launch and stop).
- **Identity key includes the process name** so a project's dev server and its editor helper (same cwd) are favourited separately.
- **Hide by process name** exists because desktop helpers take random ports per launch.
- **Windows project folders are inferred from the command line** (folder owning `node_modules`, or a script argument's folder) and dropped if the path does not exist (packaged apps report virtual paths). The UI labels them `DIR?`.

- **Stop waits for the whole group (I-010).** On WSL/Linux the `sh` leader exits on SIGTERM before the server below it; a stop therefore polls the process group (`kill(-pgid, 0)`) and sends SIGKILL if it outlasts the grace period (3 s, then 2 s). The group id cannot be reused while any member lives, so a forced signal never reaches a stranger. Windows relies on `taskkill /T /F`.
- **Port-busy holder comes from a fresh scan (I-009),** run only after the bind test says busy, and matches either side because Windows and WSL share one port space.

## Current Technical State

Verified by scoped source reads and recorded evidence in T-001 through T-005 and C-005:

- Historical O-001 baseline: its V1 routes, validation and discovery ran; `npm run typecheck`, `npm run build`, `npm test` (21 tests) passed as of 2026-10-09T23:52Z. Current project routes replace that baseline as described above.
- Acceptance verified on one machine (Windows 11 + WSL2 Ubuntu, mirrored networking): WSL and Windows Vite apps discovered, identified, renamed, favourited, opened; preferences survived a restart that also moved the server from WSL Node to Windows Node.
- Netstat fallback ran once, against real output, when an early PowerShell invocation failed; a `node:test` case now forces it with a fake runner.
- 2026-10-10 repairs for I-001..I-005 (C-001): `npm test` 46 tests pass; the UI (row star, row rename/folder, hidden/offline/website cases, add-form failed save and retry) was driven in headless Windows Edge against a WSL-hosted server, mirrored networking.
- O-002 registry schema/migration, project routes/header, matching/conflicts, forms/cards and editor links exist. C-005 ran build including typecheck and all 84 tests successfully on Node v22.22.2, plus 51 independent probe groups. I-006 migration and I-007 duplicate-card reproductions pass; their formal verified closure still depends on a CLEAR Check.
- T-005 records Windows 11 + WSL2 Ubuntu, mirrored networking, both server hosts and unchanged folders/ports across restarts. Migration used a stand-in V1 file because the owner had no real file; Windows matching used a plain Node HTTP service rather than Vite. Four owner editor-link confirmations are recorded.
- I-008 records the owner's browser/race/failure-timing/exact-platform waiver and T-004/T-005 acceptance of C-005. C-005 remains NEEDS WORK; this Design reconciliation is documentation repair, not technical clearance.

- O-003 (T-006..T-011): launch, stop, restart, log, labels and shutdown exist. C-007 recorded NEEDS WORK for I-009, I-010 and I-011. After the repairs, build and 140 tests pass; a live WSL run (Node 22.22.2) restarted a plain and a SIGTERM-ignoring server five times each with the port free and no orphan after the final stop. This is executor evidence, not technical clearance.

**Unknown / not examined:**
- Windows-hosted Restart/Stop after the I-010 repair, Vite restart repeated five times, and live holder naming across sides: not run.
- WSL NAT networking mode and plain (non-WSL) Linux: code paths exist but were not run.
- Behaviour with a non-default WSL distro or no WSL installed on a Windows host: not run.
- Client components have recorded UI scenarios rather than a component test suite. Pure model absorption has an automated regression in `server/registry.test.ts`; editor construction and status/registration combinations have independent C-005 probes. Waived scenarios are not asserted proven.
- No linter is configured.
- Code Health is not configured; C-005's official health command collected no snapshot.

## Verification Contract

The project's verification policy lives in `AGENTS.md`, under Verification Policy. Do not restate it here.
