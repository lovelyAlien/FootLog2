---
phase: 06-calendar-tab
reviewed: 2026-09-02T06:16:17Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - src/app/(tabs)/calendar/[date]/[id].tsx
  - src/app/(tabs)/calendar/[date]/index.tsx
  - src/app/(tabs)/calendar/_layout.tsx
  - src/app/(tabs)/calendar/index.tsx
  - src/app/(tabs)/index/_layout.tsx
  - src/app/(tabs)/index/index.tsx
  - src/app/(tabs)/index/settings.tsx
  - src/app/+not-found.tsx
  - src/app/__tests__/calendar-wiring.test.ts
  - src/app/__tests__/checkin-wiring.test.ts
  - src/app/__tests__/foundation-wiring.test.ts
  - src/app/__tests__/settings-wiring.test.ts
  - src/app/__tests__/tabs-wiring.test.ts
  - src/app/__tests__/today-wiring.test.ts
  - src/app/_layout.tsx
  - src/app/priming.tsx
  - src/calendar/CalendarGridScreen.tsx
  - src/calendar/DateScrubber.tsx
  - src/calendar/PastDateScreen.tsx
  - src/calendar/content.ts
  - src/calendar/monthGrid.test.ts
  - src/calendar/monthGrid.ts
  - src/calendar/scrubberRange.test.ts
  - src/calendar/scrubberRange.ts
  - src/checkin/checkinRepo.test.ts
  - src/checkin/checkinRepo.ts
  - src/db/migrations.test.ts
  - src/db/migrations.ts
  - src/db/schema.ts
  - src/settings/SettingsScreen.tsx
  - src/settings/config.ts
  - src/settings/content.ts
  - src/settings/settingsRepo.test.ts
  - src/settings/settingsRepo.ts
  - src/today/TodayBottomSheet.tsx
  - src/today/content.ts
findings:
  critical: 0
  warning: 6
  info: 2
  total: 8
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-09-02T06:16:17Z
**Depth:** standard
**Files Reviewed:** 36 (`src/app/(tabs)/calendar.tsx` confirmed deleted per phase scope — Phase 4 placeholder replaced by the `calendar/` nested route group, correctly excluded from this review)
**Status:** issues_found

## Summary

Reviewed all Phase 6 (Calendar Tab) source, route, and test files: the month grid, past-date read-only screen, date scrubber, settings screen + repo, the `app_settings` migration, and the associated wiring tests. SQL construction is clean throughout — every new query (`getCheckinDateKeysInRange`, `getCheckinHistorySummary`, `settingsRepo`) uses parameter binding exclusively, and `isValidLocalDateKey` correctly fail-closes malformed/injected `[date]` route params (verified against the repo's own SQL-injection-payload test case). The three bugs already found and fixed during this phase's own simulator pass (safe-area header offset, scrubber worklet crash, absolute-path 404s) are confirmed fixed and are not re-flagged here.

Fresh review turned up six real issues, none of them crash/security/data-loss grade, but several are genuine state-management correctness gaps that the existing test suite (all static-source-analysis or pure-function unit tests) structurally cannot catch because they only manifest through actual render/interaction sequences: a request-race in the month grid's presence query, stale scrubber data after in-screen mutations, a settings-persistence step ordering issue that can silently desynchronize DB/UI/native-notification state, a visual "today" indicator bug on month-boundary padding cells, an accessibility gap on calendar day cells, and an unverified absolute route path repeating a pattern that has already caused three separate runtime failures elsewhere in this exact phase. One hypothesis raised during review (that `DateScrubber`'s non-memoized `Gesture.Pan()` could interrupt an in-progress drag) was investigated against the installed `react-native-gesture-handler` source and found to be a non-issue in practice (`needsToReattach`/`updateHandlers` preserve the native handler tag across non-memoized re-renders) — recorded below only as a minor INFO-level convention-consistency note, not a functional bug.

## Warnings

### WR-01: "오늘" accent 밑줄이 인접 달의 패딩 셀에도 노출될 수 있음

