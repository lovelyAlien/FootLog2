---
phase: 6
slug: calendar-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD | TBD | 0 | REQ-calendar-grid | — | N/A | unit (pure grid math) | `npm test -- src/calendar/monthGrid.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | REQ-calendar-grid | — | N/A | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | REQ-past-date-view | — | N/A | static source analysis (no-checkin-button guard) | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | REQ-date-scrubber | — | N/A | unit (clamp math) + static source analysis (hitSlop/dimension) | `npm test -- src/calendar/DateScrubber.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | REQ-settings-screen | T-06-01 | `checkin_frequency` constrained to closed union at write site | unit (`settingsRepo` vs node:sqlite) + static source analysis | `npm test -- src/settings/settingsRepo.test.ts`, `npm test -- src/app/__tests__/settings-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | REQ-past-date-view | T-06-02 | `date` route param validated as `YYYY-MM-DD` before use in SQL, fail closed on malformed input | static source analysis | `npm test -- src/app/__tests__/calendar-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | (regression) | — | N/A | static source analysis (existing file, must be edited) | `npm test -- src/app/__tests__/tabs-wiring.test.ts` | ✅ exists, needs edits | ⬜ pending |

*Task/Plan/Wave columns are TBD — the planner fills these in once PLAN.md files exist and this table is reconciled against actual task IDs.*

---

## Wave 0 Requirements

- [ ] `src/db/migrations.test.ts` — extend for `DATABASE_VERSION` bump (new `app_settings` table/columns), following existing `CHECKINS_COLUMNS`/`DAILY_REFLECTIONS_COLUMNS` array-assertion pattern
- [ ] `src/calendar/monthGrid.test.ts` — new, pure date-math (grid cell generation, week-starts-Sunday, month boundaries)
- [ ] `src/calendar/DateScrubber.test.ts` — new, clamp math + visibility-gate logic as pure functions (gesture callbacks are thin wrappers, not independently unit-tested, per this repo's existing convention)
- [ ] `src/settings/settingsRepo.test.ts` — new, against `node:sqlite` test adapter, mirroring `src/checkin/draftRepo.test.ts`'s shape
- [ ] `src/app/__tests__/calendar-wiring.test.ts` — new, static source analysis for new calendar routes
- [ ] `src/app/__tests__/settings-wiring.test.ts` — new, static source analysis for new settings route + hamburger wiring
- [ ] Framework install: none — Jest/jest-expo already configured and passing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Date scrubber drag feel (momentum-free, real-time position tracking) | REQ-date-scrubber | Gesture feel/timing not verifiable via static source analysis or pure-function unit tests | iOS Simulator: attach panel, drag scrubber across range, confirm no momentum/overshoot, confirm hard clamp at both ends |
| Bottom sheet force-collapse on scrubber touch | REQ-date-scrubber | Visual/animation timing | iOS Simulator: touch scrubber while sheet is OPEN, confirm sheet collapses and map remains visible |
| Month swipe gesture (left/right) | (D-05, calendar grid) | Gesture feel | iOS Simulator: swipe grid left/right, confirm month changes and header arrow buttons produce identical result |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
