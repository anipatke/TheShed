---
id: O-001
title: Discovery spike and V1 dashboard
status: done
depends_on: []
release: G-001
priority: high
rank: 1
---

# O-001: Discovery spike and V1 dashboard

> Retrospective Objective. The work was built before Savepoint was installed (2026-10-10) and is recorded here so an independent Full Objective Check can audit everything to date. Owner decision (2026-10-10): one spike Objective with a single Task covering all work to date, including the V1 build and acceptance run that followed the spike.

## Outcome

A proven Windows + WSL localhost discovery method (Spike 01), documented with its limitations, and The Shed V1 built on it: a local-first React/TypeScript dashboard with a dependency-free Node backend that discovers, classifies, identifies and lets the developer rename, favourite, hide and open local projects, with preferences kept in local JSON.

## Why

The owner's brief required a short technical spike proving Windows and WSL discovery, with what works and what doesn't documented before any UI. The owner accepted Spike 01 ("Spike 01 is accepted. Proceed with The Shed V1") and directed V1 to use `docs/SPIKE.md` as its technical baseline.

## Success Conditions

1. `docs/SPIKE.md` records the tested discovery commands, timings, gotchas, limitations and safety decisions, all from real runs on Windows + WSL without admin rights.
2. V1 features from the owner's brief exist: automatic Windows + WSL discovery; cards with name, port, environment and status; website/API/other classification; open in browser; manual projects; manual naming and folder association; favourite/hide/unhide; hide noisy processes by name; local JSON persistence; manual and periodic refresh; per-source warnings.
3. Owner acceptance criteria hold: running Vite apps on both Windows and WSL appear and can be identified, renamed, favourited and opened; saved preferences survive restarts; unsupported or inaccessible services don't crash discovery.
4. The configured gates (`npm run typecheck`, `npm run build`, `npm test`) pass.
5. The implementation satisfies the Blocker and Required rules in `.savepoint/Guardrails.md`.

## Architectural Considerations

Interfaces, data ownership and decisions are as recorded in `.savepoint/Design.md` (reconstructed from this work). Platform evidence for the Full Check: a run on a real Windows 11 + WSL2 machine, which the executor recorded in T-001 (TEST-03). A fresh Check can reproduce it on the same machine.

## Confirmed Decisions

Recorded by the owner on 2026-10-10:

- Scope: a single Objective and a single Task covering all work to date.
- Design.md and Guardrails.md are drafted now, before the audit, so the Check runs against project-specific rules rather than the scaffold example.
- Guardrails and testing are rightsized for a single-user localhost tool: 14 substantive rules plus 5 style rules. Unit tests are for pure server logic, recorded real-machine scenarios for OS/network/UI behaviour, and no browser automation in V1.
- Quality gates come from `package.json`: typecheck, build, test; no lint gate (no linter installed).

## Boundaries

**In scope:**
- Discovery spike and its documentation (`docs/SPIKE.md`)
- Server (`server/`), shared types (`shared/`), UI (`client/`), dev script, build/test configuration
- V1 design note and acceptance record (`docs/V1-DESIGN.md`), README

**Out of scope:**
- Process start/stop controls
- Multiple WSL distros, macOS, WSL NAT-mode verification
- Automated browser (UI interaction) tests
