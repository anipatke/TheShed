---
type: guardrails
status: active
---

# Guardrails — Engineering Policy

## Purpose

This document is the authoritative engineering policy for TheShed.

If a rule can block a Check's verdict or require remediation, it must be defined here. Skills must not invent blocking policy that isn't recorded here.

**Sized for the project:** a single-user tool on one machine, bound to localhost, with no accounts, secrets or remote users. The rules guard the real risks: a local page or service abusing the server, discovery running something it shouldn't, and lost preferences. They also enforce the owner's scope limits. Generic web-app policy (auth, secrets handling, multi-tenant data) is deliberately absent.

Source tags: *owner* = owner's written briefs (Idea.md); *spike* = safety decision proven in `docs/SPIKE.md`.

Owner sign-off, 2026-10-10 (O-004 retrospective, T-012): TEST-01 host-value cases and TEST-03 repeated Restart / SIGTERM-ignoring stop added, approved by owner.
Owner sign-off, 2026-10-10 (O-003 repair, I-011): SEC-02 now names the Windows `taskkill` stop helper, approved by owner (option A).
Owner sign-off, 2026-10-10 (O-003 planning): SCOPE-02 replaced and SEC-02/SEC-04 rewritten to allow controlled launch of registered projects only; TEST-03 extended to launch/stop. Approved before any launch code landed.

## Severity Model

| Severity | Meaning |
|---|---|
| Blocker | Must be fixed before a Check can return `CLEAR`, unless the owner explicitly approves an exception. |
| Required | Must be satisfied before approval unless an explicit waiver is recorded. |
| Guideline | Improve when practical. Does not block a Check by itself. |

## Rule Index

### Security

| ID | Severity | Source | Rule |
|---|---|---|---|
| SEC-01 | Blocker | owner | The server binds to `127.0.0.1` only, and the bind address is not configurable. |
| SEC-02 | Blocker | owner, spike | Subprocesses are either fixed discovery scripts or a registered project's launch command. Discovery scripts are constant and run via argument arrays; no request, config or discovered data (ports, names, paths, titles, command lines) is ever interpolated into, or passed as, their command, script or arguments. A launch command is the project's stored command, passed to the platform shell as one argument with the project folder as working directory; the port reaches it only as a validated integer (substituted for `{port}` and set as `PORT`). Nothing discovered and no other request field is ever joined into it. The only other subprocess is the stop helper: on a Windows host, `taskkill /PID <pid> /T /F` with fixed arguments, where `<pid>` is an integer taken from a live run record of a process The Shed started. No API route can run anything else. |
| SEC-03 | Blocker | owner | Discovered services are untrusted. Probes are bounded (timeout, body cap, no redirects); service text is rendered as plain text only; URLs the UI opens are never taken from a service's response. |
| SEC-04 | Required | spike | The API rejects a non-loopback `Host`, and mutations with a non-localhost `Origin` or non-JSON body. User URLs must be `http(s)` and are probed only if loopback; user folders must be absolute paths and are stored, displayed and turned into editor links in the browser. The server uses a registered folder only as the working directory of that project's launch command; it never reads files in it or executes anything found there. |

### Scope

| ID | Severity | Source | Rule |
|---|---|---|---|
| SCOPE-01 | Blocker | owner | No feature may require admin, elevated or `sudo` privileges. Data hidden without them is reported as a limitation. |
| SCOPE-02 | Blocker | owner | The Shed starts a process only from a registered project's own launch command, on an explicit user action. It stops or signals only processes it started in the current server session, tracked by a run record. No route or code path stops, signals or adopts any other process, including after a restart. Nothing restarts automatically. |
| SCOPE-03 | Required | owner | No database, cloud service, account system or Docker dependency. The server uses Node built-ins only; any new dependency needs a reason recorded in Design Decisions. |

### Discovery

| ID | Severity | Source | Rule |
|---|---|---|---|
| DISC-01 | Required | owner | One source failing, timing out or missing a tool yields a per-source warning; the other sources still return and the server keeps running. |
| DISC-02 | Required | owner, spike | Listeners are deduplicated by environment and port (Windows/WSL overlap shown once). A listener the OS reports but The Shed can't reach is *unverified*, not offline. Changes to discovery keep `docs/SPIKE.md` true, or update it with new evidence. |

### Data

| ID | Severity | Source | Rule |
|---|---|---|---|
| DATA-01 | Required | owner | Preferences live in one local JSON file. It is validated on load (bad entries dropped; an unparseable file moved aside, never deleted), written atomically, and survives restarts. A format change must not lose existing preferences without owner approval. |

### Testing

Matched to what can go wrong here: pure logic is cheap to unit-test, platform and network behaviour can only be proven on a real machine, and the UI is small.

| ID | Severity | Source | Rule |
|---|---|---|---|
| TEST-01 | Required | owner | Every changed behaviour has named evidence. Pure server logic (parsers, inference, classification, validation) gets a `node:test` case. OS, network or UI behaviour gets a recorded scenario: what was run, where, and the result. Name the exact test cases when citing existing ones. Logic that branches on the server host or a project environment gets a case for each value (`windows`, `wsl`, `linux`). |
| TEST-02 | Required | owner | A bug fix in pure logic adds a regression test. A bug fix in OS, network or UI behaviour records its failing scenario and the passing re-run. |
| TEST-03 | Required | owner | Windows/WSL discovery and launch/stop changes are verified on a real Windows + WSL machine. The evidence names the networking mode and which side hosted the server. Launch/stop evidence includes Restart repeated at least five times and a Stop of a server that ignores SIGTERM, each followed by an orphan and free-port check. Process-control fakes include a leader that exits before the rest of its group. |

UI component tests and browser automation are not required in V1. Screenshots and recorded API runs are acceptable UI evidence.

### Code Style

| ID | Severity | Rule |
|---|---|---|
| STYLE-01 | Guideline | **One job per file and function** — split when responsibilities mix. |
| STYLE-02 | Guideline | **Handle errors at boundaries** — validate requests, subprocess output, files and probe responses. |
| STYLE-03 | Guideline | **Build only what is needed** — no speculative abstractions. |
| STYLE-04 | Guideline | **One source of truth** — no duplicated rules, constants, state or config. |
| STYLE-05 | Guideline | **Comments explain why** — not what the code already says. |

## Savepoint Check Enforcement

`savepoint-check` applies these rules through `agent-skills/references/check-method.md`: Quick evidence is optional and applies only to a requested Task Check; Full evidence is mandatory for an Objective Check. Code style rules are Guideline severity throughout — they inform review but never block a Check's verdict by themselves. Task-check waivers follow AGENTS.md's Verification Policy.

Required waivers must be explicit and documented. Blocker exceptions require direct owner approval.
