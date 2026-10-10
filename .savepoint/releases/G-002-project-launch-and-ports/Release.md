---
id: G-002
title: Project launch and port management
status: planned
---
## Outcome

The Shed becomes a local development control centre: the developer keeps a registry of projects (folder, environment, preferred port, optional launch command) whether or not they are running, sees port conflicts and how registered projects match discovered services, opens a project folder in VS Code or Cursor, and starts, stops and restarts registered projects on Windows and WSL — with launch errors, recent output, and a clear Managed/External label — while The Shed never stops a process it did not start.

## Why

Owner's Goal 02 brief (2026-10-10): "Evolve The Shed from a dashboard that discovers running localhost services into a local development control centre where users can register, organise and launch projects," preserving "V1's simplicity, reliability and local-first philosophy." V1 (G-001) is complete and accepted.

## Success Conditions

- Registered projects, their folders and preferred ports survive restarts; existing V1 preferences, including manual projects, are kept.
- Port conflicts are shown and never silently resolved; a launch whose port is taken is refused with the reason.
- A registered Windows Vite project and a registered WSL Vite project start on their assigned ports, show as Managed with recent output, and stop with their whole process tree gone and the port free.
- No route or code path stops or signals a process The Shed did not start; no command is built from discovered data.

## Boundaries

In: project registry (config v2, migration of manual projects), preferred ports and conflict detection, reconciliation with discovered services, editor-open links, a launch/stop supervisor for processes The Shed starts, launch errors and in-memory logs, Managed/External labelling, the guardrail rewrite this requires.

Out: automatic port suggestion from a range (owner: "Leave out for now"), auto-restart after a crash, re-adopting processes after The Shed restarts, stopping discovered processes, launch commands inferred from project files, editing project config files, persisted or streamed logs, per-project environment-variable editors, Docker, non-default WSL distros, macOS, port reservation.
