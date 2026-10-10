---
id: C-001
scope: {kind: objective, id: O-001}
result: NEEDS WORK
checked_by: {role: checker, session: check-o001-20261010}
executed_session: session_01WG6Lxf82CULEbTwEk9Keqb
checked_at: '2026-10-10T03:01:50Z'
reviewed:
  base_commit: b36123b
  head_commit: c3fcded4ec25f49a97785c6b6a83de4bfcb95522
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
issues: [I-001, I-002, I-003, I-004, I-005]
supersedes: null
---

# C-001: Full Objective Check — Discovery spike and V1 dashboard

## Result

**NEEDS WORK.** Four reproducible implementation/contract defects and incomplete required verification prevent clearance. T-001 remains done; the owner waiver of its optional Task Check is respected. No implementation, Task status, Objective status, router selection, Design or acceptance criteria were changed by this Check.

This is a fresh checker session independent of executor `session_01WG6Lxf82CULEbTwEk9Keqb`. It reviews every owned Task (T-001) and cross-component integration. The source was initially untracked and was committed during this review as c3fcded; the final scoped files match HEAD (`git diff HEAD -- <scoped paths>` empty). Final file hashes are retained in `check-evidence/C-001/reviewed-sha256.json`. This Check is not owner acceptance.

## Frozen initial scope lock

The following lock was written before independent probes in `/tmp/shed-c001-scope.md`; its exact original text is retained as `check-evidence/C-001/scope-lock.txt`.

# C-001 initial scope lock (before independent probes)

1. O-001 success conditions 1–5; T-001 AC1–12; SEC-01–04, SCOPE-01–03, DISC-01–02, DATA-01, TEST-01–03. Gates: typecheck, build, test, diff check, then official health. Retrospective original spike history verified by documentation/source reconciliation; do not claim to reproduce historical runs.
2. Files: all T-001 Context Files, .gitignore, package-lock.json, config gates, Guardrails and Design. Public surfaces: every API route, exported discovery parser/merge/text helper, identification helpers/identify, config validators/ConfigStore, probe/classify/title/mapLimit, scan/Scanner, client model/API/components, dev launcher and production/static entry.
3. Runtime boundaries: Node HTTP/TLS, fixed subprocess discovery including fallback, OS listener/process metadata, file identification, atomic config persistence, browser plain-text rendering and links. Windows+WSL mirrored hosts are supported; NAT verification, other distros, macOS, remote service internals and automated browser interaction are excluded by Objective.
4. Frozen matrix rows:
   P parsers/identity: empty/missing/malformed/mixed/null output; port 0/1/65535/65536/non-finite; duplicate env+port/dual-stack/relay; cwd/script/system/nonexistent/marker/name fallbacks; cross-host translations; mutable input independence.
   V validators/config: each export, null/empty/missing/wrong/mixed/duplicate/non-finite inputs, name 99/100/101, folder 999/1000/1001, key 1999/2000/2001, URLs protocol/loopback/nonlocal/IPv6, list 499/500/501, restart/roundtrip/corrupt file, write and rename failures with old memory/disk preserved, repeat mutation.
   N probes: HTML/JSON/401/403/404/503/redirect; title plain text/control/Unicode and cap; body 65535/65536/65537 and larger; refused/silent/reset/banner/truncated response; timeout/cleanup/repeat; bounded concurrency/order and empty work. HTTPS retry via source trace plus real TLS when available.
   A API: every route normal/failure/repeat, missing/empty/malformed/wrong-type bodies; Host loopback/remote/absent; Origin localhost/remote/null/absent; JSON/nonJSON/missing including DELETE bypass; body 16383/16384/16385; static traversal/missing/invalid encoding; persistence across server restart; concurrent refresh/mutations.
   D discovery: actual/configured targets and host detection; both mirrored hosts; source available/missing/error/timeout/fallback/malformed output; discovery-before-probe; unverified unreachable vs offline manual; concurrent scans/cache/forced refresh; default-distro warning; no admin or data-fed commands.
   U UI/model: all kinds/statuses, sections, favourite live/offline/revival/unstar, hidden port/process/unhide, override set/clear, manual add/edit/delete, filter, safe href and text, 15s visible-only auto, error-retaining forms, responsive/style. Model harness/source review and recorded API/screenshots permitted; no browser automation required. Click-specific rendering not independently exercised is explicitly unverified.
   E evidence/gates: named tests for pure server behaviours, regression evidence for each recorded fix, documentation truth, file reality, Design reconciliation and gates.
   Not applicable: terminal colour/cursor/redirected styling (browser UI); billing/auth/transaction/secret boundaries (none); text display-column oracle (CSS ellipsis, not column arithmetic); arbitrary skipped lifecycle transitions (no product state machine); remote provider internals. Scalar helpers with statically typed string inputs do not promise arbitrary direct wrong-type JS calls; request/config boundaries do.
