---
phase: 03-check-in-core-loop
plan: 09
subsystem: ui
tags: [react-native-maps, expo-router, useReducer, sqlite, checkin-flow, gps]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: "03-04(drafts/checkins 리포지토리), 03-05(위치 권한/거부 배너), 03-07(위치 캡처 결정 트리), 03-08(체크인 상태 머신 + 액션 카드)"
provides:
  - "src/app/index.tsx가 최소 지도 화면(D-06)으로 대체됨 — 전체화면 Apple Maps + 배너 스택 + 체크인 알약버튼"
  - "체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 즉시 upsert 전체 배선"
  - "드래그 가능한 확인 핀(3가지 시각 상태) + 드래그 시 드래프트 좌표 즉시 갱신"
  - "checkin-wiring.test.ts 신규 정적 배선 계약 회귀 가드 13건"
affects: [03-10, 04-today-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "화면 상태를 useState 뭉치가 아니라 단일 useReducer(checkinReducer)로 관리"
    - "isMountedRef + .catch(console.error) 프로미스 미삼킴 규약을 이펙트뿐 아니라 사용자 트리거 비동기 핸들러에도 동일 적용"
    - "MapView 전체화면 + 상단 배너 스택(absolute) + 하단 조건부 렌더링(체크인 버튼 vs 액션 카드) 레이아웃"

key-files:
  created:
    - src/app/__tests__/checkin-wiring.test.ts
  modified:
    - src/app/index.tsx
    - src/app/__tests__/foundation-wiring.test.ts

key-decisions:
  - "StyleSheet.absoluteFillObject가 설치된 RN 버전 타입에 존재하지 않아 StyleSheet.absoluteFill로 대체(동일 기능, tsc 게이트 통과 목적)"
  - "foundation-wiring.test.ts Test 6을 '체크인 버튼에만 accent 등장(2회 이하)'에서 '체크인 버튼 + 확인 핀(지도 마크) 두 승인 용도까지 포함(5회 이하)'으로 재조정 — Task 2가 추가한 확인 핀도 DESIGN.md 승인 accent 6개 용도 중 '지도 마크'에 해당하므로 원래 계획의 상한이 과소 산정이었음"
  - "확인/재시도/사진/메모 핸들러는 03-10에서 실배선 예정이므로 no-op + TODO(03-10) 주석으로 남김(계획 명시 지시)"

requirements-completed: [REQ-checkin-core, REQ-checkin-confirm-pin, REQ-location-denied-flow]

duration: 55min
completed: 2026-08-27
---

# Phase 3 Plan 09: 최소 지도 화면 + 체크인 캡처 배선 Summary

**Phase 1 부팅 확인 화면을 전체화면 Apple Maps 지도로 대체하고, 체크인 탭 → 위치 캡처(권한 요청/5초 타임아웃/3단계 폴백) → 드래그 가능한 확인 핀 드롭 → SQLite 드래프트 즉시 upsert까지 한 번에 배선.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-08-27T09:49:00Z (근사치 — 파일 discovery 시작 시점)
- **Completed:** 2026-08-27T10:44:30Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `src/app/index.tsx`가 Phase 1 진단용 임시 화면에서 D-06이 정한 "최소 지도 화면"으로 완전히 대체됨 — 전체화면 `MapView`(Apple Maps 기본 provider, `showsUserLocation`), 상단 배너 스택(`NotificationDeniedBanner` → `LocationDeniedBanner`), 하단 체크인 알약버튼
- 체크인 탭 한 번으로 권한 요청 → GPS 캡처(5초 타임아웃) → 실패 시 OS 캐시 → 앱 폴백 체인까지 이어지는 전체 위치 캡처 경로가 배선되고, 결과가 뜨는 즉시 `drafts` 테이블에 upsert되어(D-03) 화면 이탈/강제종료를 버팀
- 드래그 가능한 확인 핀이 `gps_auto`/저정확도·거부 폴백/`gps_dragged` 3가지 시각 상태로 구분되어 렌더링되고, 드래그가 끝나면 좌표와 `location_source`가 드래프트에 즉시 반영됨
- 지도 스타일 토큰(`colors.mapLand/mapRoad/mapWater`)과 `customMapStyle`/`PROVIDER_GOOGLE`을 이 화면에서 쓰지 않는다는 결정을 정적 회귀 테스트로 고정

## Task Commits

1. **Task 1: 전체화면 MapView + 배너 스택 + 체크인 알약버튼** - `76acb90` (feat)
2. **Task 2: 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 + 드래프트 upsert** - `57ac2e2` (feat)

_Plan metadata commit is created by the wave orchestrator after merge (worktree mode)._

## Files Created/Modified

- `src/app/index.tsx` - Phase 1 부팅 확인 화면 → 최소 지도 화면(D-06) 완전 대체. MapView + 배너 스택 + 체크인 알약버튼(Task 1), 체크인 탭 핸들러 + 확인 핀 렌더링/드래그 + 드래프트 upsert(Task 2)
- `src/app/__tests__/checkin-wiring.test.ts` - 신규. 03-09가 배선한 계약(위치/드래프트 함수 호출, Marker draggable, 지도 스타일 토큰 회귀, SQL/네이티브 import 격리) 13건 정적 검증
- `src/app/__tests__/foundation-wiring.test.ts` - Test 6을 "colors.accent가 체크인 버튼에만" 조건에서 "체크인 버튼 + 확인 핀(지도 마크) 두 승인 용도까지" 조건으로 갱신

## Decisions Made

- **StyleSheet.absoluteFillObject 미존재 대응:** 설치된 `react-native` 버전의 타입 정의에 `absoluteFillObject`가 없고(`absoluteFill`만 export) `tsc --noEmit`이 이를 컴파일 에러로 잡아냈다. 계획 문서가 명시한 이름 대신 동일 기능의 `StyleSheet.absoluteFill`로 치환(Rule 3 — 블로킹 이슈 자동 수정, 타입 정의 버전 차이).
- **foundation-wiring.test.ts Test 6 상한 재조정:** Task 1 지시대로 "accent가 체크인 버튼에만, 2회 이하"로 먼저 갱신해 Task 1 단독 상태에서는 그대로 통과했다. Task 2에서 확인 핀(지도 마크, DESIGN.md 승인 accent 6개 용도 중 하나)이 accent/accentSoft를 추가로 쓰면서 상한 2가 실제 필요한 용도 수보다 낮아 실패했다 — 계획 작성 시점에 Task 2 산출물이 고려되지 않았던 것으로 판단, 버튼+확인 핀 두 승인 용도를 모두 포함하는 상한(5)과 두 용도의 실제 존재 여부를 함께 검증하는 형태로 갱신(Rule 1 — 테스트 버그 자동 수정).
- **확인/재시도/사진/메모 핸들러 no-op 처리:** 계획이 명시적으로 "03-10에서 채운다"고 지시한 범위이므로 `TODO(03-10)` 주석과 함께 no-op으로 남김. `CheckinActionCard`는 렌더링되지만 상호작용은 아직 배선되지 않음(계획된 스코프, 스텁 아님).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] StyleSheet.absoluteFillObject → StyleSheet.absoluteFill 치환**
- **Found during:** Task 1 (`npx tsc --noEmit` 실행)
- **Issue:** 계획이 명시한 `StyleSheet.absoluteFillObject`가 설치된 `react-native` 버전의 타입 선언에 존재하지 않음(`TS2551: Property 'absoluteFillObject' does not exist... Did you mean 'absoluteFill'?`)
- **Fix:** 동일한 절대위치 전체채움 스타일 객체인 `StyleSheet.absoluteFill`로 교체
- **Files modified:** `src/app/index.tsx`
- **Verification:** `npx tsc --noEmit` exit 0
- **Committed in:** `76acb90` (Task 1 commit)

