---
id: C-002
scope: {kind: objective, id: O-001}
result: CLEAR
checked_by: {role: checker, session: check-o001-recheck-20261010}
executed_session: session_01WG6Lxf82CULEbTwEk9Keqb
checked_at: '2026-10-10T03:37:31Z'
reviewed:
  base_commit: c3fcded4ec25f49a97785c6b6a83de4bfcb95522
  files:
    - docs/SPIKE.md
    - docs/V1-DESIGN.md
    - README.md
    - package.json
    - package-lock.json
    - vite.config.ts
    - tsconfig.server.json
    - tsconfig.client.json
    - scripts/dev.mjs
    - shared/types.ts
    - server/index.ts
    - server/scan.ts
    - server/identify.ts
    - server/probe.ts
    - server/config.ts
    - server/discovery.test.ts
    - server/discovery/run.ts
    - server/discovery/listener.ts
    - server/discovery/posix.ts
    - server/discovery/windows.ts
    - client/index.html
    - client/public/favicon.svg
    - client/src/main.tsx
    - client/src/App.tsx
    - client/src/Card.tsx
    - client/src/model.ts
    - client/src/api.ts
    - client/src/styles.css
    - .gitignore
    - .savepoint/config.yml
    - .savepoint/Guardrails.md
    - .savepoint/Design.md
  dependencies: [package.json, package-lock.json]
issues: []
supersedes: C-001
---

# C-002: Full Objective recheck — Discovery spike and V1 dashboard

## Prior Issue closure map

| Prior Issue | Result | Recheck evidence |
|---|---|---|
| I-001 API project curation | Closed, verified by C-002 | Independent live UI run: row rename/folder, star/unstar, hide/unhide, offline and website neighbours; 18/18 scenarios passed |
| I-002 DELETE JSON guard | Closed, verified by C-002 | Both routes reject absent/plain/form content-type before mutation; remote Origin rejected; JSON {} deletion works in API and UI |
| I-003 preference capacity | Closed, verified by C-002 | 499→500 accepted, 501st addition rejected explicitly without changing old bytes/state, 501 valid saved entries retained and reducible, all four config lists covered |
| I-004 probe body cap | Closed, verified by C-002 | Original four split-chunk reproductions now ignore beyond-cap titles; inside-cap title retained; truncation/timeout/redirect neighbours pass |
| I-005 verification | Closed, verified by C-002 | Named identity/relay/source/TLS/cap/capacity regressions passed; recorded failed-save/retry UI scenario reproduced independently; original missing race/post-commit cells completed |

## Verdict and independence

**CLEAR**, superseding C-001. Every owned Task (T-001), the original frozen matrix, changed repair paths and their named neighbours were reviewed. No new scope axis, acceptance interpretation or dependency layer was admitted. This is the first Full recheck after C-001, within the convergence limit.

This conversation did not build the product or apply the repairs. The executor remains `session_01WG6Lxf82CULEbTwEk9Keqb`; this checker session is independent of that executor conversation and previously performed C-001. Only Check evidence and Issue resolution metadata were written here; no product implementation or owner acceptance was changed.

The source repairs are uncommitted changes over c3fcded. `reviewed.base_commit` is the tracked baseline, not a claim that HEAD alone contains the repaired code. Exact reviewed current contents are pinned by `check-evidence/C-002/reviewed-sha256.json` and `reviewed-working-tree.diff`. C-001 remains immutable.

## Frozen scope and admission

C-001's numbered scope lock, concrete coverage rows, finite external-boundary table and workflow inventory remain the contract. The complete pre-probe admission ledger is `check-evidence/C-002/admission-ledger.txt`; every blocking-capable probe has an exact C-001 cell or original Issue Proof Needed mapping. Original N/A cells remain N/A for the same scope reasons. This record updates only evidence classifications.

The ledger preserves I-005's original Proof Needed: a recorded failed-save/retry scenario that keeps the form and fields. That exact scenario now passed. Unavailable historical pre-fix source was not retroactively made an additional closure requirement. No owner waiver or exception was needed or recorded.

## Fresh gates and environment