5. Supported-path materiality: reproducible violation of these requirements in the promised localhost single-user workflow; acceptance evidence missing is unverified, not fabricated failure. Finite external cells: configured/actual target, startup/discovery/reuse, refusal/unavailable, success/non-success, redirects, timeout/cancellation, malformed/truncated, retry/cleanup/partial effects, failure output. Each receives pass/Issue/unverified/N/A in final record.

Workflow inventory (frozen):
| Order | Operation / effect | Failure owner/final state | Cleanup and oracle |
|---|---|---|---|
|1| startup read/parse config or move corrupt original | store drops bad entries or preserves backup | compare independent bytes and restarted model |
|2| bind loopback; HTTP Host/Origin/body/validator guards | API rejects before write; startup bind failure fatal | HTTP statuses, actual socket bind |
|3| source processes, parallel parse/fallback/dedupe | per-source warning, other sources retained | subprocess timeout/stdin close; OS output vs service IDs |
|4| identify stat/marker/package, probe bounded sockets | inaccessible files degrade; refused listener unverified | controlled fixtures/socket outcomes, no response URL trust |
|5| clone/update/sanitize config; mkdir/temp write/rename; memory publish | failed write retains previous state; rename follows write | independent bytes, old memory, temporary artifacts |
|6| manual reprobe/cache and favourite bookkeeping; API state response | write may succeed before later scan failure; subsequent refresh recovers | restart, GET, repeat/concurrent requests |
|7| model sections/render/edit/star/open/refresh | UI preserves screen/forms on failure | model oracle, source+recorded scenarios, plain-text JSX |
|8| dev children exit/signals; server/probe request completion | launcher closes its own children; no product process controls | source trace; test fixtures close only owned processes/sockets |

## Initial Check process corrections

No scope axes were added. The initial harness used fetch for Host overrides; its Host probe did not actually send the intended header. It was corrected to raw Node HTTP and the entire affected A pass rerun: non-loopback Host returns 421. An attempted empty Host is still normalized by the HTTP client; missing Host rejection is supported by direct handler trace, not that request result. No Host defect is admitted.

Windows interop did not inherit the isolated SHED environment variables in the first attempt, so it briefly launched the server at its default port/config. Only liveness startup was entered; no mutation or scan was sent to that server. The harness was corrected to a Windows bootstrap setting the variables explicitly. A malformed fixture file URL and a port previously reserved from WSL were also corrected; neither is admitted as a product defect. Windows discovery passed on port 49223 with an isolated UNC config. The original harness retained TCP sockets at shutdown; its completed output was preserved and the harness interrupted, then socket cleanup added. Early scratch runs are discarded Check-process attempts, not technical evidence of product failure.

## Evidence and commands

Environment: Windows 11 + WSL2 Ubuntu, kernel 6.18.33.2, mirrored networking; WSL Node v22.22.2, Windows Node v24.14.0. No elevated Windows shell or sudo was used. Sandbox escalation allowed local socket/interop testing; it did not request OS admin rights.

| Command / evidence | Current result |
|---|---|
| `npm run typecheck` | Exit 0, fresh at final head |
| `npm run build` | Exit 0, includes typecheck, Vite successful; 19 modules |
| `npm test` | Exit 0, 21 tests in 7 suites, 21 pass; final fresh run |
| `git diff --check` | Exit 0; scoped source matches final HEAD |
| `savepoint health check O-001` after final gates | Code Health not configured; no snapshot, not a finding |
| `node /tmp/shed-c001-probes.mjs > /tmp/shed-c001-results-final.json` | Completed; per-cell assertions retained, product failures do not stop remaining cells |
| `node /tmp/shed-c001-final-cells.mjs > /tmp/shed-c001-final-cells.json` | Completed; Windows-host retry and live 501st-entry probe |

