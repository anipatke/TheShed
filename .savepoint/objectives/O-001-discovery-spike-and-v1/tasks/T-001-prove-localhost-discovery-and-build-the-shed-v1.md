---
id: T-001
title: Prove localhost discovery and build The Shed V1
objective: O-001
status: done
depends_on: []
owner_validation:
    required: true
    accepted_check: ""
planned_by: {role: planner, session: session_01WG6Lxf82CULEbTwEk9Keqb}
check_waiver:
    task: T-001
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-09T23:56:55Z"
---

# Prove localhost discovery and build The Shed V1

> Retrospective Task, recorded 2026-10-10 after the work was done. The plan below is the sequence actually followed. The executor session (`session_01WG6Lxf82CULEbTwEk9Keqb`) also authored this record, so it is a claim to verify, not proof. A fresh session must run any Check.

## Outcome

Windows + WSL localhost discovery is proven and documented without admin rights, and The Shed V1 runs on that baseline: it discovers, classifies, identifies, and lets the developer rename, favourite, hide and open local projects, with preferences in local JSON.

## User Check

With a Vite dev server running in WSL and another running under Windows Node, start The Shed (`npm run build && npm start`, or under Windows Node with `node \\wsl.localhost\<distro>\…\server\index.ts`) and open `http://localhost:4777`. Both apps appear as project cards with the right names and folders. Rename one, set a folder, star it, open it in a new tab, then restart the server: the name, folder and star are still there.

## Done When

1. **AC1 Spike documented:** `docs/SPIKE.md` records the discovery commands, timings, HTTP-probe results, gotchas, limitations and safety decisions from real runs on Windows + WSL, all without admin.
2. **AC2 Discovery:** both Windows and WSL listeners are discovered automatically, whichever side hosts the server, and deduplicated by env+port, with WSL-relay overlap removed.
3. **AC3 Classification and status:** each service is classified Website / API / Other and shown Live / Unverified / Offline. Unreachable discovered listeners are Unverified, not Offline.
4. **AC4 Identification:** project name and folder are found where possible (WSL cwd; Windows command-line inference); otherwise the process name or port is shown.
5. **AC5 Cards and open:** cards show name, port, environment, URL and status, and the Open action opens the URL in a new tab.
6. **AC6 User curation:** manual projects (with optional folder), rename and folder association for discovered projects, favourite/unfavourite (offline favourites stay visible), hide by port, hide by process name, and unhide.
7. **AC7 Persistence:** all preferences live in one local JSON file, survive restarts, and survive a corrupt file without crashing.
8. **AC8 Refresh:** a manual Refresh plus automatic rescans (15 s, visible tab only), with no server restart needed.
9. **AC9 Resilience:** an unavailable source, inaccessible process or non-HTTP service yields a warning or a degraded entry, never a failed scan or a crashed server.
10. **AC10 Constraints:** satisfies the Guardrails Blocker and Required rules: loopback-only bind, fixed commands, no admin, no start/stop, no DB/cloud/accounts/Docker, untrusted-service handling.
11. **AC11 Design:** Atari-Noir (dark background, warm off-white text, restrained orange accents) with responsive cards.
12. **AC12 Gates:** `npm run typecheck`, `npm run build` and `npm test` pass.

## Context Files

`docs/SPIKE.md`, `docs/V1-DESIGN.md`, `README.md`, `package.json`, `vite.config.ts`, `tsconfig.server.json`, `tsconfig.client.json`, `scripts/dev.mjs`, `shared/types.ts`, `server/index.ts`, `server/scan.ts`, `server/identify.ts`, `server/probe.ts`, `server/config.ts`, `server/discovery.test.ts`, `server/discovery/run.ts`, `server/discovery/listener.ts`, `server/discovery/posix.ts`, `server/discovery/windows.ts`, `client/index.html`, `client/public/favicon.svg`, `client/src/main.tsx`, `client/src/App.tsx`, `client/src/Card.tsx`, `client/src/model.ts`, `client/src/api.ts`, `client/src/styles.css`.

## Design References

`.savepoint/Design.md`: Architecture, Interfaces and Data Flow, Decisions, Current Technical State. Technical baseline: `docs/SPIKE.md`.

## Guardrails

SEC-01..04, SCOPE-01..03, DISC-01..02, DATA-01, TEST-01..03.

