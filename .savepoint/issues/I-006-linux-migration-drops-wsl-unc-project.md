---
id: I-006
title: Migration drops a WSL UNC project when the host infers as plain Linux
type: defect
status: resolved
source:
  kind: check
  check: C-003
  actor: {role: checker, session: independent-o002-readonly-20261010}
  at: '2026-10-10T05:01:12Z'
tasks: [T-002]
checks: [C-003, C-004, C-006]
guardrail_ids: [DATA-01]
severity: high
resolution:
  disposition: accepted
  actor: {role: owner, session: owner-o002-completion-20261010-054734}
  at: '2026-10-10T05:47:34Z'
  reason: Owner explicitly approved applying existing waivers and acceptance to C-006 and completing O-002 by exception. Repair evidence is retained; this is owner acceptance, not technical CLEAR.
history:
  - at: '2026-10-10T05:01:12Z'
    actor: {role: checker, session: independent-o002-readonly-20261010}
    kind: observed
    check: C-003
    note: Reproduced with sanitizeConfig(raw, 'linux') on a V1 project whose folder is a WSL UNC path; the project list came back empty.
  - at: '2026-10-10T05:30:00Z'
    actor: {role: checker, session: independent-o002-recheck-20261010-0521}
    kind: rechecked
    check: C-004
    note: Original reproduction passes for both WSL UNC spellings on Windows, WSL and plain Linux; six round trips pass; named regression and fresh 84-test full gate pass. Remediation proven, but status remains open because C-004 is NEEDS WORK on remaining I-008 verification and verified resolution requires CLEAR.

  - at: '2026-10-10T05:42:54Z'
    actor: {role: checker, session: independent-o002-design-recheck-20261010-0542}
    kind: rechecked
    check: C-006
    note: Original reproduction and named adjacent cells pass again with fresh full gates. No further code repair needed; formal verified closure still requires CLEAR, so Issue remains open pending owner completion disposition.

  - at: '2026-10-10T05:47:34Z'
    actor: {role: owner, session: owner-o002-completion-20261010-054734}
    kind: owner_decision
    check: C-006
    note: Owner explicitly approved the existing waivers and acceptance against C-006 and O-002 completion by exception. Issue resolved as accepted; no technical CLEAR claimed.

---

# I-006: Migration drops a WSL UNC project when the host infers as plain Linux

## Summary

A V1 config whose project folder is `\\wsl.localhost\Ubuntu\home\me` migrates correctly on Windows/WSL, but `sanitizeConfig(raw, 'linux').projects` returns `[]`. Environment inference assigns `linux`, folder validation then rejects the UNC form, and migration drops the project (`server/config.ts:58`, `server/config.ts:107`). A saved project is lost silently.

Likelihood low, impact high, materiality high. Violates T-002 criteria 1 and 2, O-002 success condition 2, and DATA-01.

## Evidence

Independent in-memory probe in Check C-003. The migration test suite has no case for a WSL UNC folder on a plain Linux host.

## Proof Needed

- A named regression test: V1 project with a WSL UNC folder, migrated with a `linux` host, is kept (or, if dropping is intended, is reported rather than silently lost).
- Re-run the neighbouring migration cases (Windows, WSL, Linux folders, favourites, hide rules, overrides) and the full gate.

## Final Disposition

Resolved by explicit owner acceptance at 2026-10-10T05:47:34Z, naming C-006. Design reconciliation and defect reproductions passed independent review; remaining previously waived evidence is accepted for completion by exception. Earlier body and history describe the preceding states. No further proof is required for this owner disposition.
