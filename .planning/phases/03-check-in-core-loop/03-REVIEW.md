---
phase: 03-check-in-core-loop
reviewed: 2026-08-28T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - src/app/__tests__/checkin-wiring.test.ts
  - src/app/__tests__/foundation-wiring.test.ts
  - src/app/index.tsx
  - src/checkin/__tests__/nativeDeps.test.ts
  - src/checkin/checkinFlow.test.ts
  - src/checkin/checkinFlow.ts
  - src/checkin/checkinRepo.test.ts
  - src/checkin/checkinRepo.ts
  - src/checkin/config.ts
  - src/checkin/deps.ts
  - src/checkin/draftRepo.test.ts
  - src/checkin/draftRepo.ts
  - src/checkin/fallbackLocation.test.ts
  - src/checkin/fallbackLocation.ts
  - src/checkin/localDate.test.ts
  - src/checkin/localDate.ts
  - src/checkin/location.test.ts
  - src/checkin/location.ts
  - src/checkin/permissions.test.ts
  - src/checkin/permissions.ts
  - src/checkin/testing/fakeCheckinDeps.test.ts
  - src/checkin/testing/fakeImagePicker.ts
  - src/checkin/testing/fakeLocation.ts
  - src/checkin/testing/fakePhotoStorage.ts
  - src/components/CheckinActionCard.tsx
  - src/components/LocationDeniedBanner.tsx
  - src/components/__tests__/checkinCardUi.test.ts
  - src/components/__tests__/locationUi.test.ts
  - src/db/migrations.test.ts
  - src/db/migrations.ts
  - src/db/schema.ts
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-08-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Reviewed the full check-in core loop slice: reducer/state machine (`checkinFlow.ts`), repositories (`checkinRepo.ts`, `draftRepo.ts`), location capture decision tree (`location.ts`, `permissions.ts`, `fallbackLocation.ts`), date/timezone helpers (`localDate.ts`), the screen wiring (`app/index.tsx`), presentational components (`CheckinActionCard.tsx`, `LocationDeniedBanner.tsx`), DB schema/migrations, and all associated tests/fakes.

The unit-level modules (reducer, repos, location decision tree, date helpers) are well isolated, thoroughly unit-tested, and match `03-UI-SPEC.md`'s pin-color/copy contracts and `DESIGN.md`'s accent-budget rules exactly. However, tracing the wiring in `src/app/index.tsx` against the reducer surfaced a genuine **BLOCKER**: there is no way to get from `SAVED` back to `IDLE` in this build, so a user can complete exactly one check-in per app launch — after that the check-in button is gone for the rest of the session. This directly undermines the phase's stated goal ("체크인 코어 루프" — a repeatable loop). I also found several data-integrity and robustness gaps around draft/accuracy consistency, double-tap races on the save button, and swallowed rollback failures that deserve attention before this ships, plus two minor copy/documentation quality nits.

## Critical Issues

### CR-01: No transition from SAVED back to IDLE — only one check-in per app session

**File:** `src/checkin/checkinFlow.ts:37-102`, `src/app/index.tsx:183,204-250`
**Issue:** `checkinReducer`'s only path back to `IDLE` is the `DISMISS` event (line 96-97 of `checkinFlow.ts`), and `DISMISS` is dispatched exactly once in the entire app — inside `handleCheckinPress`'s `catch` block in `src/app/index.tsx:241-248`, which only fires while still in `CAPTURING` (i.e. before a pin is even confirmed). There is no button, gesture, or effect anywhere in `CheckinActionCard.tsx` or `index.tsx` that dispatches `DISMISS` (or any other IDLE-returning event) once `phase === 'SAVED'`.

Consequences:
- `showActionCard = state.phase !== 'IDLE' && !isCapturing` (`index.tsx:183`) stays `true` forever after the first successful save, so the `SAVED` card (headline + note/photo inputs) is rendered permanently and the floating "체크인" pill button (`index.tsx:470-488`) never reappears.
- The user cannot start a second check-in without force-quitting and relaunching the app. Since the draft row was already deleted on successful commit (`checkinRepo.ts:82`), relaunching does not even trigger draft recovery — it simply remounts the component with a fresh `initialCheckinState`, which is the *only* way this build currently supports doing more than one check-in.

This contradicts the phase's own premise (a repeatable "core loop" — DESIGN.md describes an hourly/periodic check-in habit, and the bottom-sheet-list design assumes many check-ins per day) and is not documented anywhere in `03-CONTEXT.md`/`03-09-PLAN.md`/`03-10-PLAN.md`/`03-10-SUMMARY.md` as an intentionally deferred limitation.