**File:** `src/calendar/CalendarGridScreen.tsx:166-199`
**Issue:** `numberColor` explicitly special-cases `!cell.inCurrentMonth` to always render `colors.textFaint`, but the `isToday` check that renders `styles.todayUnderline` is computed independently and is **not** gated by `cell.inCurrentMonth`:
```tsx
const numberColor = !cell.inCurrentMonth
  ? colors.textFaint
  : isToday
    ? colors.textPrimary
    : hasRecord ? colors.textMuted : colors.textFaint;

const cellContent = (
  <View style={styles.cellContent}>
    <Text style={[styles.dayNumber, { color: numberColor }]}>{cell.dayOfMonth}</Text>
    {isToday ? <View style={styles.todayUnderline} /> : null}
  </View>
);
```
`todayKey` is computed once at mount (`useMemo(() => resolveLocalDateKey(new Date()), [])`) and stays constant regardless of which month is currently visible. If "today" falls within the last `leadingPadding` days of a month (up to 6 days, per `buildMonthGrid`), navigating to the **next** month renders that date as a leading padding cell (`inCurrentMonth: false`) that still matches `todayKey`. This is not a hypothetical: `monthGrid.test.ts` itself uses the exact fixture (`2026-09`, whose first two grid cells are `2026-08-30`/`2026-08-31` with `inCurrentMonth: false`) that reproduces this — if "today" were Aug 30 and the user swipes forward to September, that padding cell gets a faint/grey number **and** the accent today-underline simultaneously, an inconsistent half-highlighted state nowhere specified by D-04.
**Fix:** Gate the underline the same way the color is gated:
```tsx
{cell.inCurrentMonth && isToday ? <View style={styles.todayUnderline} /> : null}
```

### WR-02: 월 이동 시 오래된 프레즌스 조회 응답이 최신 화면 상태를 덮어쓸 수 있음(요청 레이스)

**File:** `src/calendar/CalendarGridScreen.tsx:74-89`
**Issue:** `reloadMonthPresence` fires `getCheckinDateKeysInRange(db, ...)` keyed off `visibleMonth` and unconditionally calls `setRecordedDateKeys` when the promise resolves, guarded only by `isMountedRef` — there is no guard against **out-of-order resolution** between two different months' queries:
```tsx
const reloadMonthPresence = useCallback(() => {
  const { startDateKey, endDateKey } = monthRangeBounds(visibleMonth);
  getCheckinDateKeysInRange(db, startDateKey, endDateKey)
    .then((dateKeys) => {
      if (isMountedRef.current) {
        setRecordedDateKeys(new Set(dateKeys));
      }
    })
    .catch(...);
}, [db, visibleMonth]);
```
If a user taps the header arrow rapidly (or swipes twice before the first query resolves), the query for the previously-visible month can resolve **after** the query for the currently-visible month (no ordering guarantee on SQLite async round-trips), silently overwriting the correct grid's presence data with a stale/wrong month's data. This is exactly the class of bug `PastDateScreen.tsx` explicitly guards against for its own reload (`activeDateKeyRef` comparison, see its inline comment referencing "T-06-14 완화") — the same guard was not applied here, an inconsistent application of an already-established pattern within this same phase.
**Fix:** Mirror the `activeDateKeyRef` pattern used in `PastDateScreen.tsx`:
```tsx
const visibleMonthRef = useRef(visibleMonth);
useEffect(() => { visibleMonthRef.current = visibleMonth; }, [visibleMonth]);

const reloadMonthPresence = useCallback(() => {
  const requestedMonth = visibleMonth;
  const { startDateKey, endDateKey } = monthRangeBounds(requestedMonth);
  getCheckinDateKeysInRange(db, startDateKey, endDateKey)
    .then((dateKeys) => {
      if (isMountedRef.current && requestedMonth === visibleMonthRef.current) {
        setRecordedDateKeys(new Set(dateKeys));
      }
    })
    .catch(...);
}, [db, visibleMonth]);
```

### WR-03: PastDateScreen의 스크러버 데이터(historySummary/recordedDateKeys)가 화면 내 변경 후 갱신되지 않음

