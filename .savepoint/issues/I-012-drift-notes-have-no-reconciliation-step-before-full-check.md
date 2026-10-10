---
id: I-012
title: Drift Notes have no step that reconciles them before the Full Objective Check
type: other
status: resolved
source:
  kind: report
  actor: {role: executor, session: t012-retrospective-20261010}
  at: '2026-10-10T08:07:21Z'
tasks: [T-012]
checks: [C-003, C-004, C-005, C-007]
guardrail_ids: [SEC-02]
severity: medium
resolution:
  disposition: accepted
  actor: {role: owner, session: owner-goal02-close-20261010T204358Z}
  at: '2026-10-10T20:43:58Z'
  reason: "Owner accepted: a suggestion for the packaged savepoint-design/savepoint-task skills; the project already applies a local rule (AGENTS.md Project Rules). Not fixable in this repo."
history:
  - at: '2026-10-10T08:07:21Z'
    actor: {role: executor, session: t012-retrospective-20261010}
    kind: observed
    note: Goal 02 workflow retrospective (O-004, T-012) finding R1. Suggestion for packaged skills; not edited here.
  - at: '2026-10-10T20:43:58Z'
    actor: {role: owner, session: owner-goal02-close-20261010T204358Z}
    kind: owner_decision
    note: "Owner accepted: a suggestion for the packaged savepoint-design/savepoint-task skills; the project already applies a local rule (AGENTS.md Project Rules). Not fixable in this repo."
---

# I-012: Drift Notes have no step that reconciles them before the Full Objective Check

## Summary

Suggestion for the packaged `savepoint-design` and `savepoint-task` skills. The Task template says "Record architecture deltas and reconcile through the planner before Check", and `savepoint-design` workflow step 2 says to keep Objective deltas "until reconciliation", but no skill step names who runs that reconciliation or when. In both Goal 02 Objectives nobody did, and the Full Objective Check found it.

## Evidence

- O-002: C-003, C-004 and C-005 each reported `.savepoint/Design.md` still describing V1 (`/api/manual`, `manual:` identities). It was reconciled only after the convergence limit (I-008 history 2026-10-10T05:40:57Z), and C-006 had to be run to verify it.
- O-003: T-007..T-011 Drift Notes each listed deltas "for Design reconciliation before Check"; T-008 flagged SEC-02 not naming `taskkill`. C-007 returned NEEDS WORK partly on I-011 (Design and SEC-02 drift).
- Cost: three of Goal 02's five NEEDS WORK Checks (C-004, C-005, C-007) were blocked wholly or partly on reconciliation alone.
- The project now has a local rule (AGENTS.md Project Rules, owner-approved 2026-10-10T08:06:20Z), but other projects using the package have no such step.

## Proof Needed

The packaged workflow names a planner reconciliation step, with a trigger (for example "before requesting a Full Objective Check, when any owned Task has a non-empty Drift Note delta"), and `savepoint resume` or the Check skill reports unreconciled Drift Notes before a Full Check starts.
