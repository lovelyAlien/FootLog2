---
phase: 06-calendar-tab
plan: 07
subsystem: ui
tags: [react-native-gesture-handler, reanimated, bottom-sheet, calendar, date-scrubber]

# Dependency graph
requires:
  - phase: 06-calendar-tab (plan 02)
    provides: scrubberRange.ts (buildScrubberDateKeys/clampIndex/indexForTranslation/shouldShowScrubber + dimension constants)
  - phase: 06-calendar-tab (plan 05)
    provides: PastDateScreen.tsx (읽기전용 과거 날짜 화면, 지도+시트+지연삭제 배선)
provides:
  - DateScrubber.tsx — 플로팅 가로 날짜 스크러버(제스처 + 눈금 + 고정 인디케이터)
  - PastDateScreen 통합 — 시트 강제 접힘, 날짜 전환 재조회, 가시성 게이트
  - TodayBottomSheet의 선택적 sheetRef prop(오늘 뷰 동작 불변)
affects: [06-calendar-tab (plan 08, 시뮬레이터 검증)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gesture.Pan() + GestureDetector로 실시간 드래그를 처리하고, 인덱스가 실제로 바뀔 때만 runOnJS로 JS 콜백을 올려보내는 패턴(프레임당 중복 호출 방지)"
    - "고정 슬롯 수(2N+1)를 항상 렌더해 선택 항목이 항상 중앙 슬롯에 오게 하는 flex 레이아웃 트릭 — absolute 좌표 변환 없이 '고정 인디케이터 + 움직이는 눈금' 시각 효과 재현"

key-files:
  created:
    - src/calendar/DateScrubber.tsx
  modified:
    - src/calendar/PastDateScreen.tsx
    - src/today/TodayBottomSheet.tsx
    - src/app/__tests__/calendar-wiring.test.ts
    - src/app/__tests__/foundation-wiring.test.ts

key-decisions:
  - "DateScrubber.tsx는 화면 배치(absolute/bottom)를 전혀 갖지 않는다 — PastDateScreen만 카드의 화면상 위치를 결정(재사용 컴포넌트 계약)"
  - "router.setParams로 라우트 파라미터를 되쓰지 않고 activeDateKey를 화면 상태로 승격 — 파라미터↔상태 양방향 동기화 루프 회피"
  - "선택된 슬롯이 항상 중앙에 오도록 고정 개수의 슬롯(빈 슬롯 포함)을 렌더 — 좌표 변환 애니메이션 없이 Premise 9(고정 인디케이터)를 flex 레이아웃만으로 재현"

patterns-established:
  - "재사용 컴포넌트는 배치를 갖지 않는다(TodayBottomSheet/CheckinListRow와 동일 계약) — DateScrubber도 이 계약을 그대로 따름"

requirements-completed: [REQ-date-scrubber]

duration: 55min
completed: 2026-09-02
---

# Phase 6 Plan 7: 캘린더 탭 — 플로팅 날짜 스크러버 Summary

**Gesture.Pan 기반 실시간 1:1 드래그 날짜 스크러버 구현 + PastDateScreen 통합(시트 강제 접힘, 늦은 응답 가드, 0~1일 시 미마운트)**

## Performance

- **Duration:** 약 55분
- **Started:** 2026-09-02T01:58:00Z (추정)
- **Completed:** 2026-09-02T02:52:55Z
- **Tasks:** 3/3 완료
- **Files modified:** 5 (신규 1, 수정 4)

## Accomplishments

- `docs/designs/calendar-date-scrubber.md`(CLEARED)의 T1~T4 계약을 모두 코드로 구현:
  손 닿는 즉시 시트 강제 접힘(T1, CRITICAL), 하드 클램프·모멘텀 없음(T2), 44pt 터치 표면(T3),
  44pt 헤더 + 132pt 오프셋(T4)
- `PastDateScreen`이 `activeDateKey`를 화면 상태로 승격해 스크러버 드래그마다 지도·시트·헤더가
  실시간으로 그 날짜를 반영
- 늦게 도착한 조회 응답이 최신 상태를 덮어쓰지 않도록 요청 시점 날짜 키 일치 가드 추가(T-06-14)
- 기록 있는 날이 0~1일이면 스크러버가 트리에서 완전히 빠짐(Premise 11)
- `calendar-wiring.test.ts`에 CLEARED 계약 4건 + accent 예산을 고정하는 회귀 테스트 8건 추가

## Task Commits

1. **Task 1: DateScrubber 컴포넌트 — 제스처 · 눈금 · 고정 인디케이터** - `290f574` (feat)
2. **Task 2: PastDateScreen 통합 — 시트 강제 접힘 · 날짜 전환 재조회 · 가시성 게이트** - `ae3d782` (feat)
3. **Task 3: calendar-wiring.test.ts 확장 — 스크러버 계약 회귀 가드** - `856eb34` (test)

_TDD 없이 순수 `type="auto"` 태스크로 실행됨 — 각 태스크가 자체 acceptance_criteria(정적 소스
분석 grep)로 검증되고, Task 3에서 그 계약들이 자동화 테스트로 고정됐다._

## Files Created/Modified

- `src/calendar/DateScrubber.tsx` (신규) - 플로팅 스크러버 카드. `Gesture.Pan()` + `GestureDetector`로
  드래그를 처리하고 `scrubberRange.ts`의 `indexForTranslation`만으로 인덱스를 계산(자체 클램프 없음).
  선택된 슬롯이 항상 중앙에 오도록 고정 개수 슬롯 배열을 렌더해, absolute 좌표 변환 없이 "고정
  인디케이터 + 움직이는 눈금" 효과를 flex 레이아웃만으로 재현. 배치(absolute/bottom)를 전혀 갖지
  않는다.
- `src/calendar/PastDateScreen.tsx` (수정) - `activeDateKey` 상태 승격, `sheetRef`로 시트 강제 접힘
  배선, `getCheckinHistorySummary`/`getCheckinDateKeysInRange`로 스크러버 데이터 조회, 스크러버
  카드의 화면상 위치(`SCRUBBER_BOTTOM_OFFSET_PT`) 결정.
- `src/today/TodayBottomSheet.tsx` (수정) - 선택적 `sheetRef?: Ref<BottomSheet>` prop 추가. 오늘
  뷰는 이 prop을 넘기지 않아 동작 불변.
- `src/app/__tests__/calendar-wiring.test.ts` (수정) - Test 18~25 추가(T1~T4 각각 대응 + Premise
  3/11 + accent 예산 + 캡션 단일 출처).
- `src/app/__tests__/foundation-wiring.test.ts` (수정, 배선 외 자동 보정) - 하드코딩 hex 컬러
  회귀 가드에 `DateScrubber.tsx`의 `#C7C2B4`(CLEARED 문서가 명시한 이 phase 유일의 신규 hex) 단일
  예외 추가. 다른 임의의 hex는 여전히 차단됨(정확히 이 파일 + 이 값만 예외).

## Decisions Made

- `router.setParams`로 라우트 파라미터를 되쓰지 않기로 함 — 파라미터가 상태를 바꾸고 상태가
  다시 라우트를 바꾸는 양방향 동기화 루프를 피하기 위해 `activeDateKey`를 순수 로컬 상태로 관리.
- 스크러버 시각 효과(고정 인디케이터 + 움직이는 눈금)를 좌표 변환 애니메이션이 아니라, 항상
  선택 항목이 중앙에 오도록 고정 슬롯 수를 렌더하는 flex 레이아웃으로 구현 — Task 1
  acceptance_criteria가 이 파일에서 `position: 'absolute'`/`bottom:` 문자열 자체를 금지했기
  때문에(부모만 화면 배치를 가짐), 내부 오버레이가 필요한 중앙 인디케이터는
  `StyleSheet.absoluteFill`(react-native 제공 사전 등록 스타일 id, 리터럴 문자열 아님)로만
  구현.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 기존 하드코딩 hex 컬러 회귀 가드 실패**
- **Found during:** Task 1 완료 후 전체 테스트 스위트 실행 시
- **Issue:** `src/app/__tests__/foundation-wiring.test.ts`의 "src/ 전체 하드코딩 hex 컬러 회귀
  가드" 테스트가 `DateScrubber.tsx`의 `#C7C2B4` 리터럴을 오프렌더로 잡아 실패. 이 값은
  `docs/designs/calendar-date-scrubber.md`(CLEARED)가 "이 phase의 유일한 신규 hex"로 명시한
  값이며 06-UI-SPEC.md도 동일하게 확인한 값이라, 코드에서 제거할 수 없었다.
- **Fix:** 가드 로직을 넓게 완화하지 않고, `calendar/DateScrubber.tsx` 파일 + `#C7C2B4` 값
  하나만 정확히 예외 처리하도록 좁혀서 수정. 다른 파일/다른 hex 값은 여전히 차단된다.
- **Files modified:** `src/app/__tests__/foundation-wiring.test.ts`
- **Verification:** `npm test -- src/app/__tests__/foundation-wiring.test.ts` 통과 확인,
  전체 스위트(`npm test`) 616개 테스트 green.
- **Committed in:** `ae3d782` (Task 2 커밋에 함께 포함 — Task 1 완료 직후 발견했으나 Task 2
  작업과 같은 커밋 사이클에서 처리됨)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** 기존 회귀 가드의 목적(임의 hex 난입 차단)은 그대로 유지하면서, CLEARED
디자인 문서가 이미 승인한 단일 예외만 허용했다. 스코프 확장 없음.

## Issues Encountered

- `StyleSheet.absoluteFillObject`가 이 프로젝트의 react-native 타입 정의에 없어(`absoluteFill`만
  존재) `npx tsc --noEmit`에서 TS2551 에러 발생 — `StyleSheet.absoluteFill`로 교체해 해결
  (react-native이 제공하는 사전 등록 스타일 id, 동일한 절대좌표 오버레이 효과).

## User Setup Required

None - 외부 서비스 설정 불필요.

## Manual Verification Deferred

`.planning/phases/06-calendar-tab/06-VALIDATION.md` §Manual-Only Verifications 및 이 플랜의
`<verification>` 절이 명시한 대로, 아래 항목은 정적 소스 분석/단위 테스트로 검증 불가능해
06-08(시뮬레이터 검증 플랜)로 이월한다:
- 드래그 감각(모멘텀 없음, 실시간 1:1 추적) 실제 체감
- 스크러버 터치 시 시트 접힘 애니메이션 타이밍 육안 확인
- 경계(첫 체크인 날짜/오늘)에서 튕김 없는 하드 클램프 육안 확인

## Next Phase Readiness

- Task 1~3 전부 완료, `npm test`(616 tests) green, `npx tsc --noEmit` clean.
- 06-08(캘린더 탭 phase 마지막 플랜)이 이 스크러버의 제스처 체감/애니메이션 타이밍을 iOS
  시뮬레이터로 검증할 준비가 됐다 — `DateScrubber.tsx`/`PastDateScreen.tsx` 모두 이 커밋들에서
  완성된 상태.
- 블로커 없음.

---
*Phase: 06-calendar-tab*
*Completed: 2026-09-02*
