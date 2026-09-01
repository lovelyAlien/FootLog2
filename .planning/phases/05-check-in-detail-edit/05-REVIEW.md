---
phase: 05-check-in-detail-edit
reviewed: 2026-09-01T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/app/(tabs)/index/[id].tsx
  - src/app/(tabs)/index/_layout.tsx
  - src/app/(tabs)/index/index.tsx
  - src/app/__tests__/checkin-detail-wiring.test.ts
  - src/app/__tests__/checkin-wiring.test.ts
  - src/app/__tests__/foundation-wiring.test.ts
  - src/app/__tests__/notification-wiring.test.ts
  - src/app/__tests__/tabs-wiring.test.ts
  - src/app/__tests__/today-wiring.test.ts
  - src/checkin/CheckinDetailScreen.tsx
  - src/checkin/checkinFlow.ts
  - src/checkin/checkinRepo.test.ts
  - src/checkin/checkinRepo.ts
  - src/checkin/config.ts
  - src/checkin/deps.ts
  - src/checkin/localDate.test.ts
  - src/checkin/localDate.ts
  - src/checkin/testing/fakePhotoStorage.ts
  - src/today/CheckinListRow.tsx
  - src/today/TodayBottomSheet.tsx
  - src/today/UndoSnackbar.tsx
  - src/today/__tests__/todayUi.test.ts
  - src/today/content.ts
  - src/today/pendingDelete.test.ts
  - src/today/pendingDelete.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-09-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Reviewed the check-in detail/edit screen (`CheckinDetailScreen.tsx`), its route wrapper/layout, the today-view wiring that gained row-tap navigation and swipe-to-delete in this phase (`(tabs)/index/index.tsx`, `CheckinListRow.tsx`, `TodayBottomSheet.tsx`, `UndoSnackbar.tsx`, `pendingDelete.ts`), and the supporting repo/config/test files. Most of the diff is careful, well-commented, and backed by thorough regression-guard tests (the `*-wiring.test.ts` suite tracks the actual source closely and was verified consistent with the reviewed code). SQL access is fully parameterized (no injection risk), no secrets/eval/dangerous APIs were found, and the delayed-delete/undo controller (`pendingDelete.ts`) is correctly designed and tested.

The main defect found is a genuine correctness gap: nothing in the today screen invalidates/reloads `todayCheckins` when the user returns from editing a check-in in the detail screen, which produces both a visibly stale list (note preview) and — more seriously — can cause the swipe-delete flow to target a stale/already-deleted photo path, leaking an orphaned photo file. Three further warnings cover missing error handling and dirty/save-state desync in `CheckinDetailScreen.tsx`'s photo edit handlers.

## Critical Issues

### CR-01: Today list is never refreshed after editing a check-in in the detail screen, causing stale previews and orphaned photo files on later delete

**File:** `src/app/(tabs)/index/index.tsx:411-421` (`reloadTodayCheckins`), `:537-539` (`handleRowPress`), `:452-483` (`commitPendingDelete`)
**File:** `src/checkin/CheckinDetailScreen.tsx:124-139` (`flushNoteAndPhoto`), `:157-219` (`handlePickPhoto`), `:227-248` (`handleDeletePhoto`)

