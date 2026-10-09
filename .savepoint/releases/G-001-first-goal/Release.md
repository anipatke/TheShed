---
id: G-001
title: TheShed
status: in_progress
---
## Outcome

The Shed V1: a local-first homepage that discovers development projects running on localhost across Windows and WSL and lets the developer identify, rename, favourite, hide and open them, with preferences kept in a local JSON file.

## Why

Owner's stated purpose: "A single homepage for discovering and navigating development projects running on localhost," built on a discovery approach first proven in a technical spike, with limitations documented before the UI was built.

## Success Conditions

Owner's acceptance criteria: running Vite applications on both Windows and WSL appear in The Shed and can be identified, renamed, favourited and opened; saved preferences survive restarts; unsupported or inaccessible services don't crash discovery.

## Boundaries

In: Windows + WSL discovery, HTTP classification, cards, manual projects, naming and folder association, favourites, hiding (by port or process name), JSON persistence, manual and periodic refresh, per-source warnings, Atari-Noir responsive UI.

Out: process start/stop, databases, cloud, accounts, Docker dependency, administrator privileges.
