# The Shed

A local-first homepage for whatever you have running on localhost. It finds listening ports on
Windows **and** WSL, works out which ones are websites, names them after their project folder,
and gives you one place to open them.

No database, no cloud, no accounts, no Docker, no admin rights. One Node process bound to
`127.0.0.1`, plus a JSON file.

## Quick start

Requires Node **22.18+** (the server runs TypeScript directly, with no build step and no runtime dependencies).

```sh
npm install
npm run build      # typecheck + build the UI into dist/
npm start          # http://localhost:4777
```

Development (API restarts on change, UI hot-reloads):

```sh
npm run dev        # UI at http://localhost:4778, API proxied to :4777
npm test           # parser, heuristic and probe tests (node:test)
```

| Env var | Default | |
|---|---|---|
| `SHED_PORT` | `4777` | API/UI port. The bind address is always `127.0.0.1` and is deliberately not configurable. |
| `SHED_CONFIG` | `data/config.json` | Where favourites, manual projects and hide rules are stored. |

### Where to run it

Run it from **either** side; it discovers both:

| Server runs in | Discovers locally with | Discovers the other side with |
|---|---|---|
| WSL | `ss` + `/proc` | `powershell.exe` via WSL interop |
| Windows | PowerShell `Get-NetTCPConnection` | `wsl.exe -e sh -c …` (default distro) |
| Plain Linux | `ss` + `/proc` | — |

**Using Windows dev servers? Host The Shed on Windows.** Windows Node/Vite listen on `::1`, which mirrored networking doesn't carry into WSL, so a WSL-hosted Shed lists them as *Unverified*. They're still identified and openable, just not probed. A Windows-hosted Shed sees both sides fully.

The server has zero runtime dependencies, so Windows Node can run a WSL checkout directly:
`node \\wsl.localhost\Ubuntu\path\to\TheShed\server\index.ts` (build `dist/` first, from either side).

## What you see

- **Favourites**: starred projects. They stay on the page while stopped (shown as *Offline*, with last-seen time and last URL).
- **Projects**: web servers whose project folder could be identified, plus projects you add by URL.
- **Other web pages**: HTML on localhost with no project folder (desktop apps, admin UIs).
- **Other listeners** (collapsed): HTTP APIs and non-HTTP TCP services.
- **Hidden** (collapsed): hide by **port**, or by **process name** (best for apps that grab random ports on each launch, such as editor helpers, Steam or SteelSeries).

Each card shows **kind** and **status** separately:

