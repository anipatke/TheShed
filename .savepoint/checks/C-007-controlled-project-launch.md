---
id: C-007
scope: {kind: objective, id: O-003}
result: NEEDS WORK
checked_by: {role: checker, session: independent-o003-full-20261010-0732}
executed_session: multiple (T-006..T-011 executor sessions; see each Task's Technical Evidence)
checked_at: '2026-10-10T07:32:24Z'
reviewed:
  base_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7
  head_commit: 500642df78bc8aafca2b0b3f9cb98860fcaf92a7 (plus uncommitted working tree)
  files: [server/supervisor.ts, server/supervisor.test.ts, server/index.ts, server/config.ts, server/runs.test.ts, server/registry.ts, shared/launch.ts, shared/types.ts, client/src/runs.ts, client/src/LogPanel.tsx, client/src/Card.tsx, client/src/model.ts, client/src/App.tsx, client/src/api.ts, client/src/ProjectForm.tsx, docs/SPIKE-LAUNCH.md, docs/evidence/T-010/, docs/evidence/T-011/, .savepoint/Design.md, .savepoint/Guardrails.md]
  dependencies: []
issues: [I-010, I-011]
supersedes: null
---

# O-003 Full Objective Check: Controlled project launch

Fresh session: this conversation started after `/clear` and built none of O-003. Mode: **Full**. All six owned Tasks (T-006..T-011) are `done` with owner Task-check waivers; this Check covers each of them, cross-Task integration and Design reconciliation.

**Result: NEEDS WORK.** Launch, refusal, ownership, log and shutdown behaviour mostly hold under independent probes. Three things block: Stop treats the shell's exit as the whole tree stopping, so Restart is refused and a slow or SIGTERM-ignoring server is left running and unstoppable (I-010, new); a busy port is often refused without naming the holder, and never when the holder is on the other side (I-009, existing, widened); Design and SEC-02 were never reconciled with launching (I-011, new).

## Scope Lock

1. **Criteria:** O-003 Success Conditions 1–7 and Outcome; Done When of T-006..T-011; Guardrails SEC-01..04, SCOPE-01..03, DATA-01, TEST-01..03 (STYLE advisory). Design reconciliation.
2. **Changed files / entry points:** files in `reviewed.files`. Public surfaces: `POST /api/projects/:id/{start,stop,restart}`, `GET /api/projects/:id/log`, `GET /api/state` (`runs`), `DELETE /api/projects/:id`, project create/edit (`launch.command`), shutdown signal handlers, `Supervisor` (start/stop/restart/stopAll/runs/log), `LogBuffer`, `withPort`, `refusalStatus`, `defaultCheckPort`, `defaultIsListening`, `shared/launch.ts`, `client/src/runs.ts`, `RunControls`, `LogPanel`.
3. **Relied-on runtime:** `child_process.spawn` (`sh -c` detached / `cmd.exe /d /s /c` verbatim), process-group signals, `taskkill`, `net` bind/connect, Scanner cache.
4. **Matrix axes:** below; Windows-hosted cells rely on T-011 recorded executor evidence (not re-run here) and are marked so.
5. **Admission:** an Issue must break a named criterion/guardrail, be reproducible through a supported path (WSL→WSL or Windows→Windows), and have a credible consequence.

## Gates and Evidence

| Command | Result |
|---|---|
| `npm run typecheck` | pass (exit 0) |
| `npm run build` | pass (vite, 23 modules) |
| `npm test` | 137 pass, 0 fail, 0 skipped (Node v22.22.2, WSL) |
| `git diff --check` | clean |
| lint | not configured (`quality_gates.lint: null`) |
| `savepoint health check O-003 .` | "Code Health is not configured"; no snapshot; not a finding |

Independent scenarios: a scratch harness (outside the repo) started the real server (`SHED_PORT=4833/4834`, temp `SHED_CONFIG`) on WSL, `networkingMode=mirrored`, and drove the HTTP API with a stand-in dev server that keeps a child process (a tree). Plus direct `Supervisor` probes and bind-timing probes. All processes the harness started were removed by it afterwards.

## Coverage Matrix (WSL-hosted, live server unless noted)

| Cell | Expected | Actual | Class |
|---|---|---|---|
| Start without `X-Shed` / evil `Origin` / `text/plain` / non-loopback Host / GET on start | refused | 403 / 403 / 415 / 421 / 404 | Proven |
| Unknown id on start/stop/log; `..%2F` id | 404 | 404 ×3; 404 | Proven |
| Not launchable (no port) | 400 with reason | 400 "needs a preferred port" | Proven |
| Wrong environment | 409 | 409 "lives in windows…" | Proven |
| Stop with no run; stop body carrying an outside PID | 409, nothing signalled | 409; body ignored | Proven (SC5) |
| Two concurrent starts | one 200, one 409 | 200 / 409 "already running or starting" | Proven |
| Start → running on assigned port; `{port}` repeated and `PORT` set | running, port open | running; HTTP on 5701; log shows `5701 PORT=5701` | Proven |
| Log route: plain text, ANSI CSI stripped, HTML literal | text | `<b>bold</b>` literal; CSI gone; OSC 8 payload and BEL left | Proven (OSC: observation) |
| Delete while running | 409 | 409 "stop it first" | Proven |
| Restart while running | stop, wait, start | **409 "Port … in use, holder unknown"**, run left `stopped` (4/4 commands) | **Issue I-010** |
| Stop: tree gone, port free | no leftovers | none left, port closed (fast-exiting server) | Proven |
| Stop: server slow to exit / ignoring SIGTERM | escalate to SIGKILL, port free | reported `stopped` in 0 ms; server alive and listening 4 s later; unstoppable | **Issue I-010** |
| Stop after run ended | 409, no signal | 409 | Proven |
| Bad command | failed, exit code, last lines | `failed`, code 7, "l1\nl2" | Proven (SC4) |
| Missing folder | failed with reason | `failed`, "Could not start: spawn sh ENOENT" | Proven (wording: observation) |
| Exit after running | exited, code, last lines | `exited`, code 4, last lines | Proven |
| Port held, same side, just bound | refused naming holder | 409 "holder unknown" | **Issue I-009** |
| Port held, same side, after fresh scan | names holder | "in use by node (pid …)" | Proven |
| Port held, Windows side, after fresh scan | names holder | **still "holder unknown"** (scan and card warning do name `node.exe`) | **Issue I-009** |
| Hand-started server | External, no run, stop refused, keeps serving | matched, no run, 409, still serving | Proven (SC5, SCOPE-02) |
| SIGKILL of Shed, restart | survivors not re-adopted, stop refused | 3 survivors; `runs: []`; 409; still up | Proven (SC6) |
| SIGTERM / SIGHUP of Shed | tree stopped, exit 0 | exit 0, no leftovers, port free (both) | Proven (SC6) |
| Ready timeout (60 s), stop-all, escalation with live leader, ring cap | per T-008 | unit tests only (`supervisor.test.ts`) | Proven by named tests |
| UI: Start/Stop/Restart visibility, Managed/External, error panel, refusal, output view | per T-010 | source read (`Card.tsx:56-123`, `runs.ts`, `model.ts:148-178`) agrees; T-010 screenshots 1–7; 14 `runs.test.ts` cases | Proven (mismatch warning: tests only) |
| Launch command field: validation, round trip, dropped on load | per T-007 | named `discovery.test.ts` "launch command" cases pass | Proven |
| Windows→Windows launch, stop, restart, refusals, Ctrl+C | per T-011 | T-011 `windows-hosted.log`, `windows-ctrlc.log` (executor evidence, not re-run) | Accepted as recorded TEST-03 evidence; Windows I-010 race unverified |
| Cross-environment launch | refused (no cross Task) | 409 `wrong-environment` | Proven |

### External boundary (spawn, signals, bind, connect)

Configured vs actual target: host env from `detectHost`, matched. Startup ordering: bind check then spawn; readiness by connect to `127.0.0.1` then `::1`. Unavailable dependency: missing folder → `failed`. Non-success: non-zero exit → `failed`/`exited`. Timeout: readiness 60 s (unit). Cleanup/partial effects: **leader-exit vs group-exit gap (I-010)**. Secret-safe output: no secrets in scope. Redirects/malformed responses: not applicable (no HTTP client in launch path).

### Workflow and side effects (start → run → stop/restart → shutdown)

| Order | Operation | Side effect | Failure handling | Oracle |
|---|---|---|---|---|
| 1 | eligibility, env, active, other-run port | none | refusal, nothing spawned | API status + `ps` |
| 2 | bind pre-check | brief bind | `port-busy` | harness holder |
| 3 | spawn | process group | `failed` on throw/error | `ps -eo pgid` |
| 4 | readiness poll | none | 60 s → stop → `failed` | port connect |
| 5 | stop: SIGTERM group, wait leader, SIGKILL | signals own group only | **leader exit ends the wait (I-010)** | `ps`, port |
| 6 | restart: stop then start | as 5 + 1–3 | **step 2 races step 5 (I-010)** | API, bind probe |
| 7 | shutdown: stopAll ≤10 s, exit 0 | as 5 for all runs | bounded | `ps`, exit code |

## Acceptance Classification

| Criterion | Class |
|---|---|
| SC1 spike record | Proven (`docs/SPIKE-LAUNCH.md` summary, seven questions, environment, decision; Windows Ctrl+C limitation stated) |
| SC2 guardrail rewrite before code, owner sign-off | Proven (Guardrails sign-off line; Objective Confirmed Decisions) |
| SC3 start on port, Managed, output, stop with no orphan, port free | **Issue** (I-010: stop/restart; Vite runs in T-011 passed) |
| SC4 busy port refused with holder; failure shows code and last lines | **Issue** for holder (I-009); failure display Proven |
| SC5 no stop without a run record | Proven |
| SC6 shutdown stops runs; no re-adoption | Proven (WSL live; Windows by T-011 evidence) |
| SC7 gates pass, Blocker/Required met, TEST-03 evidence | **Issue**: SEC-02 text vs `taskkill` and Design drift (I-011); gates pass; TEST-03 evidence names mode and host side |
| Design reconciliation | **Issue** (I-011) |
| Owner validation for T-010, T-011 (`owner_validation.required`) | Not recorded (`accepted_check` empty; T-011 User Check "pending") — owner action after a CLEAR Check |

## Guardrails

SEC-01 bind constant unchanged — met. SEC-02 command reaches the shell as one argument; port only as validated integer; nothing discovered joined — met in substance; `taskkill` not named by the rule text — I-011. SEC-03 log and messages render as text nodes (`LogPanel.tsx:46`, `Card.tsx:90`) — met. SEC-04 route guards — met (G1–G7); folder used only as cwd — met. SCOPE-01 no elevation — met. SCOPE-02 only own runs signalled, no adoption, no auto-restart — met; I-010 leaves an own process running, which is a stop-completeness defect, not a signal to a foreign process. SCOPE-03 no new dependencies — met. DATA-01 launch field optional, V2 unchanged — met. TEST-01/02 — met for delivered behaviour; I-010 lacks a covering test. TEST-03 — met by T-011 evidence.

## Materiality

| Issue | Likelihood | Impact | Materiality | Recommendation |
|---|---|---|---|---|
| I-010 Stop ends on leader exit | High for Restart (4/4 here; Vite passed by timing); Medium for slow-shutdown servers | Restart button unusable; a still-running server the Shed can no longer stop, port held | High | Fix now in `Supervisor` (wait for or escalate against the group, bounded) with a fake-spawn test and re-run on both hosts |
| I-009 holder not named | High (any freshly bound or other-side holder) | Refusal still correct, only the name missing; card warning names other-side holders | Low–Medium | Combine with the I-010 fix: fresh scan on busy, and accept holders from either environment |
| I-011 Design/SEC-02 drift | Certain | Wrong architecture record; Blocker rule text contradicts shipped code | Medium | `savepoint-design` reconciliation plus owner wording approval for SEC-02 |

## Observations (non-blocking)

- `LogBuffer` strips CSI only; OSC sequences (e.g. OSC 8 hyperlinks) leave `]8;;url` and a BEL in the text. Still plain text; Vite emitted none in T-011.
- A missing folder reports "spawn sh ENOENT", which names the shell rather than the folder.
- If the leader exits on its own while children live, the run becomes `exited` and the children cannot be stopped from The Shed (deliberate SCOPE-02 trade-off; worth a Design limitation line).
- Readiness accepts any listener on the assigned port, including one that bound after the pre-check.
- HTTP routes have no in-process tests (`server/index.ts` listens on import); coverage is recorded API runs.
- Windows Ctrl+C evidence cannot separate The Shed's handler from Vite's own (T-011 caveat); console-window close (SIGBREAK) not exercised.
- Windows→WSL works in the spike but is refused by design until a cross-environment Task exists.

## Code Style Review

- [ ] STYLE-01 **One job per file and function** — `server/index.ts` `api()` now holds every route including run control (~100 lines of branching); `supervisor.ts` itself is focused.
- [x] STYLE-02 **Handle errors at boundaries**
- [x] STYLE-03 **Build only what is needed**
- [x] STYLE-04 **One source of truth** — launch rules shared via `shared/launch.ts`.
- [x] STYLE-05 **Comments explain why**

## Owner Validation Still Needed

After a CLEAR re-check: the owner's User Check for T-010 and T-011, recorded as `owner_validation.accepted_check` naming that Check.

## Next

Remediation goes to the executor as direct repairs under I-010 and I-009, and to `savepoint-design` for I-011. No Task status was changed by this Check.
