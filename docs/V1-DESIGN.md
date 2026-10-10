# The Shed V1: design and tasks

Baseline: [SPIKE.md](SPIKE.md). Its discovery commands, limitations and safety decisions are kept as they are.

## Shape

```
Browser (React)  ──fetch /api──▶  Node server (127.0.0.1:4777, no runtime deps)
                                   ├─ discovery/posix.ts    ss + /proc        (fixed script)
                                   ├─ discovery/windows.ts  PowerShell / netstat (fixed script)
                                   ├─ identify.ts           cwd / cmdline → folder → name
                                   ├─ probe.ts              GET / → website | api | other
                                   ├─ scan.ts               parallel sources, merge, cache
                                   └─ config.ts             data/config.json (validated, atomic)
```

One scan = all sources in parallel → per-source report (ok / error / notes) → merge by `env:port`
→ drop `wslrelay.exe` duplicates of WSL ports → identify → probe → apply user overrides in the UI.

## Model

**Kind** (what it is) and **status** (can we reach it) are separate:

| Probe result | Kind | Status |
|---|---|---|
| HTML page / redirect / 401–403 | Website | Live |
| Other HTTP (JSON, 404, text) | API | Live |
| Accepts TCP, not HTTP | Other | Live |
| OS says listening, connect fails | (unknown) | **Unverified** |
| Favourite or manual project not answering | — | Offline |

**Identity key** (stable across port changes): `dir:<env>:<folder>#<process>` when a folder is
known, else `port:<env>:<port>`. Favourites and overrides are keyed by it.

**Config** (`data/config.json`):

```ts
{ version: 1,
  manual:     { id, name, url, folder? }[]
  favourites: { key, name, url, env?, lastSeen? }[]
  hidden:     { id, kind: 'port', env, port } | { id, kind: 'process', env, process }
  overrides:  { key, name?, folder? }[]        // NEW: rename / associate folder
}
```

## API

| | |
|---|---|
| `GET /api/state[?refresh]` | scan + config |
| `POST/PUT/DELETE /api/manual[/:id]` | manual projects (name, url, folder) |
| `PUT /api/favourites` | star / unstar |
| `POST/DELETE /api/hidden[/:id]` | hide rules |
| `PUT /api/overrides` | set or clear a name and folder for an identity key (NEW) |

All mutations (including DELETE, with body `{}`): JSON only, localhost Origin, validated, size-capped. Additions past 500 entries per list are refused (409), never silently dropped. No input ever reaches a command.

## Tasks

| # | Task | Status |
|---|---|---|
| 1 | Discovery sources, merge, dedupe, WSL/Windows overlap | done |
| 2 | Probe + classification, unverified handling | done |
| 3 | Config store, favourites, hide by port/process, unhide | done |
| 4 | Cards, sections, refresh + 15 s auto scan, per-source warnings | done |
| 5 | Split **kind** (Website/API/Other) from **status** (Live/Unverified/Offline) on cards | done |
| 6 | **Overrides**: rename + folder association for discovered services (API, config, edit UI) | done |
| 7 | Manual projects: edit name/URL, optional folder | done |
| 8 | Tests for overrides validation | done |
| 9 | Acceptance: Vite running on **Windows** and **WSL**, then identify, rename, favourite, open, restart and check persistence | done |

## Out of scope (V1)

Process start/stop, multiple WSL distros, macOS, non-loopback probing, auth.

## Acceptance results (2026-10-10)

Tested with a WSL Vite app (`~/code/galaxy`, :5173) and a temporary **Windows** Vite app (Windows Node, :5300).

| Criterion | WSL-hosted Shed | Windows-hosted Shed |
|---|---|---|
| Both Vite apps appear | ✅ | ✅ |
| Identified (package name + folder) | ✅ WSL via cwd · Windows via command line (`DIR?`) | ✅ |
| Status | WSL: Live · Windows: **Unverified** (`::1` not mirrored) | both Live |
| Rename / set folder | ✅ applied here (via API) | ✅ shown after restart |
| Favourite | ✅ applied here (via API) | ✅ shown after restart |
| Open (card URL served to the Windows browser) | ✅ both | ✅ both |
| Prefs survive restart | ✅ restarted *and* moved WSL → Windows on the same config file; all overrides, favourites, manual projects and hide rules intact, identity keys matched | |
| Inaccessible services don't crash discovery | ✅ elevated processes, other-user sockets, `::1`-only, non-HTTP, PowerShell failure (falls back to netstat) | ✅ |

The edit form, star and menus were exercised through the API and checked visually in a screenshot, but no automated browser clicks were run.

Bugs found and fixed during acceptance: manual `localhost` URLs only tried IPv4; the add-project form closed on a failed save; the manual-project API silently dropped an invalid folder.

**Recommendation:** if you run dev servers on Windows, host The Shed on Windows (`node \\wsl.localhost\…\server\index.ts`). It sees both sides fully.
