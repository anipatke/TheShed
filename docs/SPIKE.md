# Spike: localhost discovery on Windows + WSL

Date: 2026-10-10. Host: Windows 11 + WSL2 (Ubuntu, kernel 6.18, `networkingMode=mirrored`),
Node 22.22 (WSL) and Node 24.14 (Windows). Everything below was run as a normal user — no admin, no sudo.

## Summary

| Question | WSL side | Windows side |
|---|---|---|
| Enumerate listening TCP ports | ✅ `ss -Hltnp` (iproute2) | ✅ `Get-NetTCPConnection -State Listen` (~0.8 s incl. PowerShell start-up) |
| Port → PID | ✅ for **own** processes; ❌ other users (e.g. `ollama` service, uid 999) | ✅ always (`OwningProcess`) |
| Process name / command line | ✅ `/proc/<pid>/cmdline` (own processes) | ✅ user processes via `Win32_Process`; ❌ `CommandLine` is `null` for elevated/system processes (svchost, postgres service, lsass…) |
| Working directory | ✅ `readlink /proc/<pid>/cwd` (own processes) | ❌ not exposed by any non-admin API without reading another process's PEB. **Inferred** from the command line instead (`…\node_modules\…` prefix, or script path argument) |
| Other side's ports visible? | — | ❌ WSL listeners do **not** appear in `Get-NetTCPConnection`, even in mirrored mode. Must ask WSL via `wsl.exe` |
| Reach the other side over HTTP | ✅ (mirrored) Windows `127.0.0.1:1234` reachable from WSL | ✅ WSL ports reachable from Windows at `localhost` (both mirrored and default NAT `localhostForwarding`) |
| Cross-invoke | `powershell.exe` via WSL interop | `wsl.exe -e sh -c '…'` (default distro) |

## Commands proven

WSL (also what the Windows-hosted server runs through `wsl.exe -e sh -c`):

```sh
ss -Hltnp                          # LISTEN 0 511 127.0.0.1:5173 0.0.0.0:* users:(("node",pid=88065,fd=25))
readlink /proc/88065/cwd           # /home/user/code/galaxy
tr '\0' ' ' < /proc/88065/cmdline  # node /home/user/code/galaxy/node_modules/.bin/vite
```

Windows (piped to `powershell.exe -NoProfile -NonInteractive -Command -`):

```powershell
$l = Get-NetTCPConnection -State Listen
$ids = $l | Select-Object -ExpandProperty OwningProcess -Unique
Get-CimInstance Win32_Process -Filter ("ProcessId=" + ($ids -join " OR ProcessId=")) |
  Select-Object ProcessId,Name,ExecutablePath,CommandLine
```

Fallback if the NetTCPIP module is unavailable: `netstat.exe -ano -p TCP` (fast, ~40 ms, PIDs only).

## HTTP probing results

`GET /` with a 2 s timeout cleanly separates the cases:

| Port | Result | Meaning |
|---|---|---|
| 5173 (vite) | `200 text/html` | website |
| 1234 (LM Studio), 11434 (ollama) | `200 application/json` / `text/plain` | HTTP API, not a page |
| 57770 (codex) | `401` | HTTP, auth-protected |
| 5037 (adb) | empty reply | TCP, not HTTP |
| 27036 (steam), 55432 (postgres) | connection reset | TCP, not HTTP |

## Gotchas found

- Spawning `powershell.exe`/`cmd.exe` from a WSL path prints a "UNC paths are not supported" warning. Spawn with `cwd: /mnt/c`.
- `wsl.exe -l` output is UTF-16LE; avoid parsing it — just run commands with `wsl.exe -e`.
- The same service often listens on both `0.0.0.0` and `::` — dedupe by (environment, port).
- `ss` reports `[::]:port` and `%lo` scoped addresses (`127.0.0.53%lo:53`); the parser must handle both.
- PowerShell `-Command -` (script on stdin) runs line by line and silently breaks multi-line blocks — empty output. Use `-EncodedCommand` (base64 UTF-16LE).
- Always close a child's stdin, but swallow `EPIPE` on it: a child that exits first (e.g. `wslinfo`) otherwise raises an unhandled error that kills the server. Found during build.
- Mirrored mode: IPv6 loopback (`::1`) listeners on Windows are **not** reachable from WSL (they are from Windows).
- Mirrored mode: connecting to an *unused* loopback port from WSL may time out, or be briefly accepted and reset by the relay, instead of a clean `ECONNREFUSED`. A refused/failed probe of a port the OS *says* is listening is therefore reported as "unverified", not "down".
- *(Found in V1 acceptance)* **Windows Vite binds `localhost` → `::1` only.** Combined with the point above, a WSL-hosted Shed shows every Windows Vite app as *Unverified* (still listed and openable). A Windows-hosted Shed verifies them. Manual `localhost` URLs are probed on `127.0.0.1` then `::1`, like a browser.
- *(Found in V1 acceptance)* Mirrored mode: after a WSL server stops, its `TIME-WAIT` sockets keep the port reserved **on Windows** for ~30–60 s ("Only one usage of each socket address…"), though Linux could rebind immediately. Switching The Shed between WSL and Windows on the same port needs that pause.
- Many desktop apps (agy, codex, Steam, SteelSeries, Riot) hold random high ports. These are noise for a dev dashboard → "hide by process name" is more useful than "hide by port".

## Limitations to document

1. **Other users' WSL processes** (system services like `ollama`, `postgres`) show the port but no PID/name. `sudo` would fix it; we deliberately don't ask for it.
2. **Elevated Windows processes** show a name but no command line → no project inference.
3. **Windows working directory** is never available; project path is a best-effort guess from the command line.
4. **WSL NAT mode** (non-mirrored): the WSL-hosted server can enumerate Windows ports but usually can't *probe* them at `127.0.0.1`; those show as "listening, unverified".
5. **Only the default WSL distro** is queried from Windows.
6. `wsl.exe -e` from Windows will start a stopped distro (~1–2 s first time). Discovery is skipped if `wsl.exe` is absent.
7. Plain Linux works (WSL half only). macOS is not supported in V1.

## Decision

- Discovery runs **fixed, constant scripts** (`execFile`, no shell interpolation of any input) — nothing from the frontend or from discovered services is ever passed to a command.
- Run both halves in parallel; one side failing yields a per-source warning, never a failed scan.
- Server can be hosted in either environment; it detects where it is and calls across.
