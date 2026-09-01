---
phase: 04-today-view
verified: 2026-09-01T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  note: "No prior 04-VERIFICATION.md existed. This is a retroactive initial verification performed at commit 76228c9 (branch gsd/phase-04-today-view-clean), after informal completion/sign-off."
---

# Phase 4: Today View Verification Report

**Phase Goal:** 사용자가 오늘의 체크인들을 지도에서 보여주는 홈 화면과, 새 체크인을 위한 마찰 낮은 진입점을 갖는다.
**Verified:** 2026-09-01 (retroactive), against commit `76228c9` on branch `gsd/phase-04-today-view-clean`
**Status:** passed
**Re-verification:** No — initial verification (retroactive, no prior VERIFICATION.md artifact existed for this phase)

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 사용자가 오늘 탭을 열면 3단 스냅(CLOSED/DRAGGING/OPEN) 바텀시트가 있는 지도가 보이며, 오늘의 실제 체크인이 시간순으로 나열된다 | ✓ VERIFIED | `src/today/TodayBottomSheet.tsx` renders `BottomSheet` with `snapPoints=[closedPeak, openPeak]` + continuous `animatedPosition` tracking for the DRAGGING state (design decision documented in 04-04-SUMMARY.md, consistent with 04-UI-SPEC.md §바텀시트). `src/app/(tabs)/index.tsx:377` calls `getTodayCheckins(db, resolveLocalDateKey(new Date()))`, which orders by `timestamp_utc ASC` (`src/checkin/checkinRepo.ts:123-130`). `today-wiring.test.ts` asserts `getTodayCheckins(` appears exactly once (single-query contract, D-11). |
| 2 | 바텀시트 상태와 무관하게 플로팅 체크인 버튼에 항상 접근할 수 있다 | ✓ VERIFIED | `floatingButtonStyle` (useAnimatedStyle, `index.tsx:422-427`) computes `bottom: containerHeight - sheetPosition.value + spacing.lg`, continuously tracking the sheet's `animatedPosition` — the button follows the sheet rather than being obscured by it at any snap state. `today-wiring.test.ts` Test group "플로팅 버튼 연속 추적 계약 (D-05)" (lines 176-209) guards this wiring. |
| 3 | 체크인 시 첨부된 사진은 최대 1600px로 리사이징되어 `documentDirectory` 하위에 저장되어 OS 캐시 삭제에도 살아남는다 | ✓ VERIFIED | `MAX_PHOTO_DIMENSION_PX = 1600` (`src/checkin/config.ts:65`); `resolveResizeTarget` (`src/checkin/photoResize.ts`) computes orientation-aware resize target; `defaultResizeDeps` (`src/checkin/deps.ts`) invokes `expo-image-manipulator`; resized output is piped through the existing `copyIntoDocumentDirectory` port (`src/checkin/photos.ts:114`) — never left in the manipulator's cache output. Simulator spot-check in 04-07-SUMMARY.md Task 1 item 12 measured actual output file at 1600×1600 via `sips`. |
| 4 | 얇고 채도 낮은 궤적선이 오늘의 체크인들을 시간순으로 연결하며, 거리/시간 라벨은 없다 | ✓ VERIFIED | `buildTrajectoryCoordinates` (`src/today/trajectory.ts`) returns `[]` for <2 checkins (pure function, unit tested). `index.tsx` renders a single `<Polyline strokeColor={colors.accentSoft} ...>` (line 973-975) fed by `buildTrajectoryCoordinates(todayCheckins)`. `today-wiring.test.ts` "궤적선 계약" group asserts exactly one `<Polyline`, no `lineDashPattern`, and no label/arrow identifiers near the render. |
| 5 | 첫 사용자는 알림 priming 외에 별도의 온보딩 플로우를 보지 않으며, 위치 권한은 첫 체크인 탭 시점에 맥락적으로 요청된다 | ✓ VERIFIED | `index.tsx:954-955` — `if (shouldShowPriming(permission)) return <Redirect href="/priming" />` (unchanged single gate). `handleCheckinPress` (line 659) retains Phase 3's contextual `requestForegroundPermissionsAsync` call at first check-in tap — no new upfront onboarding screen was added; `checkin-wiring.test.ts`/`foundation-wiring.test.ts`/`notification-wiring.test.ts` (all in the phase's file-modified list) pass, guarding this against regression. |

