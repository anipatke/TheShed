---
id: T-012
title: Look back at how Goal 02's work went and tune the project rules
objective: O-004
status: done
depends_on: []
owner_validation:
    required: true
    accepted_check: ""
planned_by: {role: planner, session: planning-o004-2026-10-10}
check_waiver:
    task: T-012
    reason: Owner completed this Task via the board without requesting a Task Check.
    actor:
        role: owner
        session: board-owner
    recorded_at: "2026-10-10T08:11:58Z"
---

# Look back at how Goal 02's work went and tune the project rules

## Outcome

O-004's `## Retrospective` section records how the Savepoint workflow served Goal 02, drawn from its Checks, Issues, Tasks and lessons. Each finding has exactly one disposition: an owner-approved change applied to `.savepoint/Guardrails.md`, AGENTS.md project rules or `quality_gates`; an Issue suggesting a change to a packaged skill or shared reference; or "no change, because…" with the reason.

## User Check

Read the Retrospective section in O-004. Confirm each finding makes sense, that every change you approved appears in the named file and no change you declined does, and that each skill suggestion has an Issue you can open on the board.

## Done When

- The review covers every Goal 02 Check (C-003..C-008, with result and what each NEEDS WORK blocked on), every Issue (I-006..I-011, with origin and resolution), and the Tasks of O-002 and O-003, including their waivers and Drift Notes. It states explicitly that no Task returned REPLAN REQUIRED.
- It addresses at least these lessons: O-002 closed by owner exception after four NEEDS WORK Checks (I-006, I-007, I-008); O-003 waived every Task Check and the Full Check (C-007) then found I-010 (high) and I-011; Design and SEC-02 reconciliation was missed until the Full Check; real-machine Tasks (T-005, T-011) found defects that host-only tests missed (I-006, I-009).
- Each finding names its evidence (record IDs) and has exactly one disposition.
- Each project-owned change was put to the owner as a yes/no proposal before being applied. Yes: the change is applied and the decision is recorded with actor and time. No: it is recorded as "no change, because owner declined", with the reason.
- Skill and shared-reference suggestions are Issues that cite the evidence. They are created on the main checkout, not in a lane, after searching for existing Issues per issue-capture.
- No product code, packaged skill or shared reference is edited, and the Retrospective adds no new field, state, command or Goal-owned Task list.
- Configured build and test gates pass at handoff (AGENTS.md Verification Policy), and the owner confirms the User Check.

## Context Files

`.savepoint/objectives/O-004-goal-02-workflow-retrospective/Objective.md`, `.savepoint/releases/G-002-project-launch-and-ports/Release.md`, `.savepoint/objectives/O-002-project-registry-and-ports/Objective.md`, `.savepoint/objectives/O-003-controlled-project-launch/Objective.md`, `.savepoint/objectives/O-002-project-registry-and-ports/tasks/T-002-move-saved-projects-into-the-new-project-list.md`, `.savepoint/objectives/O-002-project-registry-and-ports/tasks/T-003-spot-running-projects-and-port-clashes.md`, `.savepoint/objectives/O-002-project-registry-and-ports/tasks/T-004-manage-projects-and-open-them-in-an-editor.md`, `.savepoint/objectives/O-002-project-registry-and-ports/tasks/T-005-try-the-project-list-on-the-windows-and-wsl-machine.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-006-find-out-how-starting-and-stopping-really-works-on-this-machine.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-007-save-a-launch-command-with-a-project.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-008-keep-track-of-the-projects-the-shed-starts.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-009-start-stop-and-restart-projects-through-the-server.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-010-start-and-stop-projects-from-their-cards.md`, `.savepoint/objectives/O-003-controlled-project-launch/tasks/T-011-try-starting-and-stopping-projects-on-the-windows-and-wsl-machine.md`, `.savepoint/checks/C-003-project-registry-and-ports.md`, `.savepoint/checks/C-004-project-registry-and-ports-recheck.md`, `.savepoint/checks/C-005-project-registry-targeted-recheck.md`, `.savepoint/checks/C-006-project-registry-design-recheck.md`, `.savepoint/checks/C-007-controlled-project-launch.md`, `.savepoint/checks/C-008-controlled-project-launch-recheck.md`, `.savepoint/issues/I-006-linux-migration-drops-wsl-unc-project.md`, `.savepoint/issues/I-007-starred-service-shows-as-live-and-offline-card.md`, `.savepoint/issues/I-008-o002-required-verification-incomplete.md`, `.savepoint/issues/I-009-port-busy-refusal-may-not-name-holder.md`, `.savepoint/issues/I-010-stop-counts-leader-exit-as-tree-stopped.md`, `.savepoint/issues/I-011-design-and-sec02-not-reconciled-with-launch.md`, `.savepoint/Guardrails.md`, `.savepoint/config.yml`, `AGENTS.md`, `agent-skills/savepoint-idea/SKILL.md`, `agent-skills/savepoint-design/SKILL.md`, `agent-skills/savepoint-task/SKILL.md`, `agent-skills/savepoint-check/SKILL.md`, `agent-skills/references/check-method.md`, `agent-skills/references/issue-capture.md`, `agent-skills/references/commands-and-procedures.md`.

## Design References

None. This Task changes no implemented architecture.

## Guardrails

TEST-01..03 (as review subjects), SEC-02 (I-011 context).

## Implementation Plan

