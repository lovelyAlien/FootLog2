---
phase: 6
slug: calendar-tab
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo 57.0.4 |
| **Config file** | `package.json` `"test"` script: `NODE_OPTIONS=--experimental-sqlite jest` |
| **Quick run command** | `npm test -- <path/to/file>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

This repo's established convention is **static source analysis** (`@jest-environment node`, `fs.readFileSync` + `stripComments`, regex/string assertions against route/component source — not RN Testing Library render tests) for wiring/contract tests, and real unit tests against `node:sqlite` (via `src/db/testing/nodeSqliteAdapter.ts`) for pure-logic modules. Phase 6 plans must follow this exact split.

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <file touched>`
- **After every plan wave:** Run `npm test` (full suite — includes `NODE_OPTIONS=--experimental-sqlite`)
- **Before `/gsd:verify-work`:** Full suite must be green, with explicit confirmation that `tabs-wiring.test.ts` Tests 13/14 were *edited* (not left red, not deleted)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-02 Task 2 | 06-02 | wave 1 | REQ-calendar-grid | — | N/A | unit (pure grid math) | `npm test -- src/calendar/monthGrid.test.ts` | ✅ | ✅ done |
| 06-03 Task 3 | 06-03 | wave 2 | REQ-calendar-grid | — | N/A | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-05 Task 3 | 06-05 | wave 3 | REQ-past-date-view | — | N/A | static source analysis (no-checkin-button guard) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-02 Task 3 | 06-02 | wave 1 | REQ-date-scrubber | — | N/A | unit (clamp math + visibility gate, pure functions) | `npm test -- src/calendar/scrubberRange.test.ts` | ✅ | ✅ done |
| 06-07 Task 3 | 06-07 | wave 4 | REQ-date-scrubber | — | N/A | static source analysis (hitSlop/dimension on DateScrubber component) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-01 Task 2 | 06-01 | wave 1 | REQ-settings-screen | T-06-01 | `checkin_frequency` constrained to closed union at write site | unit (`settingsRepo` vs node:sqlite) | `npm test -- src/settings/settingsRepo.test.ts` | ✅ | ✅ done |
| 06-04 Task 3 | 06-04 | wave 2 | REQ-settings-screen | T-06-01 | `checkin_frequency` constrained to closed union at write site | static source analysis | `npm test -- src/app/__tests__/settings-wiring.test.ts` | ✅ | ✅ done |
| 06-05 Task 1, Task 3 | 06-05 | wave 3 | REQ-past-date-view | T-06-02 | `date` route param validated as `YYYY-MM-DD` before use in SQL, fail closed on malformed input | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ✅ | ✅ done |
| 06-03 Task 3, 06-06 Task 3 | 06-03, 06-06 | wave 2, wave 3 | (regression) | — | N/A | static source analysis (existing file, edited — Test 13 by 06-03, Test 14 by 06-06) | `npm test -- src/app/__tests__/tabs-wiring.test.ts` | ✅ | ✅ done |

All Task/Plan/Wave columns reconciled against actual 06-01~06-07 PLAN.md task IDs and SUMMARY.md commits (2026-09-02, 06-08 Task 1).

**Fence test confirmation (06-RESEARCH.md Pitfall 2 gate):** `tabs-wiring.test.ts` Test 13/14 still exist in the file, their bodies were rewritten from absence-assertions to existence-assertions (Phase 4 D-07/D-08 boundaries intentionally reversed by 06-03/06-06), and both pass in isolation — confirmed via `npm test -- src/app/__tests__/tabs-wiring.test.ts -t "Test 13"` and `-t "Test 14"` (2026-09-02).

---

## Wave 0 Requirements

- [x] `src/db/migrations.test.ts` — extended for `DATABASE_VERSION` bump (`app_settings` table), following existing `CHECKINS_COLUMNS`/`DAILY_REFLECTIONS_COLUMNS` array-assertion pattern (06-01 Task 1)
- [x] `src/calendar/monthGrid.test.ts` — new, pure date-math (grid cell generation, week-starts-Sunday, month boundaries) (06-02 Task 2)
- [x] `src/calendar/scrubberRange.test.ts` — new, clamp math + visibility-gate logic as pure functions (corrected from the originally-planned component-level test file name — the pure logic was split into its own module; gesture callbacks in `DateScrubber.tsx` are thin wrappers verified via static source analysis instead, per this repo's existing convention) (06-02 Task 3)
- [x] `src/settings/settingsRepo.test.ts` — new, against `node:sqlite` test adapter, mirroring `src/checkin/draftRepo.test.ts`'s shape (06-01 Task 2)
- [x] `src/app/__tests__/calendar-wiring.test.ts` — new, static source analysis for new calendar routes (06-03 Task 3, extended by 06-05 Task 3 and 06-07 Task 3)
- [x] `src/app/__tests__/settings-wiring.test.ts` — new, static source analysis for new settings route + hamburger wiring (06-04 Task 3, extended by 06-06 Task 3)
- [x] Framework install: none — Jest/jest-expo already configured and passing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Date scrubber drag feel (momentum-free, real-time position tracking) | REQ-date-scrubber | Gesture feel/timing not verifiable via static source analysis or pure-function unit tests | iOS Simulator: attach panel, drag scrubber across range, confirm no momentum/overshoot, confirm hard clamp at both ends |
| Bottom sheet force-collapse on scrubber touch | REQ-date-scrubber | Visual/animation timing | iOS Simulator: touch scrubber while sheet is OPEN, confirm sheet collapses and map remains visible |
| Month swipe gesture (left/right) | (D-05, calendar grid) | Gesture feel | iOS Simulator: swipe grid left/right, confirm month changes and header arrow buttons produce identical result |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant` set to true in frontmatter

**Approval:** Task 1 automated gate passed (`npm test` 616/616, `npx tsc --noEmit` clean). Pending Task 3 founder sign-off for device-only items.
