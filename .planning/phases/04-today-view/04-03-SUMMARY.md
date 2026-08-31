---
phase: 04-today-view
plan: 03
subsystem: ui
tags: [expo-router, tabs, navigation, react-native, design-tokens]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: 전체화면 지도 화면(src/app/index.tsx)의 GPS 캡처/확인 핀/저장 배선 — 이 plan이 이동시킨 대상
provides:
  - "오늘/캘린더 2탭 하단 탭바 셸(expo-router (tabs) 라우트 그룹)"
  - "캘린더 탭 플레이스홀더 화면"
  - "오늘 뷰 문구 단일 출처(src/today/content.ts, TODAY_COPY)"
  - "오늘 화면이 (tabs)/index.tsx로 이동, 이후 plan들이 바텀시트/버튼 오프셋을 얹을 좌표계 기준"
affects: [04-today-view 이후 plan들(바텀시트/지도 핀/궤적선/사진 리사이징), 06-calendar-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "expo-router (tabs) 라우트 그룹으로 하단 탭바 구성, screenOptions에 tabBarActiveTintColor/tabBarInactiveTintColor/tabBarStyle 명시적 오버라이드(iOS 기본 파란 틴트 회귀 방지)"
    - "도메인 문구 단일 출처 파일(src/today/content.ts, TODAY_COPY as const) — src/notifications/content.ts와 동일 규약"

key-files:
  created:
    - src/today/content.ts
    - "src/app/(tabs)/_layout.tsx"
    - "src/app/(tabs)/calendar.tsx"
    - src/app/__tests__/tabs-wiring.test.ts
  modified:
    - "src/app/(tabs)/index.tsx (src/app/index.tsx에서 이동, import 경로 한 단계 깊게 갱신)"
    - src/app/__tests__/checkin-wiring.test.ts
    - src/app/__tests__/foundation-wiring.test.ts
    - src/app/__tests__/notification-wiring.test.ts

key-decisions:
  - "foundation-wiring.test.ts Test 4의 상대 경로 정규식을 단일 단계(../)만 허용하던 것에서 임의 깊이 허용으로 완화 — 화면 이동으로 상대 경로가 한 단계 깊어진 것을 반영(Rule 1)"

patterns-established:
  - "탭바 셸: screenOptions에서 색상 3종을 명시적으로 지정하지 않으면 iOS 시스템 블루로 렌더되는 함정을 회귀 테스트(tabs-wiring.test.ts)로 고정"

requirements-completed: [REQ-today-view, REQ-onboarding-empty-state]

# Metrics
duration: ~25min
completed: 2026-08-31
---

# Phase 4 Plan 3: 하단 탭바 셸 + 오늘 화면 이동 Summary

**expo-router `(tabs)` 라우트 그룹으로 오늘/캘린더 2탭 하단 탭바를 세우고, Phase 3의 전체화면 지도 화면을 오늘 탭(`(tabs)/index.tsx`)으로 이동 — 동작 변경 없이 라우트 구조만 재배치**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-31T04:31:17Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified — 이동 포함)

## Accomplishments
- `src/today/content.ts`(TODAY_COPY)를 오늘 뷰/탭바 확정 문구 단일 출처로 신설
- `src/app/(tabs)/_layout.tsx`에 오늘/캘린더 2탭 `Tabs` 셸 구성, 탭바 색상을 디자인 토큰(`colors.textPrimary`/`colors.textMuted`/`colors.surface`/`colors.line`)으로 명시적 오버라이드해 iOS 기본 파란 틴트 회귀를 방지
- `src/app/(tabs)/calendar.tsx`에 안내 문구 한 줄짜리 캘린더 플레이스홀더 화면 추가(D-07, Phase 6 콘텐츠 없음)
- `git mv`로 `src/app/index.tsx`를 `src/app/(tabs)/index.tsx`로 이동해 커밋 히스토리 보존, 상대 경로 import 19곳을 한 단계 깊게(`../X` → `../../X`) 갱신
- 기존 배선 회귀 가드 3개 테스트 파일(`checkin-wiring`/`foundation-wiring`/`notification-wiring`)의 소스 경로 상수를 새 위치로 갱신 — Phase 2/3의 배선 계약 100여 개가 새 경로에서도 그대로 통과
- `src/app/__tests__/tabs-wiring.test.ts` 신규 작성 — 라우트 구조/탭바/캘린더 플레이스홀더/스코프 경계(D-08)/문구 단일 출처 5개 계약군을 15개 테스트로 고정

## Task Commits

Each task was committed atomically:

