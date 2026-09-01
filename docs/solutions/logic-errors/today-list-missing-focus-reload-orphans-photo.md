---
title: 상세화면 편집 후 오늘 목록이 갱신되지 않아 사진 orphan을 유발하던 버그
date: 2026-09-01
category: logic-errors
module: today-checkin-list-sync
problem_type: logic_error
component: frontend_stimulus
symptoms:
  - "CheckinDetailScreen에서 노트나 사진을 수정하고 뒤로 나가도 Today 화면의 체크인 목록(todayCheckins)이 갱신되지 않아 노트 미리보기가 예전 값 그대로 남음"
  - "reloadTodayCheckins()가 mount/저장 성공/AppState active 복귀/체크인 종료/지연삭제 커밋 성공 등 5개 고정 지점에서만 호출되고 화면 focus 복귀(뒤로가기) 시점에는 호출되지 않음"
  - "사진을 교체한 직후 같은 행을 다시 로드하지 않은 상태로 스와이프 삭제하면 deleteFile()이 이미 교체되어 더 이상 참조되지 않는 옛 사진 경로를 대상으로 호출되어 사실상 no-op으로 끝남"
  - "DB 행은 deleteCheckin으로 정상 삭제되지만 실제로 참조되던 새 사진 파일은 정리 경로가 없어 디스크에 영구적으로 orphan으로 남음"
root_cause: logic_error
resolution_type: code_fix
severity: high
related_components: [expo-router, react-navigation, CheckinDetailScreen]
tags: [usefocuseffect, cache-invalidation, stale-list, orphaned-file, photo-cleanup, navigation-focus, today-screen, checkin-detail]
---

# 상세화면 편집 후 오늘 목록이 갱신되지 않아 사진 orphan을 유발하던 버그

## Problem

The Today screen (`src/app/(tabs)/index/index.tsx`) never reloaded `todayCheckins` when the user navigated back from the check-in detail/edit screen (`src/checkin/CheckinDetailScreen.tsx`, routed at `src/app/(tabs)/index/[id].tsx`) after editing a note or replacing/removing a photo. Beyond a stale note preview in the list, this was a data-integrity bug: if a photo was replaced in the detail screen and the user then swiped that same row to delete the check-in before any unrelated reload happened to fire, the delete path read `photo_path` off the stale cached row and deleted the *old* (already-gone) file while the *new* file the DB row actually pointed to — now that the row itself was deleted — became permanently orphaned on disk.

## Symptoms

- After editing a memo in the detail screen and tapping back, the Today list row kept showing the old note text until some unrelated trigger (app backgrounded/foregrounded, a new check-in saved, a swipe-delete committed) happened to call `reloadTodayCheckins()`.
- Replacing a photo in the detail screen, then swiping the same check-in row to delete it (without any intervening reload), left the newly-saved photo file on disk with no DB row left to reference it — a silent, unrecoverable storage leak (the old, already-deleted path was the one actually passed to `deleteFile()`, so that call was a harmless no-op).
- No crash, no console error, and no test failure prior to the fix — the bug was invisible to automated tests until reviewer-authored regression coverage was added, and was only caught by a code-review pass (`gsd-code-reviewer`, finding CR-01, severity Blocker/Critical, in `.planning/phases/05-check-in-detail-edit/05-REVIEW.md`), not by a user report.

## What Didn't Work