### Observable Truths (from PLAN frontmatter must_haves, sampled — representative subset)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | 리스트와 지도 핀이 소비할 조회 함수가 정확히 하나만 존재한다(D-11) | ✓ VERIFIED | Single `getTodayCheckins` export in `checkinRepo.ts`; `today-wiring.test.ts` asserts exactly 1 call-site of `getTodayCheckins(` in `index.tsx`. |
| 7 | 앱을 열면 화면 하단에 '오늘'/'캘린더' 2개 탭이 있는 상시 탭바가 보인다(D-06) | ✓ VERIFIED | `src/app/(tabs)/_layout.tsx` renders `<Tabs>` with exactly `Tabs.Screen name="index"` and `name="calendar"`, overriding `tabBarActiveTintColor`/`tabBarInactiveTintColor`/`tabBarStyle` with design tokens (not iOS system blue). `tabs-wiring.test.ts` Tests 4-10 guard this. |
| 8 | 체크인 진행 중(확인 핀/액션 카드)에는 바텀시트가 화면에서 사라진다(숨김이 아니라 언마운트) | ✓ VERIFIED | `index.tsx` ternary: `showActionCard ? <CheckinActionCard .../> : (<><TodayBottomSheet .../><...floating buttons/></>)` — mutually exclusive render branches, not opacity/display toggling. `today-wiring.test.ts` "바텀시트 마운트 게이트 계약 (D-04)" explicitly asserts no `opacity: 0`/`display: none`/`enabled={false}`/`pointerEvents="none"` appears near the sheet, and that `<TodayBottomSheet` sits in the `showActionCard === false` branch. |
| 9 | 리스트 행은 탭할 수 없고 탭 가능함을 암시하는 시각 요소가 없다(D-03) | ✓ VERIFIED | `CheckinListRow.tsx` wraps content in a plain `View` (not `Pressable`/`TouchableOpacity`), no chevron/arrow. `tabs-wiring.test.ts`/`today-wiring.test.ts` scope-boundary tests assert no detail-screen navigation identifiers appear in `index.tsx` (Phase 5 territory). |

