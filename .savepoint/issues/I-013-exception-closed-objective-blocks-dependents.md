---
id: I-013
title: An Objective closed by owner exception blocks every Objective that depends on it
type: other
status: resolved
source:
  kind: report
  actor: {role: executor, session: t012-retrospective-20261010}
  at: '2026-10-10T08:07:21Z'
tasks: [T-012]
checks: [C-006]
severity: low
resolution:
  disposition: accepted
  actor: {role: owner, session: owner-goal02-close-20261010T204358Z}
  at: '2026-10-10T20:43:58Z'
  reason: "Owner accepted without change: an exception-closed Objective not counting as cleared is the intended behaviour, and removing the dependency is a recorded owner choice (O-003, O-004). Not a defect."
history:
  - at: '2026-10-10T08:07:21Z'
    actor: {role: executor, session: t012-retrospective-20261010}
    kind: observed
    note: Goal 02 workflow retrospective (O-004, T-012) finding R6. Suggestion for the packaged runtime and skills; not edited here.
  - at: '2026-10-10T20:43:58Z'
    actor: {role: owner, session: owner-goal02-close-20261010T204358Z}
    kind: owner_decision
    note: "Owner accepted without change: an exception-closed Objective not counting as cleared is the intended behaviour, and removing the dependency is a recorded owner choice (O-003, O-004). Not a defect."
---

# I-013: An Objective closed by owner exception blocks every Objective that depends on it

## Summary

Suggestion for the packaged dependency gate and `savepoint-design`. O-002 closed by owner exception against C-006. The runtime then reported it as `cleared_by_exception` and treated it as blocking, so every dependent Objective was held. The owner's only option was to delete the dependency, which also deletes the record of why the order mattered.

## Evidence

- O-003 `## Confirmed Decisions`: "Objective dependency on O-002 removed: the runtime gate held O-003 because O-002 closed by owner exception against C-006."
- O-004 `## Architectural Considerations`: "Dependency on O-002 removed (owner, 2026-10-10): O-002 reached done by owner exception, which the dependency gate reports as `cleared_by_exception` and treats as blocking."
- The same workaround was needed twice in one Goal.

## Proof Needed

The packaged workflow defines what an exception-closed Objective satisfies. For example, `requires: done` (or a documented owner override on the dependency) is met by completion by exception, while `requires: clear` is not. Or it documents that removing the dependency is the intended path, with a record of the reason. `savepoint resume` explains the block in plain words.
