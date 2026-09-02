---
phase: 06-calendar-tab
plan: 05
subsystem: ui
tags: [expo-router, react-native-maps, bottom-sheet, calendar, navigation]

# Dependency graph
requires:
  - phase: 06-calendar-tab (06-02)
    provides: monthGrid.ts (isValidLocalDateKey, formatDateKeyTitle), calendar route tab shell
  - phase: 06-calendar-tab (06-03)
    provides: calendar/_layout.tsx nested Stack, CALENDAR_COPY.pastDateEmptyState
  - phase: 04-today-view
    provides: TodayBottomSheet, pendingDelete controller, UndoSnackbar, trajectory builder
  - phase: 05-check-in-detail-edit
    provides: CheckinDetailScreen (reused as-is), getCheckinById-based detail flow
provides:
  - "과거 날짜 화면(PastDateScreen) — 읽기전용 지도+시트, 체크인 버튼 없음"
  - "캘린더 스택 내 [date]/index, [date]/[id] 라우트 2개(날짜 파라미터 fail-closed 검증 포함)"
  - "TodayBottomSheet의 선택적 emptyText prop(기존 오늘 뷰 동작 불변)"
  - "탭바 숨김의 유일한 조작 지점(이 화면 focus/blur에 연동)"
affects: [06-calendar-tab (06-06, 06-07 이후 phase-06 나머지 plan)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "화면별 탭바 조작은 정확히 한 파일에서만: useFocusEffect + navigation.getParent()?.setOptions({ tabBarStyle })로 진입 시 숨기고 blur/unmount 시 복원"
    - "얇은 라우트 래퍼 + 화면 본체 분리: [date]/index.tsx는 검증만, PastDateScreen.tsx가 실제 로직/JSX 소유"
    - "기존 오늘 뷰의 지연 삭제(pendingDelete)/undo 스낵바 배선을 새 화면에 그대로 이식"

key-files:
  created:
    - "src/calendar/PastDateScreen.tsx"
    - "src/app/(tabs)/calendar/[date]/index.tsx"
    - "src/app/(tabs)/calendar/[date]/[id].tsx"
  modified:
    - "src/app/(tabs)/calendar/_layout.tsx"
    - "src/today/TodayBottomSheet.tsx"
    - "src/app/__tests__/calendar-wiring.test.ts"

key-decisions:
  - "TodayBottomSheet에 emptyText?: string prop을 추가(기본값 TODAY_COPY.emptyState)해 빈 상태 문구를 상속 없이 재사용 — 새 시트 컴포넌트를 만들지 않는 것이 06-RESEARCH.md 명시 anti-pattern 회피 제약이었음"
  - "탭바 숨김을 useLayoutEffect가 아니라 useFocusEffect로 걸어, 상세화면 push(blur)→복원, 뒤로가기(focus)→재숨김이 자동으로 두 화면의 탭바 계약을 동시에 만족하게 함"

requirements-completed: [REQ-past-date-view]

# Metrics
duration: 40min
completed: 2026-09-02
---

# Phase 6 Plan 05: 과거 날짜 화면(PastDateScreen) Summary

**캘린더 그리드에서 날짜를 탭하면 열리는 읽기전용 지도+바텀시트 화면 — Phase 4/5 컴포넌트(TodayBottomSheet, pendingDelete, CheckinDetailScreen)를 그대로 재사용하고, 이 화면 하나에서만 탭바를 숨긴다.**

## Performance

- **Duration:** 약 40분
- **Started:** 2026-09-02T01:48:08Z (worktree base 정렬 후)
- **Completed:** 2026-09-02T02:28:51Z
- **Tasks:** 3/3
- **Files modified:** 6 (신규 3, 수정 3)

## Accomplishments
- `PastDateScreen.tsx` 신설 — 그날의 지도 핀+궤적선+바텀시트 리스트를 읽기전용으로 렌더, 체크인 버튼/재센터 버튼 없음
- 캘린더 스택 안에 `[date]/index`(과거 날짜 화면 래퍼, fail-closed 파라미터 검증) + `[date]/[id]`(Phase 5 `CheckinDetailScreen` 재사용) 라우트 2개 신설
- 이 화면에서만 탭바를 숨기고, 상세화면으로 push하거나 뒤로 나가면 자동 복원(`useFocusEffect` + `navigation.getParent()?.setOptions`)
- `calendar-wiring.test.ts`에 10개 신규 assertion(Test 8~17) 추가 — 파라미터 fail-closed, 얇은 래퍼 계약, 체크인 버튼 부재, 탭바 조작 단일 지점(.tsx 전체 재귀 스캔), 삭제 확정 경로

## Task Commits

1. **Task 1: 캘린더 스택 라우트 2개 + date 파라미터 검증** - `7cdcadb` (feat)
2. **Task 2: PastDateScreen — 읽기전용 지도+시트, 체크인 버튼 없음, 탭바 숨김** - `1aacb33` (feat)
3. **Task 3: calendar-wiring.test.ts 확장 — 과거 날짜 화면 계약 회귀 가드** - `c507e5c` (test)

**Plan metadata:** (SUMMARY.md 커밋은 이 응답 직후 진행)

## Files Created/Modified
- `src/calendar/PastDateScreen.tsx` - 과거 날짜 지도+시트 화면 본체(신규)
- `src/app/(tabs)/calendar/[date]/index.tsx` - 과거 날짜 라우트, isValidLocalDateKey 검증 + Redirect(신규)
- `src/app/(tabs)/calendar/[date]/[id].tsx` - 캘린더 스택 전용 체크인 상세 라우트, CheckinDetailScreen 재사용(신규)
- `src/app/(tabs)/calendar/_layout.tsx` - Stack에 `[date]/index`, `[date]/[id]` 스크린 2개 등록
- `src/today/TodayBottomSheet.tsx` - 선택적 `emptyText` prop 추가(기본값 `TODAY_COPY.emptyState`)
- `src/app/__tests__/calendar-wiring.test.ts` - 과거 날짜 화면 회귀 가드 10개 assertion 추가(append, 기존 06-03 블록 무변경)

## Decisions Made
- `emptyText` prop 기본값을 `TODAY_COPY.emptyState`로 둬 오늘 뷰 동작을 전혀 바꾸지 않으면서 과거 날짜 화면만 `CALENDAR_COPY.pastDateEmptyState`를 넘기도록 함(회귀 위험 최소화).
- 탭바 숨김/복원을 `useFocusEffect`로 구현 — `useLayoutEffect`였다면 상세화면으로 push해도 blur가 발생하지 않아 탭바가 계속 숨겨진 채로 남았을 것(product-design.md의 "상세화면은 탭바 유지" 계약 위반). `useFocusEffect`의 cleanup이 blur 시점에 자동으로 복원을 실행하므로 별도 분기가 필요 없었다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `[date]/index.tsx`의 조건부 훅 호출 방지**
- **Found during:** Task 1 작성 중
- **Issue:** 초안이 `isValidLocalDateKey` 검증 실패 시 조기 `return <Redirect .../>` 한 뒤에야 `useSQLiteContext()`를 호출해, 검증 실패 렌더 경로에서 훅 호출 순서가 달라지는 React Hooks 규칙 위반이었다.
- **Fix:** `useSQLiteContext()`를 조기 반환보다 먼저(무조건) 호출하도록 순서를 재배치.
- **Files modified:** `src/app/(tabs)/calendar/[date]/index.tsx`
- **Verification:** `npx tsc --noEmit` 통과, ESLint react-hooks 규칙 위반 없음(정적 검토로 확인).
- **Committed in:** `7cdcadb` (Task 1 커밋에 포함, 별도 후속 커밋 아님 — 최초 작성 단계에서 바로잡음)

**2. [Rule 1 - Bug] 디자인 토큰 값 오기입 정정**
- **Found during:** Task 2 작성 중 자체 검토
- **Issue:** `PastDateScreen.tsx`의 undo 스낵바 컨테이너 여백을 처음에 `spacing.lg`(24) 대신 리터럴 `16`(실제로는 `spacing.md`)으로 하드코딩했다 — (tabs)/index/index.tsx의 동일 컨테이너는 `spacing.lg`를 쓴다.
- **Fix:** `spacing` 토큰을 import해 `spacing.lg`로 교체, 리터럴 숫자 제거.
- **Files modified:** `src/calendar/PastDateScreen.tsx`
- **Verification:** `npx tsc --noEmit` 통과, 오늘 뷰와 동일한 배치 값으로 일치 확인.
- **Committed in:** `1aacb33` (Task 2 커밋에 포함, 최초 작성 단계에서 바로잡음)

---

**Total deviations:** 2 auto-fixed (둘 다 Rule 1 — 코드 작성 중 자체 검토로 발견해 커밋 전에 수정, 별도 후속 커밋 없음)
**Impact on plan:** 두 건 모두 최초 구현 단계에서 발견해 해당 태스크 커밋에 포함된 상태로 수정됐다. 스코프 확장 없음.

## Issues Encountered
- 초안에서 회귀 가드 테스트(Task 3) 작성 시 주석 문구에 `getCheckinsByDate`/`CheckinActionCard` 등 금지 문자열이 우연히 포함돼 자체 acceptance-criteria grep이 실패했다 — 문구를 재구성해 해결(코드 로직 변경 없음, 순수 주석 표현 수정).

## User Setup Required

None - no external service configuration required.

## Simulator/Device Verification

이 플랜은 `checkpoint:human-verify` 없이 완전 자동 실행되도록 설계됐고(`autonomous: true`),
`<verification>` 섹션도 `npm test` 전체 스위트 green + `npx tsc --noEmit` + 정적 소스 분석
회귀 가드로만 구성돼 있어 시뮬레이터 시각 검증을 요구하지 않는다. 새 네이티브 모듈 설치가
없고(MapView/BottomSheet 모두 기존 phase에서 이미 검증된 라이브러리), 지도 핀/시트 합성은
오늘 뷰의 기존 검증된 패턴을 그대로 옮긴 것이라 회귀 위험이 낮다고 판단해 자동 테스트로만
검증했다. 다만 아래 항목은 실제 화면에서 시각적으로 확인된 적이 없으므로, 다음 실사용 QA
차례(06-07 이후 통합 QA 또는 창업자 트라이얼)에서 시뮬레이터로 먼저 확인할 것을 권장한다:
- 과거 날짜 화면 진입/이탈 시 탭바 숨김·복원 애니메이션의 시각적 자연스러움
- 빈 상태 문구("이 날은 기록이 없어요")가 지도 위가 아니라 시트 표면에만 보이는지 실제 레이아웃
- 행 탭 → 상세화면 진입 → 뒤로가기 시 탭바가 정말로 다시 나타나는지 실기기/시뮬레이터 왕복

## Next Phase Readiness
- REQ-past-date-view 요구사항 충족 — 캘린더 그리드(06-03의 `CalendarGridScreen.tsx` `handleCellPress`)가 이미 `router.push({ pathname: '/calendar/[date]', params: { date: dateKey } })`를 호출하도록 배선돼 있음을 확인. 이 플랜이 만든 `[date]/index.tsx` 라우트가 그 push를 정확히 받는 대상이라 그리드→과거 날짜 화면 진입 경로가 지금 이 커밋들로 실제로 완성됐다.
- 06-06/06-07(플로팅 날짜 스크러버 등 남은 Phase 6 plan)이 이 화면의 헤더/탭바 계약을 그대로 소비할 수 있음.
- 블로커 없음.

---
*Phase: 06-calendar-tab*
*Completed: 2026-09-02*