Windows 11 / WSL2 Ubuntu, kernel 6.18.33.2, mirrored networking; WSL Node v22.22.2, Windows Node v24.14.0. Discovery and tests ran as a normal user with no sudo/elevated Windows shell. Sandbox approvals permitted local socket/interop testing, not OS administrator privileges.

| Command / run | Result |
|---|---|
| `git diff --check` | Exit 0, initial and final |
| `npm run typecheck` | Exit 0, fresh current repair tree |
| `npm run build` | Exit 0, fresh current tree; includes typecheck, Vite built 19 modules |
| `npm test` | Exit 0; 46 tests / 12 suites, 46 pass, 0 fail, 0 skip |
| `savepoint health check O-001` after gates | Code Health not configured; no snapshot collected; not a finding |
| `node .savepoint/check-evidence/C-002/original-matrix.mjs` | Exit 0; 28/28 independently asserted frozen matrix groups passed |
| `node .savepoint/check-evidence/C-002/api-scenario.mjs /home/user/code/TheShed /tmp/shed-c002-api` | Exit 0; 16/16 real API guard/capacity/restart scenarios passed |
| `node .savepoint/check-evidence/C-002/ui-scenario.mjs /home/user/code/TheShed /tmp/shed-c002-ui` | Exit 0; 18/18 recorded UI scenarios passed in dedicated headless Windows Edge profile |
| `node .savepoint/check-evidence/C-002/remaining-cells.mjs` | Exit 0; 4/4 independent source/TLS/race/post-commit groups passed |

Gate evidence is fresh from this recheck, not reused executor results. No lint gate exists. Source, tests, dependency files and gate definitions were not changed by this checker between gates and the final reviewed hash capture.

A first recheck harness attempt omitted Content-Length on its raw HTTP JSON DELETE. Node's test client then sent malformed framing and the harness's restart group failed parsing the response. The client was corrected to explicitly frame supplied bodies and the complete original-matrix harness rerun; all 28 groups passed. The malformed framing attempt is discarded Check-process scratch (`/tmp/shed-c002-pre-framing-results.json`), not a product failure. The fetch-based real API/UI runs independently passed the actual client deletion format as well.

## Frozen coverage completion

All original C-001 rows are accounted for below, including its previously unverified cells. Passed source trace is explicitly distinguished from executed fixtures; no unsupported OS or browser-automation gate was introduced.

