# Spike: starting and stopping projects (Goal 02, O-003 / T-006)

Date: 2026-10-10. Real machine, no admin, no sudo. Throwaway scripts lived outside the repository
(`launch.cjs` harness in the session scratchpad and `C:\Users\User\shed-spike-scripts`); only commands and
output are quoted here. Test projects: a Vite 5.4.21 app on each side (`npm run dev` → `vite`, esbuild 0.21.5).

**Environment (TEST-03):** Windows 11 build 26300 (26H2); WSL2, Ubuntu 24.04.4, kernel 6.18.33.2,
`networkingMode=mirrored`; Node 22.22.2 on the WSL side for the harness (Node 24.16 via nvm in interactive
shells), Node 24.14.0 on Windows; npm 10.9.7. Host side per run: **WSL-hosted** = harness run by Linux
`node`; **Windows-hosted** = harness run by `node.exe`.

## Summary

| Host → project | Supported | Spawn | Stop | Orphans after stop |
|---|---|---|---|---|
| WSL → WSL | **Yes** | `spawn('sh',['-c',cmd],{detached:true})` (own process group) | `kill(-pgid,SIGTERM)`, SIGKILL after timeout; ~50 ms | none; port free |
| Windows → Windows | **Yes** | `spawn('cmd.exe',['/d','/s','/c','"cmd"'],{windowsVerbatimArguments:true})` | `taskkill /PID <pid> /T /F` while the leader is alive | none; port free |
| WSL → Windows | **Not in Goal 02** | `cmd.exe /d /s /c "cd /d C:\… && cmd"` | Held PID is a Linux relay; killing it leaves the tree running. Needs a Windows-side `taskkill` found via a process query | none only when stopped via Windows `taskkill /T` |
| Windows → WSL | **Yes, with caveats** | `wsl.exe -e bash -ic "cd … && exec cmd"` (interactive shell needed) | `taskkill /PID <wsl.exe pid> /T /F` (tree and port freed) | none; port free |

## Evidence per question

### 1. Spawn and process tree

- **WSL→WSL** tree for `sh -c "npm run dev -- --port 5601 --strictPort"`: `sh` → `npm` → `sh -c vite` → `node vite` → `esbuild --service` (all one PGID, the `sh` pid).
- **Windows→Windows**: `cmd.exe /d /s /c "npm run dev…"` → `node npm-cli.js` → `cmd.exe /c vite` → `node vite.js` → `esbuild.exe`.
- Spawning `npm.cmd` directly under Node 24.14 fails: `Error: spawn EINVAL`. `.cmd` launchers must go through `cmd.exe`; with `windowsVerbatimArguments: true` and the command wrapped in one pair of quotes.
- **WSL→Windows** and **Windows→WSL** produce the same trees on the target side.
- **Gotcha (Windows→WSL):** `wsl.exe -e sh -c "npm …"` does not load the user's profile. Linux `node`/`npm` come from nvm and are found only in an interactive shell (`bash -ic`, `zsh -ic`); with plain `sh -c`, `npm` resolved to the **Windows** `npm` through interop (output showed `CMD.EXE was started with the above path…` UNC warning). Use an interactive shell and `exec`.

### 2. Held PID

- WSL: `child.pid` is the `sh` leader and PGID; with `detached: true` it reaches the whole tree.
- Windows: `child.pid` is the outer `cmd.exe`; `taskkill /T` walks parent links from it.
- WSL→Windows: `child.pid` is `/init … cmd.exe` (a Linux relay). The Windows `cmd.exe` PID is not exposed and has to be found by querying `Win32_Process` for the command line.
- Windows→WSL: `child.pid` is `wsl.exe`; the Linux PGID is not exposed (found with `ps -eo pgid,args`).

### 3. Stop, timing and orphan checks

