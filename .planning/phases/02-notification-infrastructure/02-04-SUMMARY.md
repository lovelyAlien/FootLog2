---
phase: 02-notification-infrastructure
plan: 04
subsystem: notifications
tags: [expo-notifications, appstate, permissions, tdd, jest-node]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    plan: 01
    provides: "src/notifications/config.ts(NotificationDeps), src/notifications/deps.ts(defaultNotificationDeps),
      src/notifications/testing/fakeNotifications.ts(createFakeNotifications 인메모리 더블)"
provides:
  - "src/notifications/permissions.ts — fetchNotificationPermission/requestNotificationPermission/
    shouldShowDeniedBanner/shouldShowPriming/markPrimingDismissed/resetPrimingSession/
    subscribeToForegroundActive/useNotificationPermissionBanner"
affects: [02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "권한 판정 로직을 @jest-environment node로 검증 가능한 순수/주입형 함수로 전부 분리,
      React 렌더러가 필요한 훅(useNotificationPermissionBanner)은 조립만 하는 얇은 껍데기로 유지"
    - "AppStateLike 구조적 타입 + 기본 인자 주입 패턴(subscribeToForegroundActive(handler, appState = AppState)) —
      테스트 파일은 실제 react-native AppState를 import하지 않고 인라인 페이크만 사용"
    - "priming 세션 플래그는 모듈 레벨 변수로 의도적 비영속화(정확성 목적 — 무한 리다이렉트 방지, UX
      선호 아님), resetPrimingSession()으로만 테스트 격리"

key-files:
  created:
    - src/notifications/permissions.ts
    - src/notifications/permissions.test.ts
  modified: []

key-decisions:
  - "fakeNotifications.ts(Plan 01 산출물)에 requestPermissionsAsync 전용 호출 카운터가 없어,
    migrations.test.ts Test 6과 동일한 패턴(jest.fn으로 감싼 스파이를 얕은 복사 deps 객체에 주입)으로
    Test 7~9의 호출 횟수를 관찰 — fakeNotifications.ts는 이 plan의 files_modified 범위 밖이라 수정하지 않음"
  - "it('Test N: ...') 리터럴 grep 패턴(정확히 16회)을 만족시키기 위해 테스트 설명문 내부의 모든
    작은따옴표를 \\'로 이스케이프하고 전체를 작은따옴표 문자열로 통일 — Plan 01 Deviation #3과 동일한
    이슈, 동일한 해법 재사용"

requirements-completed: [REQ-notification-denied-flow]

# Metrics
duration: ~20min
completed: 2026-08-27
---

# Phase 2 Plan 4: 알림 권한 판정/재확인 모듈 Summary

**권한 조회/요청, 거부 배너 판정, AppState 포그라운드 재확인 구독, priming 세션 플래그를 16개
순수/주입형 테스트로 고정하고 이를 조립만 하는 얇은 React 훅으로 배선**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-27 (worktree wave 2 base 정렬 후)
- **Completed:** 2026-08-27
- **Tasks:** 2 완료 (TDD RED → GREEN)
- **Files modified:** 2 (신규 생성)

## Accomplishments
- `PermissionSnapshot`(status/granted/canAskAgain 표준 3필드) 계약 정의, `getPermissionsAsync()` 원본
  응답에서 `ios` 등 플랫폼 전용 필드를 걸러내는 `fetchNotificationPermission` 구현
- `requestNotificationPermission`에 `status !== 'undetermined'` 가드절 적용 — 이미 거부/승인된
  상태에서 OS 프롬프트를 반복 시도하지 않음(threat T-02-10 완화, Test 8/9로 호출 횟수 0 회귀 고정)
- `shouldShowDeniedBanner`를 `status === 'denied'` 기준으로만 판정(`undetermined`은 `granted: false`여도
  배너 대상 아님) + `null` 초기 프레임에서 배너가 깜빡이지 않도록 처리
