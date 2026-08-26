---
phase: 02-notification-infrastructure
plan: 06
subsystem: ui
tags: [expo-router, react-native, notifications, accessibility, tdd, jest-node]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    plan: 04
    provides: "src/notifications/permissions.ts — requestNotificationPermission/markPrimingDismissed/
      useNotificationPermissionBanner"
provides:
  - "src/app/priming.tsx — 알림 priming 전체화면 라우트 (/priming)"
  - "src/components/NotificationDeniedBanner.tsx — 재사용 가능한 알림 거부 상태 배너 + 설정 딥링크"
  - "src/components/__tests__/notificationUi.test.ts — 확정 카피 + 디자인 토큰 규율 + 접근성 최소 기준 12개 회귀 가드"
affects: [02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "네임스페이스 import(import * as permissions)로 정적 grep 계약 테스트가 함수/훅 식별자를
      호출부 1곳에서만 세도록 함 — import 목록에 함수명을 나열하지 않음(priming.tsx와
      NotificationDeniedBanner.tsx 양쪽 동일 패턴)"
    - "재사용 가능한 독립 UI 컴포넌트는 위치 지정(absolute positioning)이나 화면별 로직을
      내부에 갖지 않고 showBanner=false 시 null을 반환 — 배치는 항상 부모가 결정"
    - "정적 소스 분석 회귀 테스트(@jest-environment node, fs.readFileSync + stripComments)로
      카피/토큰/접근성 계약을 고정하는 foundation-wiring.test.ts 패턴을 컴포넌트 레이어로 확장"

key-files:
  created:
    - src/app/priming.tsx
    - src/components/NotificationDeniedBanner.tsx
    - src/components/__tests__/notificationUi.test.ts
  modified: []

key-decisions:
  - "requestNotificationPermission/markPrimingDismissed/useNotificationPermissionBanner를
    named import 대신 namespace import(permissions.xxx())로 호출 — acceptance criteria의
    grep -c 함수명 1회 등장 기준이 import 목록과 호출부 양쪽에서 중복 매치되는 문제를
    구조적으로 회피"
  - "배너 컴포넌트를 src/app/index.tsx(임시 부팅 확인 화면)가 아니라 재사용 컴포넌트로만
    만들고 배치는 이 plan의 스코프 밖(Plan 07)으로 남김 — UI-SPEC이 명시한 '최종 위치
    아님' 계약을 코드 구조로 강제"

requirements-completed: [REQ-permission-copy, REQ-notification-denied-flow]

# Metrics
duration: ~15min
completed: 2026-08-27
---

# Phase 2 Plan 6: 알림 priming 화면 + 거부 배너 컴포넌트 Summary

**expo-router `/priming` 전체화면(확정 카피 3종 + accent/Newsreader 미사용) + 재사용 가능한
`NotificationDeniedBanner` 컴포넌트를 12개 정적 계약 테스트로 고정**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-27 (worktree wave 3 base 정렬 후)
- **Completed:** 2026-08-27
- **Tasks:** 2 완료 (Task 2는 TDD RED → GREEN)
- **Files modified:** 3 (신규 생성)

## Accomplishments
- `src/app/priming.tsx` — expo-router `/priming` 라우트, UI-SPEC 6단계 세로 스택 레이아웃
  (세이프에어리어 + `spacing.xl` 상단 여백 → heading → CTA 필 버튼 → secondary 링크)을
  정확히 구현, 확정 카피 3종을 창작 없이 전사
- 두 인터랙션 모두 승인/거부와 무관하게 `router.replace('/')`로 홈 진입 —
  product-design.md T8("앱 사용을 막지 않는다") 준수, 중복 탭 방지용 in-flight 플래그 적용
- `colors.accent`/`typography.journalEntry`/`FootLog` 워드마크/빈도 UI 문자열 전부 미사용
  (UI-SPEC이 명시적으로 이 phase 밖으로 지정한 요소들)
- `src/components/NotificationDeniedBanner.tsx` — 위치 지정/화면별 로직 없는 재사용 가능한
  독립 컴포넌트, `showBanner=false`면 `null` 반환, 고정 불투명 `colors.surface` 배경으로
  02-RESEARCH.md Pitfall 6(가변 배경 위 대비 보장 불가) 회피
- `src/components/__tests__/notificationUi.test.ts` — 12개 정적 소스 분석 테스트로 카피/
  토큰/접근성/아이콘 미사용 계약을 고정, TDD RED(컴포넌트 부재로 스위트 실패) → GREEN
  (12/12 통과) 순서 준수
- 인터랙티브 요소 3개(허용하기/나중에/배너 전체) 전부 `minHeight: 44` + `accessibilityRole`/
  `accessibilityLabel` 확보

## Task Commits

Each task was committed atomically:

1. **Task 1: 알림 priming 전체화면 라우트** - `23a6cbd` (feat)
2. **Task 2: 알림 거부 배너 컴포넌트 + UI 계약 회귀 테스트 (RED)** - `4809662` (test)
3. **Task 2: 알림 거부 배너 컴포넌트 + UI 계약 회귀 테스트 (GREEN)** - `355e81d` (feat)

_Task 2는 계획대로 TDD RED → GREEN 순서로 분리 커밋됨. REFACTOR 단계는 불필요
(GREEN 구현이 이미 깔끔해 추가 정리 없이 바로 완료)._

## Files Created/Modified
- `src/app/priming.tsx` - `/priming` 라우트, priming 전체화면 (허용하기/나중에 액션)
- `src/components/NotificationDeniedBanner.tsx` - 재사용 가능한 알림 거부 배너 + 설정 딥링크
- `src/components/__tests__/notificationUi.test.ts` - 12개 정적 카피/토큰/접근성 계약 테스트

## Decisions Made
- 네임스페이스 import(`import * as permissions from '../notifications/permissions'`)로
  전환해 acceptance criteria의 `grep -c "requestNotificationPermission" == 1` /
  `grep -c "markPrimingDismissed" == 1` / `grep -c "useNotificationPermissionBanner" == 1`
  기준을 만족 — named import 방식은 import 목록과 호출부 양쪽에서 동일 리터럴이 매치돼
  카운트가 2가 되는 구조적 충돌이 있었음(계획 의도와 동일한 기능, import 스타일만 변경)

## Deviations from Plan

None - 계획대로 실행됨. 네임스페이스 import 전환은 계획이 명시한 acceptance criteria의
정확한 grep 카운트 기준을 만족시키기 위한 구현 세부사항이며, `<interfaces>` 블록이 정의한
함수 시그니처나 동작을 변경하지 않는다.

## Issues Encountered
- 워크트리에 `node_modules`가 없어 `npm test`/`tsc`가 즉시 실행 불가했음 — 메인 저장소의
  `node_modules`를 심볼릭 링크로 재사용(파괴적 명령 없이 해결, `npm install` 재실행 없이
  기존 락파일 기준 의존성 그대로 사용). 워크트리 전용 이슈이며 이 plan의 파일 변경과 무관.

## User Setup Required
None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 07(실제 화면 배선: `_layout.tsx`를 `SafeAreaProvider`로 감싸고, index에서 priming
  리다이렉트 조건 배선, 배너를 최종 위치로 재배치)이 이 plan의 두 export(`PrimingScreen`,
  `NotificationDeniedBanner`)를 import만으로 소비 가능
- 전체 스위트 99개 테스트 green(기존 87개 + 이 plan 12개), `tsc --noEmit` exit 0
- 블로커 없음 — `react-native-safe-area-context`의 `SafeAreaProvider` 트리 래핑은 Plan 07의
  스코프로 `<interfaces>` 블록에 이미 명시돼 있음(런타임 동작을 위해 필요)

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*