- WSL→WSL: `kill(-pid,'SIGTERM')` → group gone in 49 ms, port closed; `ps` showed no spike process left.
- Windows→Windows: `taskkill /PID 37124 /T /F` killed all six processes (including esbuild) at once; port refused after 2 ms; process query empty.
- WSL→Windows (a): SIGTERM to the Linux relay killed only the outer `cmd.exe`; `npm`, `cmd`, `vite` and `esbuild` kept running with the port still listening (we removed them by hand).
- WSL→Windows (b): `powershell.exe … Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where CommandLine -match 'npm run dev -- --port 5632' | taskkill /PID … /T /F` removed the whole tree; port free.
- Windows→WSL (a): `taskkill /PID <wsl.exe> /T /F` — the Linux `ps` afterwards showed nothing and the port was refused (~300 ms).
- Windows→WSL (b): `wsl.exe -e sh script` with `kill -TERM -- -<pgid>` **failed** (`kill: Illegal number: -`); `sh` (dash) rejects `--`. `kill -TERM -<pgid>` worked.

### 4. Leader exit and PID reuse

- WSL: after `SIGKILL` to the leader alone, `vite` and `esbuild` stayed alive in the same PGID, and `kill(-pgid,'SIGTERM')` still reached them (49 ms). Once the group was empty, signalling it would fail with `ESRCH`; a PGID can only be reused after the group is empty, so a stop must be refused once the run record has seen the group go.
- Windows: after `taskkill /PID <leader> /F` (no `/T`) the children kept running with the port listening and their `ParentProcessId` pointing at the dead PID. `taskkill /PID <dead leader> /T /F` then **failed** and the orphans survived; they were only removable by naming a surviving child PID. So the Windows stop must be issued while the leader is alive, or from a recorded tree snapshot taken at readiness. Windows PIDs are reused, so before any `taskkill` the supervisor must confirm the PID's creation time still matches the run record (SCOPE-02).

### 5. Survival when The Shed exits

| Host exit | WSL→WSL | Windows→Windows | WSL→Windows | Windows→WSL |
|---|---|---|---|---|
| SIGINT / SIGTERM / SIGHUP (no handler) | vite + esbuild survive, port stays open | not measured | not measured | not measured |
| SIGKILL / `taskkill /F` | survive | survive (npm, cmd, vite, esbuild; port open) | survive (full Windows tree) | **tree and port gone within 2 s** |

- `taskkill` without `/F` on the Windows host: refused ("can only be terminated forcefully"), so a graceful Windows stop signal could not be tested headlessly.
- A shutdown handler can cover SIGINT, SIGTERM and SIGHUP (WSL) and Ctrl+C / console close (Windows), but never SIGKILL or Task Manager End Task. After those, children keep their ports, and the next Shed shows them as External. **Not measured:** real Ctrl+C and closing the terminal window on Windows, and signals on the cross-environment pairs other than SIGKILL.

### 6. Readiness and port check

- WSL→WSL: a TCP connect to `127.0.0.1` succeeded after ~550 ms (Vite listens on IPv4).
- Windows→Windows: connect succeeded after ~440–620 ms, but **only on `::1`** (`v4: false, v6: true`). Readiness must try both addresses.
- WSL→Windows: connect to both `127.0.0.1` and `::1` **failed even though Vite was listening** (consistent with `SPIKE.md`). Readiness here must come from a Windows-side listener query (`Get-NetTCPConnection`), not a TCP connect. A stop-then-check "port free" via connect is a false positive.
- Windows→WSL: connect to `127.0.0.1` succeeded after ~740–1700 ms.
- Port shared across sides: with a Windows `node.exe` listening on `127.0.0.1:5651`, a WSL bind returned `EADDRINUSE` in 7 ms and a WSL connect succeeded, but WSL `ss` did not list it. The reverse (WSL listener, Windows bind) also gave `EADDRINUSE`, yet `Get-NetTCPConnection` did not list the WSL listener. So **a bind attempt detects that a port is busy on either side; the holder's name comes only from the owning side's discovery scan** (Windows scan for Windows holders, `ss` for WSL ones) and may be unavailable.

### 7. Output

- stdout/stderr are pipes with no TTY. Vite still emits colour: Windows output contained `\u001b[32m\u001b[1mVITE\u001b[22m …`; WSL output was plain. Strip CSI/SGR sequences (`\x1b\[[0-9;]*[A-Za-z]`) from the log buffer.
- `bash -ic` can add job-control noise on stderr; expect it in the log.

## Decision