**2. [Rule 1 - Bug] foundation-wiring.test.ts Test 6 상한을 확인 핀의 정당한 accent 용도까지 포함하도록 보정**
- **Found during:** Task 2 (`npm test -- src/app` 실행, Test 6 실패)
- **Issue:** Task 1이 갱신한 Test 6("accent가 체크인 버튼에만, 2회 이하")은 Task 2가 추가하는 확인 핀 시각 상태(`pinConfident`/`pinFallback`/`pinDragged`, 총 3회 추가 accent/accentSoft 사용)를 고려하지 않아, Task 2 완료 후 실제 5회 등장으로 테스트가 실패함. 확인 핀은 DESIGN.md가 승인한 accent 6개 용도 중 "지도 마크"에 해당하는 정당한 두 번째 용도이므로, 상한을 낮추는 대신(즉 accent를 핀에서 빼는 대신) 테스트를 실제 요구사항에 맞게 넓히는 것이 올바른 수정이라 판단
- **Fix:** 상한을 2 → 5로 조정하고, 두 승인 용도(체크인 버튼/확인 핀)의 스타일 정의가 실제로 존재하는지 확인하는 보조 단언 추가 — 상한만 느슨하게 풀고 실제 검증을 생략하는 것을 방지
- **Files modified:** `src/app/__tests__/foundation-wiring.test.ts`
- **Verification:** `npm test -- src/app` 전체 green(32건), `npm test` 전체 스위트 green(260건)
- **Committed in:** `57ac2e2` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking — 타입 정의 버전 차이, 1 bug — 계획 시점 테스트가 이후 task 산출물을 반영하지 못함)
**Impact on plan:** 둘 다 기능/스코프 변경이 아니라 계획 문서와 실제 설치된 패키지 버전/실행 순서 사이의 사소한 불일치를 바로잡은 것. 스코프 추가나 아키텍처 변경 없음.