1. Read the Context Files. Build a per-record ledger of each Check result and blocker, each Issue's origin, severity and resolution, each Task waiver and Drift Note, and any REPLAN REQUIRED (none expected; confirm).
2. Derive findings. For each one, say what happened, what it cost (rechecks, exceptions, late discovery) and which record proves it. Separate project-owned causes (Guardrails, AGENTS.md rules, gates) from packaged-skill causes.
3. For each project-owned finding, draft the smallest concrete change as exact wording or a config diff. Put each one to the owner as a single yes/no question, one at a time, and wait for each answer.
4. Apply only the approved changes. Record each decision, with actor and time, in the Retrospective.
5. For packaged-skill findings, search existing Issues, then create Issues (type and fields per issue-capture) that cite the evidence.
6. Write O-004's `## Retrospective` with the ledger summary, findings and dispositions, plus an explicit "no change, because…" for anything left as is.
7. Run the configured build and test gates and record the results.

## Boundaries

No product code. No edits to `agent-skills/` files. No new Savepoint fields, states or commands. No changes to Design.md beyond what an approved finding requires. No closing or reopening of existing Issues.

## Technical Verification

Manual trace check: every finding cites records that exist, and every disposition is recorded. Run the configured build and test gates at handoff per AGENTS.md's Verification Policy. Evaluate the later Full Objective Check against `agent-skills/references/check-method.md`. No platform evidence is needed.

## Technical Evidence

Executor session `t012-retrospective-20261010` (main checkout; `git rev-parse --git-dir` equals `--git-common-dir`, so not a lane). Claims for a Check to verify, not proof.

**Start:** the dependency was met: O-003 is `done` and T-012 has no Task dependencies. The router already selected O-004/T-012 (`release: G-002` unchanged). T-012 was set to `in_progress`/`build` and O-004 to `in_progress`.

**Per criterion**

1. Coverage: met. O-004 `## Retrospective` ledger lists C-003..C-008 with result and blocker, I-006..I-011 with origin and resolution, and T-002..T-011 waivers, owner validation and Drift Notes. It states that no Task returned REPLAN REQUIRED (no `replan:` block in any Task; grep of all ten Task files).
2. Named lessons: met. O-002 exception after four NEEDS WORK is covered by R3, R5a and R5b. The O-003 waivers and C-007 findings are R3. Design/SEC-02 reconciliation is R1/R2. The real-machine lesson is R4a/R4b. The record is corrected on one point: I-006 came from C-003's in-memory probe, not from T-005. T-011 found I-009.
3. Evidence and one disposition per finding: met. R1..R11 each cite record IDs and carry exactly one disposition: Applied, Issue, or No change because….
4. Owner yes/no before applying: met. There were six separate questions, each answered yes. Answer times (from `date -u` right after each answer) were 08:06:20Z, 08:06:33Z, 08:06:42Z, 08:06:48Z, 08:06:55Z and 08:07:04Z, owner actor in this session. No proposal was declined.
5. Skill Issues: met. Existing Issues were searched first (titles I-001..I-011; none covers these topics). I created I-012 (Drift Note reconciliation trigger), I-013 (exception-closed dependency gate), I-014 (initial Check cell inventory) and I-015 (O-003 closed without T-010/T-011 owner acceptance; owner action plus a runtime suggestion), all on the main checkout. `savepoint resume` strict-loaded all four.
6. Boundaries: met. No product code, `agent-skills/` file or shared reference was edited. No new field, state, command or Goal-owned Task list. No existing Issue was closed or reopened. Design.md was not changed.
7. Gates: met (see Commands). Owner User Check: pending.

**Manual trace check:** every record ID cited in the Retrospective (C-003..C-008, I-006..I-015, T-002..T-011, O-002..O-004) exists on disk.

**Commands** (2026-10-10T08:08:34Z, Node v22.22.2, WSL): `npm run build` pass (typecheck plus Vite build); `npm test` 140 pass, 0 fail, 0 skipped, 35 suites; `git diff --check` clean; no `.test-scratch-*` left behind. Lint is not configured (`quality_gates.lint: null`). `savepoint resume` was run after creating the Issues.

**Files read:**
- The Context Files: all files listed above, with the four `agent-skills/` skills and three references read in targeted sections (design Retrospective, Drift Notes and template; check Closure Rules; check-method convergence and Verify File Reality; issue-capture in full).
- Extra reads, logged:
  - `package.json` scripts, the `scratchDir()` helper in `server/discovery.test.ts` and `.gitignore`, to confirm the R5a Build note (what the gates write, and the cleanup).
  - The titles of `.savepoint/issues/I-001..I-005`, for search-before-creating.

**Files changed:**
- `AGENTS.md` (Build note; new `## Project Rules`).
- `.savepoint/Guardrails.md` (TEST-01, TEST-03, sign-off line).
- O-004 `Objective.md` (status, Retrospective).
- This Task.
- New: `.savepoint/issues/I-012..I-015`.

**Limitations:**
- Skill files were read in targeted sections, not end to end.
- R7/I-015 records only what the files show. Whether the owner performed the T-010/T-011 User Checks outside the records is unknown; no acceptance was inferred.
- Answer times are taken from the clock immediately after each answer, not from the question UI itself.

## Drift Notes

Record architecture deltas and reconcile them through the planner before the Check.

None: no architecture change. The project rules changed (AGENTS.md, Guardrails TEST-01/TEST-03); Design.md is unaffected.
