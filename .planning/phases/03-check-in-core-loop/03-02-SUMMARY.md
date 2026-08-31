---
phase: 03-check-in-core-loop
plan: 02
subsystem: checkin
tags: [typescript, jest, tdd, location, constants]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (03-01)
    provides: 패키지 legitimacy 감사 통과, expo-location 등 5개 패키지 설치
provides:
  - "src/checkin/fallbackLocation.ts — D-07 3단계 위치 폴백 체인의 마지막 단계 상수(FALLBACK_COORDINATE) + 좌표 유효성 헬퍼(isValidCoordinate)"
affects: [check-in-core-loop, today-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "순수 상수/함수 모듈(네이티브 import 없음)로 작성해 Node 테스트 환경에서 그대로 로드 — src/db/schema.ts, src/theme/tokens.ts와 동일 규약"
    - "값 출처를 헤더 주석에 명시하고 '여기서 값을 발명하지 않는다' 톤 유지 — 창업자 제공 데이터를 다루는 모듈의 반복 컨벤션"

key-files:
  created:
    - src/checkin/fallbackLocation.ts
    - src/checkin/fallbackLocation.test.ts
  modified: []

key-decisions:
  - "D-07 최종 폴백 좌표: 창업자가 checkpoint:decision에서 옵션 provide-coordinate(실제 생활권 좌표 사용)를 선택, 위도 37.3789 / 경도 127.1145 제공 — 에이전트가 추정/발명하지 않음(03-RESEARCH.md Open Questions #3 준수)"

patterns-established:
  - "placeholder(0,0) 잔존을 막는 자동 게이트 테스트 패턴 — 창업자 확인이 필요한 하드코딩 값에 재사용 가능"

requirements-completed: [REQ-location-denied-flow, REQ-checkin-confirm-pin]

# Metrics
duration: 5min
completed: 2026-08-27
---

# Phase 3 Plan 02: D-07 최종 폴백 좌표 확정 Summary

**창업자가 checkpoint에서 직접 제공한 실제 좌표(37.3789, 127.1145)로 `FALLBACK_COORDINATE` 상수를 고정하고, placeholder(0,0) 잔존을 막는 TDD 게이트 테스트를 추가**

## Performance

- **Duration:** 5 min (checkpoint 대기 시간 제외, 순수 실행 시간)
- **Tasks:** 2 (Task 1: checkpoint:decision, Task 2: auto/tdd)
- **Files modified:** 2 (신규 생성)

## Accomplishments
- Task 1: 창업자로부터 D-07 최종 폴백 좌표 확정값을 체크포인트를 통해 직접 수집(옵션 `provide-coordinate` 선택, 위도 37.3789 / 경도 127.1145)
- Task 2: `src/checkin/fallbackLocation.ts` 상수 모듈과 `fallbackLocation.test.ts` 게이트 테스트를 TDD(RED→GREEN)로 구현

## Task Commits

Each task was committed atomically:

1. **Task 1: D-07 최종 폴백 좌표값 확정 (창업자 입력 필수)** - 리포지토리 변경 없음(체크포인트 정보 수집만; 값은 Task 2 구현에 반영됨)
2. **Task 2: fallbackLocation.ts 상수 모듈 + placeholder 잔존 게이트 테스트**
   - RED: `de918f8` (test) — 실패하는 5개 테스트 작성, 모듈 미존재로 인한 실패 확인
   - GREEN: `e96ab5e` (feat) — 상수 모듈 구현, 5개 테스트 전부 green

**Plan metadata:** (이 커밋에서 함께 커밋됨)

_Note: Task 2는 TDD 태스크로 RED→GREEN 2개 커밋으로 구성됨. REFACTOR 단계는 불필요(코드가 이미 최소/단순)._

## Files Created/Modified
- `src/checkin/fallbackLocation.ts` - D-07 최종 폴백 좌표 상수(`FALLBACK_COORDINATE`)와 좌표 유효성 헬퍼(`isValidCoordinate`) export. 순수 상수/함수 모듈, 네이티브 의존성 없음.
- `src/checkin/fallbackLocation.test.ts` - placeholder(0,0) 잔존 방지 게이트 테스트 + 범위/NaN 검증 테스트 5개.

## Decisions Made
- **D-07 좌표값 확정:** 창업자가 옵션 `provide-coordinate`(실제 생활권 좌표 사용, D-07 원문 그대로)를 선택하고 위도 37.3789 / 경도 127.1145를 checkpoint를 통해 직접 제공했다. 이 값은 계획/구현 에이전트가 추정하거나 대신 만들어낸 것이 아니다 — 03-RESEARCH.md Open Questions #3이 명시적으로 요구한 절차를 그대로 따랐다.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. 전체 테스트 스위트(14 suites, 131 tests) 실행 결과 회귀 없음을 확인했다 — 특히 `src/app/__tests__/foundation-wiring.test.ts`의 hex 컬러/진행률 패턴 회귀 가드가 새 좌표 값과 충돌하지 않았다.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `FALLBACK_COORDINATE`와 `isValidCoordinate`가 확정되어, 이후 plan(위치 캡처 → 3단계 폴백 체인 조립)이 이 모듈을 최종 폴백 단계로 바로 import해서 사용할 수 있다.
- 블로커 없음.

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/checkin/fallbackLocation.ts
- FOUND: src/checkin/fallbackLocation.test.ts
- FOUND: .planning/phases/03-check-in-core-loop/03-02-SUMMARY.md
- FOUND commit: de918f8 (test)
- FOUND commit: e96ab5e (feat)