**Issue:** `handleRowPress` pushes `/[id]` via `router.push`, and `CheckinDetailScreen` writes note/photo edits directly to SQLite (`updateCheckinNoteAndPhoto`) with no way to notify the parent Today screen. `reloadTodayCheckins()` is only called from 5 fixed sites (mount, `commitCheckin` success, `AppState` → `'active'`, `handleFinishCheckin`, `commitPendingDelete` success — this exact count is even pinned by `today-wiring.test.ts`'s "reloadTodayCheckins() 호출이 정확히 5회" assertion). None of these fire when the user simply navigates back from the detail screen (in-app back navigation does not trigger `AppState` change). There is also no `navigation.addListener('focus', ...)` / `useFocusEffect` anywhere in the codebase (verified via grep across `src/`).

Consequences:
1. **Stale note preview:** if the user edits the memo in the detail screen and taps back, the Today list row still shows the old note text (D-02 preview contract) until some unrelated trigger (app backgrounded/foregrounded, a new check-in saved, or a swipe-delete committed) happens to call `reloadTodayCheckins()`.
2. **Orphaned photo file / wrong delete target:** `handleDeleteRequest(checkin)` (in `CheckinListRow`/`TodayBottomSheet`) is called with the `CheckinRow` object taken from the stale `todayCheckins` state, so `checkin.photo_path` can be the *old* photo path. If the user replaces a photo in the detail screen (`handlePickPhoto` deletes the old file and points the DB row at the new one) and then, without any intervening reload, swipes that row to delete it, `commitPendingDelete` will call `defaultPhotoStorageDeps.deleteFile(item.photoPath)` with the **already-deleted old path** (harmless no-op/caught error) while the **new** photo file that the DB row actually referenced is now orphaned on disk forever (the DB row itself is gone via `deleteCheckin`, so nothing will ever clean that file up).

**Fix:** Add a focus-based reload so the today screen re-syncs after any detail-screen edit, e.g.:
```tsx
import { useFocusEffect } from 'expo-router'; // or '@react-navigation/native'

useFocusEffect(
  useCallback(() => {
    reloadTodayCheckins();
  }, [reloadTodayCheckins])
);
```
This also incidentally fixes the photo-path staleness for swipe-delete, since `todayCheckins` (and therefore `checkin.photo_path` passed to `handleDeleteRequest`) will be current by the time the user can swipe a row after returning from the detail screen.

## Warnings

### WR-01: `CheckinDetailScreen`'s initial data load has no error handling — a rejected fetch leaves the screen permanently blank with no signal

**File:** `src/checkin/CheckinDetailScreen.tsx:101-110`
**Issue:**
```tsx
useEffect(() => {
  getCheckinById(db, checkinId).then((row) => {
    if (!isMountedRef.current) return;
    setCheckin(row);
    ...
  });
}, [db, checkinId]);
```
There is no `.catch()`. Every other async call site in this codebase (including the rest of this same file — `flushNoteAndPhoto`, `handlePickPhoto`, `handleDeletePhoto`) follows the project's own "프로미스 미삼킴 규약" (never let a promise go unhandled), logging at minimum via `console.error`. If `getCheckinById` rejects (e.g. a transient SQLite error), this becomes an unhandled promise rejection and the screen renders `null` forever (`if (!checkin) return null;`) with zero diagnostic trail and no way for the user to retry — indistinguishable from a broken screen.

**Fix:**
```tsx
useEffect(() => {
  getCheckinById(db, checkinId)
    .then((row) => {
      if (!isMountedRef.current) return;
      setCheckin(row);
      ...
    })
    .catch((error) => {
      console.error('Failed to load checkin for detail screen', error);
    });
}, [db, checkinId]);
```

### WR-02: Photo replace/delete handlers persist the current note as a side effect but never clear `isDirtyRef`/`saveFailed`, causing false "unsaved changes" warnings and stale failure UI

**File:** `src/checkin/CheckinDetailScreen.tsx:184-191` (`handlePickPhoto`), `:230-234` (`handleDeletePhoto`)
**Issue:** Both handlers call `updateCheckinNoteAndPhoto(db, checkinId, { note: noteRef.current || null, photoPath: ..., now })` — which persists whatever the user has currently typed into the note field, not just the photo change (necessary because the update function takes both fields together). However, neither handler resets `isDirtyRef.current` or `saveFailed` on success:
- If the user had just typed a note edit (`isDirtyRef.current = true` from `handleChangeNote`) and then replaces/removes the photo, the note is in fact saved to SQLite as part of that write, but `isDirtyRef.current` stays `true`. If the user then backs out without further edits, `beforeRemove` still fires the "저장하지 않은 변경사항이 있어요" dialog even though there is nothing left unsaved.
- If a prior `flushNoteAndPhoto()` had failed (`saveFailed === true`, showing the "저장하지 못했어요" retry card) and the user then successfully edits a photo, the note text gets persisted as a side effect of that photo write, but `saveFailed` is never cleared — the stale failure card keeps showing until the user taps "다시 시도" again (which will trivially succeed since nothing changed), an unnecessary and confusing extra step.

**Fix:** After a successful photo write in both handlers, mirror the reset that `flushNoteAndPhoto` performs on success:
```tsx
.then(() => {
  if (!isMountedRef.current) return;
  photoPathRef.current = result.uri; // or null for delete
  isDirtyRef.current = false;
  setSaveFailed(false);
  setCheckin((prev) => (prev ? { ...prev, photo_path: result.uri } : prev));
  ...
})
```

### WR-03: Photo persist failures in `handlePickPhoto`/`handleDeletePhoto` are silently swallowed with no retry and no user-facing error state

**File:** `src/checkin/CheckinDetailScreen.tsx:207-209`, `:245-247`
**Issue:** Unlike `flushNoteAndPhoto` (wrapped in `runWithSingleRetry` and surfaced via the `saveFailed` UI) or the photo *pick/copy* failure path (surfaced via `photoError`), a failure of the `updateCheckinNoteAndPhoto(...)` write inside `handlePickPhoto`/`handleDeletePhoto` is caught only with `console.error(...)` — no retry, no UI feedback. From the user's perspective, tapping to change/remove a photo simply does nothing if the DB write fails, with no indication of why or how to retry.

**Fix:** Route these writes through the same `runWithSingleRetry` + user-visible failure state already established for notes (`saveFailed`/`photoError` can be reused, or a new `photoSaveFailed` state added), so photo edits get the same reliability guarantee as note edits.

## Info

### IN-01: `commitPendingDelete`'s `unhide()` has no `isMountedRef` guard

**File:** `src/app/(tabs)/index/index.tsx:452-483`
**Issue:** `commitPendingDelete` calls `setHiddenIds(...)` (via `unhide()`) in both the failure and success branches without checking `isMountedRef.current`, unlike most other async completions in this file (`reloadTodayCheckins`, `handleSaveCheckin`, etc.). In practice this screen is a persistent tab root that rarely unmounts mid-flight, so the risk is low, but it's an inconsistency with the rest of the file's guarding convention and would log a React dev warning if it ever did fire post-unmount.
**Fix:** Guard with `if (!isMountedRef.current) return;` before calling `unhide()` in both branches, matching the pattern used elsewhere in this file.

---

_Reviewed: 2026-09-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