## Implementation Plan

1. Spike: enumerate listeners on both sides (`ss`/`proc`, `Get-NetTCPConnection`, `netstat`), map ports to processes and folders, probe HTTP, test cross-boundary reachability, and write `docs/SPIKE.md`.
2. Server: fixed-script discovery sources, merge/dedupe, identification, bounded probing, validated JSON config, and a loopback-only API with Host/Origin checks.
3. UI: Atari-Noir cards and sections, refresh/auto, filter, manual projects, favourites, hiding.
4. V1 brief: write `docs/V1-DESIGN.md`; split kind from status; add overrides (rename and folder) and manual-project editing; add tests.
5. Acceptance: WSL and Windows Vite apps; rename, favourite, open; restart (moving hosts); record results.

## Boundaries

No process start/stop; no other WSL distros; no macOS; no non-loopback probing; no auth; no browser-automation tests.

## Technical Verification

Configured gates (AGENTS.md Verification Policy). TEST-03 platform evidence: real runs on Windows 11 + WSL2 Ubuntu, `networkingMode=mirrored`, with the server hosted on each side. A Full Objective Check applies `agent-skills/references/check-method.md` and can reproduce the platform runs on the same machine.

## Technical Evidence

### Gates (fresh run)

Run at 2026-10-09T23:52:00Z, Node v22.22.2 (WSL), TypeScript 7.0.2, from the project root:

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (Vite build OK) |
| `npm test` | exit 0; 21 tests, 21 pass, 0 fail |
| `git diff --check` | exit 0. **Vacuous:** no commits exist yet, so there is no diff base. |

Lint: none configured.

### Per-criterion outcomes

| AC | Outcome | Evidence |
|---|---|---|
| AC1 | Met | `docs/SPIKE.md`: commands with sample output; timings (`ss` ~40 ms, PowerShell ~0.8 s, netstat ~40 ms); HTTP probe table (5173 html, 1234 json, 57770 401, 5037/27036/55432 non-HTTP); 11 gotchas; 7 limitations; decisions. All runs were as a normal user (no sudo, no elevated shell). |
| AC2 | Met | Live scans, WSL host: WSL 15 listeners (`ss + /proc`) plus Windows 32–34 (PowerShell). Windows host (Node v24.14): Windows 33 plus WSL 15 (`wsl.exe → ss + /proc`, 158 ms). Dual-stack merge: test `ss parsing › joins listeners with /proc details and merges dual-stack sockets`. wslrelay removal: code only, see Limitations. |
| AC3 | Met | Tests `probe helpers › classifies responses`; `probe against real sockets › sees a web page / sees a silent TCP server / sees a non-HTTP banner`. Live: GoogleDriveFS on `::1` from WSL host showed `unverified` (it was `closed` before the fix); Windows Vite on `::1` from WSL host showed `unverified`, and Live from Windows host. |
| AC4 | Met | WSL: andromeda (`/home/user/code/galaxy`, cwd), sea-level, astraeus ×2 identified from `package.json`. Windows: `win-vite-acceptance` folder inferred from the command line (`DIR?`). Tests `project inference › *` (4 cases). Fallbacks seen live: `LM Studio`, `svchost` (process), `Port 11434` (other-user socket). |
| AC5 | Met | Screenshots (headless Edge, 1400 px and 520 px) show cards with name, port, env tag, URL and status. Open is `<a target=_blank rel="noopener noreferrer">` (`Card.tsx` `OpenLink`). `curl.exe` from Windows got `<title>` from both card URLs (`localhost:5300`, `localhost:5173`). |
| AC6 | Met (API) | The acceptance script applied via the API: rename (Windows and WSL), folder association, favourites, manual project with folder, hide by process (`SteelSeriesGG.exe`). Invalid folder → 400 on both `/api/overrides` and `/api/manual`. An earlier run checked hide-by-process (`agy`) and an offline favourite card (screenshot). Tests `overrides and folders › *` (4 cases). |
| AC7 | Met | Restart test: the WSL server stopped and Windows Node started on the same `SHED_CONFIG`. Overrides, 2 favourites, manual project + folder and the hide rule were intact, and identity keys still matched live services. Corrupt file: `{"manual": [oops` moved to `.broken-<ts>`, then the server started. Test `config validation › drops invalid entries instead of failing`. |
| AC8 | Met | `GET /api/state?refresh=1` re-scans (3 consecutive scans, about 3 s each, 200). Auto refresh: `App.tsx` 15 s interval gated on `document.visibilityState`. Seen in the UI as "Scanned just now". |
| AC9 | Met | PowerShell primary path failed (empty output) → netstat fallback with note, and the scan succeeded. Elevated processes (13 null command lines), other-user socket (11434), `::1`-only and non-HTTP ports handled. EPIPE crash found and fixed; afterwards 3 repeated scans plus all mutations ran with no crash. |
| AC10 | Met (claimed) | Bind address is the constant `127.0.0.1`; LAN-IP request → no connection (curl `000`). Host `evil.example` → 421; cross-origin POST → 403; form-encoded POST → 415; `javascript:` URL → 400; path traversal served `index.html`. All subprocesses go through `run.ts` `execFile` with constant scripts. No start/stop code. Server `package.json` runtime deps: `react`, `react-dom` (client only). An independent Check must verify SEC-02/SEC-03 by reading the code. |
| AC11 | Met | Screenshots: `#0d0c0b` background, `#ede5d6` text, `#f26a1b` accents on the brand, primary button, Open, stars and Website tags. Layout is one column at 520 px. 390 px could not be captured (headless min width ~500 px). |
| AC12 | Met | Gates above. |

