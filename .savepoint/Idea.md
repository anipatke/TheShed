---
type: idea
status: planned
---

# Idea: The Shed

> Recorded retrospectively from the owner's two written briefs (the original V1 brief and the "Spike 01 is accepted. Proceed with The Shed V1" brief, both 2026-10-10). Wording below is the owner's; nothing here is inferred from source code.
>
> Goal 02 additions come from the owner's "Goal 02: Project Launch & Port Management" brief and the scope approval that followed it (both 2026-10-10). They are marked *(Goal 02)*.

## Intent

"A small, local-first developer dashboard called The Shed." Its purpose: "A single homepage for discovering and navigating development projects running on localhost."

*(Goal 02)* "Evolve The Shed from a dashboard that discovers running localhost services into a local development control centre where users can register, organise and launch projects," while preserving "V1's simplicity, reliability and local-first philosophy."

## User

A developer working across Windows-native and WSL development environments on one machine, running several local dev servers at once.

## Core Experience

Open one page; see the projects currently running on localhost on Windows and WSL as cards with name, port, environment and live status; open a website in a new browser tab. Favourite what matters, hide noise, and add or rename projects by hand. Refresh discovery without restarting.

*(Goal 02)* Keep a list of your projects whether or not they are running, each with its folder and preferred port; see port clashes; start and stop a project from its card; see why a launch failed and its recent output; open its folder in VS Code or Cursor; tell at a glance which running services The Shed started and which you started yourself.

## Scope

- Discover listening localhost ports on Windows and WSL.
- Probe HTTP services; classify website / API / other.
- Identify project name and working directory where possible, otherwise show the port.
- Project cards with name, port, environment, URL and status; open in a new tab.
- Manual projects, manual naming and folder association.
- Favourite, hide and unhide; hide noisy processes by name.
- Local JSON persistence.
- Manual refresh and periodic discovery; per-source warnings without failing the whole scan.
- Atari-Noir design: dark background, warm off-white text, restrained orange highlights; responsive cards.
- *(Goal 02)* Project registry: register projects independently of whether they are running; associate them with Windows or WSL folders; assign and edit preferred ports; detect port conflicts; keep identities and preferences across restarts; reconcile registered projects with discovered services; never silently reassign ports.
- *(Goal 02)* Controlled launch: launch registered projects with explicitly configured commands on Windows and WSL; pass assigned ports to supported dev servers; track the processes The Shed starts and stop only those; handle launch failures, unexpected exits and restarts.
- *(Goal 02)* Convenience: open project folders in VS Code or Cursor; useful launch errors; basic stdout/stderr logs; managed vs external services clearly distinguished.

## Out of Scope

- ~~Process start/stop controls ("Do not implement process start/stop controls yet").~~ Brought into scope by Goal 02, limited to processes The Shed itself starts.
- Databases, cloud services, accounts, Docker dependency.
- Administrator privileges.
- *(Goal 02)* Terminating arbitrary discovered processes; executing commands derived from discovered process metadata; modifying individual project configuration files without explicit approval; a general-purpose process manager or IDE.
- *(Goal 02, owner 2026-10-10)* Suggesting ports automatically from a configured range: "Leave out for now."

## Success Criteria

Owner's V1 acceptance criteria: "Running Vite applications on both Windows and WSL appear in The Shed, can be identified, renamed, favourited and opened. Saved preferences survive restarts. Unsupported or inaccessible services don't crash discovery."

*(Goal 02)* Registered projects and their ports survive restarts; port conflicts are shown and never silently resolved; a registered Windows project and a registered WSL project can be launched on their assigned ports, show their output, and stop cleanly; The Shed never stops a process it did not start.