The first sandboxed npm test run failed because socket access was blocked; the subsequent authorized run and final fresh run passed. No lint gate is configured. Project build/test inputs were not modified by the checker. The retained probes are Check evidence, not additions to the project's regression suite.

Reproduction artifacts: `.savepoint/check-evidence/C-001/probes.mjs`, `results.json`, `final-cells.mjs`, `final-results.json`. The main probe creates a fresh temporary directory and starts only owned test servers. The supplemental script records its original `/tmp/shed-c001-sDMoh2` fixture path; when repeating from a new main run, substitute the new `temp` directory from results.json. Test fixture processes/sockets were stopped; temporary failure/config files are retained for evidence. App preferences were not intentionally edited.

## Completed coverage classifications

All frozen cells below are classified; **unverified is not passed**. Where a row contains more than one classification the exact failing or unverified cells are named. Source trace is distinguished from executed probes. No unsupported platform or browser-automation requirement is introduced.

| Row / applicable axes and exact cells | Classification | Independent oracle and result |
|---|---|---|
| P: ss empty/invalid, ports 0–128, 65535/65536/-1/NaN/Infinity | Passed | P1 expected finite port validity, independent integers; existing `ss parsing › parses address forms` adds IPv6/wildcard/scoped forms |
| P: dual-stack duplicate env+port, distinct environments, mutable address input | Passed | P2 expects 2 independent listeners and unchanged caller address array; existing `ss parsing › joins listeners with /proc details and merges dual-stack sockets` |
| P: PowerShell empty object/null command lines, malformed JSON; netstat/tasklist fallback parsers | Passed | P1 and exact existing `Windows parsing › parses PowerShell JSON, tolerating null command lines` / `parses netstat + tasklist fallback`; malformed JSON throws to source boundary by trace |
| P: cwd/marker/package, nonexistent inferred folder, corrupt package, translations/system/script fallback | Passed behaviour; regression evidence Issue I-005 | P3 fixture creates independent package/name and missing path; existing four `project inference` cases; actual Windows/WSL scan identifies cross-boundary WSL packages |
| P/D: WSL relay overlap removal | Unverified, I-005 | Filter exists at scan.ts:177–179, but no executed overlap fixture or named node:test; NAT environment verification is N/A by scope |
| V: all validators/config normal, null, undefined, empty, number, bool, array, missing fields, NaN/Infinity, mixed lists | Passed | V1; invalid entries drop and output roundtrip equals independent expected config |
| V: name 99/100/101, folder 999/1000/1001, key 1999/2000/2001; port 0/1/65535/65536/non-number | Passed | V1 exact limits and existing `overrides and folders` tests |
| V: URL protocols/remote/loopback/IPv6; user folder never read | Passed | Named `config validation › allows only http(s) URLs`, `probe helpers › only treats loopback hosts as probe-able`; live external manual returns unverified without probe, source ownership trace |
| V: duplicate/mixed valid entries and mutation after validation | Passed for promised validation | Sanitization creates new records, preserves duplicates (no acceptance rule demands deduping manual IDs), V1 roundtrip and mutable-source oracle |
| V: list 499/500/501, persistence of valid saved entries | Issue I-003 | V3; supplemental actual POST returns 200 with 500 entries and absent new record |
| V: corrupt load/move aside, restart, before-write callback failure, temp-write failure, rename failure | Passed data preservation | V2 compares original bytes, restarted config and old memory; failed rename leaves a temp artifact (observation) |
| N: HTML/JSON/200/302/401/403/404/503, no-follow redirect | Passed | Existing real web-page case plus independent status fixtures; 302 fixture sees one request, not two |
| N: title ASCII/control/combining/wide/variation/modifier/flag/joined emoji; no title and 120-char limit | Passed | Independent text fixtures and existing `probe helpers › extracts titles as plain text`; JSX interpolation, no HTML insertion |
| N: body 65535/65536/65537/100000 with title after cap | Issue I-004 | Four deterministic chunked socket fixtures return title BEYOND-CAP past 65536 bytes |
| N: refused/silent/reset/nonHTTP/banner, bounded timeout and repeat/cleanup | Passed | N real-socket fixtures; silent timeout 80 ms and existing exact real-socket cases; probe finish destroys request by trace |
| N: bounded concurrency/order/empty map | Passed | Independent active-counter maximum 2 and expected output [3,6,9,12,15] |
| N: controlled TLS retry/truncated response/cancellation during response | Unverified, I-005 | Retry and cleanup code traced; controlled TLS/truncated response not executed, so resilience matrix is incomplete |
| A: all public API routes normal/create/update/delete/missing IDs, set/clear overrides, invalid folders | Passed | A workflow oracle verifies config changes, missing-ID 404, invalid folder 400, removal of manual favourite |
| A: malformed/empty JSON and null favourites, wrong/missing field validators | Passed | Malformed JSON returns 400; null favourites returns 400; V1 and handler trace cover wrong-type fields |
| A: Host remote/loopback; Origin remote/null/absent; content-type on POST/PUT | Passed | Corrected raw HTTP matrix: remote Host 421, loopback 200, remote/null Origin 403, nonJSON 415; missing Host guarded by source trace (client attempted empty Host auto-inserted localhost) |
| A: DELETE absent/nonJSON format bypass | Issue I-002 | Live hide-rule deletion with text/plain succeeds 200; both routes skip readJson; client omits deletion content-type |
| A: body 16383/16384/16385, traversal/static/invalid encoding | Passed | 400 below/at invalid JSON limit, 413 above; traversal serves UI; invalid encoding controlled 500, no file disclosure |
| A: restart, cache/forced/repeated/concurrent refresh | Passed | Independent byte/config restart comparison; Scanner concurrent results same object, cached result same, forced next result distinct |
| A: concurrent mutation vs scan; failure after committed config and before state response | Unverified, I-005 | Persistence precedes reprobe/state by trace; race/failure timing not independently injected |
| D: actual vs configured target, startup, both host modes and default distro | Passed | WSL mirrored host discovers both sources (34 each in recorded run); Windows mirrored host sees Windows 35 and WSL 20 (1039/128 ms), correct env and warnings |
| D: inaccessible/other-user metadata and nonHTTP services | Passed | Current Windows scan reports 13 hidden command lines and WSL 1 other-user port; both scans complete with mixed web/http/tcp/unverified results |
| D: source refusal/unavailable/missing-tool/timeout/fallback/malformed orchestration | Unverified, I-005 | Per-source catch/fallback traced, historical executor scenario recorded, but a controlled independent failure/fallback matrix was not run |
| U: every kind/status section, favourite live/offline/revival, hide/unhide, overrides and filter | Passed model/normal API; UI curation Issue I-001 | Independent expected section counts, case-insensitive hide rule, offline favourite and filter; source callbacks/repeated API workflow |
| U: API/Other row star/rename/folder entry points | Issue I-001 | Model routes JSON projects into rows; Row has no Star or onEdit; cannot reach curation through normal UI |
| U: manual add/edit/delete, open safe URL, response text, error-retaining edit form | Passed source/model/normal API; historical failed-save evidence Issue I-005 | safeHref rejects javascript, Open uses new tab with noopener/noreferrer, JSX plain text; add/edit forms await saves before closing; required recorded failing/retry scenario absent |
| U: manual refresh and 15s visible-only auto; responsive Atari-Noir styling | Passed by source and model reconciliation | App interval 15000/visibility guard; CSS explicit theme tokens and one-column media query at 720; no automated UI clicks claimed |
| E: all files named by Context Files and evidence | Passed | Every named current file exists; no unexplained phantom paths. Early Check scratch attempts explicitly discarded; screenshot claims have no file paths and were not treated as independent visual proof |
| E: per-fix regression evidence / changed pure logic | Issue I-005 | Exact missing TEST-02 evidence at T-001:118/120; overlap pure behaviour lacks node:test; green existing tests do not fill it |
| E: Design integration and gates | Gates passed; Design discrepancies explained by Issues | Design API JSON-all-mutations/64KB cap/full curation/data survival promises conflict with I-001–004; no Design edits in Check |
| All frozen N/A cells | Not applicable for stated reasons | Terminal colour/cursor/output sink axes, billing/auth/transactions/secrets, display-column arithmetic, unsupported OS/distros/NAT verification, external service internals, automated browser interactions excluded by initial lock |