- **Replacing the existing mount-only `useEffect`** (`src/app/(tabs)/index/index.tsx:425-427`, `useEffect(() => { reloadTodayCheckins(); }, [reloadTodayCheckins]);`) **with a `useFocusEffect`, instead of adding a second effect**: rejected. That mount effect already exists as its own deliberately tiny, separate block for an unrelated reason predating this fix — it sits right after a much larger draft-recovery effect (`:335-403`) whose body is anchored by `checkin-wiring.test.ts`'s regex-based assertions, so the mount effect was kept minimal specifically to avoid ever needing to touch that neighbor. Swapping it for a `useFocusEffect` (which also fires on initial mount, but on a different scheduling path than plain `useEffect`) risked disturbing the assumed ordering between draft recovery and the first today-list load — a risk the source code's own comment flags explicitly, not one that was proven to break in testing. Adding a second, fully separate effect avoided both the pre-existing test-anchor constraint on its neighbor and this ordering risk.
- **Relying on the existing `AppState` `'active'` listener** (`src/app/(tabs)/index/index.tsx:1053-1054`, `AppState.addEventListener('change', (nextAppState) => { if (nextAppState === 'active') { ... } })`): considered and rejected as a fix vector because it doesn't fire for in-app navigation at all — it only reacts to the OS backgrounding/foregrounding the whole app. Going from the Today screen to the pushed detail screen and back is a React Navigation stack transition, not an `AppState` transition, so this is a genuinely different lifecycle event, not a latent bug in the listener itself.

## Solution

