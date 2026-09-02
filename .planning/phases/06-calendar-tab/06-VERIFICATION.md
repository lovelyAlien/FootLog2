---
phase: 06-calendar-tab
verified: 2026-09-02T16:20:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
human_verification: []
---

# Phase 6: Calendar Tab Verification Report

**Phase Goal:** 사용자가 월 그리드와 빠른 날짜별 스크러버로 과거 날짜를 훑어볼 수 있다.
**Verified:** 2026-09-02T16:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 캘린더 탭을 열면 오늘 날짜가 밑줄 표시된 월 그리드가 보이고, 과거 날짜 탭 시 체크인 버튼 없는 읽기전용 지도+시트가 열린다 | ✓ VERIFIED | `src/calendar/CalendarGridScreen.tsx:172-227` builds grid via `buildMonthGrid`, computes `isToday`, renders `todayUnderline` gated by `cell.inCurrentMonth && isToday` (post-WR-01 fix, line 189). `handleCellPress` → `router.push('/calendar/[date]', {date})` (line 112-115). `PastDateScreen.tsx` has zero imports of any checkin-capture component/state machine (grep confirms no `CheckinActionCard`/`checkinFlow` references) — read-only by construction. Route `[date]/index.tsx` fail-closes malformed dates via `isValidLocalDateKey` → `Redirect href="/calendar"`. |
| 2 | 과거 날짜 뷰에서 플로팅 가로 스크러버를 드래그해 실시간 이동, 경계에서 하드 클램프(러버밴딩 없음), 44×44pt 터치 타겟 | ✓ VERIFIED | `scrubberRange.ts`: `clampIndex`/`indexForTranslation` both carry `'worklet'` directive (fixed post 06-08 Bug 2, tick spacing now passed explicitly as a param rather than closure-captured constant — `DateScrubber.tsx:77-82`). Clamp is `Math.min(Math.max(index,0), length-1)` — hard clamp, no spring/rubber-band math. No `.onEnd()` handler in `DateScrubber.tsx`'s `panGesture` (explicit comment: "관성/스프링/모멘텀 없음"). `SCRUBBER_TOUCH_SURFACE_HEIGHT_PT = 44` applied to `touchSurface` style (`minHeight: SCRUBBER_TOUCH_SURFACE_HEIGHT_PT`). |
| 3 | 스크러버 터치 시 바텀시트가 강제로 접혀 지도가 계속 보인다 | ✓ VERIFIED | `DateScrubber.tsx` `.onBegin()` calls `runOnJS(onScrubStart)()` before any translation is processed. `PastDateScreen.tsx` `handleScrubStart` → `sheetRef.current?.snapToIndex(0)` (CLOSED index). `sheetRef` passed into `TodayBottomSheet` as `sheetRef` prop. |
| 4 | 햄버거 아이콘 탭 시 설정 화면이 열리고 알림 빈도/하루 마무리 토글(기본 켜짐)/버전 3항목을 보여준다 | ✓ VERIFIED | `(tabs)/index/index.tsx:1199-1208` renders `SymbolView name="line.3.horizontal"` inside a `Pressable` wired to `handleSettingsPress` → `router.push('./settings')` (line 720). `SettingsScreen.tsx` renders exactly 3 rows: 빈도(`rowFrequency`, ActionSheetIOS with `FREQUENCY_ACTION_SHEET_OPTIONS`), 하루 마무리 `Switch` (`rowDailyReflection`), 버전(`rowVersion`, `Constants.expoConfig?.version`). `PHASE2_NOTIFICATION_SETTINGS.dailyReflectionEnabled = true` is the default and `resolveNotificationSettings` falls back to it when no row exists. Persistence round-trips through real `node:sqlite` in `settingsRepo.test.ts`. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | `app_settings` table DDL | ✓ VERIFIED | `CREATE TABLE IF NOT EXISTS app_settings` present (line 132) |
| `src/db/migrations.ts` | `DATABASE_VERSION = 3` | ✓ VERIFIED | Confirmed at line 18 |
| `src/settings/settingsRepo.ts` | upsert/read + frequency guard | ✓ VERIFIED | `getSettingsRow`, `upsertSettings`, `resolveNotificationSettings`, `isNotificationFrequency` all present and exported |
| `src/calendar/monthGrid.ts` | grid math + `isValidLocalDateKey` | ✓ VERIFIED | Pure functions, round-trip validated date-key guard (fail-closed) |
| `src/calendar/scrubberRange.ts` | clamp math + visibility gate + worklet dims | ✓ VERIFIED | `'worklet'` directives present on both hot-path functions post-bugfix |
| `src/calendar/CalendarGridScreen.tsx` | month grid screen | ✓ VERIFIED | Wired, tested, safe-area fix applied (`insets.top`), accessibility labels added (WR-05 fix) |
| `src/calendar/PastDateScreen.tsx` | read-only map+sheet screen | ✓ VERIFIED | No checkin-button imports; tab bar hidden via `useFocusEffect` + `navigation.getParent()?.setOptions` |
| `src/calendar/DateScrubber.tsx` | floating scrubber component | ✓ VERIFIED | Gesture, ticks, center indicator, no momentum |
| `src/settings/SettingsScreen.tsx` | settings screen (3 rows) | ✓ VERIFIED | Single write path `persist()`, reordered post-WR-04 (native apply before DB commit) |
| `src/app/(tabs)/calendar/index.tsx`, `_layout.tsx`, `[date]/index.tsx`, `[date]/[id].tsx` | calendar nested stack routes | ✓ VERIFIED | Thin wrappers, fail-closed param validation, relative-path pushes throughout |
| `src/app/(tabs)/index/settings.tsx` | settings route | ✓ VERIFIED | Thin wrapper, relative-path entry (`./settings`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `(tabs)/index/index.tsx` hamburger `Pressable` | `(tabs)/index/settings.tsx` | `router.push('./settings')` | ✓ WIRED | Relative path confirmed (not absolute — avoids the `/index/index` segment-collision bug class documented in 06-VALIDATION.md) |
| `CalendarGridScreen.tsx` cell `Pressable` | `calendar/[date]/index.tsx` | `router.push({pathname:'/calendar/[date]'...})` | ✓ WIRED | Confirmed tap-verified in simulator per 06-VALIDATION item 3 |
| `PastDateScreen.tsx` row `Pressable` | `calendar/[date]/[id].tsx` | `router.push({pathname:'/calendar/[date]/[id]'...})` | ✓ WIRED | Absolute path retained (WR-06 resolution: tap-verified directly in simulator, no segment-collision risk for this path — see 06-REVIEW.md Resolution) |
| `DateScrubber.tsx` `.onBegin` | `PastDateScreen.tsx` `handleScrubStart` | `runOnJS(onScrubStart)` → `sheetRef.snapToIndex(0)` | ✓ WIRED | Confirmed crash-free post worklet fix, simulator-verified (06-VALIDATION item 5) |
| `DateScrubber.tsx` `.onUpdate` | `PastDateScreen.tsx` `handleScrubIndexChange` | `runOnJS(onIndexChange)` → `setActiveDateKey` | ✓ WIRED | Drives map/sheet re-render via `activeDateKey` state, guarded against stale-response races (`activeDateKeyRef`) |
| `SettingsScreen.tsx` `persist()` | `settingsRepo.upsertSettings` + `applyNotificationSettings` | sequential await, native-first | ✓ WIRED | Order confirmed fixed (WR-04): native apply succeeds before DB commit |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `CalendarGridScreen.tsx` | `recordedDateKeys` | `getCheckinDateKeysInRange(db, ...)` real SQLite range query, refetched on focus + month change with stale-response guard (`visibleMonthRef`, WR-02 fix) | Yes | ✓ FLOWING |
| `PastDateScreen.tsx` | `checkins` | `getTodayCheckins(db, activeDateKey)` real query, refetched on focus + after delete commit | Yes | ✓ FLOWING |
| `PastDateScreen.tsx` | `historySummary`/`recordedDateKeys` (scrubber) | `getCheckinHistorySummary`/`getCheckinDateKeysInRange`, now refetched via `reloadScrubberData()` on focus + after swipe-delete commit (WR-03 fix — previously mount-only, now current) | Yes | ✓ FLOWING |
| `SettingsScreen.tsx` | `settings` | `settingsRepo.getSettingsRow(db)` on mount, real SQLite read with in-code fallback to `PHASE2_NOTIFICATION_SETTINGS` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm test` | 38 suites / 616 tests passed | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| Fence tests (Phase 4 D-07/D-08 boundary, intentionally reversed) | `npm test -- tabs-wiring.test.ts` (included in full run) | Test 13/14 present, rewritten to existence-assertions, passing | ✓ PASS |
| Debt-marker scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) on all phase-touched files | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER..."` across 11 core files | No matches | ✓ PASS |
| Semantic-color scan (DESIGN.md prohibition) | `grep` for red/green/blue in calendar `.tsx` files | Only `colors.pinSoft`/`colors.accent` design tokens found, no raw semantic colors | ✓ PASS |

### Probe Execution

No dedicated `scripts/*/tests/probe-*.sh` files exist for this phase; this repo's established verification convention (per `06-VALIDATION.md`) is Jest static-source-analysis + pure-function unit tests + real `node:sqlite` round-trips, all covered above. Step 7c: SKIPPED (no probe files declared or found).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| REQ-calendar-grid | 06-02, 06-03 | 월 그리드 + 오늘 accent 밑줄 | ✓ SATISFIED | Code verified above (Truth 1) |
| REQ-past-date-view | 06-02, 06-05 | 체크인 버튼 없는 읽기전용 지도+시트 | ✓ SATISFIED | Code verified above (Truth 1) |
| REQ-date-scrubber | 06-02, 06-07 | 하드 클램프, 44×44pt, 시트 강제 접힘 | ✓ SATISFIED | Code verified above (Truths 2, 3) |
| REQ-settings-screen | 06-01, 06-04, 06-06, 06-08 | 3항목 + 영속화 | ✓ SATISFIED | Code verified above (Truth 4) |

**Documentation gap found (non-blocking):** `.planning/REQUIREMENTS.md`'s Traceability table (line ~136) still reads `| REQ-settings-screen | Phase 6 | Pending (영속화 계층은 06-01 완료, 화면/배선은 후속 플랜) |` even though the requirement's own checklist entry above it (line 54) is checked `[x]` and the surrounding rows (REQ-calendar-grid/REQ-past-date-view/REQ-date-scrubber) were all correctly flipped to `Complete` by commit `9c62ad0`. This is a stale row that commit `9c62ad0` missed — a copy/paste oversight, not a sign of incomplete work (the actual settings screen/hamburger wiring is verified complete above, and 06-08 explicitly built on top of it). Recommend a one-line follow-up edit to `.planning/REQUIREMENTS.md` line ~136 changing `Pending (...)` → `Complete`. Not gating this phase's status since it is a documentation-only inconsistency with zero functional impact — the code, the roadmap's phase-completion line, and every other tracking artifact agree the requirement is done.

### Anti-Patterns Found

None. No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER), no empty stub implementations, no hardcoded-empty state feeding renders, no semantic color usage across all 11 phase-owned source files scanned.