| Exact original row / cells | Current classification and evidence |
|---|---|
| P ss empty/invalid, ports 0–128 and numeric edge values | Proven: original P1 independent integer oracle rerun; named `ss parsing › parses address forms` passed |
| P dual-stack/env+port duplicates and caller address mutation | Proven: P2 independent expected listener count/caller immutability; named `ss parsing › joins listeners with /proc details and merges dual-stack sockets` |
| P PowerShell null/empty/malformed JSON; netstat/tasklist parsers | Proven: original P1 and both exact `Windows parsing` tests; malformed PowerShell→fallback independently exercised in remaining-cells |
| P cwd/marker/package/nonexistent/corrupt/translations/system/script paths | Proven: original P3 plus named `identify on real folders › ignores a folder that does not exist (packaged-app virtual paths)` / `still identifies an existing project folder` and four project-inference cases |
| P/D WSL relay overlap | Proven: named `source orchestration › shows a WSL port once when wslrelay re-listens on Windows`; independent remaining-cell neighbour retains nonrelay Windows service on same port and unmatched relay |
| V validators null/undefined/empty/wrong/mixed/missing/non-finite shapes | Proven: original V1 rerun; invalid entries drop, explicit independent expected empty config |
| V name 99/100/101, folder 999/1000/1001, key 1999/2000/2001, port validity | Proven: original V1 boundary assertions and named `overrides and folders` cases |
| V URL protocol/remote/loopback/IPv6 and stored-only user folders | Proven: original validator/loopback tests and live API external manual stays unverified without remote probe; user folder never reaches identify/subprocess by trace |
| V duplicate/mixed valid entries, mutation after validation and serialization | Proven: original V1 roundtrip and mutable input oracle; duplicate handwritten IDs accepted as before (no uniqueness requirement added) |
| V list 499/500/501 and durable save semantics | Proven: original V3 now expects explicit ConfigFullError instead of silent loss; named `preference capacity` cases for manual/favourites/hidden/overrides plus 16-step API run proves 409 and restart |
| V corrupt backup/restart/before-write/write/rename failures | Proven: original V2 compares disk bytes and memory; named `preference capacity › leaves the saved file and memory unchanged when the write fails`; corrupt source moved aside |
| N HTTP 200/302/401/403/404/503, HTML/JSON, no-follow redirect | Proven: original controlled fixtures/status oracle and one-request redirect counter; ordinary real-web case passes |
| N title text classes/control/bidi/Unicode/no-title/120-char limit | Proven: original independent text fixtures rerun; plain JSX renderer traced, no HTML insertion |
| N exact body boundaries 65535/65536/65537/100000 | Proven: all original split-chunk reproductions passed with no beyond-cap title; seven named `probe body cap` cases include inside-cap boundary and one-large-chunk neighbour |
| N refused/silent/reset/banner/timeout/repeat/cleanup | Proven: original real-socket fixtures rerun; current named `probe against real sockets` cases passed; request destroy/settle ordering traced |
| N mapLimit concurrency/order/empty | Proven: original independent active-counter and expected array oracle rerun |
| N controlled TLS retry/truncation/cancellation | Proven: both named `TLS retry` tests passed with openssl available, no skips; remaining-cells repeats independent HTTPS success and truncated JSON response cancellation twice before deadline |
| A all API routes/create/edit/delete/missing IDs/override clear/invalid folder | Proven: original normal workflow rerun and real API/UI runs; JSON {} DELETE consumes body before write, missing ID behaviour preserved |
| A malformed/empty JSON, null favourites and wrong/missing validators | Proven: original A/V1 and handlers rerun; malformed/null requests controlled 400 |
| A Host remote/loopback/absent, Origin remote/null/absent, POST/PUT content-type | Proven: original raw HTTP guard pass; missing Host rejection still direct unchanged handler trace (not client auto-inserted empty Host); 415/421/403 outcomes and 16-KB limit preserved |
| A DELETE missing/plain/form format bypass | Proven: original I-002 reproduction now 415; both routes preserve entries in API run; JSON {} / localhost Origin succeeds; client Unhide and Remove project succeed in browser |
| A bodies 16383/16384/16385, static/traversal/invalid encoding | Proven: original raw HTTP/static fixtures rerun; 400/413 limits, SPA fallback and controlled malformed-path 500 unchanged |
| A restart/cache/forced/repeated/concurrent refresh | Proven: original byte/config restart and Scanner identity oracle; 16-step API capacity restart passes |
| A concurrent mutation vs inflight scan | Proven: remaining-cells waits until old manual probe entered, saves a new manual project during that scan; save 200 and two records durable; next forced refresh includes both manual statuses |
| A failure after config commit before response | Proven: remaining-cells one-shot Scanner refresh failure injected only in test bootstrap; API returns generic 500, saved record remains, liveness and next state return 200, retry/edit returns 200 with durable updated record |
| D actual/configured targets, startup, both hosts/default distro | Proven: fresh WSL-host scan mirrored, 34 WSL + 34 Windows; Windows-host mirrored scan 35 Windows + 34 WSL, both sources ok; dedicated UNC temporary config and generated browser URLs verified |
| D inaccessible/other-user metadata and nonHTTP services | Proven: current real scans and warnings retained; mixed source/probe kinds returned without failed scan/server; unverified listener semantics traced and named source/socket cases |
| D source missing/timeout/malformed/fallback/isolation | Proven: five named `source orchestration` cases; remaining-cells uses real missing-tool/timeout failures inside independent injected Windows fallback runner and verifies other source listener retained |
| U kind/status/sections/live/offline/revival/hide/override/filter | Proven: original model oracle and live UI/API repeated workflows; offline card, hidden row, unstar→row and website neighbour observed |
| U API/Other row star/rename/folder public controls | Proven: Row now renders Star and an edit callback; independent real browser rename/folder/star/restart/unstar scenarios passed; screenshots viewed by checker |
| U manual add/edit/delete/open safety/plain text/error-retaining forms | Proven: original safeHref/model/normal API and unchanged safe new-tab JSX; independent UI save with server stopped keeps error/fields/button, retry saves and closes, JSON Remove project succeeds |
| U manual refresh/15s visible-only auto/theme/responsiveness | Proven: original unchanged App visibility/interval source reconciled; new row edit/star media-grid rules reviewed; viewed current screenshot confirms theme and edit rendering |
| E named file reality | Proven: every scoped source/evidence file exists; repair screenshots/scripts/results verified; current recheck artifacts retained; transient fixture directories are explicitly test scratch |
| E per-fix regressions/changed pure logic | Proven: named identity, body cap, source/relay/fallback and four-list capacity node:test cases passed; independent network/UI failure/retry scenarios recorded. No historical-source reconstruction requirement added |
| E Design integration/current gates | Proven: Design/API docs now match JSON DELETE and capacity preservation; module extraction does not change production pipeline; fresh gates all passed |
| All original N/A cells | N/A unchanged: terminal colours/cursor/sinks, billing/auth/secrets/transactions, text-column arithmetic, unsupported platform/distros/NAT verification, remote internals and mandatory browser-automation gate |

