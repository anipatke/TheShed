---
id: I-005
title: Required regression evidence and Full Check cells remain incomplete
type: verification
status: resolved
source:
  kind: check
  check: C-001
  actor: {role: checker, session: check-o001-20261010}
  at: '2026-10-10T03:01:50Z'
tasks: [T-001]
checks: [C-001, C-002]
guardrail_ids: [TEST-01, TEST-02]
resolution:
  disposition: verified
  check: C-002
  actor: {role: checker, session: check-o001-recheck-20261010}
  at: '2026-10-10T03:37:31Z'
  reason: "Named regressions plus independent source/TLS/UI failure-retry/race/post-commit probes complete the original frozen missing cells; all 46 tests passed with no skips."
history:
  - at: '2026-10-10T03:01:50Z'
    actor: {role: checker, session: check-o001-20261010}
    kind: observed
    check: C-001
    note: Initial independent Objective Check; frozen E regression inventory and D/N failure cells.
  - at: '2026-10-10T03:31:00Z'
    actor: {role: executor, session: session_01WG6Lxf82CULEbTwEk9Keqb}
    kind: repair_attempted
    note: "Repair (verification): node:test cases added in server/discovery.test.ts. (1) 'identify on real folders': nonexistent cwd and command-line folder -> {}; existing folder neighbour -> projectDir, cwd, package name. Reverting the identify.ts:147 guard makes it fail. (2) Add form failed save then retry: headless Edge run (.savepoint/repair-evidence/O-001-2026-10-10/ui-results.json, 05-add-failed.png) - server stopped, submit -> 'Failed to fetch', form open with all three fields and Save enabled; server restarted, resubmit -> form closes, Docs card, saved with folder. (3) 'source orchestration': failed source (timeout / not found / bad JSON messages) reported while the other source's listeners kept; malformed ss/netstat output -> no listeners, malformed PowerShell JSON throws (becomes per-source failure); PowerShell failure -> netstat+tasklist fallback via injected runner (scan.ts collectSources, windows.ts discoverWindows(exec)); real run() of a hung node child -> 'timed out', missing tool -> 'not found'; wslrelay overlap fixture via dropRelayDuplicates. (4) 'TLS retry': self-signed HTTPS server (openssl) -> retried as https web with title; TLS socket destroyed -> stays http/tcp. (5) ConfigStore write failure leaves file and memory unchanged. Platform: WSL-hosted UI/API runs and Windows-hosted discovery (Windows Node v24.14.0: windows 35 via PowerShell, wsl 20 via wsl.exe, mirrored; .savepoint/repair-evidence/O-001-2026-10-10/windows-host.txt). Gates 2026-10-10T03:30:04Z, Node v22.22.2, tsc 7.0.2: npm run typecheck 0, npm run build 0, npm test 0 (46 pass, 0 fail, 0 skipped); git diff --check 0. Unverified: concurrent mutation during an in-flight scan and failure after a successful config commit (no fixture run); add-form pre-fix failing scenario cannot be reproduced (fix predates first commit), only the passing run is recorded; TLS tests skip where openssl is missing. Executor evidence only; not verified."
  - at: '2026-10-10T03:37:31Z'
    actor: {role: checker, session: check-o001-recheck-20261010}
    kind: rechecked
    check: C-002
    note: "Named regressions plus independent source/TLS/UI failure-retry/race/post-commit probes complete the original frozen missing cells; all 46 tests passed with no skips."
---

# I-005: Required regression evidence and Full Check cells remain incomplete

## Summary

O-001 success condition 5 and AC10 require TEST-01/02. Two recorded fixes lack their required regression evidence. Some frozen Full Check failure cells could not be completed in this run and remain unverified rather than cleared.

## Evidence

T-001 evidence lines 118 and 120 explicitly record no regression test/passing platform re-run for the virtual packaged-app folder fix, and no reproduced failing scenario or passing re-run for the add-project form fix. The current `server/discovery.test.ts` never imports or tests `identify`; `server/identify.ts:145`–147 contains the nonexistent-folder guard. A Check-only P3 fixture now shows the guard works, but is not the required project node:test regression case. `client/src/App.tsx:58`–65 awaits the save before closing; source correctness does not supply the missing scenario record.

Additional frozen cells classified unverified in C-001: forced source timeout/missing-tool/fallback and malformed-source orchestration; wslrelay overlap fixture (pure logic, currently no named node:test); controlled TLS retry/truncated response; concurrent mutation vs scan and failure after a successful config commit. These are verification limitations, not demonstrated product failures. Normal Windows and WSL mirrored-host discovery did pass independently.

## Proof Needed

Supply a named node:test regression case for nonexistent inferred folders (including existing-folder neighbour), and a recorded add-form failed-save then successful retry scenario, retaining entered fields and the form on failure. Complete the already frozen D/N/A failure and overlap cells named above, with exact commands/fixtures/expected and actual outcomes. Browser automation and NAT-mode testing remain excluded; a pure overlap fixture and recorded UI scenario suffice. Recheck the full frozen matrix and gates without adding new axes.
