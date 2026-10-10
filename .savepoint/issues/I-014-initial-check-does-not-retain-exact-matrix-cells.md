---
id: I-014
title: An initial Full Check does not keep its exact matrix cells, so re-checks demand vague replays
type: other
status: open
source:
  kind: report
  actor: {role: executor, session: t012-retrospective-20261010}
  at: '2026-10-10T08:07:21Z'
tasks: [T-012]
checks: [C-003, C-004, C-005]
guardrail_ids: [TEST-01]
severity: medium
history:
  - at: '2026-10-10T08:07:21Z'
    actor: {role: executor, session: t012-retrospective-20261010}
    kind: observed
    note: Goal 02 workflow retrospective (O-004, T-012) finding R5. Suggestion for agent-skills/references/check-method.md; not edited here.
---

# I-014: An initial Full Check does not keep its exact matrix cells, so re-checks demand vague replays

## Summary

Suggestion for `agent-skills/references/check-method.md`. C-003 froze its Coverage Matrix as broad row descriptions, such as "75 passing cells" and "virtual filesystem probes", run from scratch harnesses in `/tmp`. It kept neither an exact cell list nor the harnesses. The re-checks C-004 and C-005 then classified whole rows as "original … not freshly replayed: Unverified", which kept O-002 at NEEDS WORK until the convergence limit. I-008's Check-Process Observation later recorded that these replay demands lacked exact frozen cells and could not justify further blocking under the re-check admission rule.

## Evidence

- C-003 Gates and Commands: probes and 75 matrix cells, all in scratch harnesses.
- C-004 Coverage Matrix Reconciliation: "The original scratch harnesses behind C-003's 75 cells and virtual matrix are not available as repository artifacts."
- C-005 Frozen Matrix Reconciliation: Validation, Matching and Client API rows marked Unverified for "original … not freshly replayed".
- I-008 `## Check-Process Observation`.
- Cost: O-002 took four Checks (C-003..C-006) and closed by owner exception (O-002 `exception:`).

## Proof Needed

check-method.md requires the initial Full Check to record an exact, replayable cell inventory: each cell's input and expected result, or a retained harness path. It also requires a re-check to classify only against those listed cells and never against a broad row label.
