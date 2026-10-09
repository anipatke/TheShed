---
type: idea
status: planned
---

# Idea: The Shed

> Recorded retrospectively from the owner's two written briefs (the original V1 brief and the "Spike 01 is accepted. Proceed with The Shed V1" brief, both 2026-10-10). Wording below is the owner's; nothing here is inferred from source code.

## Intent

"A small, local-first developer dashboard called The Shed." Its purpose: "A single homepage for discovering and navigating development projects running on localhost."

## User

A developer working across Windows-native and WSL development environments on one machine, running several local dev servers at once.

## Core Experience

Open one page; see the projects currently running on localhost on Windows and WSL as cards with name, port, environment and live status; open a website in a new browser tab. Favourite what matters, hide noise, and add or rename projects by hand. Refresh discovery without restarting.

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

## Out of Scope

- Process start/stop controls ("Do not implement process start/stop controls yet").
- Databases, cloud services, accounts, Docker dependency.
- Administrator privileges.

## Success Criteria

Owner's V1 acceptance criteria: "Running Vite applications on both Windows and WSL appear in The Shed, can be identified, renamed, favourited and opened. Saved preferences survive restarts. Unsupported or inaccessible services don't crash discovery."
