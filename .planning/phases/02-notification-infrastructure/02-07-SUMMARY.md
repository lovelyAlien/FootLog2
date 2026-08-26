---
phase: 02-notification-infrastructure
plan: 07
subsystem: infra
tags: [expo-router, react-native, appstate, safe-area-context, notifications, jest]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    provides: "Plan 04(permissions.ts) 권한 판정/구독, Plan 05(registry.ts) 자가진단 오케스트레이터, Plan 06(NotificationDeniedBanner.tsx, priming.tsx) UI 조각"
provides:
  - "루트 레이아웃(_layout.tsx)에 SafeAreaProvider 배선 — priming 화면의 useSafeAreaInsets 전제 충족"
  - "콜드스타트/포그라운드 복귀 시 정확히 한 곳에서만 알림 자가진단을 실행하는 단일 AppState 리스너"
  - "홈 화면(index.tsx)의 priming 리다이렉트 게이트 + 거부 배너 임시 렌더링"
  - "배선 계약 회귀 테스트 10건(notification-wiring.test.ts)"
affects: [phase-04-today-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "단일 AppState 리스너 규율: migrateDbIfNeeded의 onInit 단일 호출 규율과 동일하게, runForegroundNotificationCheck도 _layout.tsx 한 곳에서만 호출하도록 정적 소스 테스트로 고정"
    - "선언형 Redirect 게이트: permission이 null인 초기 프레임에 false를 반환하는 shouldShowPriming과 조합해 router.replace 명령형 호출 없이 리다이렉트"

key-files:
  created:
    - src/app/__tests__/notification-wiring.test.ts
  modified:
    - src/app/_layout.tsx
    - src/app/index.tsx

key-decisions:
  - "배너를 index.tsx에 조건부 래핑 없이 렌더링 — NotificationDeniedBanner가 스스로 showBanner를 판정해 null을 반환하는 자기완결 계약을 그대로 소비"
  - "index.tsx 컨테이너를 screen/content 두 겹으로 분리 — 배너는 상단 고정, 기존 부팅 확인 콘텐츠는 세로 중앙 유지, 배경색 중복 지정 방지"

patterns-established:
  - "정적 소스 분석 회귀 가드에서 헤더/인라인 주석에 식별자 원문을 그대로 쓰면 grep 기반 acceptance criteria(예: 등장 횟수 3회)를 오염시킨다 — 주석에서는 식별자를 우회 표현으로 서술하고 실제 import/호출부에만 정확한 식별자를 남긴다"

requirements-completed: [REQ-notification-scheduling, REQ-notification-denied-flow]

duration: 15min
completed: 2026-08-27
---

# Phase 2 Plan 07: 알림 인프라 앱 배선 Summary

**루트 레이아웃에 SafeAreaProvider와 단일 AppState 알림 자가진단 리스너를 배선하고, 홈 화면에 priming 리다이렉트 게이트 + 거부 배너를 연결해 Plan 03~06의 알림 인프라 조각을 실제 앱 부팅 흐름으로 완성**

## Performance

- **Duration:** 약 15분
- **Started:** 2026-08-26T19:47:00Z (컨텍스트 로드 기준)
- **Completed:** 2026-08-27T04:02:33+09:00
- **Tasks:** 3
- **Files modified:** 3 (2 수정 + 1 생성)

## Accomplishments
- 콜드스타트 + 포그라운드 복귀가 정확히 하나의 `AppState` 리스너 경로로 권한 재확인·자가진단을 실행하도록 고정 (`_layout.tsx`)
- `SafeAreaProvider`를 `GestureHandlerRootView` 안, `SQLiteProvider` 밖에 배선해 `priming.tsx`의 `useSafeAreaInsets()` 런타임 전제 충족
- 홈 화면에 선언형 `<Redirect href="/priming">` 게이트(권한 미결정 시)와 `<NotificationDeniedBanner />` 상단 배치(거부 시) 연결
- 배선 계약 회귀 테스트 10건 신규 작성 — 중복 리스너, `AppState` 직접 등록, `expo-notifications` 격리 위반, priming 라우트 부재를 자동 감지

## Task Commits

Each task was committed atomically:

1. **Task 1: _layout.tsx — SafeAreaProvider + 단일 AppState 리스너 배선** - `9f58e38` (feat)
2. **Task 2: index.tsx — priming 리다이렉트 게이트 + 거부 배너 렌더링** - `7be4c91` (feat)
3. **Task 3: 배선 계약 회귀 테스트** - `b396577` (test)

_Note: Task 3은 tdd="true"였지만 Task 1/2가 이미 소스를 수정한 상태라 계획서가 명시한 대로 "즉시 통과 + 기대값 반전 검증" 절차를 따랐다(아래 Deviations 참고) — 별도 실패 커밋 없이 test 커밋 1개로 완결._

## Files Created/Modified
- `src/app/_layout.tsx` - `SafeAreaProvider` 배선 + 콜드스타트/포그라운드 복귀 시 `runForegroundNotificationCheck`를 호출하는 단일 `useEffect` 추가 (조기 반환보다 위, 훅 순서 유지)
- `src/app/index.tsx` - `shouldShowPriming` 기반 선언형 리다이렉트 게이트 + `NotificationDeniedBanner` 상단 렌더링, 컨테이너를 `screen`/`content`로 분리
- `src/app/__tests__/notification-wiring.test.ts` - 배선 계약 회귀 테스트 10건 (정적 소스 분석, `@jest-environment node`)

## Decisions Made
- 배너를 조건부 JSX 래핑 없이 항상 렌더링 — 컴포넌트 자체가 `showBanner=false`일 때 `null`을 반환하는 Plan 06 계약을 그대로 신뢰
- `index.tsx` 컨테이너 분리(`styles.screen` / `styles.content`) — 배너 상단 고정과 기존 부팅 확인 콘텐츠 세로 중앙을 동시에 만족시키기 위함, `backgroundColor`는 바깥 컨테이너로 단일화

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 주석 내 식별자 원문 노출로 grep 기반 acceptance criteria 오염**
- **Found during:** Task 1, Task 2 (초기 구현 직후 acceptance criteria 검증 단계)
- **Issue:** `_layout.tsx`/`index.tsx`에 추가한 설명 주석이 `SafeAreaProvider`, `runForegroundNotificationCheck`, `subscribeToForegroundActive`, `shouldShowPriming` 식별자를 그대로 인용해, `grep -c` 기반 등장 횟수 계약(예: `SafeAreaProvider` == 3)을 초과시킴
- **Fix:** 주석 문구를 우회 표현("아래에서 import한 구독 함수", "아래 판정 함수" 등)으로 재작성해 실제 import/호출부만 카운트되도록 수정. 동작·타입 변경 없음
- **Files modified:** src/app/_layout.tsx, src/app/index.tsx
- **Verification:** 모든 grep acceptance criteria 재검증 통과, `npx tsc --noEmit` / `npm test` 그대로 green 유지
- **Committed in:** 9f58e38, 7be4c91 (해당 task 커밋에 포함, 별도 커밋 없음)

---

**Total deviations:** 1 auto-fixed (Rule 1 - 회귀 테스트 계약을 만족시키기 위한 주석 표현 수정, 동작 변경 없음)
**Impact on plan:** 계획된 배선 로직·주석 의도는 그대로 유지, 표현만 조정. 스코프 크리프 없음.

## TDD Verification Note (Task 3)

Task 3은 계획서가 명시한 대로 Task 1/2가 이미 소스를 수정한 상태에서 작성됐다 — 전통적 RED(실패하는 테스트 먼저) 단계 대신, 각 단언의 기대값을 임시로 뒤집어(`toMatch` 패턴에 `ZZZ` 접미사 추가, `toHaveLength(1)`→`(2)`, `toEqual([])`→`(['ZZZ'])`, `toBe(true)`→`(false)` 등) 10개 테스트 전부가 올바른 이유로 실패하는지 확인한 뒤 원복했다. 이 절차로 각 단언이 실제로 소스를 읽고 판정함을(항상-참 assertion이 아님을) 검증했다. 최종 원본 파일은 10/10 통과.

## Issues Encountered
None - 위 Deviations 항목 외 특이사항 없음

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2(notification-infrastructure)의 8개 plan 중 07까지 완료 — 알림 스케줄링 + 자가진단 + 권한 UX(priming/배너)가 앱 부팅 흐름에 전부 연결됨
- `NotificationDeniedBanner`의 index.tsx 배치는 명시적으로 임시(Phase 4가 오늘 뷰를 만들 때 지도 상단으로 이관) — Phase 4 착수 시 이 파일의 배너 렌더링을 제거하고 import 경로만 옮기면 됨
- `src/app/index.tsx`는 여전히 Phase 1의 부팅 확인용 임시 화면이며 Phase 4가 오늘 뷰로 완전히 대체할 때까지 유지됨(4개 텍스트 요소 보존 확인됨)

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/app/_layout.tsx
- FOUND: src/app/index.tsx
- FOUND: src/app/__tests__/notification-wiring.test.ts
- FOUND: .planning/phases/02-notification-infrastructure/02-07-SUMMARY.md
- FOUND commit: 9f58e38
- FOUND commit: 7be4c91
- FOUND commit: b396577
- FOUND commit: 0718b4b
