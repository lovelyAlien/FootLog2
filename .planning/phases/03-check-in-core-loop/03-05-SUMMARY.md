---
phase: 03-check-in-core-loop
plan: 05
subsystem: check-in-core-loop
tags: [expo-location, permissions, appstate, react-native, jest]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (03-01)
    provides: "LocationDeps 타입, defaultLocationDeps, createFakeLocation 테스트 더블"
provides:
  - "src/checkin/permissions.ts — 위치 권한 조회/요청/배너 판정/포그라운드 재확인 훅"
  - "src/components/LocationDeniedBanner.tsx — 위치 권한 거부 조용한 배너"
  - "requestForegroundPermissionsAsync() 호출 책임 경계 확정: Phase 3 소유"
affects: [04-today-view-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "알림 권한 모듈(Phase 2)과 동일한 계약 복제: PermissionSnapshot 3필드 정규화, undetermined 가드절, isMounted + .catch(console.error) 훅 규약"
    - "subscribeToForegroundActive를 재구현하지 않고 notifications/permissions.ts에서 재사용(AppState 래퍼 단일화)"

key-files:
  created:
    - src/checkin/permissions.ts
    - src/checkin/permissions.test.ts
    - src/components/LocationDeniedBanner.tsx
    - src/components/__tests__/locationUi.test.ts
  modified: []

key-decisions:
  - "requestForegroundPermissionsAsync() 호출 소유권을 Phase 3로 확정(03-RESEARCH.md Open Questions #2 해소) — Phase 4는 온보딩 문구만 얹는다"
  - "위치 권한 priming 세션 플래그는 복제하지 않음 — 별도 priming 화면이 없고 권한 요청은 체크인 첫 탭 시점의 맥락적 요청"

patterns-established:
  - "위치 권한 판정은 알림과 동일하게 status==='denied' 하나만 본다(iOS Location Services 전역 꺼짐 vs 앱별 거부를 구분하지 않는 의도적 단순화)"

requirements-completed: [REQ-location-denied-flow]

# Metrics
duration: 8min
completed: 2026-08-27
---

# Phase 3 Plan 05: 위치 권한 거부 배너 Summary

**알림 권한 모듈(Phase 2)과 동일한 계약으로 위치 권한 조회/요청/배너 판정을 구현하고, `requestForegroundPermissionsAsync()` 호출 소유권을 Phase 3로 코드 주석에 명시적으로 확정**

## Performance

- **Duration:** 약 8분 (RED 테스트 → GREEN 구현 → tsc/전체 테스트 검증)
- **Tasks:** 2 completed
- **Files modified:** 4 (전부 신규 생성)

## Accomplishments

- `src/checkin/permissions.ts`: `fetchLocationPermission`, `requestLocationPermission`(undetermined 가드절 포함), `shouldShowLocationDeniedBanner`, `useLocationPermissionBanner` 구현. `subscribeToForegroundActive`는 재구현 없이 `notifications/permissions.ts`에서 재사용.
- `src/components/LocationDeniedBanner.tsx`: `NotificationDeniedBanner`와 동일한 톤(조용한 회색 배너, 아이콘/경고색 없음)으로 위치 권한 거부 배너 구현. 배치는 부모가 결정한다는 계약을 그대로 계승.
- 03-RESEARCH.md Open Questions #2("Phase 3 vs Phase 4의 위치 권한 요청 호출 책임 경계")를 해소 — 헤더 주석에 Phase 3가 소유함을 명시.
- 확정 문구/토큰/접근성/배치 계약을 정적 회귀 테스트로 고정.

## Task Commits

TDD 사이클로 두 태스크 모두 RED → GREEN 순서로 진행:

1. **Task 1 RED: 위치 권한 모듈 실패 테스트** - `d8c5191` (test)
2. **Task 1 GREEN: permissions.ts 구현** - `79b493c` (feat)
3. **Task 2 RED: LocationDeniedBanner UI 계약 실패 테스트** - `f8c187e` (test)
4. **Task 2 GREEN: LocationDeniedBanner.tsx 구현** - `b16525f` (feat)

**Plan metadata:** (아래 최종 커밋에서 기록)

## Files Created/Modified

- `src/checkin/permissions.ts` - 위치 권한 조회/요청/배너 판정/포그라운드 재확인 훅. 알림 모듈과 동일 계약.
- `src/checkin/permissions.test.ts` - 6개 테스트(fetch 3필드 정규화, undetermined/denied 요청 가드, 배너 판정, 포그라운드 재확인 구독/해제)
- `src/components/LocationDeniedBanner.tsx` - 위치 권한 거부 조용한 배너 컴포넌트
- `src/components/__tests__/locationUi.test.ts` - 8개 정적 소스 분석 테스트(확정 카피, 토큰, 접근성, 배치 계약)

## Decisions Made

- `requestForegroundPermissionsAsync()` 호출 책임을 Phase 3가 소유하는 것으로 확정하고 소스 주석에 근거(03-RESEARCH.md Open Questions #2)를 남김.
- priming 세션 플래그(알림 모듈의 `markPrimingDismissed`/`shouldShowPriming` 계열)는 위치 권한에 복제하지 않음 — 별도 priming 화면 없이 체크인 버튼 탭이 곧 맥락적 권한 요청이기 때문.

## Deviations from Plan

None — 계획대로 실행됨. 단, 실행 환경 준비를 위해 `npm ci`로 워크트리에 `node_modules`를 설치했다(패키지는 이미 `package.json`/`package-lock.json`에 선언돼 있었고, 새 패키지를 추가/치환하지 않았으므로 Rule 3의 "패키지 설치 제외" 조항 대상이 아님 — 기존 lockfile 그대로 재현).

## Issues Encountered

- Task 1 acceptance criteria 게이트(`markPrimingDismissed|shouldShowPriming` 문자열이 0회 등장해야 함)를 헤더 주석이 위반해 재작성 — 함수명을 직접 언급하지 않는 표현으로 수정 후 게이트 통과.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- Phase 4(오늘 뷰/온보딩)가 `useLocationPermissionBanner()`와 `LocationDeniedBanner`를 그대로 재사용할 수 있음 — import 경로만 바꿔 지도 상단으로 재배치 가능.
- `requestForegroundPermissionsAsync()` 호출 소유권이 Phase 3로 고정됐으므로 Phase 4는 요청 호출을 다시 만들지 않고 온보딩 문구만 얹으면 됨.
- 블로커 없음.

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/checkin/permissions.ts
- FOUND: src/checkin/permissions.test.ts
- FOUND: src/components/LocationDeniedBanner.tsx
- FOUND: src/components/__tests__/locationUi.test.ts
- FOUND commit: d8c5191 (test)
- FOUND commit: 79b493c (feat)
- FOUND commit: f8c187e (test)
- FOUND commit: b16525f (feat)
