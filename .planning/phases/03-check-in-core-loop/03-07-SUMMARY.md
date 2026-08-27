---
phase: 03-check-in-core-loop
plan: 07
subsystem: checkin
tags: [expo-location, promise-race, dependency-injection, jest, tdd, decision-tree]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: "03-01 LocationDeps/config 상수, 03-02 FALLBACK_COORDINATE/isValidCoordinate, 03-04 getLatestCheckinCoordinate, 03-05 PermissionSnapshot/requestLocationPermission"
provides:
  - "captureWithTimeout: 5초 Promise.race + OS 캐시 폴백 순수 함수"
  - "resolveCheckinLocation: 권한 판정 + 3단계 폴백 체인 + location_source 확정 순수 함수"
  - "applyDraggedSource: 드래그 시 gps_dragged 전이 함수"
  - "LOCATION_SOURCE_MAPPING_NOTE: 5개 location_source 값의 확정 트리거 매핑(소스 고정)"
affects: [03-check-in-core-loop 이후 플랜(확인 핀 화면, drafts 연동), 04-today-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.race + setTimeout으로 SDK에 없는 timeout 옵션을 직접 구현(getCurrentPositionAsync)"
    - "positionPromise.then(onFulfilled, onRejected) 형태로 rejection 핸들러를 동기적으로 부착해 unhandled rejection을 원천 차단"
    - "captureWithTimeout(deps, timeoutMs?)/resolveCheckinLocation({...,timeoutMs?}) 형태의 선택적 timeoutMs 테스트 훅으로 jest fake timer 없이 결정적 타임아웃 테스트"

key-files:
  created:
    - src/checkin/location.ts
    - src/checkin/location.test.ts
  modified: []

key-decisions:
  - "captureWithTimeout(deps, timeoutMs = CAPTURE_TIMEOUT_MS) 형태로 두 번째 선택 인자를 둠 — jest.useFakeTimers()+advanceTimersByTimeAsync 조합보다 단순하고 결정적(계획 Task 1 action이 권장한 방식 채택)"
  - "resolveCheckinLocation의 args 객체에 계획 인터페이스에 없던 선택적 timeoutMs 필드를 추가 — captureWithTimeout에 그대로 전달해 테스트가 5초 실타임아웃을 기다리지 않게 함(Rule 3: 5초 미만 실행시간 acceptance criteria 충족을 위한 블로킹 이슈 해결)"

patterns-established:
  - "위치 캡처 결정 트리 전체가 expo-location을 런타임 import하지 않는 순수 함수로 구현됨 — @jest-environment node 테스트가 네이티브 모듈 없이 5초 타임아웃/폴백 체인/권한 분기를 전부 검증"

requirements-completed: [REQ-checkin-core, REQ-checkin-confirm-pin, REQ-location-denied-flow]

# Metrics
duration: 5min
completed: 2026-08-27
---

# Phase 3 Plan 07: 체크인 위치 캡처 결정 트리 Summary

**5초 Promise.race 기반 GPS 타임아웃 + OS 캐시 폴백 + 앱 소유 3단계 폴백 체인을 순수 함수로 구현하고, 5개 location_source 값의 확정 트리거 매핑을 소스에 고정**

## Performance

- **Duration:** 5min
- **Started:** 2026-08-27T18:57:27+09:00
- **Completed:** 2026-08-27T19:01:32+09:00
- **Tasks:** 2
- **Files modified:** 2 (신규 생성)

## Accomplishments
- `captureWithTimeout`: `getCurrentPositionAsync`와 5초 타이머를 `Promise.race`로 경합시켜 GPS 성공/타임아웃 분기 확정, SDK에 존재하지 않는 `timeout` 옵션을 사용하지 않음
- `resolveCheckinLocation`: 권한 granted가 아니면 `expo-location`을 전혀 호출하지 않고 앱 소유 3단계 폴백 체인(최근 체크인 → 지도 마지막 좌표 → `FALLBACK_COORDINATE`)으로 즉시 진입
- `LOCATION_SOURCE_MAPPING_NOTE`로 03-RESEARCH.md Open Questions #1이 열어뒀던 5개 `location_source` 값의 트리거 조건을 소스 상수로 확정
- `applyDraggedSource`: 원 소스와 무관하게 드래그 시 `gps_dragged`로 즉시 전이, `accuracyMeters`는 `null`로 초기화

## Task Commits

Each task followed RED → GREEN TDD gates:

1. **Task 1: captureWithTimeout** — RED `62fa8bd` (test), GREEN `96e3e8f` (feat)
2. **Task 2: resolveCheckinLocation** — RED `7f23c77` (test), GREEN `0ee7865` (feat)

**Plan metadata:** (별도 커밋 예정 — 이 SUMMARY 및 REQUIREMENTS.md 커밋)

_TDD 게이트: 각 태스크마다 실패하는 테스트를 먼저 커밋(RED)하고, 최소 구현으로 통과시킨 뒤(GREEN) 커밋했다. REFACTOR 단계는 두 태스크 모두 필요 없었다(코드가 이미 단순함)._

## Files Created/Modified
- `src/checkin/location.ts` - `captureWithTimeout`, `resolveCheckinLocation`, `resolveFallbackChain`, `applyDraggedSource`, `LOCATION_SOURCE_MAPPING_NOTE`, 관련 타입(`Coordinate`, `CaptureResult`, `ResolvedLocation`, `FallbackSources`)을 export하는 순수 함수 모듈
- `src/checkin/location.test.ts` - 25개 테스트(Task 1: 6개, Task 2: 13개, 그 외 `resolveFallbackChain`/`LOCATION_SOURCE_MAPPING_NOTE` 단위 테스트 6개 포함), `@jest-environment node`, 개별 파일 실행 시간 약 1.3초

## Decisions Made
- `captureWithTimeout`에 `timeoutMs` 선택적 두 번째 인자를 둬 실제 5초를 기다리지 않고 결정적으로 타임아웃 경로를 테스트(계획 Task 1 action 문단이 명시한 두 옵션 중 후자 채택, jest fake timer 방식보다 단순)
- `resolveCheckinLocation`의 `args`에도 동일한 이유로 선택적 `timeoutMs` 필드를 추가해 `captureWithTimeout`에 그대로 전달 — 계획 인터페이스 원문에는 없던 필드이나, 없으면 Task 2의 "타임아웃" 경로 테스트마다 실제 5초(`CAPTURE_TIMEOUT_MS`)를 기다려야 해 "npm test -- src/checkin/location.test.ts 실행 시간 5초 미만" acceptance criteria를 구조적으로 만족할 수 없었음(Rule 3 — blocking issue auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] resolveCheckinLocation에 선택적 timeoutMs 필드 추가**
- **Found during:** Task 2 (resolveCheckinLocation 구현)
- **Issue:** 계획 원문의 `resolveCheckinLocation(args: { permission; deps?; fallbackSources })` 시그니처에는 타임아웃 제어 수단이 없어, "GPS granted + 타임아웃" 경로를 검증하려면 내부적으로 `CAPTURE_TIMEOUT_MS`(5000ms) 기본값이 그대로 쓰여 테스트가 매번 실제 5초를 기다려야 함 — 계획의 "npm test -- src/checkin/location.test.ts ... 실행 시간 5초 미만" acceptance criteria와 정면으로 충돌
- **Fix:** `args`에 선택적 `timeoutMs?: number` 필드를 추가하고 `captureWithTimeout(deps, args.timeoutMs ?? CAPTURE_TIMEOUT_MS)`로 그대로 전달. 프로덕션 호출부(화면)는 이 필드를 생략하면 기존과 동일하게 5000ms를 그대로 쓴다 — 동작 계약 자체는 변경 없음, 테스트 결정성만 확보
- **Files modified:** src/checkin/location.ts, src/checkin/location.test.ts
- **Verification:** `npm test -- src/checkin/location.test.ts` 전체(19개 테스트, Task 1 포함 총 25개 통과 시 기준) 약 1.3초에 완료, `npx tsc --noEmit` exit 0
- **Committed in:** `0ee7865` (Task 2 GREEN 커밋)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** 계획이 명시한 acceptance criteria(5초 미만 실행)를 실제로 충족시키기 위한 최소 확장이며, 프로덕션 동작 계약은 변경되지 않음. 스코프 크리프 없음.

## Issues Encountered
None - Task 1의 GREEN 구현 초안에서 `LAST_KNOWN_MAX_AGE_MS`를 동적 `import()`로 불필요하게 참조했던 실수를 즉시 정적 import로 교정했다(같은 GREEN 커밋 이전에 수정, 별도 커밋/이슈로 분리하지 않음).

## Known Stubs
None - 이 플랜은 UI 컴포넌트나 화면 배선을 포함하지 않는 순수 로직 모듈이라 stub 대상 자체가 없다. `resolveCheckinLocation`을 실제 확인 핀 화면에 연결하는 작업은 이후 플랜(03-08 이후, drafts/확인 핀 UI)의 책임이다.

## Threat Flags
None - `<threat_model>`이 이미 다룬 표면(T-3-02, T-3-19, T-3-20, T-3-21, T-3-03) 밖의 새 네트워크 엔드포인트/인증 경로/스키마 변경이 이 플랜에서 발생하지 않았다.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- `resolveCheckinLocation`/`applyDraggedSource`가 확인 핀 화면(드래그 가능한 마커, drafts 연동)이 곧바로 소비할 수 있는 계약으로 준비됨
- 5개 `location_source` 값 전부가 자동 테스트로 게이트되어 있어, 이후 플랜이 화면 배선만 추가하면 됨 — 위치 캡처 로직 자체를 다시 검증할 필요 없음
- 블로커 없음

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/checkin/location.ts
- FOUND: src/checkin/location.test.ts
- FOUND: .planning/phases/03-check-in-core-loop/03-07-SUMMARY.md
- FOUND: 62fa8bd, 96e3e8f, 7f23c77, 0ee7865 (task commits)
