---
type: project-design
status: active
---

# TheShed — Design

> Describes implemented reality as of 2026-10-10 (O-001). Discovery evidence and platform findings live in `docs/SPIKE.md` (the technical baseline); V1 acceptance results in `docs/V1-DESIGN.md`. This file does not restate them.

## Architecture

1. **One local Node process** serves both the JSON API and the built UI. It binds `127.0.0.1` only. The address is a constant, not configuration (`server/index.ts`).
2. **Zero runtime dependencies on the server.** Node built-ins only, run as TypeScript through Node's native type stripping (Node ≥ 22.18). The same checkout runs under WSL Node or Windows Node.
3. **Discovery is read-only and command-fixed.** OS queries run constant scripts through `execFile` (no shell interpolation). No request data and no discovered data ever reach a command line, script body or argument.
4. **Sources are isolated.** Each environment's discovery runs in parallel; a failing source becomes a per-source report (`ok: false`, `error`), never a failed scan.
5. **Discovered services are untrusted input.** Probes are bounded (timeout, body cap, no redirects). Service text is reduced to plain text. Open URLs are built by the server from the port, never copied from a service.
6. **Persistence is one JSON file.** It is validated on load (invalid entries dropped, unparseable file moved aside) and written atomically (temp file, then rename).
7. **The UI is a React SPA** with no routing library and no state library. All writes go through the API, which returns the full new state.

## Components/Codebase Map

| Module | Purpose |
|---|---|
| `server/index.ts` | HTTP server: Host/Origin/content-type checks, API routes, static `dist/` serving with SPA fallback, security headers |
| `server/scan.ts` | Host detection, source orchestration, merge/dedupe, WSL-relay overlap removal, naming, probing, manual-project probing, `Scanner` cache |
| `server/identify.ts` | Project folder from cwd or command line, marker-file root walk, cross-boundary path translation, `package.json` name read |
| `server/probe.ts` | One bounded HTTP(S) GET, classification, `<title>` extraction, loopback check, concurrency helper |
| `server/config.ts` | Config schema validation (manual, favourites, hidden, overrides), URL/folder validators, `ConfigStore` atomic writes |
| `server/discovery/run.ts` | The only subprocess entry point (`execFile` wrapper with timeout, buffer cap, stdin handling) |
| `server/discovery/posix.ts` | WSL/Linux discovery script (`ss` + `/proc`) and parser; also run via `wsl.exe` from a Windows host |
| `server/discovery/windows.ts` | Windows discovery (PowerShell `-EncodedCommand`) with `netstat`/`tasklist` fallback, and parsers |
| `server/discovery/listener.ts` | `Listener` type, merge by env+port, text sanitising |
| `server/discovery.test.ts` | `node:test` suite: parsers, inference, classification, real-socket probes, config validation |
| `shared/types.ts` | Types shared by server and client (`Service`, `Probe`, `Config`, `State`…) |
| `client/src/App.tsx` | Page shell: masthead, refresh/auto, filter, add-project form, sections, discovery notes, hide-rule chips |
| `client/src/Card.tsx` | Card, row, status lamp, kind tag, menu, inline rename/folder/manual edit form |
| `client/src/model.ts` | Pure view model: overrides applied, kind/status mapping, section assignment, filtering |
| `client/src/api.ts` | Typed fetch wrapper for every API route |
| `client/src/styles.css` | Atari-Noir theme tokens and responsive layout |
| `scripts/dev.mjs` | Runs API (watch) and Vite dev server together |

## Interfaces and Data Flow

**Scan pipeline:** sources (parallel) → `Listener[]` + `SourceReport[]` → merge by `env:port` → drop `wslrelay.exe` copies of WSL ports → per listener (16 at a time): identify + probe → `Service[]`. Manual projects are probed separately (8 at a time). The result is cached for 4 s; concurrent requests share one in-flight scan; `?refresh` bypasses the cache.

**API** (all JSON; mutations need `Content-Type: application/json` and a localhost or absent `Origin`; body ≤ 16 KB; every response is the full `State`):