## Finite external-boundary matrix

| Cell | Result |
|---|---|
| Configured and actual targets | Passed both host envs, explicit isolated config; initial harness mistakes corrected and excluded |
| Startup/discovery/reuse ordering | Passed HTTP liveness → scan sources → merge → identify/probe → model; cache and concurrent refresh oracle |
| Connection refusal/unavailable | Probe refusal passed; forced source missing/unavailable unverified I-005 |
| Success/non-success responses | Passed HTTP 200/302/401/403/404/503 and request 400/403/404/413/415/421 |
| Redirects | Passed no following; response Location never determines service Open URL |
| Timeout/cancellation | Silent socket deadline passed; source timeout and controlled mid-response cancellation unverified I-005 |
| Malformed/unexpected response | Parser invalid JSON rejection and nonHTTP banner passed; controlled truncated HTTP/source fallback unverified I-005 |
| Retry/cleanup/partial side effects | Config failures/restart/refresh repeat passed; TLS retry and post-commit scan failure unverified I-005; cap Issue I-004 |
| Secret-safe failure output | No secret-bearing feature in scope; generic API 500 hides internal detail, source warnings intentionally show discovery errors. No exposure observed |

## Workflow and side-effect completion

The initial inventory above remains frozen. Startup load/corrupt backup, bind/guards, successful parallel discovery, identification/probe, config clone/temp/replace/publication, reprobe/cache and normal UI callbacks were traced to actual operations and probed as the coverage table states. V2 independently proves no memory publication on callback/write/rename failure and preservation of old disk bytes. A normal save becomes durable before the API response; silent truncation violates that promised save outcome (I-003). DELETE can enter persistence without the content-type guard (I-002). Request-failure timing after commit and forced source/TLS failures remain unverified (I-005), not inferred from green tests. No checker implementation repairs were made.