## Finite external-boundary completion

| Frozen boundary cell | Result |
|---|---|
| Configured/actual target | Passed both actual host modes and isolated config/port selection |
| Startup/discovery/reuse ordering | Passed liveness→source→parse/merge→identify/probe→model; Scanner cache/inflight/forced refresh |
| Refused/unavailable/missing dependency | Passed refusal fixtures, real run ENOENT/timeout, source isolation/fallback |
| Success/non-success | Passed original HTTP/status/request matrix and explicit capacity 409 |
| Redirect behaviour | Passed original one-request no-follow fixture; response URL never controls Open |
| Timeout/cancellation | Passed silent TCP, real subprocess timeout and controlled response socket destruction |
| Malformed/unexpected | Passed parser boundaries, malformed source fallback, banner and truncated JSON/HTML responses |
| Retry/cleanup/partial effects | Passed TLS/repeat fixtures, config write/rename failure bytes, scan/save race and post-commit recovery; owned fixtures cleaned up |
| Failure output | Passed generic 500 hides injected detail from client; intended source warnings remain; no secret-bearing feature in original scope |

## Workflow and side effects

The original eight-step inventory remains frozen. Guards run before mutation; JSON DELETE now follows the same body-validation path as other writes. Capacity is checked before mkdir/write, so rejection leaves old memory and bytes intact; reading oversized existing files preserves valid entries. Temp write/rename publishes memory only after success. Probes retain a prefix limited to 65536 bytes before classifying/title extraction. Source orchestration catches each failing source and preserves its peer; the production default still uses only fixed discovery commands.

For the previously missing failure timing: a real scan uses the config snapshot it started with, so a newly saved manual project's probe can be absent from that inflight result; the model marks it unverified until the next refresh. Two preferences remain durable and the next forced scan includes both statuses. This is bounded transient status, not lost preferences or a restart requirement. A failure injected immediately after the durable save returns 500 with a generic error, retains the save, and recovers on the next GET/edit. No rollback or idempotent-POST requirement was added to this nontransactional API.

The UI scenario drives actual controls, stops only its owned Shed fixture to induce failed saves, then restarts it and retries. It preserves input/error state while failed and closes only after successful save. It exercises row→favourite card→row→hidden/unhidden→offline representations. A dedicated Edge profile is created and only its processes are cleaned up; product process controls remain absent.

## Adversarial reconciliation

Original bypasses were repeated through the same surfaces: DELETE handlers cannot reach persistence with non-JSON requests; direct store/API saves cannot silently drop valid capacity overflow; split/large response chunks cannot inject a title beyond the cap; card/row representation changes retain curation controls. Wrong-type/non-finite validation, caller mutation, duplicate environments, serialization/restart, error/timeout/retry and no-follow redirect invariants all passed independently of the new unit-test examples. New exported source helpers/default runner wrappers were traced through actual production callers; they introduce no request-data-to-command path. No unrelated defect perimeter was introduced.