### Human Verification Required

None. All four roadmap success criteria are verifiable via code + automated tests. The device-only behavioral items (drag feel, scrubber settle precision, real-lighting color distinction, actual notification firing cadence) were already explicitly confirmed by the founder in this same session per `06-VALIDATION.md`'s sign-off line, and the two remaining lower-risk secondary interactions noted as "시간 관계상 미확인" in `06-VALIDATION.md` item 7 (frequency action-sheet tap outcome, toggle persistence across app backgrounding) are covered by: (a) `settingsRepo.test.ts`'s real `node:sqlite` round-trip test for persistence, and (b) `settings-wiring.test.ts` Tests 5-8 for the action-sheet index→frequency mapping correctness — sufficient automated coverage that no further interactive confirmation is required to consider REQ-settings-screen satisfied.

### Gaps Summary

No blocking gaps. One non-blocking documentation inconsistency identified in `.planning/REQUIREMENTS.md`'s Traceability table for `REQ-settings-screen` (see Requirements Coverage section above) — recommend a follow-up one-line doc fix but it does not affect phase goal achievement, since the underlying requirement is functionally complete and verified in code.

All three bugs found and fixed during this phase's own simulator pass (safe-area header offset, scrubber worklet crash, absolute-path 404s — `06-VALIDATION.md`) are confirmed fixed in the current code. All six code-review findings (`06-REVIEW.md`) are confirmed resolved: WR-01 through WR-05 have code fixes present and verified directly in this pass (today-underline gating, request-race guard, scrubber staleness fix, settings write-ordering fix, accessibility labels/record-dot), and WR-06 was correctly left as a no-op after a real simulator tap-verification (not just narration).

---

_Verified: 2026-09-02T16:20:00Z_
_Verifier: Claude (gsd-verifier)_