## Adversarial pass

Alternative surfaces were exercised rather than only the original examples: API deletion bypasses the write validator, direct and API ConfigStore saves hit the same lossy sanitizer, split response chunks bypass the nominal cap, and model representation changes from website card to API row remove curation entry points. Live/offline favourites and case-insensitive hiding were checked independently. Wrong-type/non-finite validators, duplicate environments, caller mutation and serialization roundtrip were covered. Unicode plain-text handling was inspected and probed; no HTML execution path exists. HTTP failure/timeout/repeat cleanup and source errors were traced; incomplete finite failure cells remain explicitly unverified. Assertions use expected values/independent counters/byte comparisons rather than the implementation's own calculations. No unrelated remote/internal dependency axes were admitted.

## Acceptance coverage

| Criterion | Classification / evidence |
|---|---|
| AC1 Spike | Proven as documentary acceptance: commands, timings, probes, gotchas, limitations/safety are present and agree with current supported-source traces. Historical timing claims are not described as rerun proof |
| AC2 Discovery | Unverified in full: real both-host scans and env/port uniqueness passed; relay overlap fixture still missing, I-005 |
| AC3 Classification/status | Proven in exercised status/model/socket cells; forced resilience cells retained under AC9 |
| AC4 Identification | Proven current behaviour by fixtures and cross-host scan; missing regression artifact separately I-005 |
| AC5 Cards/open | Proven source/model: required card fields, generated URL, safe new-tab link; no browser click automation claimed |
| AC6 Curation | Issue I-001; normal API operations work, API/other row UI does not provide curation |
| AC7 Persistence | Issue I-003; normal restart/corrupt/write-failure behaviour passed |
| AC8 Refresh | Proven Scanner cache/concurrency/force and source visible-only 15s interval |
| AC9 Resilience | Unverified in full, I-005: normal inaccessible/nonHTTP cases passed, controlled source/TLS/post-commit failures missing |
| AC10 Constraints | Issues I-002/I-004/I-005; remaining rules below satisfied |
| AC11 Design/theme | Proven static styling/responsive source: stated tokens and responsive grid; screenshots not independently inspected |
| AC12 Gates | Proven fresh all three configured commands passed |
| O-001 SC1 | Proven documentation condition (AC1) |
| O-001 SC2 | Issue I-001; otherwise normal feature integration exists |
| O-001 SC3 | Issue I-003 and material unverified resilience cells; historical dual-Vite acceptance remains a claim, not fresh reproduced Vite/UI proof |
| O-001 SC4 | Proven fresh gates |
| O-001 SC5 | Issue I-002/I-004/I-005 |