## Known Acceptance-Criteria Mismatch (비차단, 문서화만)

`03-09-PLAN.md` Task 1 acceptance_criteria의 `grep -c "useReducer" src/app/index.tsx 가 1` 항목은 실제로 2를 반환한다(import 줄 1 + 사용 줄 1). 이는 `useReducer`가 import되고 곧바로 호출되는 통상적인 구조에서는 구조적으로 피할 수 없는 카운트이며(Task 2 acceptance_criteria의 `upsertDraft`/`updateDraftCoordinate` 등 다른 식별자는 모두 "1 이상"으로 명시해 이 이중 카운트를 이미 감안하고 있음), 검증하려는 실질 내용("화면 상태가 흩어진 `useState`가 아니라 단일 `useReducer`로 관리된다")은 코드로 충족됨. 게이팅 자동화 검증(`npm test -- src/app`, `npx tsc --noEmit`)은 모두 green이라 이 grep 항목만의 불일치는 실행을 막지 않았다.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/app/index.tsx`가 실제로 존재하는 화면이 되어 창업자가 실기기에서 체크인 버튼 → 확인 핀 플로우를 수동 QA할 수 있는 상태
- 03-10(저장 확정/재시도/사진/메모 배선)이 이어받을 지점이 `TODO(03-10)` 주석으로 명확히 표시됨 — `CheckinActionCard`는 이미 렌더링되므로 03-10은 핸들러 배선에만 집중 가능
- Phase 4(오늘 뷰)는 이 파일의 지도/캡처/드래그 로직을 그대로 재사용하고 배너 스택 위치만 이관하면 됨(주석에 명시)
- 블로커 없음

## Self-Check: PASSED

- FOUND: src/app/index.tsx
- FOUND: src/app/__tests__/checkin-wiring.test.ts
- FOUND: src/app/__tests__/foundation-wiring.test.ts
- FOUND commit: 76acb90
- FOUND commit: 57ac2e2

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*
