---
id: O-004
title: Goal 02 workflow retrospective
status: done
depends_on: [O-003]
release: G-002
priority: low
rank: 3
---

# O-004: Goal 02 workflow retrospective

## Outcome

A recorded review of how the Savepoint workflow served Goal 02, with any project-owned changes applied (Guardrails, AGENTS.md project rules, configured gates) and suggestions for the packaged skills captured as Issues — or a "no change, because…" conclusion.

## Why

The design skill requires a final workflow-retrospective Objective once a Goal's other Objectives are planned. Goal 02 is the first Goal to change The Shed's safety model, so its lessons are likely to matter.

## Success Conditions

1. The review covers Goal 02's REPLAN REQUIRED Tasks, NEEDS WORK Checks, Issues and lessons from O-002 and O-003.
2. Each finding is either applied to a project-owned file, recorded as an Issue for the packaged skills, or explicitly concluded as no change, with the reason.

## Architectural Considerations

Planner-owned. The packaged skills and shared references are not edited here; suggestions for them become Issues.

Confirmed planning decisions (owner, 2026-10-10, session planning-o004-2026-10-10):

- Owner approval before applying: each proposed change to `.savepoint/Guardrails.md`, AGENTS.md project rules or `quality_gates` is presented to the owner for an explicit yes/no and applied only on yes; a declined proposal is recorded as "no change, because owner declined" with the owner's reason.
- One sequential Task: every finding and change touches the same small set of records, so there is no parallel lane.
- Records in scope: Checks C-003..C-008, Issues I-006..I-011, O-002 and O-003 with Tasks T-002..T-011, their Drift Notes and Technical Evidence. No Goal 02 Task returned REPLAN REQUIRED; the review states that rather than inventing one. Lessons to weigh include O-002 closing by owner exception after four NEEDS WORK Checks, O-003 waiving every Task Check before a Full Check found three Issues, and Design/SEC-02 reconciliation being missed until the Full Check (I-011).
- Outcome record: the review and each finding's disposition are written in this Objective's `## Retrospective` section.
- Dependency on O-002 removed (owner, 2026-10-10): O-002 reached done by owner exception, which the dependency gate reports as `cleared_by_exception` and treats as blocking. The retrospective only reads O-002's records and does not need it technically cleared. That exception is itself one of the findings under review.
- Verification: no product code changes; the configured build and test gates still run at handoff per AGENTS.md's Verification Policy, and the Full Objective Check confirms every finding has a disposition traceable to the records.

## Boundaries

**In scope:**
- Reviewing Goal 02's workflow records
- Tuning `.savepoint/Guardrails.md`, AGENTS.md project rules and `quality_gates`

**Out of scope:**
- Product code
- Editing packaged skills or shared references

## Retrospective

Recorded by T-012 (executor session `t012-retrospective-20261010`, 2026-10-10). The sources are the Goal 02 records named in T-012's Context Files. Owner decisions were taken one at a time as yes/no questions. Times come from `date -u` at each answer.

### Ledger

**Checks**

| Check | Scope | Result | What blocked it |
|---|---|---|---|
| C-003 | O-002 Full | NEEDS WORK | I-006 (high, DATA-01 migration loss), I-007 (medium, duplicate card), I-008: read-only session did not run `npm run build` / `npm test` ("writes `dist/`", "creates `.test-scratch-*`"), four editor clicks pending, live/browser cells unexercised, Design still V1. |
| C-004 | O-002 full re-check | NEEDS WORK | I-006/I-007 repair proven. I-008 remained: unreplayed C-003 cells (harnesses not retained), browser/race/exact-platform cells, Design still V1. |
| C-005 | O-002 targeted re-check | NEEDS WORK | Design reconciliation only (owner had waived the remaining cells at 05:33:01Z). Convergence limit reached. |
| C-006 | O-002 owner-requested re-check | NEEDS WORK | Design repair verified. Kept only because waived evidence is not technical proof. Owner then closed O-002 by exception (05:47:34Z). |
| C-007 | O-003 Full | NEEDS WORK | I-010 (high, Stop ends on leader exit, Restart refused, SIGTERM-ignoring server orphaned), I-009 widened (holder never named across sides), I-011 (Design and SEC-02 text not reconciled). |
| C-008 | O-003 full re-check | CLEAR | All three repaired and verified on both host sides. |

**Issues**

| Issue | Type / severity | Origin | Resolution |
|---|---|---|---|
| I-006 | defect / high | C-003 in-memory probe (`sanitizeConfig(raw,'linux')`) | Repair proven C-004/C-006; resolved `accepted` by owner exception against C-006 |
| I-007 | defect / medium | C-003 view-model probe | Repair proven C-004/C-006; `accepted` by owner exception |
| I-008 | verification | C-003 | `accepted` by owner exception against C-006 (waiver 05:33:01Z; Design repair 05:40:57Z) |
| I-009 | defect / low | T-011 real-machine run (executor report) | `verified` by C-008 |
| I-010 | defect / high | C-007 live probes | `verified` by C-008 |
| I-011 | drift / medium | C-007 | `verified` by C-008 (owner approved SEC-02 wording) |

**Tasks:**
- **Task Checks:** all ten Tasks (T-002..T-011) are `done` with owner board waivers. No optional Task Check was requested in Goal 02.
- **Owner acceptance:** T-004/T-005 carry owner acceptance renewed against C-006. T-010/T-011 have `owner_validation.required` with an empty `accepted_check` (see R7).
- **Drift Notes:** T-002..T-006 have none recorded. T-006 holds only its planned REPLAN instruction. T-007..T-011 each list deltas deferred "for Design reconciliation before Check", and T-008 flags SEC-02 vs `taskkill`.
- **REPLAN REQUIRED:** no Goal 02 Task returned it. No Task has a `replan:` frontmatter block. T-003 records "no replan", and T-011 records "no REPLAN REQUIRED". T-006's spike found a clean stop for the supported pairs, so its conditional REPLAN did not trigger.