| Route | Effect |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/state[?refresh]` | `{ scan, config }` |
| `POST /api/manual` · `PUT /api/manual/:id` · `DELETE /api/manual/:id` | manual projects (name, http(s) URL, optional absolute folder). Delete also removes the project's favourite |
| `PUT /api/favourites` | star/unstar by identity key |
| `POST /api/hidden` · `DELETE /api/hidden/:id` | hide rules: `{kind:'port',env,port}` or `{kind:'process',env,process}` |
| `PUT /api/overrides` | set/clear a user name and folder for an identity key |

**Data ownership:**
- The server owns `data/config.json` (path overridable by `SHED_CONFIG`). The client never writes storage except the auto-refresh preference in `localStorage`.
- **Identity key** (`Service.favouriteKey`): `dir:<env>:<projectDir>#<processName>` when a folder is known, else `port:<env>:<port>`. Favourites and overrides are keyed by it. Manual projects use `manual:<id>`.
- **Kind vs status** (client `model.ts`): probe `web`→Website, `http`→API, `tcp`→Other; status is Live for those three, Unverified for `unverified`, Offline for `closed` or a favourite not currently present.
- **Unverified:** a discovered listener whose probe could not connect is reported `unverified`, never `closed`, because the OS has just reported it listening.

## Boundaries

- Does: enumerate TCP listeners on the host and the other WSL/Windows side, probe loopback HTTP, infer project folders, persist user preferences locally.
- Does not: start, stop or signal processes; probe non-loopback hosts (manual URLs elsewhere are listed but not probed); read or execute user-entered folders; require admin/sudo; use a database, network service, account or Docker; support macOS; query WSL distros other than the default.

## Decisions

- **Server can run on either side.** WSL host: `ss`+`/proc` locally, PowerShell via interop for Windows. Windows host: PowerShell locally, `wsl.exe -e sh -c` for WSL. Reason: neither side sees the other's listeners (SPIKE.md).
- **PowerShell runs via `-EncodedCommand`.** `-Command -` on stdin silently broke multi-line blocks (SPIKE.md).
- **Subprocess stdin is always closed and its `EPIPE` swallowed.** A child exiting early otherwise crashed the server (found during build).
- **Refused probe ⇒ unverified.** Mirrored networking does not carry `::1` into WSL; Windows Vite binds `::1`. A WSL-hosted Shed therefore cannot probe Windows Vite. It still lists, identifies and links it.
- **Manual `localhost` URLs probe `127.0.0.1` then `::1`**, as a browser would. **A manual URL answering non-HTTP counts as closed,** because the WSL mirrored relay can accept-then-reset unused ports.
- **Identity key includes the process name** so a project's dev server and its editor helper (same cwd) are favourited separately.
- **Hide by process name** exists because desktop helpers take random ports per launch.
- **Windows project folders are inferred from the command line** (folder owning `node_modules`, or a script argument's folder) and dropped if the path does not exist (packaged apps report virtual paths). The UI labels them `DIR?`.

## Current Technical State

Verified by reading the code and by runs recorded in T-001 evidence:

- All routes, validation and discovery described above exist and run. Gates: `npm run typecheck`, `npm run build`, `npm test` (21 tests) pass as of 2026-10-09T23:52Z.
- Acceptance verified on one machine (Windows 11 + WSL2 Ubuntu, mirrored networking): WSL and Windows Vite apps discovered, identified, renamed, favourited, opened; preferences survived a restart that also moved the server from WSL Node to Windows Node.
- Netstat fallback ran once, against real output, when an early PowerShell invocation failed. It is not covered by an automated forced-failure test.

**Unknown / not examined:**
- WSL NAT networking mode and plain (non-WSL) Linux: code paths exist but were not run.
- Behaviour with a non-default WSL distro or no WSL installed on a Windows host: not run.
- Client code (`model.ts`, components) has no automated tests; UI behaviour was checked by API calls and screenshots, not by scripted browser interaction.
- No linter is configured.

## Verification Contract

The project's verification policy lives in `AGENTS.md`, under Verification Policy. Do not restate it here.