1. **Task 1: (tabs) 라우트 그룹 + 탭 레이아웃 + 캘린더 플레이스홀더** - `38c043d` (feat)
2. **Task 2: 오늘 화면을 (tabs)/index.tsx로 이동 + import·테스트 경로 갱신** - `abfa72f` (feat)
3. **Task 3: 탭 셸 UI 계약 회귀 가드 신규 테스트** - `24a97f6` (test)

_이 plan은 tdd="true"가 아니며, Task 3의 테스트는 Task 1/2가 이미 구현한 계약을 고정하는 회귀 가드다(TDD RED/GREEN 사이클 대상 아님)._

## Files Created/Modified
- `src/today/content.ts` - 오늘 뷰/탭바 확정 문구 단일 출처(TODAY_COPY)
- `src/app/(tabs)/_layout.tsx` - 오늘/캘린더 2탭 Tabs 셸, 탭바 색상 토큰 오버라이드
- `src/app/(tabs)/calendar.tsx` - 캘린더 탭 플레이스홀더 화면
- `src/app/(tabs)/index.tsx` - Phase 3 지도 화면 이동본, 상대 경로만 갱신(로직 무변경)
- `src/app/__tests__/checkin-wiring.test.ts` - TODAY_SCREEN_PATH 상수로 경로 갱신
- `src/app/__tests__/foundation-wiring.test.ts` - TODAY_SCREEN_PATH 상수 도입 + Test 4 정규식 완화
- `src/app/__tests__/notification-wiring.test.ts` - TODAY_SCREEN_PATH 상수로 경로 갱신
- `src/app/__tests__/tabs-wiring.test.ts` - 탭 셸 UI 계약 신규 회귀 가드(15개 테스트)

## Decisions Made
- foundation-wiring.test.ts Test 4의 상대 경로 정규식(`(\.\.\/)?`)을 `(\.\.\/)*`로 완화 — 화면 이동으로 `../theme/tokens`가 `../../theme/tokens`로 한 단계 깊어진 것을 반영(임의 깊이 상대 경로를 허용해도 검증 의도 자체는 동일하게 유지: 특정 상대/절대 경로에서 tokens를 import하는지 확인)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] foundation-wiring.test.ts Test 4 정규식이 화면 이동으로 깊어진 상대 경로를 거부**
- **Found during:** Task 2 (`npm test` 실행 시 1건 실패)
- **Issue:** `expect(indexSource).toMatch(/from ['"](\.\.\/)?(@\/)?(src\/)?theme\/tokens['"]/)`가 `../` 단일 단계만 허용해, `(tabs)/index.tsx`로 이동하며 두 단계(`../../theme/tokens`)가 된 실제 import를 매칭하지 못함
- **Fix:** `(\.\.\/)?`를 `(\.\.\/)*`로 완화해 임의 깊이의 상대 경로를 허용
- **Files modified:** src/app/__tests__/foundation-wiring.test.ts
- **Verification:** `npm test` 전체 27 suites / 333 tests green
- **Committed in:** `abfa72f` (Task 2 커밋에 포함)

---

**Total deviations:** 1 auto-fixed (Rule 1 — 버그 수정)
**Impact on plan:** 화면 이동이라는 계획된 작업의 직접 파생 효과를 고치는 회귀 테스트 보정. 스코프 크리프 없음.

## Issues Encountered
- `.expo/types/router.d.ts`(typedRoutes 캐시, expo-router `experiments.typedRoutes: true`)가 이 worktree에 한 번도 생성된 적이 없어 acceptance criteria(`/priming` href 존재 확인)를 검증할 파일이 없었음. `CI=1 EXPO_NO_TELEMETRY=1 npx expo start --offline`을 20초간 백그라운드로 띄워 typegen만 트리거한 뒤 프로세스를 종료 — 생성된 파일에서 `/priming`, `${'/(tabs)'}`, `${'/(tabs)'}/calendar` 라우트가 모두 정상 존재함을 확인. `.expo/`는 `.gitignore` 대상이라 커밋하지 않음(로컬 검증 산출물).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 하단 탭바 셸과 오늘 화면 이동이 완료되어, 이후 plan(바텀시트, 저장된 체크인 핀, 이동 궤적선, 재센터/체크인 버튼의 바텀시트 연동)이 `(tabs)/index.tsx` 위에서 작업을 이어갈 좌표계 기준이 확정됨
- Phase 3의 체크인 코어 루프 동작·테스트(체크인 캡처/저장/드래프트 복구/재센터 버튼)가 새 경로에서도 회귀 없이 그대로 통과
- 알림 priming 리다이렉트(`<Redirect href="/priming">`)와 "첫 체크인 탭 시점 위치 권한 요청" 경계는 이동 전후로 로직 변경이 없어 다음 plan에서 재검증 불필요
- 블로커 없음

---
*Phase: 04-today-view*
*Completed: 2026-08-31*
