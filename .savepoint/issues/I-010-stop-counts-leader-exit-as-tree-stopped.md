---
id: I-010
title: Stop counts the shell's exit as the whole tree stopped, so Restart is refused and slow servers are orphaned
type: defect
status: resolved
source:
  kind: check
  check: C-007
  actor: {role: checker, session: independent-o003-full-20261010-0732}
  at: '2026-10-10T07:32:24Z'
tasks: [T-008, T-009, T-010]
checks: [C-007, C-008]
guardrail_ids: [SCOPE-02, TEST-02]
severity: high
resolution:
  disposition: verified
  check: C-008
  actor: {role: checker, session: independent-o003-recheck-20261010-0756}
  at: '2026-10-10T07:56:22Z'
  reason: Repair proven by CLEAR Check C-008.
history:
  - at: '2026-10-10T07:32:24Z'
    actor: {role: checker, session: independent-o003-full-20261010-0732}
    kind: observed
    check: C-007
    note: Reproduced on WSL (mirrored) through the live API and directly against Supervisor. Restart refused 4/4; a SIGTERM-ignoring server survived Stop with the run reported stopped.
  - at: '2026-10-10T08:30:00Z'
    actor: {role: executor, session: o003-repair-20261010}
    kind: repair_attempted
    note: >-
      Stop now holds the run in stopping until the whole process group is gone, not just the sh leader
      (server/supervisor.ts: groupAlive, escalate). SIGKILL is sent to the group if it outlasts the grace period; a
      group The Shed did not create is never signalled. Restart also waits a bounded time for the port to be released.
      New node:test cases cover a leader that exits first and a member that ignores SIGTERM. Live on WSL (Node 22,
      real sh): restart x5 ok for a plain node server and a SIGTERM-ignoring one, final stop forced, port free, no
      orphan. Build and 140 tests pass, 4 runs. Unverified: Windows-hosted Restart/Stop (taskkill path unchanged
      apart from the bounded port wait), and Vite restart x5.
  - at: '2026-10-10T07:56:22Z'
    actor: {role: checker, session: independent-o003-recheck-20261010-0756}
    kind: rechecked
    check: C-008
    note: 'Proof Needed met: restart x5 WSL (plain, Vite, SIGTERM-ignoring) and Windows (plain, Vite); forced stop of SIGTERM-ignoring server; new node:test cases pass. See C-008.'
---

# I-010: Stop counts the shell's exit as the whole tree stopped, so Restart is refused and slow servers are orphaned

## Summary

On a WSL/Linux host the run is launched as `sh -c <command>` in its own process group and the stop sends SIGTERM to the group. `Supervisor.escalate` (`server/supervisor.ts:260-267`) waits only for the leader's `exit` event, and `onExit` (`server/supervisor.ts:217-226`) then records `stopped`. The `sh` leader dies on SIGTERM at once, before the actual server below it has finished exiting. So:

1. **Restart is refused.** `restart` (`server/supervisor.ts:162-170`) starts again as soon as `stop` returns; the port pre-check still sees the old server's socket and refuses with `port-busy`. The run is left `stopped`.
2. **No escalation reaches a server that is slow to exit or ignores SIGTERM.** The leader has exited, so SIGKILL is never sent, the run says `Stopped.`, the server keeps the port, and because the run record is no longer active nothing in The Shed can stop it any more.

Violates O-003 Outcome and Success Condition 3 (stop the whole process tree, no orphan, port free; restart from the card), T-008 Done When ("tree-stop mechanism with a bounded escalation"; "Restart is stop, wait for exit, then start") and T-009/T-010 Restart.

## Evidence

Scratch harness (C-007 session scratchpad), WSL host, `networkingMode=mirrored`, Node 22.22.2:

- Live API, three commands (`node srv.js {port}`, `node srv.js {port}; echo after`, `node -e "...listen({port},'127.0.0.1')"`): start → `running`; `POST /restart` → **409 `Port 572x is in use, holder unknown.`** in 2-3 ms; run left `stopped`. Same in the main scenario run (project `ok`, port 5701).
- Directly against `Supervisor` with the default port check: `check {"busy":true}` at the restart, `{"busy":false}` 20 ms later.
- `node -e "process.on('SIGTERM',()=>{});...listen({port})"`: `stop` → `stopped`, `signal SIGTERM`, 0 ms; 4 s later the `node` process (same PGID as the dead leader) is still running and listening. Removed by the checker afterwards.
- T-011's Vite Restart passed by timing; the unit test "escalates to a forced kill…" uses a fake child whose leader stays alive, so it never covers a leader that dies first.

Windows (`taskkill /T /F`, exit of the `cmd.exe` leader) was not re-run by the Check; whether the same restart race occurs there is unverified.

## Proof Needed

- Restart of a running project succeeds on WSL with a single-process command and with a Vite command, repeated at least five times each.
- A server that ignores SIGTERM under an `sh` leader is gone after Stop (forced after the grace period), the port is free, and the run is `stopped` only then.
- A `node:test` case with a fake spawn where the leader exits before the group is empty, proving Stop waits for (or escalates against) the remaining group, and that no signal is ever sent to a group The Shed did not create (SCOPE-02).
- Windows-hosted Restart then Stop repeated, with an orphan and port check (TEST-03).