## Acceptance and Guardrails

| Criterion | Current result |
|---|---|
| AC1 / SC1 spike documentation | Proven: unchanged documented baseline reconciled with current commands and fresh platform observations; historical timings remain documentation, not claimed rerun history |
| AC2 discovery | Proven: both real mirrored hosts and env+port merge pass; formerly missing pure relay fixture now passed |
| AC3 classification/status | Proven: original network/classification/model matrices and TLS/truncation neighbours |
| AC4 identification | Proven: original independent package/cwd/missing fixture plus named regression and real cross-host WSL identification |
| AC5 cards/open | Proven: card fields/new-tab/safe generated links unchanged and current browser/source inspection |
| AC6 curation / SC2 feature integration | Proven: row controls and complete recorded UI/API curation/restart sequence |
| AC7 persistence | Proven: original corruption/failure/restart plus four-list and live API capacity preservation |
| AC8 refresh | Proven: original Scanner and App invariants; race next-refresh reconciliation |
| AC9 resilience | Proven: controlled missing/timeout/fallback/TLS/truncated/post-commit failures now complete |
| AC10 constraints / SC5 Guardrails | Proven: rules mapped below, no remaining original Issue |
| AC11 theme/responsive design | Proven: source/media-grid review and viewed current UI captures |
| AC12 / SC4 gates | Proven: current fresh typecheck/build/46 tests and diff check |
| SC3 acceptance integration | Proven within original recorded-baseline contract: both-host discovery/identification, current real curation and durable restart, controlled inaccessible/nonHTTP/source failures. No claim that the removed historical Windows Vite fixture was recreated |

SEC-01: constant loopback bind on both actual hosts. SEC-02: server imports/run callers and default runner wrappers remain fixed-command only. SEC-03: strict byte cap now proven, no redirects, plain-text JSX, server-generated service URLs. SEC-04: all mutation guards including DELETE, loopback Host/Origin and URL/folder validation passed. SCOPE-01/02/03: normal-user discovery, no product process-control route, Node built-ins server/no database/cloud/account/Docker. DISC-01/02: isolated source failures/warnings, current merge/relay and listener unverified semantics verified. DATA-01: load validation/backup/preservation/atomic replacement/restart passed. TEST-01/02: exact named cases and independent recorded failure/retry scenarios now exist. TEST-03: fresh real Windows+WSL mirrored discovery from both hosting sides.

## Code Style Review

- [x] STYLE-01 **One job per file and function** — source collection/relay helpers remain scoped to discovery; row edit reuses existing EditForm.
- [x] STYLE-02 **Handle errors at boundaries** — capacity error mapped at HTTP boundary; validated DELETE and capped probes.
- [x] STYLE-03 **Build only what is needed** — narrow controls/guards/helpers without new runtime dependencies.
- [ ] STYLE-04 **One source of truth** — original advisory duplication remains between folder/URL predicates in server/config.ts and client/src/model.ts; no new blocking finding.
- [x] STYLE-05 **Comments explain why** — new cap/capacity/default runner comments explain purpose.

## Observations, materiality and owner handoff

No unresolved in-scope Issues or material unverified cells remain; no materiality actions are required. Existing nonblocking observations remain: failed rename can leave a temporary file while preserving old state; invalid percent encoding returns a controlled generic 500; duplicated client/server predicates remain advisory. Transient pending manual-probe status during an inflight scan is explicitly described above and recovers on refresh.

The UI fixture launches its Shed with the same cwd/process name as its JSON fixture; both can share the documented folder+process identity. A favourite's tracked URL can therefore follow that shared identity to the fixture Shed when the API stops. This fixture observation is not a new identity-collision blocking axis; no new scope or repair is required by this Check.

All Task-check waiver/owner decisions are preserved. T-001 remains owner-done. O-001 is technically cleared and ready for the owner's acceptance/closure decision; the checker did not set it done or record acceptance. C-002 supersedes C-001 and verifies I-001–I-005. This Check stops here.
