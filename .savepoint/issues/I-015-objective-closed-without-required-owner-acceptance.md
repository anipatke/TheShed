---
id: I-015
title: O-003 closed while T-010 and T-011 still lack the required owner acceptance
type: verification
status: open
source:
  kind: report
  actor: {role: executor, session: t012-retrospective-20261010}
  at: '2026-10-10T08:07:21Z'
tasks: [T-010, T-011, T-012]
checks: [C-008]
severity: low
history:
  - at: '2026-10-10T08:07:21Z'
    actor: {role: executor, session: t012-retrospective-20261010}
    kind: observed
    note: Goal 02 workflow retrospective (O-004, T-012) finding R7. Records were only read; no Task, Objective or Check was changed.
---

# I-015: O-003 closed while T-010 and T-011 still lack the required owner acceptance

## Summary

T-010 and T-011 declare `owner_validation: {required: true}` with `accepted_check: ""`. C-008 (CLEAR) says "Before O-003 closes, the owner performs their User Checks and records acceptance naming **C-008**". O-003 is nevertheless `status: done`, with no exception recorded. The savepoint-check Closure Rules require this acceptance at Objective close, but the board's close transition did not enforce it.

## Evidence

- `T-010` and `T-011` frontmatter: `owner_validation.required: true`, `accepted_check: ""`. T-011 Technical Evidence: "Owner confirms the User Check (8): pending."
- C-008 `## Owner Validation Still Needed`.
- O-003 frontmatter: `status: done`, no `owner_validation` or `exception` block.
- O-002, by contrast, renewed T-004/T-005 acceptance against C-006 before closing.

## Proof Needed

Two parts:

- **Project:** the owner performs the T-010 and T-011 User Checks and records acceptance naming C-008, or records an explicit exception. Only the owner may do this.
- **Package:** a suggestion for the packaged runtime. The Objective close transition refuses, or reports as `Blocked:`, an Objective whose owned Task has `owner_validation.required` and no acceptance naming the current Check.