### Findings and dispositions

| # | Finding | Evidence | Cost | Disposition |
|---|---|---|---|---|
| R1 | Design and Guardrail text were not brought up to date before either Full Check. Drift Notes deferred it "before Check", but no step owned it. | I-008, I-011; C-003, C-004, C-005, C-007; T-007..T-011 Drift Notes; T-008 (SEC-02) | 3 of 5 NEEDS WORK Checks blocked wholly or partly on it; O-002 needed C-006 | **Applied** — AGENTS.md Project Rules, first bullet. Owner: yes, 2026-10-10T08:06:20Z. |
| R2 | The packaged skills give Drift Notes no reconciliation trigger, so other projects will repeat R1. | Same as R1 | — | **Issue I-012** |
| R3 | Every Task Check was waived. O-002's C-003 then found I-006 (high) and I-007; O-003's C-007 found I-010 (high) and I-011. The high-severity defects were in DATA-01 migration (T-002) and SCOPE-02 process stop (T-008). | T-002..T-011 `check_waiver`; C-003; C-007 | Defects found at Objective level; O-002 closed by exception after 4 NEEDS WORK | **Applied** — AGENTS.md Project Rules, second bullet (Task Check for SEC-02/SCOPE-02/DATA-01 Tasks). Owner: yes, 08:06:33Z. |
| R4a | Host-dependent migration was not tested for every host value. A WSL UNC folder on a plain Linux host had no case ("The migration test suite has no case for a WSL UNC folder on a plain Linux host"), and that is where I-006 lost a project. It was found by C-003's in-memory probe, not by T-005's real-machine run. T-005 ran on Windows+WSL only and used a stand-in V1 file. | I-006; C-003 F1; T-005 Migration row | One high defect reached the Full Check | **Applied** — TEST-01 host-value sentence. Owner: yes, 08:06:42Z. |
| R4b | The real-machine trial T-011 found I-009, which host-only tests missed. But I-010 escaped T-011 (one Vite Restart "passed by timing") and the unit test (the fake leader never exits first). | I-009 (T-011 origin); I-010 Evidence; C-007 | High defect found only at C-007 | **Applied** — TEST-03 Restart ×5, SIGTERM-ignoring stop and leader-exits-first fake. Owner: yes, 08:06:48Z. |
| R5a | C-003 skipped `npm run build` and `npm test`, believing they write to the repo. C-004, C-005 and C-006 each first failed `npm test` on sandbox EPERM before rerunning with socket access. | C-003 Gates; C-004/C-005/C-006 Gates | Gate evidence missing in C-003 (part of I-008); repeated false-failure runs | **Applied** — AGENTS.md Build note. Owner: yes, 08:06:55Z. |
| R5b | C-003 kept no exact cell inventory or harness, so C-004/C-005 demanded vague "original replay" and kept O-002 at NEEDS WORK until the convergence limit. | C-003; C-004; C-005; I-008 Check-Process Observation | O-002 took 4 Checks and closed by owner exception | **Issue I-014** |
| R6 | An exception-closed O-002 blocked its dependents through the runtime gate. The owner removed the dependency twice (O-003, O-004). | O-003 Confirmed Decisions; O-004 Architectural Considerations | Two manual dependency removals; lost ordering record | **Issue I-013** |
| R7 | O-003 is `done` although T-010/T-011 require owner acceptance and have none naming C-008. | T-010, T-011 frontmatter; C-008 Owner Validation Still Needed | Closure rule not enforced | **Issue I-015** (owner action plus a runtime suggestion) |
| R8 | Repair history entries in I-009/I-010/I-011 are stamped 08:30Z/08:50Z, later than the C-008 Check (07:56:22Z) that verified them. | C-008 Observations; I-009, I-010, I-011 history | History order unreliable for later Checks | **Applied** — AGENTS.md Project Rules, third bullet (clock timestamps). Owner: yes, 08:07:04Z. |
| R9 | Check-specific owner acceptance had to be renewed for T-004/T-005 each time a re-check superseded the previous Check (C-005 → C-006). | I-008 history 05:38:48Z and 05:47:34Z; C-006 Completion Disposition | One extra owner record | **No change, because** the rule stops acceptance carrying over to a Check that reviewed different code, and the cost was one record edit. Fixing R5b reduces re-checks, and with them renewals. |
| R10 | C-003..C-006 recorded `executed_session: unknown`, because O-002 Task evidence named no executor session. | C-003..C-006 frontmatter | None: independence was still established by the checker sessions | **No change, because** no Check was blocked or weakened by it, and O-003 records already name executor sessions (C-007, C-008). |
| R11 | No Goal 02 Task returned REPLAN REQUIRED; plans held through spike and implementation. | Task ledger above | — | **No change, because** the planning approach (spike first, then sequenced Tasks with explicit REPLAN triggers) worked. |

### Changes applied

- `AGENTS.md`: Build note on gate side effects and sandbox socket access (R5a); new `## Project Rules` section (R1, R3, R8).
- `.savepoint/Guardrails.md`: TEST-01 (R4a) and TEST-03 (R4b) sentences, with an owner sign-off line.
- `quality_gates` unchanged: no finding called for a gate change.
- No product code, packaged skill or shared reference edited. No new field, state, command or Goal-owned Task list.
