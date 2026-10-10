---
id: I-007
title: A previously starred service shows as both a live card and an Offline favourite
type: defect
status: resolved
source:
  kind: check
  check: C-003
  actor: {role: checker, session: independent-o002-readonly-20261010}
  at: '2026-10-10T05:01:12Z'
tasks: [T-004]
checks: [C-003, C-004, C-006]
severity: medium
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
    note: Reproduced with buildSections - star a discovered service, then register its folder and port from scratch; a live project and an Offline favourite appear for the same service.
  - at: '2026-10-10T05:30:00Z'
    actor: {role: checker, session: independent-o002-recheck-20261010-0521}
    kind: rechecked
    check: C-004
    note: Original reproduction and 30 environment/status/registration-path cells pass with one favourite project card; named regression and fresh 84-test full gate pass. Remediation proven, but status remains open because C-004 is NEEDS WORK on remaining I-008 verification and verified resolution requires CLEAR.

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

# I-007: A previously starred service shows as both a live card and an Offline favourite

## Summary

Star a discovered service, then register its folder and port from scratch (not from the discovered card). `buildSections` returns the live project and also an Offline favourite for the same service. Absorption skips the service before marking its favourite present (`client/src/model.ts:107`), so the fallback creates the duplicate (`client/src/model.ts:167`), and the duplicate wrongly says Offline.

Likelihood medium, impact medium, materiality medium. Violates T-004 criterion 1 and O-002 success condition 3.

## Evidence

Independent view-model probe in Check C-003. The recorded UI scenario only covers registering from the discovered card, which transfers the favourite, so it misses this path.

## Proof Needed

- A named model test for the register-from-scratch path: exactly one card, with the live status and the favourite kept.
- Re-run the register-from-discovered-card path and the other status transitions, plus the full gate.

## Final Disposition

Resolved by explicit owner acceptance at 2026-10-10T05:47:34Z, naming C-006. Design reconciliation and defect reproductions passed independent review; remaining previously waived evidence is accepted for completion by exception. Earlier body and history describe the preceding states. No further proof is required for this owner disposition.