## Guardrails

SEC-01 satisfied: BIND constant 127.0.0.1, both actual startup logs; no request/config override. SEC-02 satisfied: all server run calls audited, fixed executables/argument arrays/constant scripts, no request/config/discovered-service input flows to them. SEC-03 Issue I-004 on exact cap; plain text, generated URLs and no redirects otherwise satisfied. SEC-04 Issue I-002 on DELETE; Host/Origin and URL/folder validators otherwise passed. SCOPE-01 satisfied normal-user scans and inaccessible metadata warnings; SCOPE-02 satisfied no discovered-service process-control route (dev launcher cleanup of its own children is development orchestration, not a product feature); SCOPE-03 satisfied Node built-in server imports, React client deps, no database/cloud/account/Docker. DISC-01 unverified controlled failures I-005; DISC-02 normal dedupe/unverified source semantics satisfied, relay fixture unverified I-005. DATA-01 Issue I-003. TEST-01/02 Issue I-005. TEST-03 passed fresh real mirrored Windows/WSL hosts, versions/networking mode recorded.

## Materiality

| Issue | Likelihood | Impact | Materiality | Recommendation |
|---|---|---|---|---|
| I-001 API project curation | High: every API project row | Medium: core curation inaccessible | Medium | Fix controls within existing UI scope |
| I-002 DELETE JSON bypass | High: every current client DELETE | Low: Origin guard still enforced, no remote exploit shown | Low | Fix both guards and client headers together |
| I-003 silent capacity loss | Low: needs 500 entries or oversized hand-edited file | Medium: accepted preference missing/discarded | Medium | Preserve existing valid entries and explicitly reject capacity additions |
| I-004 exact probe cap | Medium: large chunked service response | Low: bounded extra chunk, no execution or unlimited growth shown | Low | Narrow cap fix and boundary regression |
| I-005 verification | High: documented missing evidence | Medium: required safety/resilience behaviour not established | Medium | Fill only named frozen cells/regression scenarios before recheck |

Materiality does not waive the Required/Blocker rules. SEC-03 remains blocking under policy even though the demonstrated overrun's practical impact is low.

## Code Style Review

- [x] STYLE-01 **One job per file and function** — module split matches discovery/config/probe/UI responsibilities.
- [x] STYLE-02 **Handle errors at boundaries** — explicit HTTP, subprocess, file and probe handlers; recorded correctness gaps do not negate the boundary structure.
- [x] STYLE-03 **Build only what is needed** — small Node/React application without speculative service layers.
- [ ] STYLE-04 **One source of truth** — folder and URL predicates are duplicated between server/config.ts:22/37 and client/src/model.ts:175/184; advisory divergence risk.
- [x] STYLE-05 **Comments explain why** — fixed commands, loopback, fallback and corruption comments give reasons.

## Nonblocking observations and closure

- A rename failure leaves the newly written temp file; old disk/memory config is preserved. No data loss was shown in that scenario.
- Invalid percent encoding returns a generic 500; no disclosure/crash was shown.
- The task's statement that no commits exist is now historical: source was committed during this Check. Gate inputs match current HEAD.
- The docs' recorded screenshots were not present as named artifacts to inspect. Current visual acceptance is supported by CSS/source; no fresh screenshot or browser interaction is claimed.
- Duplicate handwritten manual IDs are not rejected; no uniqueness acceptance rule was invented.

No health configuration is normal and is not a finding. All five admitted Issues are reported together; checker work stops at this verdict. Repair defaults to the linked Issues without retreating the completed T-001. A subsequent independent recheck must use this same frozen lock, cover the named remaining cells and original reproductions, and run the fresh gates. Owner acceptance/closure remains pending; no waiver or acceptance is recorded on the owner's behalf.