### Bugs found and fixed during the work (TEST-02)

Under TEST-02, the pure-logic fixes need a regression test; the OS/network/UI fixes need a failing scenario plus a passing re-run.

| Bug | Proof |
|---|---|
| Subprocess stdin `EPIPE` crashed the server | OS: failing scenario recorded (server exited with an `Error: write EPIPE` stack from `run.ts:38`). Re-run: 3 scans and all mutations, no crash. |
| PowerShell `-Command -` returned empty output | OS: failing scenario `Unexpected end of JSON input` → netstat fallback. Re-run: PowerShell source ok, 32 listeners. |
| HTML error pages (404/503) classified as websites and used as names | Test `probe helpers › classifies responses` (404 → http) |
| `python3 /path/x.py` gave no project folder | Test `project inference › uses a script argument, but not global installs` |
| Refused probe of a listening port shown as closed | Network: failing scenario GoogleDriveFS `::1:7679` was `closed`. Re-run: `unverified`. |
| Virtual packaged-app path used as folder (`C:\snapshot\bundle`) | OS: failing scenario, Epic helper named `bundle`. Re-run: not verified separately. The existence check is pure logic but has **no regression test** (possible TEST-02 gap). |
| Manual `localhost` URL probed on IPv4 only | Network: failing scenario "Docs" → `localhost:5300` (`::1`) was Offline. Re-run: `web`. |
| Add-project form closed on a failed save | UI: found by code reading; **no failing scenario was reproduced and no re-run recorded** (TEST-02 gap). |
| Manual API dropped an invalid folder silently | Scenario: POST `folder: "nope"` → 400 `Folder must be an absolute path` |

### Files

Changed (all created in this work): every Context File above, plus `.gitignore`, `package-lock.json` and the `.savepoint/` records for this retrospective (`config.yml` gates, `Idea.md`, `Design.md`, `Guardrails.md`, `releases/G-001-first-goal/Release.md`, this Objective and Task).

Read beyond the Context Files: `.savepoint/*` and `agent-skills/*` (Savepoint adoption), and the Savepoint source at `/home/user/code/savepoint/internal/data/discover.go` (record layout). Read-only.

Platform side effects during testing, all reverted: a temporary Windows project `C:\Users\User\shed-acceptance-vite` (created, then deleted), and test `node.exe` processes (ended by PID after checking their command lines).

### Limitations

- WSL NAT networking, plain Linux, non-default distros and Windows without WSL were not run.
- `wslrelay.exe` dedupe only appears in NAT mode, so it is unexercised (code only, no test).
- The netstat fallback was exercised once, by accident; no forced-failure test.
- No client unit tests. UI behaviour was verified through API calls and screenshots; no scripted clicks of the edit form, menus or star.
- No commits exist yet, so a Check has no `base_commit`/`head_commit` to pin.
- One machine only.

## Drift Notes

`Design.md` was reconstructed from this work at the same time as this record, so there is no drift between them by construction. A Check should still reconcile Design against the code.
