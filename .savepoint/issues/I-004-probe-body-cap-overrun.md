---
id: I-004
title: Service probes read beyond the documented body cap
type: guardrail
status: resolved
source:
  kind: check
  check: C-001
  actor: {role: checker, session: check-o001-20261010}
  at: '2026-10-10T03:01:50Z'
tasks: [T-001]
checks: [C-001, C-002]
guardrail_ids: [SEC-03]
resolution:
  disposition: verified
  check: C-002
  actor: {role: checker, session: check-o001-recheck-20261010}
  at: '2026-10-10T03:37:31Z'
  reason: "Original four split-chunk reproductions and named body-cap/TLS/truncation cases passed; beyond-cap titles ignored."
history:
  - at: '2026-10-10T03:01:50Z'
    actor: {role: checker, session: check-o001-20261010}
    kind: observed
    check: C-001
    note: Initial independent Objective Check; frozen N body limit cells.
  - at: '2026-10-10T03:31:00Z'
    actor: {role: executor, session: session_01WG6Lxf82CULEbTwEk9Keqb}
    kind: repair_attempted
    note: "Repair: server/probe.ts keeps only chunk.subarray(0, MAX_BODY - size), so at most 65536 bytes are retained and searched for </title>. node:test 'probe body cap': title starting at bytes 65535/65536/65537/100000 after a 65530-byte first chunk -> kind web, no title; title ending exactly at 65536 -> read; title past the cap inside one large chunk -> ignored; truncated response (content-length 5000, socket destroyed) settles <1000 ms as web. Existing real-socket tests (web page, silent TCP, banner, closed) and TLS retry tests still pass. Regression check: reverting the fix makes all 5 beyond-cap cases fail. Gates 2026-10-10T03:30:04Z, Node v22.22.2, tsc 7.0.2: npm run typecheck 0, npm run build 0, npm test 0 (46 pass, 0 fail, 0 skipped); git diff --check 0. Not run: redirects case beyond existing classify unit test. Executor evidence only; not verified."
  - at: '2026-10-10T03:37:31Z'
    actor: {role: checker, session: check-o001-recheck-20261010}
    kind: rechecked
    check: C-002
    note: "Original four split-chunk reproductions and named body-cap/TLS/truncation cases passed; beyond-cap titles ignored."
---

# I-004: Service probes read beyond the documented body cap

## Summary

SEC-03 requires capped untrusted response reads; README and probe.ts promise at most 64 KB. The implementation appends a full chunk before testing the limit, so content beyond byte 65536 affects the result.

## Evidence

Controlled loopback HTTP fixture: respond text/html, write 65530 padding bytes, then after 30 ms send padding to offset 65535/65536/65537/100000 followed by `<title>BEYOND-CAP</title>`. Expected: no title sourced past the cap. Actual: `BEYOND-CAP` in all four independent N cells. At offset 100000, more than 100 KB is processed.

`server/probe.ts:106`–109 pushes the entire chunk, increments size and only then settles. Existing real-socket tests cover small HTML, TCP and closed ports, but not response byte boundaries. This remains bounded by a received chunk beyond the cap; the evidence does not show unlimited memory growth or script execution.

## Proof Needed

Frozen N body-limit cells: exact 65535/65536/65537 boundaries and larger/chunk-split input must retain/process at most 65536 bytes; title outside the retained prefix must not affect output. Verify timeout, request cleanup, ordinary titles, redirects and classification remain correct.