**File:** `src/calendar/PastDateScreen.tsx:131-162, 247-264`
**Issue:** `historySummary`/`recordedDateKeys` (which drive the scrubber's visible tick marks and its show/hide gate, `shouldShowScrubber(historySummary.distinctDateCount)`) are fetched exactly once, in an effect with deps `[db, todayKey]` — `todayKey` is a `useMemo(..., [])` value that never changes for the lifetime of the screen, so this effect runs only on mount. Neither the screen's own swipe-delete commit path (`commitPendingDelete`, which does call `reloadCheckins()` but nothing else) nor returning to this screen via `useFocusEffect` after editing/deleting a checkin in the pushed detail screen (`[date]/[id].tsx`) re-fetches this data. Concretely: if a user swipe-deletes the **only** checkin on the day that made `distinctDateCount` exactly `SCRUBBER_MIN_DISTINCT_DATES` (2), the scrubber should disappear per Premise 11 (`shouldShowScrubber`) but remains visible and interactive with a now-inaccurate tick (`recordedDateKeys` still marks that date as recorded) until the screen is torn down and remounted.
**Fix:** Re-run the `getCheckinHistorySummary`/`getCheckinDateKeysInRange` effect from the same places `reloadCheckins` is re-run (the `useFocusEffect` block, and after a successful `commitPendingDelete`), or factor it into a single `reloadAll()` callback shared by both call sites.

### WR-04: SettingsScreen.persist()의 쓰기 순서 — SQLite 커밋이 알림 재구성 성공보다 먼저 일어나 3자 상태(DB/UI/네이티브 스케줄)가 갈라질 수 있음

**File:** `src/settings/SettingsScreen.tsx:78-94`
**Issue:**
```tsx
const persist = useCallback(async (next) => {
  lastAttemptRef.current = next;
  try {
    await settingsRepo.upsertSettings(db, next, new Date().toISOString());
    await applyNotificationSettings(next, defaultNotificationDeps);
    if (!isMountedRef.current) return;
    setSettings(next);
    setSaveFailed(false);
  } catch (error) {
    console.error('Failed to persist settings', error);
    if (!isMountedRef.current) return;
    setSaveFailed(true);
  }
}, [db]);
```
`upsertSettings` (the SQLite write) is awaited and can succeed **before** `applyNotificationSettings` (the native trigger cancel/reschedule call) is attempted. If the second call throws (e.g. a transient native/permissions error), the `catch` sets `saveFailed = true` and correctly leaves the in-memory `settings` state (and thus the UI) on the old value — but the SQLite row has already been permanently updated to the new value. This produces a real 3-way divergence:
- SQLite `app_settings`: new value (committed)
- SettingsScreen UI: old value + "저장하지 못했어요" banner
- Actual scheduled native notifications: still on the old value (since `applyNotificationSettings` never completed)

The next time the app foregrounds or cold-starts, `NotificationSelfHealGate` (`src/app/_layout.tsx`) reads the already-persisted **new** row via `getSettingsRow`/`resolveNotificationSettings` and calls `runForegroundNotificationCheck` with it — silently reconciling native triggers to the new value with no user-visible confirmation, while the still-open Settings screen (if any) continues showing the stale error banner and old displayed value. The user never receives correct feedback about what state their notifications actually ended up in.
**Fix:** Reorder so the durable write only commits after the side effect that must stay in lock-step with it succeeds (apply native settings first, persist second), or wrap both in a single "all-or-nothing" outcome that only updates `lastAttemptRef`/DB after `applyNotificationSettings` succeeds — mirroring the "verify before commit" discipline already used elsewhere in this codebase (e.g. `commitCheckin`'s BEGIN/COMMIT-after-insert-succeeds pattern).

### WR-05: 캘린더 날짜 셀 접근성 — 개별 셀에 accessibilityRole/Label이 없고, 기록 유무를 색상 톤 차이만으로 전달함

**File:** `src/calendar/CalendarGridScreen.tsx:163-172, 191-199`
**Issue:** The header's prev/next month arrow buttons in this same file correctly set `accessibilityRole="button"` and `accessibilityLabel={CALENDAR_COPY.prevMonthLabel/nextMonthLabel}`, but the day-cell `Pressable`s (the primary interactive surface of this screen) set neither:
```tsx
return (
  <Pressable key={cell.dateKey} style={styles.cell} onPress={() => handleCellPress(cell.dateKey)}>
    {cellContent}
  </Pressable>
);
```
A screen-reader user gets only a bare day-of-month number read out, with no indication of which month it belongs to, whether it's today, or whether it has a record — worse than the discoverability the header buttons already provide in the same screen. Separately, "has a checkin" vs "no checkin" is conveyed *exclusively* via a two-shade gray text distinction (`colors.textMuted #79786F` vs `colors.textFaint #A7A49A`) with no secondary (non-color) cue — a fairly subtle luminance difference to rely on as the sole signal for a stateful distinction, especially for low-vision users who are not full screen-reader users and so get no benefit from an accessibilityLabel fix alone.
**Fix:** Add `accessibilityRole="button"` and a computed `accessibilityLabel` (date + record status, reusing `formatDateKeyTitle`) to each in-month cell's `Pressable`; consider a secondary non-color affordance (e.g. a small dot) for "has record" so the distinction survives for both screen-reader and low-vision users.

### WR-06: PastDateScreen의 절대경로 라우트(`/calendar/[date]/[id]`)가 이 phase에서 이미 3회 발생한 버그 패턴과 동일하며 탭으로 검증되지 않음

**File:** `src/calendar/PastDateScreen.tsx:211`, `src/calendar/CalendarGridScreen.tsx:102`
**Issue:** Both call sites use absolute leading-slash `pathname` strings:
```tsx
router.push({ pathname: '/calendar/[date]/[id]', params: { date: activeDateKey, id } });
// and
router.push({ pathname: '/calendar/[date]', params: { date: dateKey } });
```
This exact phase's own `06-VALIDATION.md` documents **three separate** runtime-only failures this session caused by absolute expo-router paths colliding with folder/segment naming (`/index/settings`, `/index/[id]`, `/[id]`, `/`), all fixed by switching to relative paths (`./settings`, `./[id]`). The `calendar/[date]` segment doesn't share the exact "folder and file both literally named `index`" collision mechanism documented for those fixes, and `06-VALIDATION.md` item 3 confirms the grid-cell tap into `/calendar/[date]` was tapped and confirmed working in-simulator. However, the row-tap from `PastDateScreen` into `/calendar/[date]/[id]` was **not** verified by an actual tap — `06-VALIDATION.md`'s Bug 3 note explicitly says the analogous Today-tab case (`/index/[id]`) "타입 체크·정적 테스트 통과로만 확인했고 실기기/시뮬레이터 탭으로 직접 재현 확인하지 못했다," and the calendar-stack equivalent is not mentioned as tapped at all in the verification table.
**Fix:** Either explicitly tap-verify `/calendar/[date]/[id]` navigation in the simulator (list row → detail screen) before treating this phase as fully verified, or defensively convert to a relative path given this phase's demonstrated track record with absolute-path failures in this exact router version.

## Info

### IN-01: DateScrubber의 panGesture가 메모이즈되지 않음(CalendarGridScreen의 monthSwipeGesture와 다른 컨벤션)

**File:** `src/calendar/DateScrubber.tsx:67-87`
**Issue:** `CalendarGridScreen.tsx`'s `monthSwipeGesture` is wrapped in `useMemo`, but `DateScrubber.tsx`'s `panGesture` is a plain `const` recreated every render — and because `.onUpdate` calls `runOnJS(onIndexChange)`, which triggers a parent re-render via `setActiveDateKey`, this gesture object is recreated mid-drag on every index change. Investigated against the installed `react-native-gesture-handler` source (`GestureDetector/needsToReattach.ts`, `updateHandlers.ts`): a full detach/reattach only happens if handler count/name/thread changes, none of which occur here, so RNGH takes the `updateHandlers` path, which reuses the existing native `handlerTag` and refreshes only the UI-thread callback set via a shared value — the in-progress native gesture recognizer is **not** interrupted. This is not a functional bug, just a style/consistency deviation from the correctly-memoized sibling pattern in the same phase.
**Fix:** Optional — wrap in `useMemo` with stable deps (reading `selectedIndex` via a ref at `.onBegin()` time instead of prop closure) purely for consistency with `CalendarGridScreen.tsx` and to avoid unnecessary per-render gesture-config object churn.

### IN-02: SettingsScreen의 하루 마무리 알림 Switch에 accessibilityLabel이 없음

**File:** `src/settings/SettingsScreen.tsx:171-174`
**Issue:** The frequency row's `Pressable` has an explicit `accessibilityLabel`, but the `Switch` for `SETTINGS_COPY.rowDailyReflection` does not:
```tsx
<Switch value={settings.dailyReflectionEnabled} onValueChange={handleToggleDailyReflection} />
```
VoiceOver traversal typically picks up the adjacent row label, but relying on traversal order rather than an explicit label is a minor inconsistency with the labeling discipline applied elsewhere on this same screen.
**Fix:** Add `accessibilityLabel={SETTINGS_COPY.rowDailyReflection}` to the `Switch`.

---

_Reviewed: 2026-09-02T06:16:17Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