- **Supported in Goal 02:** WSL→WSL, Windows→Windows, and Windows→WSL. Same-environment launch ships first (O-003 plan).
- **WSL→WSL:** `spawn('sh',['-c',command],{detached:true})`, one argument, folder as cwd. Stop: SIGTERM to the group, SIGKILL after about 3 s, then confirm the group is gone. Readiness: TCP connect to `127.0.0.1`.
- **Windows→Windows:** `cmd.exe /d /s /c "<command>"` with verbatim arguments. Stop: `taskkill /PID <pid> /T /F` only while the run record is live and the PID's creation time matches. Readiness: connect to `127.0.0.1` or `::1`.
- **Windows→WSL:** `wsl.exe -e bash -ic "cd <dir> && exec <command>"`; stop with `taskkill /T /F` on the held `wsl.exe` PID. This is the one pair where a Shed crash also stops the project. Readiness: connect to `127.0.0.1`.
- **WSL→Windows: not supported.** The held PID cannot reach the tree, the Windows PID has to be found by command-line matching (a SCOPE-02 risk unless a unique run token is embedded), and readiness cannot be seen over TCP.
- **Port pre-check:** try to bind the port on the host side; if it is busy, name the holder from a fresh discovery scan when it has one, otherwise say "in use, holder unknown".
- **Shutdown:** handle SIGINT/SIGTERM/SIGHUP (and Windows console close) by stopping every live run; SIGKILL and End Task cannot be covered.
- **Cross-environment launch Task:** the only candidate is WSL→Windows, and it is **not recommended** for Goal 02. Windows→WSL is already covered above, so no separate cross-environment Task is needed.

## Limitations

- Windows Ctrl+C / window-close survival was not exercised (no interactive console in the session); SIGINT/SIGTERM/SIGHUP on Windows-hosted and cross pairs were not measured; only SIGKILL / forced kill were.
- One Vite version and one machine; networking mode is mirrored only (NAT not measured).
- The `{port}` check against a Windows holder and the shared-port tests used throwaway Node listeners, not real dev servers.

## T-011 real-machine results (product code, 2026-10-10)

Run with the shipped supervisor, from a Shed on each side, against a throwaway Vite 5.4.21 project per side.
Same machine and versions as above; Windows build 10.0.26300.9457, WSL Ubuntu 24.04.4, `networkingMode=mirrored`,
Node 22.22.2 (WSL host) and 24.14.0 (Windows host), npm 10.9.7 (WSL) and 11.9.0 (Windows). Logs, harness and
orphan checks: `docs/evidence/T-011/`.

| Scenario | WSL-hosted → WSL | Windows-hosted → Windows |
|---|---|---|
| Start on preferred port, Running, output, HTTP 200 | pass (readiness ~1 s) | pass; matched service seen as `node.exe` |
| Stop: tree gone, port free | pass (`sh, npm, sh, node, esbuild` all gone) | pass (`cmd, conhost, node, cmd, node, esbuild` all gone) |
| Restart then Stop | pass (new leader pid, old one gone) | pass |
| Port held by another process | refused 409; holder named only after a fresh scan (I-009) | same |
| Bad command | `failed`, exit code 7, last lines in message | same |
| Project in the other environment | refused 409 `wrong-environment` | same |
| Hand-started Vite | no run record (External); API stop refused 409; server keeps listening | same |
| Shutdown signal | SIGINT: Shed stops the tree, exit 0, port free | real console Ctrl+C: Shed exit 0, tree gone, port free (`windows-ctrlc.log`) |
| Hard kill of the Shed | whole tree and port survive | leader `cmd.exe` gone, `node`/`cmd`/`conhost` survive, port stays open |
| After restarting the Shed | survivor shows as External, API stop refused 409 | same |

Differences from the spike and caveats:

- The Windows Ctrl+C was sent with `GenerateConsoleCtrlEvent` to the Shed's console, which Vite shares, so Vite also received it. The result shows a clean exit and no orphans, but not that the Shed's own shutdown handler did the stopping.
- Windows→WSL, which the spike found workable, is **not delivered**: the shipped supervisor refuses it with `wrong-environment` (no cross-environment Task was planned). The refusal was verified; a launch was not.
- A Windows hard kill left fewer survivors than the spike's `taskkill /F` run (the leader and its console host died); the stray ports and processes were still the Shed's to be found as External.
- Only mirrored networking and one Vite version were tried; NAT mode was not.
