---
id: I-009
title: Port-busy refusal says "holder unknown" when the scan is stale
type: defect
status: resolved
source:
  kind: report
  actor: {role: executor, session: t011-real-machine-20261010}
  at: '2026-10-10T07:22:57Z'
tasks: [T-011]
checks: [C-007, C-008]
guardrail_ids: [TEST-03]
severity: low
resolution:
  disposition: verified
  check: C-008
  actor: {role: checker, session: independent-o003-recheck-20261010-0756}
  at: '2026-10-10T07:56:22Z'
  reason: Repair proven by CLEAR Check C-008.
history:
  - at: '2026-10-10T07:22:57Z'
    actor: {role: executor, session: t011-real-machine-20261010}
    kind: observed
    note: Found during T-011 real-machine runs on both sides. Not patched inside T-011 (evidence-only Task).
  - at: '2026-10-10T07:32:24Z'
    actor: {role: checker, session: independent-o003-full-20261010-0732}
    kind: rechecked
    check: C-007
    note: >-
      Reproduced on a WSL-hosted Shed (mirrored). Wider than recorded: a holder on the other side is never named,
      even after a fresh scan. Windows node.exe bound 127.0.0.1:5703; the fresh scan listed windows:5703 node.exe
      (pid 41836) and the card conflict warning named it, but Start still said "Port 5703 is in use, holder
      unknown." because findHolder in server/index.ts:24-27 keeps only services with env === store.host, while
      registry conflicts treat Windows/WSL as one port space. Also, findHolder reads the scan cached up to 4 s
      (CACHE_MS), not a fresh one. Material to O-003 Success Condition 4 ("refused with what holds it").
      Proof Needed additionally: a holder on the other side is named, on both host sides.
  - at: '2026-10-10T08:30:00Z'
    actor: {role: executor, session: o003-repair-20261010}
    kind: repair_attempted
    note: >-
      The holder lookup now runs a fresh scan (not the 4 s cache) only once the bind check says the port is busy, and
      accepts a holder on either side, since Windows and WSL share one port space (server/index.ts). Unverified:
      live naming of a holder on a WSL-hosted and a Windows-hosted Shed, and a dedicated test for the lookup, which
      lives in index.ts wiring and has no unit seam.
  - at: '2026-10-10T07:56:22Z'
    actor: {role: checker, session: independent-o003-recheck-20261010-0756}
    kind: rechecked
    check: C-008
    note: 'Proof Needed met: holder named when just bound, same side and other side, from WSL-hosted and Windows-hosted Sheds. See C-008.'
---

# I-009: Port-busy refusal says "holder unknown" when the scan is stale

## Summary

When a start is refused because the port is taken, the message names the holder only if the cached discovery scan already knows it. A process that bound the port since the last scan is reported as "in use, holder unknown". The T-011 Done When asks for a refusal "naming the holder".

## Evidence

`docs/evidence/T-011/wsl-hosted.log` and `windows-hosted.log`, section 4. A harness process bound the port, then Start was requested:

- No scan since it bound: `Port 5613 is in use, holder unknown.` (WSL) and `Port 5623 is in use, holder unknown.` (Windows).
- After a fresh scan: `Port 5613 is in use by node (pid 1171804).` and `Port 5623 is in use by node.exe (pid 40616).`

The refusal itself is correct on both sides (nothing was spawned). Only the holder name is missing. The page's auto-refresh scans every 15 s, so a holder that has been up a while is normally named. `checkPort` in `server/index.ts` uses the cached scan; `server/supervisor.ts` builds the message.

## Proof Needed

Start a project whose port was bound moments ago, with no scan in between, on a WSL-hosted and a Windows-hosted Shed; the refusal names the holder. Add a case to `server/supervisor.test.ts` for a holder found through a fresh scan. A likely repair is to rescan before naming the holder only when the bind check says the port is busy.