Import `useFocusEffect` from `expo-router` (it re-exports React Navigation's hook) and add a new, separate effect that calls `reloadTodayCheckins()` on every focus:

Before (`src/app/(tabs)/index/index.tsx`, mount-only reload — unchanged, still present):

```tsx
// 마운트 시 1회 로드 — 드래프트 복구 effect(위)와 별도로 둔다. 그 effect의 본문을
// 건드리면 checkin-wiring 테스트(드래프트 복구 정규식 앵커 의존 케이스들)가 깨진다.
useEffect(() => {
  reloadTodayCheckins();
}, [reloadTodayCheckins]);
```

After — a new block added directly below it (`src/app/(tabs)/index/index.tsx:429-442`):

```tsx
// 05-REVIEW.md CR-01 — 상세화면([id].tsx)에서 메모/사진을 편집하고 뒤로가기로
// 돌아왔을 때 이 화면을 갱신하는 유일한 경로. AppState 리스너는 앱이 백그라운드로
// 나갔다 돌아올 때만 반응하고 인앱 네비게이션(뒤로가기)에는 반응하지 않는다 — 이
// 경로가 없으면 목록의 메모 미리보기가 오래된 채로 남을 뿐 아니라, 상세화면에서
// 사진을 교체한 직후 같은 행을 스와이프 삭제하면 캐시된 옛 photo_path로 삭제
// 대상을 잘못 잡아 실제 새 사진 파일이 디스크에 orphan으로 남는다(DB row는 이미
// 삭제됐으니 아무도 그 파일을 정리하지 않는다). 마운트 시 1회 로드와 별개로 둔다 —
// 위 useEffect를 지우면 마운트 최초 포커스 타이밍에 대한 드래프트 복구 순서 가정이
// 깨질 수 있다.
useFocusEffect(
  useCallback(() => {
    reloadTodayCheckins();
  }, [reloadTodayCheckins])
);
```

`useFocusEffect` is imported alongside the other `expo-router` imports at the top of the file: `import { Redirect, router, useFocusEffect } from 'expo-router';` (`src/app/(tabs)/index/index.tsx:36`).

The fix commits (found via `git log --oneline --all --grep="CR-01"`, following the repo's RED-then-GREEN TDD convention; both are on the local `gsd/phase-04-today-view` branch, not yet merged/pushed to `origin/main` as of this writing — SHAs may be rewritten on merge):
- `88cdef5` — `test(05-review): CR-01 실패 테스트 추가 — 상세화면 편집 후 오늘 목록 미갱신` (RED)
- `40330d1` — `fix(05-review): CR-01 — 상세화면 편집 후 인앱 복귀 시 오늘 목록 재조회` (GREEN)

The regression guard `src/app/__tests__/today-wiring.test.ts` (static-source-analysis tests, no RN render environment needed) was updated with:
- The total literal `reloadTodayCheckins()` occurrence count assertion bumped from 5 to 6 (`today-wiring.test.ts:42-45`).
- A new structural assertion that one of those occurrences sits inside a `useFocusEffect(useCallback(() => {...}, [reloadTodayCheckins]))` block (`today-wiring.test.ts:63-70`).
- A new assertion that `useFocusEffect` is imported from `'expo-router'` (`today-wiring.test.ts:72-74`).

## Why This Works

`useFocusEffect` (React Navigation's hook, re-exported by `expo-router`) runs its callback every time the screen regains focus — including a plain back-navigation from a pushed screen — and can register a cleanup that runs on blur. This is a fundamentally different lifecycle signal from plain `useEffect`, which by default runs once on mount and then again only when its dependency array's values change; a component that stays mounted throughout a stack push (as the Today tab does while `[id].tsx` is pushed on top of it) never has its mount-effect deps change on return, so a plain `useEffect` cannot express "re-run when this screen becomes visible again." `AppState`'s `'active'` event covers a related but distinct case — the OS bringing the whole app back to the foreground — and simply has no signal for in-app stack navigation, so it structurally cannot substitute for a focus event.

Keeping the new `useFocusEffect` as its own block, rather than replacing the pre-existing mount `useEffect` with it, matters for two reasons. First, `useFocusEffect` and `useEffect` have different scheduling semantics (focus-driven vs. mount/dep-driven) — swapping one for the other changes when the initial load happens relative to other mount-time effects, including the draft-recovery effect above it, and the source comment flags that reordering as a real risk rather than a settled fact. Second, and concretely for this codebase, that mount effect already exists as its own tiny, separate block for an unrelated reason: its neighbor (the larger draft-recovery effect just above it) is what `checkin-wiring.test.ts` regex-anchors on, so the mount effect was kept minimal to avoid ever touching that neighbor. Adding a second effect, rather than restructuring the existing one, keeps that pre-existing, unrelated constraint entirely out of scope — `reloadTodayCheckins` (already a stable `useCallback`, `src/app/(tabs)/index/index.tsx:411-421`) is simply subscribed from a second lifecycle hook.

## Prevention

The general guardrail: any screen that (a) reads cached list state that it hands down to child rows, and (b) has a sibling detail/edit route that mutates the same underlying rows out from under that cache, must re-sync on focus — not only on mount or OS foreground. Mount-only and `AppState`-only reload strategies are both blind to plain in-app stack navigation between sibling screens, and when the mutated field (like `photo_path`) is also used to decide what to delete from disk, staleness isn't just a UI nit — it can silently leak files with no future cleanup path (the DB row's own deletion is what would normally trigger cleanup, and it removes the only owner of the correct path). Any list screen that hands a cached row's file-reference field to a delete/cleanup routine should be treated as a data-integrity path, not just a display path.

Concretely, this repo already has a reusable technique for catching a future *removal* of this focus-effect: the `*-wiring.test.ts` family of tests (here `src/app/__tests__/today-wiring.test.ts`) does static source analysis via `fs.readFileSync` + `stripComments`, then asserts both a literal call-count for the reload function (5 → 6 here) and a structural regex match for the specific `useFocusEffect(useCallback(...), [reloadTodayCheckins])` block shape. If someone later deletes or refactors away the focus-effect, both the count assertion and the structural assertion fail immediately, without needing an RN render environment. This pattern generalizes well to any other "N call sites must call this reload function, and one of them must be inside lifecycle-hook X" contract in the codebase.

## Related Issues

No related entries in `docs/solutions/` — searched (keywords: `reloadTodayCheckins`, `useFocusEffect`, `today`, `focus`, `stale`, `cache invalidat`, `orphan`, `photo_path`, `navigation`, `checkin-detail`, `sync`) across all 3 existing docs (`location-cache-accuracy-vs-freshness.md`, `map-imperative-calls-before-ready.md`, `map-camera-animation-race.md`); all three belong to the unrelated `check-in-map-view` module (native MapView/expo-location timing, caching, and camera-animation races) and score `low`/no overlap on every dimension. `gh issue list` search against this repo returned no matching issues. This is a new problem category for this repo: missing cache invalidation on React Navigation focus events.