**Fix:** Add an explicit transition (e.g. a new `RESET`/`START_NEW` event, or reuse `DISMISS`) that the screen dispatches once the user is done with the `SAVED` card (for example when the note/photo area loses focus, or via an explicit affordance), returning `phase` to `IDLE` so `handleCheckinPress` can run again in the same session. At minimum, gate this as a documented, tracked follow-up before considering the phase complete — currently it silently blocks the core use case.

## Warnings

### WR-01: Dragged draft's `accuracy_meters` is never nulled in SQLite, unlike the in-memory pin

**File:** `src/checkin/draftRepo.ts:58-85`, `src/app/index.tsx:254-265`, `src/checkin/location.ts:191-204`
**Issue:** `applyDraggedSource` (the reducer's single source of truth for drag semantics, `location.ts:194-204`) always sets `accuracyMeters: null` for a dragged pin, with an explicit comment explaining why ("사용자가 손으로 옮긴 위치라 GPS 정확도 수치가 더 이상 의미를 갖지 않기 때문"). `updateDraftCoordinate` in `draftRepo.ts` supports an optional `accuracyMeters` arg to persist that nulling, but the only production caller, `handleDragEnd` in `index.tsx:254-265`, never passes it:
```ts
updateDraftCoordinate(db, { lat: latitude, lng: longitude, now: toIsoTimestamp() })
```
This takes the "no accuracyMeters" branch (`draftRepo.ts:77-85`), which leaves the stale pre-drag `accuracy_meters` value in the `drafts` row even though `location_source` is correctly flipped to `gps_dragged`.
If the app is killed between a drag and tapping "확인", `loadRecoverableDraft`/`RESTORE_DRAFT` (`index.tsx:156-180`) reconstructs a pin with `locationSource: 'gps_dragged'` but a non-null, stale `accuracyMeters`. If the user then immediately confirms without dragging again, that stale value is written permanently into `checkins.accuracy_meters`, violating the domain invariant that dragged pins have no meaningful accuracy.
**Fix:** Have `handleDragEnd` pass `accuracyMeters: null` explicitly, e.g. `updateDraftCoordinate(db, { lat: latitude, lng: longitude, accuracyMeters: null, now: toIsoTimestamp() })`, so the persisted draft always matches the in-memory pin's invariant.

### WR-02: Reducer's "undefined transitions are no-ops" contract doesn't apply to PHOTO_PICKED/PHOTO_FAILED/NOTE_CHANGED

**File:** `src/checkin/checkinFlow.ts:46-48, 87-94`
**Issue:** The file header states: "정의되지 않은 (phase, event) 조합은 state를 그대로 반환하는 방어적 no-op이다." But `PHOTO_PICKED`, `PHOTO_FAILED`, and `NOTE_CHANGED` are handled unconditionally for every phase, including `IDLE`/`CAPTURING`/`CONFIRM`/`SAVING`/`SAVE_FAILED` — there is no `state.phase === 'SAVED'` guard mirroring `canEditNoteAndPhoto`. Today this is unreachable because the only call sites (`handlePickPhoto`, `handleChangeNote` in `index.tsx`) gate on `state.checkinId` truthiness, but the reducer itself — the file explicitly designated as "the single decision point" for this rule — provides no defense-in-depth, so a future caller (or a bug in the call-site guard) could silently mutate `note`/`photo` outside `SAVED`.
**Fix:** Add `if (state.phase !== 'SAVED') return state;` to these three cases, consistent with `canEditNoteAndPhoto`, so the reducer itself enforces the invariant rather than relying solely on caller discipline.

### WR-03: A failed ROLLBACK can leave the SQLite connection in a broken transaction state with no recovery path

**File:** `src/checkin/checkinRepo.ts:59-93`
**Issue:** `commitCheckin`'s retried `attempt()` wraps `BEGIN` → `INSERT` → `DELETE draft` → `COMMIT` in a try/catch that calls `ROLLBACK` on any failure and explicitly swallows a `ROLLBACK` failure ("ROLLBACK 자체의 실패는 흡수한다"). If `ROLLBACK` itself throws and the connection is left inside an open transaction, the immediate single retry's `BEGIN` will itself throw ("cannot start a transaction within a transaction" on the shared connection), and — because `MigratableDb` is a long-lived singleton connection shared for the app's lifetime — every subsequent `commitCheckin` call in the same session would also fail the same way, with no code path that ever issues a corrective `ROLLBACK`/reconnect. A single anomalous failure could thus turn into "every check-in fails for the rest of the session."
**Fix:** On a `ROLLBACK` failure, consider proactively re-issuing `ROLLBACK` (or, since `MigratableDb` only exposes `execAsync`/`runAsync`/`getFirstAsync`, at least logging distinctly from an ordinary write failure) so future writes aren't silently doomed; alternatively document why the connection is guaranteed to self-heal (e.g., expo-sqlite auto-rollback on next statement) if that's actually the case.

### WR-04: "확인"/"다시 시도" buttons have no busy-state guard against rapid double-taps

**File:** `src/components/CheckinActionCard.tsx:68-77, 141-150`, `src/app/index.tsx:271-320`
**Issue:** The `Pressable` for `onConfirm`/`onRetry` has no `disabled` prop at all — the only protection against a double-tap is the phase check inside `handleSaveCheckin` (`index.tsx:272-274`), which reads `state.phase` from the closure captured at the last render. Two touch events dispatched in quick succession before React re-renders can both see `phase === 'CONFIRM'`, and since `pendingCheckinIdRef.current` is set synchronously before either async call starts, both calls to `commitCheckin(db, params)` would use the **same** client-generated `id`. Given `checkins.id` is a `PRIMARY KEY`, the two concurrent transactions race on the same connection; whichever completes second is very likely to fail the retry loop too (either due to the unique constraint or a nested-transaction error, see WR-03) and dispatch `SAVE_FAILED` even though the check-in was actually saved by the first call. The reducer's own phase guards prevent state corruption (the second, stale dispatch becomes a no-op once phase is no longer `SAVING`), but the user can still see a false "저장하지 못했어요" flash for a check-in that in fact succeeded.
**Fix:** Add a `disabled` prop to the confirm/retry `Pressable`s driven by `phase === 'SAVING'`, or debounce `handleSaveCheckin` with a ref-based "already dispatching" flag set synchronously on the first call.

### WR-05: Generic error handler in `handleCheckinPress` always discards in-progress state via `DISMISS`, even after successful persistence

**File:** `src/app/index.tsx:204-250`
**Issue:** The single `catch` block wrapping the entire capture→dispatch→`upsertDraft`→`animateToRegion` sequence unconditionally dispatches `DISMISS` on any thrown error (line 246), resetting the whole reducer state to `IDLE` regardless of how far the flow had progressed. Concretely: `dispatch({ type: 'CAPTURE_RESOLVED', location })` and `await upsertDraft(...)` both happen before `mapRef.current?.animateToRegion(...)` — if the draft write already succeeded and only the trailing `animateToRegion` call throws (e.g., a native module hiccup), the entire in-memory confirm-pin UI is silently wiped with no user-facing feedback, even though a recoverable draft now exists in SQLite. The user has no way to know a check-in is "half-done" until they relaunch the app and get the recovery prompt.
**Fix:** Narrow the `catch` to only reset to `IDLE` for failures that occur before the state has meaningfully progressed (e.g., wrap only the permission/location-resolution portion), or surface a lightweight message when a later step in the same handler fails after a successful draft write, rather than always dispatching a blanket `DISMISS`.

## Info

### IN-01: "사진 변경"/"변경" strings are hardcoded outside `CHECKIN_COPY`

**File:** `src/components/CheckinActionCard.tsx:96, 111`
**Issue:** Every other user-facing string in this component is sourced from `CHECKIN_COPY` (per the file's own header comment and `checkinCardUi.test.ts`'s regression guard), but the accessibility label `'사진 변경'` (line 96) and the visible label `'변경'` (line 111) are inline literals not present in `CHECKIN_COPY` at all, breaking the single-source-of-truth convention this codebase otherwise enforces strictly (see `checkinFlow.ts`'s own comment: "여기서 문구를 발명하지 않는다 — 출처는 03-UI-SPEC.md").
**Fix:** Add `photoChangeLabel: '변경'` (and reuse it for both the label text and the accessibility label) to `CHECKIN_COPY` in `checkinFlow.ts`, and reference it from both call sites.

### IN-02: `LOCATION_SOURCE_MAPPING_NOTE` is a large doc string masquerading as exported production code

**File:** `src/checkin/location.ts:112-118`
**Issue:** This ~500-character constant duplicates the mapping table already documented in the block comment directly above it (lines 98-111) and exists solely so `location.test.ts`'s `LOCATION_SOURCE_MAPPING_NOTE` describe block has something to assert against (`typeof === 'string'`, non-empty). It has no runtime behavior and is not consumed anywhere else in the reviewed files.
**Fix:** Either drop the constant and the corresponding low-value test, or fold the content into a JSDoc comment instead of shipping a duplicated documentation string as a public export.

---

_Reviewed: 2026-08-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
