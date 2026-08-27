---
phase: 03-check-in-core-loop
fixed_at: 2026-08-27T16:37:59Z
review_path: .planning/phases/03-check-in-core-loop/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-08-27T16:37:59Z
**Source review:** .planning/phases/03-check-in-core-loop/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: No transition from SAVED back to IDLE — only one check-in per app session

**Files modified:** `src/app/index.tsx`
**Commit:** `8381f80`
**Applied fix:** Added a `handleMapPress` callback wired to `<MapView onPress>` that, only while `phase === 'SAVED'`, flushes the in-progress note/photo one more time (defensive, since both are already persisted at their own commit points) and dispatches the existing `DISMISS` event to return the reducer to `IDLE`. This reuses the reducer's existing `DISMISS` transition rather than inventing a new event, and does not introduce any new copy/label — no button/affordance exists in `03-UI-SPEC.md` for "done with this check-in," so a tap-outside-the-card gesture (consistent with the bottom-sheet-style card already used for `SAVED`) was chosen instead of fabricating new UI text.

**Status note:** `fixed: requires human verification`. This closes the functional gap (the core loop is no longer blocked after one check-in per launch), and passes all existing tests (`checkin-wiring.test.ts`, `checkinFlow.test.ts`), but the specific interaction — "tap empty map area to dismiss the SAVED card" — is a UX/interaction-design choice not specified in `03-UI-SPEC.md`. Per `CLAUDE.md`'s design-system rule ("do not deviate [from DESIGN.md] without explicit user approval"), please confirm this gesture matches the intended product behavior before considering the phase complete, or replace it with whatever affordance product/design settles on (e.g., a dedicated "새 체크인"/"닫기" control) in a follow-up.

### WR-01: Dragged draft's `accuracy_meters` is never nulled in SQLite, unlike the in-memory pin

**Files modified:** `src/app/index.tsx`
**Commit:** `9331b8f`
**Applied fix:** `handleDragEnd` now passes `accuracyMeters: null` explicitly to `updateDraftCoordinate`, matching the in-memory invariant enforced by `applyDraggedSource` (dragged pins always have `accuracyMeters: null`). Verified against `draftRepo.test.ts` and `checkin-wiring.test.ts` — both pass.

### WR-02: Reducer's "undefined transitions are no-op" contract doesn't apply to PHOTO_PICKED/PHOTO_FAILED/NOTE_CHANGED

**Files modified:** `src/checkin/checkinFlow.ts`
**Commit:** `519954a`
**Applied fix:** Added `if (state.phase !== 'SAVED') return state;` guards to the `PHOTO_PICKED`, `PHOTO_FAILED`, and `NOTE_CHANGED` reducer cases, matching `canEditNoteAndPhoto`'s single decision point. All 13 existing `checkinFlow.test.ts` tests still pass (call sites already only invoke these events when `checkinId` is set, i.e. `SAVED`, so behavior is unchanged for legitimate callers — this is pure defense-in-depth).

### WR-03: A failed ROLLBACK can leave the SQLite connection in a broken transaction state with no recovery path

**Files modified:** `src/checkin/checkinRepo.ts`
**Commit:** `3312078`
**Applied fix:** The `catch` around the `ROLLBACK` call now logs a distinct, clearly-labeled `console.error` (naming the ROLLBACK failure and the risk of the connection being left in an open transaction) instead of silently swallowing it with no trace. The original error is still re-thrown to the retry logic unchanged, per the finding's suggested minimal fix (since `MigratableDb` only exposes `execAsync`/`runAsync`/`getFirstAsync` with no reconnect primitive, proactive re-issuing of `ROLLBACK` or reconnect was out of scope for a minimal fix). All 11 `checkinRepo.test.ts` tests pass.

### WR-04: "확인"/"다시 시도" buttons have no busy-state guard against rapid double-taps

**Files modified:** `src/app/index.tsx`
**Commit:** `96321e5`
**Applied fix:** Added an `isSaveInFlightRef` ref, checked and set synchronously at the top of `handleSaveCheckin` before the existing `state.phase` closure checks, and cleared in both the `.then()` and `.catch()` branches of the `commitCheckin` call. This closes the race the `state.phase` closure check alone could not (two touch events dispatched before a re-render both reading the same stale phase). Confirmed `CheckinActionCard.tsx` cannot use a `disabled` prop instead — `checkinCardUi.test.ts` Test 11 explicitly asserts `disabled=` never appears in that file (enforcing the project's "unmount, don't disable" convention) — so the fix was scoped entirely to `index.tsx`.

### WR-05: Generic error handler in `handleCheckinPress` always discards in-progress state via `DISMISS`, even after successful persistence

**Files modified:** `src/app/index.tsx`
**Commit:** `f99a714`
**Applied fix:** Split the single `try/catch` in `handleCheckinPress` into two: the first covers permission request → location resolution → `CAPTURE_RESOLVED` dispatch → `upsertDraft` and still dispatches `DISMISS` on failure (unchanged behavior, T-3-24 still covered); the second wraps only the trailing `animateToRegion` call and, on failure, just logs — it no longer dispatches `DISMISS`, so a native map-animation hiccup after a successful draft write no longer silently wipes the confirm-pin UI. Verified against `checkin-wiring.test.ts` and `foundation-wiring.test.ts` (37 tests, all passing) plus a project-wide `tsc --noEmit` with zero errors in the modified file.

## Skipped Issues

None — all 6 in-scope findings (CR-01, WR-01 through WR-05) were fixed.

---

_Fixed: 2026-08-27T16:37:59Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