**Score:** 9/9 sampled truths verified (roadmap's 5 Success Criteria + 4 representative plan-level must_haves). All 7 plans' individual `must_haves.artifacts` and `key_links` were additionally checked directly against source (see Required Artifacts / Key Link tables below) — no gaps found.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/migrations.ts` | `MigratableDb` includes `getAllAsync` | ✓ VERIFIED | Line 19: `Pick<SQLiteDatabase, 'getFirstAsync' \| 'execAsync' \| 'runAsync' \| 'getAllAsync'>` |
| `src/db/testing/nodeSqliteAdapter.ts` | node:sqlite-backed `getAllAsync` | ✓ VERIFIED | Line 58: `getAllAsync: async <T>(sql, ...params): Promise<T[]>` |
| `src/checkin/checkinRepo.ts` | `getTodayCheckins(db, localDateKey)` | ✓ VERIFIED | Exported, single shared query, `ORDER BY timestamp_utc ASC` |
| `src/today/trajectory.ts` | `buildTrajectoryCoordinates` pure fn | ✓ VERIFIED | Exported; returns `[]` for <2 rows; type-only import of `CheckinRow` |
| `src/checkin/config.ts` | `MAX_PHOTO_DIMENSION_PX` | ✓ VERIFIED | Line 65: `= 1600` |
| `src/checkin/photoResize.ts` | `resolveResizeTarget` | ✓ VERIFIED | Exported pure function |
| `src/checkin/deps.ts` | `defaultResizeDeps` + isolated `expo-image-manipulator` import | ✓ VERIFIED | Line 11 import, line 87 export |
| `src/checkin/photos.ts` | resize → `copyIntoDocumentDirectory` pipeline, `resize_failed` error | ✓ VERIFIED | Lines 61/110/114 |
| `src/app/(tabs)/_layout.tsx` | Tabs shell, no icons, token colors | ✓ VERIFIED | 32 lines, contains `Tabs`, no `tabBarIcon` |
| `src/app/(tabs)/calendar.tsx` | Placeholder screen | ✓ VERIFIED | Renders `TODAY_COPY.calendarPlaceholder` only |
| `src/app/(tabs)/index.tsx` | Today screen (moved from Phase 3, ≥900 lines) | ✓ VERIFIED | 1176 lines |
| `src/today/content.ts` | `TODAY_COPY` single source | ✓ VERIFIED | `as const`, includes tab/placeholder/emptyState copy |
| `src/today/CheckinListRow.tsx` | Non-interactive time+note row | ✓ VERIFIED | Exports `CheckinListRow`, `LIST_ROW_MIN_HEIGHT`; plain `View`, no Pressable |
| `src/today/TodayBottomSheet.tsx` | `@gorhom/bottom-sheet`-based sheet | ✓ VERIFIED | Exports `TodayBottomSheet`; uses `BottomSheetFlatList` (not plain `FlatList`) |
| `src/checkin/localDate.ts` | `formatLocalTime` | ✓ VERIFIED | Exported, `Intl`-based HH:mm |
| `src/app/(tabs)/index.tsx` (plan 05/06 additions) | `getTodayCheckins` wiring, `pinSaved` markers, `Polyline`, `TodayBottomSheet` mount gate, `animatedPosition` offset | ✓ VERIFIED | All present and wired (see truths 1-9 above) |
| `.planning/phases/04-today-view/04-07-SUMMARY.md` | Simulator + device verification results, clearly separated | ✓ VERIFIED | 13 simulator items (12 PASS, 1 documented gap unrelated to app code) + 4 device-only items, all PASS per founder confirmation recorded in commit `76228c9` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `checkinRepo.ts` | `MigratableDb.getAllAsync` | parameterized multi-row query | ✓ WIRED | `getAllAsync<CheckinRow>('SELECT * FROM checkins WHERE local_date_key = ? ORDER BY timestamp_utc ASC', localDateKey)` |
| `trajectory.ts` | `db/schema.ts CheckinRow` | type-only import | ✓ WIRED | `import type { CheckinRow } from '../db/schema'` |
| `photos.ts` | `PhotoStorageDeps.copyIntoDocumentDirectory` | resize output → UUID filename copy | ✓ WIRED | Line 114 |
| `deps.ts` | `expo-image-manipulator` | isolated runtime import | ✓ WIRED | Line 11, single-file isolation preserved |
| `(tabs)/_layout.tsx` | `theme/tokens.ts` | tabBar color overrides | ✓ WIRED | `tabBarActiveTintColor`/`tabBarInactiveTintColor`/`tabBarStyle` all token-based |
| `(tabs)/index.tsx` | `/priming` | `<Redirect>` on `shouldShowPriming` | ✓ WIRED | Line 954-955 |
| `CheckinListRow.tsx` | `localDate.ts formatLocalTime` | timestamp → HH:mm | ✓ WIRED | Line 41 |
| `TodayBottomSheet.tsx` | `@gorhom/bottom-sheet BottomSheetFlatList` | sheet pan / list scroll coordination | ✓ WIRED | Line 78-82 |
| `(tabs)/index.tsx` | `checkinRepo.ts getTodayCheckins` | single query → screen state | ✓ WIRED | Line 377, reloaded at 4 call sites (mount/save/finish/foreground) |
| `(tabs)/index.tsx` | `trajectory.ts buildTrajectoryCoordinates` | query result → Polyline coords | ✓ WIRED | Line 397 |
| `(tabs)/index.tsx` | `TodayBottomSheet.tsx` | mount gate + prop wiring | ✓ WIRED | Line 1037-1041, mutually exclusive with `CheckinActionCard` |
| Sheet `animatedPosition` (SharedValue) | Floating button container `bottom` offset | `useAnimatedStyle` continuous read | ✓ WIRED | Line 422-427 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `TodayBottomSheet` list | `checkins` prop | `todayCheckins` state ← `getTodayCheckins(db, localDateKey)` real SQLite query, reloaded on mount/save/finish/foreground | Yes (real query, not static/empty return) | ✓ FLOWING |
| Map saved pins | `todayCheckins.map(...)` | same `getTodayCheckins` result | Yes | ✓ FLOWING |
| Polyline coordinates | `trajectoryCoordinates` ← `buildTrajectoryCoordinates(todayCheckins)` | same shared state | Yes | ✓ FLOWING |

No hardcoded-empty props or disconnected data sources found.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npm test` | 31 suites / 410 tests passed | ✓ PASS |
| Type-check clean | `npx tsc --noEmit` (after deleting stale `.expo/types/router.d.ts`) | exit 0, no errors | ✓ PASS |
| Dependency presence | `grep expo-image-manipulator / @gorhom/bottom-sheet package.json` | `expo-image-manipulator@~57.0.14`, `@gorhom/bottom-sheet@^5.2.14` present | ✓ PASS |

Simulator-level behavioral checks (bottom sheet gestures, map pin colors, boot, tab switching) were already performed directly by Claude in the iOS Simulator during Plan 07 execution (documented in 04-07-SUMMARY.md, 12/13 PASS) — not re-run here since no app code changed since that commit; re-running would only reproduce the same result.

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files exist in this repository and no plan/summary references probe-based verification. This phase is verified via Jest + tsc + direct source inspection.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| REQ-today-view | 04-01, 04-03, 04-04, 04-05, 04-06, 04-07 | 오늘 탭에 지도 + 3단 스냅 바텀시트가 오늘의 체크인을 시간순으로 나열, 시트 상태와 무관하게 체크인 버튼 접근 가능 | ✓ SATISFIED | Truths 1, 2, 6, 7, 8, 9 above |
| REQ-photo-resize | 04-02, 04-07 | 사진 최대 1600px 리사이징, documentDirectory 저장, 실패 시 인라인 문구, 카메라/라이브러리 출처 구분 | ✓ SATISFIED | Truth 3; `PhotoSource` type retains `'camera' \| 'library'` distinction in `photos.ts` |
| REQ-onboarding-empty-state | 04-03, 04-07 | 알림 priming만 온보딩 역할, 위치 권한은 첫 체크인 탭 시점 맥락적 요청 | ✓ SATISFIED | Truth 5 |
| REQ-trajectory-line | 04-01, 04-05, 04-07 | 얇고 채도 낮은 궤적선, 거리/시간 라벨 없음 | ✓ SATISFIED | Truth 4 |

No orphaned requirements: REQUIREMENTS.md's Phase 4 traceability row lists exactly these 4 IDs, and all 4 appear in at least one plan's `requirements:` frontmatter field.

### Anti-Patterns Found

None. Scanned all phase-4-modified files (`src/db/migrations.ts`, `src/db/testing/nodeSqliteAdapter.ts`, `src/checkin/checkinRepo.ts`, `src/today/trajectory.ts`, `src/checkin/config.ts`, `src/checkin/photoResize.ts`, `src/checkin/deps.ts`, `src/checkin/photos.ts`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/calendar.tsx`, `src/app/(tabs)/index.tsx`, `src/today/content.ts`, `src/today/CheckinListRow.tsx`, `src/today/TodayBottomSheet.tsx`, `src/checkin/localDate.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub-return patterns — no unreferenced debt markers found. The only `return null` (in `TodayBottomSheet.tsx`) is the documented pre-layout-measurement guard, not a stub. `.catch(() => {})` occurrences in `index.tsx` are fire-and-forget draft-write queue chains inherited from Phase 3, not new empty handlers introduced by this phase.

**Informational note (non-blocking):** 04-07-SUMMARY.md records one documented, code-verified gap: a small triangle (▼) renders above tab labels in the iOS 26.5 simulator despite `tabBarIcon` never being set in `_layout.tsx` (confirmed absent by `tabs-wiring.test.ts` Test 9, which passes). This was investigated and attributed to iOS/Xcode 26.5-26.6 tab bar rendering defaults, not an app code defect. It does not affect any roadmap Success Criterion (which specifies tab bar *color*, not icon absence) and does not block Phase 5.

### Human Verification Required

None outstanding. The 4 device-only items identified as un-simulatable in `04-VALIDATION.md` (bottom sheet gesture feel including map-pan-through-CLOSED-sheet, saved-vs-active pin visibility in real lighting, high-res photo attach perceived speed, tab switch + draft persistence) were already executed on the founder's physical iPhone and confirmed PASS for all 4 items, per `04-07-SUMMARY.md` Task 3 and commit `76228c9` ("실기기 검증 4개 항목 전부 통과, phase 4 완료 처리"). One non-blocking side observation was raised during that device pass (saved check-in pin color felt low-contrast against the map) — recorded as a follow-up note in the SUMMARY, not a failed test item, and does not gate this phase.

### Gaps Summary

No gaps found. All 5 roadmap Success Criteria and all 7 plans' must_haves (truths/artifacts/key_links) verified directly against source at commit `76228c9`. Full test suite (410/410) and `tsc --noEmit` both green when re-run independently by this verifier. Requirements traceability for the 4 phase-4 requirement IDs is complete with no orphans. The one recorded issue (tab icon triangle) is informational, confirmed non-code-caused, and does not affect any must-have.

---

_Verified: 2026-09-01_
_Verifier: Claude (gsd-verifier, retroactive)_