- Kind: **Website** (serves a page) · **API** (answers HTTP, but not a page: JSON, 404…) · **Other** (accepts TCP, not HTTP).
- Status: **Live** · **Unverified** (the OS says it's listening, but The Shed can't reach it from where it runs) · **Offline** (a favourite or manual project that isn't answering). Non-live states use a hollow lamp, so status doesn't depend on colour alone.

**Rename / set folder** (card `⋯` menu): give any discovered project your own name and/or associate a folder, for example to fix a Windows folder that was inferred wrongly. It's keyed by project folder + process, so it survives port changes and restarts. Leave a field blank to go back to what was discovered. Manual projects can be edited (name, URL, folder) the same way.

Names come from, in order: your rename → `package.json` name → project folder name → page `<title>` → process name → `Port N`.

Refresh with the button, or leave **Auto** on (rescans every 15 s while the tab is visible). Scans take about 3 s and are cached and de-duplicated on the server.

## How discovery works

1. **Enumerate**: run fixed scripts (never built from input) in parallel, one per environment. If one fails, its card in *Discovery notes* says why and the others still show.
2. **Identify**:
   - WSL/Linux: exact working directory from `/proc/<pid>/cwd`, then walk up to the nearest folder containing `package.json`, `.git`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.
   - Windows: no API exposes another process's cwd without admin rights, so it's **inferred** from the command line (the folder owning `node_modules`, or a script argument's folder). The card labels this `DIR?`.
3. **Probe**: one `GET /` per port (2 s timeout, at most 64 KB read, no redirects followed, HTTPS retried for TLS dev servers) to classify it and read its `<title>`.

Full findings, timings and the commands that were proven are in [docs/SPIKE.md](docs/SPIKE.md).

### Known limitations

- **Other users' processes in WSL** (system services such as `ollama` or `postgres`): the port is shown but not the process or folder. Fixing that would need `sudo`, which The Shed doesn't ask for.
- **Elevated Windows processes** hide their command line from non-admin users, so no project can be inferred for them.
- **Windows working directories** are a best guess, made from the command line.
- **Only the default WSL distro** is queried when the server runs on Windows. Running it inside each distro works as well.
- **WSL NAT networking** (not mirrored): a WSL-hosted server can list Windows ports but often can't probe them, so they show as *Unverified*. WSL ports forwarded by `wslrelay.exe` are shown once, not twice.
- **Mirrored networking**: Windows services bound only to `::1` can't be reached from WSL (*Unverified* when the server runs in WSL; fine when it runs on Windows).
- **Switching hosts on the same port** (WSL ↔ Windows) can fail for ~30–60 s in mirrored mode while old `TIME-WAIT` sockets expire.
- **Slow first responses**: a dev server that compiles on first request (e.g. Next.js) may answer after the 2 s probe and briefly show as *TCP*. The next scan corrects it.
- macOS is not supported in V1.

## Security model

The Shed lists processes on your machine, so the server is locked down even though it's local:

- Listens on `127.0.0.1` only (the address is hard-coded).
- Rejects any request whose `Host` isn't `localhost`/`127.0.0.1`/`[::1]`, which blocks DNS-rebinding attacks from web pages.
- Mutations require `Content-Type: application/json` and a localhost `Origin` (or none), so other sites can't post to it.
- The frontend can't make the server run anything. Discovery runs constant scripts through `execFile` (no shell interpolation), and no request data or service data ever reaches a command.
- **Discovered services are untrusted**. Titles are reduced to plain text (tags, control and bidi characters stripped, capped at 120 chars) and rendered as text. Open links are built by the server from the port number, never taken from a service. `package.json` reads are size-capped and type-checked.
- Manual project URLs must be `http(s)`. Only loopback URLs are probed, so the server can't be used as a proxy to other hosts.
- Strict CSP (`default-src 'self'`) on the UI. Links open with `rel="noopener noreferrer"`.
- The config file is validated on load. A corrupt file is moved aside (`config.json.broken-<time>`) and the app starts fresh.

## Config file

`data/config.json` is written atomically (temp file + rename) and is safe to edit by hand while the server is stopped:

```json
{
  "version": 1,
  "manual": [{ "id": "…", "name": "Docs", "url": "http://localhost:3000/docs" }],
  "favourites": [{ "key": "dir:wsl:/home/me/code/site#node", "name": "site", "url": "http://localhost:5173", "env": "wsl", "lastSeen": "…" }],
  "overrides": [{ "key": "dir:windows:C:\\dev\\site#node.exe", "name": "Marketing site", "folder": "C:\\dev\\site" }],
  "hidden": [
    { "id": "…", "kind": "process", "env": "windows", "process": "steam.exe" },
    { "id": "…", "kind": "port", "env": "wsl", "port": 11434 }
  ]
}
```

Favourites and overrides are keyed by **project folder + process** (or `env + port` when no folder is known), so a project keeps its star and name when its port changes. User-entered folders are stored and displayed only. The Shed never reads or executes them.

## Layout

```
server/            Node HTTP server, no runtime deps
  index.ts         routes, Host/Origin checks, static files
  scan.ts          orchestration, caching, naming
  identify.ts      cwd/command line → project folder → name
  probe.ts         HTTP classification and title extraction
  config.ts        validated JSON store
  discovery/       posix.ts (ss + /proc), windows.ts (PowerShell, netstat fallback)
client/            React + Vite UI
shared/types.ts    types used by both
docs/SPIKE.md      discovery spike findings (the technical baseline)
docs/V1-DESIGN.md  V1 design, task breakdown, acceptance results
```

## Not in V1

Starting or stopping processes. The Shed only reads.
# TheShed