- 모듈 레벨 priming 세션 플래그(`markPrimingDismissed`/`resetPrimingSession`/`shouldShowPriming`)로
  "나중에" 탭 후 index → priming 무한 리다이렉트 루프 차단, 의도적 비영속(Phase 6/7 영속화 예정)
- `AppStateLike` 구조적 타입 + 기본 인자 주입으로 `subscribeToForegroundActive` 구현 — `active` 전환에만
  재확인 트리거, 반환된 unsubscribe로 리스너 누수 방지
- `useNotificationPermissionBanner` 훅은 위 함수들을 조립만 하는 얇은 껍데기 — `src/app/index.tsx`와
  동일한 `isMounted` 가드 + `.catch(console.error)` 프로미스 미삼킴 규약, `Linking.openSettings()`로
  설정 딥링크(threat T-02-09 완화, `app-settings:` 리터럴 직접 사용 없음)
- TDD RED(16개 테스트, 전부 "not implemented"로 실패) → GREEN(16개 전부 통과) 순서 준수

## Task Commits

Each task was committed atomically:

1. **Task 1: permissions.test.ts — 판정/재확인/세션 시나리오 실패 테스트 작성 (RED)** - `95050bd` (test)
2. **Task 2: permissions.ts 구현 — 판정 함수 + 포그라운드 구독 + 얇은 훅 (GREEN)** - `09d7ea7` (feat)

_TDD 태스크는 계획대로 test→feat 2단계 커밋으로 분리됨. REFACTOR 단계는 불필요(GREEN 구현이 이미
깔끔해 추가 정리 없이 바로 완료)._

## Files Created/Modified
- `src/notifications/permissions.ts` - 권한 조회/요청/판정 순수 함수 + `AppStateLike` 포그라운드 구독 +
  priming 세션 플래그 + `useNotificationPermissionBanner` 훅
- `src/notifications/permissions.test.ts` - 16개 시나리오 테스트(`@jest-environment node`,
  `-t bannerVisibility` / `-t appStateRecheck` 필터 계약 준수)

## Decisions Made
- `fakeNotifications.ts`(Plan 01 산출물, 이 plan의 `files_modified` 범위 밖)에 `requestPermissionsAsync`
  전용 호출 카운터가 없어, `migrations.test.ts` Test 6과 동일한 스파이 주입 패턴(`jest.fn(fake.x)`을
  얕은 복사 deps 객체에 주입)으로 Test 7~9의 호출 횟수를 관찰
- acceptance criteria의 `grep -c "it('Test " == 16` 리터럴 패턴을 만족시키기 위해 모든 테스트 설명문을
  작은따옴표 문자열로 통일하고 내부 작은따옴표는 `\'`로 이스케이프(Plan 01 Deviation #3과 동일 이슈,
  동일 해법)

## Deviations from Plan

None - 계획대로 실행됨. `requestPermissionsAsync` 스파이 주입 방식과 테스트 문자열 인용부호 통일은
계획의 `<read_first>`가 명시한 `migrations.test.ts`/Plan 01 규약을 그대로 따른 구현 세부사항이며,
계획 의도(순수/주입형 함수 16개 테스트 고정)에서 벗어나지 않는다.

## Issues Encountered
None.

## User Setup Required
None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 06(priming 화면/배너 컴포넌트)과 Plan 07(실제 화면 배선)이 `<interfaces>` 블록의 8개 export만으로
  코드베이스 탐색 없이 소비 가능
- `useNotificationPermissionBanner` 자체의 React 렌더링 검증은 이 plan의 스코프 밖(node 환경과 충돌) —
  Plan 07의 정적 회귀 테스트와 Plan 08의 실기기 검증이 커버 예정, 계획서에 이미 명시된 분업
- 전체 스위트 73개 테스트 green(기존 57개 + 이 plan 16개), `tsc --noEmit` exit 0
- 블로커 없음

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*
