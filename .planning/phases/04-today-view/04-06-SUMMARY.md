---
phase: 04-today-view
plan: 06
subsystem: ui
tags: [react-native, reanimated, gorhom-bottom-sheet, expo-router, jest]

# Dependency graph
requires:
  - phase: 04-today-view (plan 04)
    provides: TodayBottomSheet 컴포넌트(containerHeight/animatedPosition props 계약)
  - phase: 04-today-view (plan 05)
    provides: todayCheckins 화면 상태(getTodayCheckins 단일 쿼리, D-11)
provides:
  - 오늘 화면에 실제로 마운트된 3단 스냅 바텀시트(체크인 진행 중과 상호 배타적 렌더, D-04)
  - 시트 상단을 실시간 추적하는 플로팅 체크인/재센터 버튼 연속 오프셋(D-05)
  - "체크인 중 재센터 버튼 노출 여부" 결정 확정(option-a) + 04-UI-SPEC.md 문서-코드 불일치 정정
  - D-04/D-05/D-09 배선 계약 회귀 가드 테스트 31개
affects: [04-today-view (plan 07, 시뮬레이터 검증)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "reanimated default export를 Reanimated로 명시 바인딩해 react-native Animated(크로스페이드용)와의 이름 충돌 회피"
    - "useAnimatedStyle 워크릿 안에서 containerHeight<=0 조기 폴백 분기를 둬 레이아웃 측정 전 음수 오프셋 방지"
    - "삼항 조건부 렌더로 화면 최하단 공간을 공유하는 두 UI(시트/액션카드)를 언마운트 기준으로 상호 배타화(D-04, CheckinActionCard와 동일 계약)"

key-files:
  created: []
  modified:
    - "src/app/(tabs)/index.tsx"
    - "src/app/__tests__/today-wiring.test.ts"
    - ".planning/phases/04-today-view/04-UI-SPEC.md"

key-decisions:
  - "Task 1 체크포인트: 체크인 진행 중 재센터 버튼 노출 여부 — option-a(Phase 3 동작 유지, 재센터 버튼도 언마운트) 채택. 회귀 위험 0, 확인 핀 확정 중 지도를 옮길 이유 없음(핀을 잃어버리는 혼란 방지), 구현 비용 0이 근거"
  - "04-UI-SPEC.md z-order 분기 B 문서가 실제 Phase 3 코드 동작(재센터 버튼도 언마운트)과 반대로 적혀 있던 사실 오인을 코드에 맞춰 정정"

patterns-established:
  - "부모 소유 SharedValue를 prop으로 자식(TodayBottomSheet)에 넘기고 부모가 useAnimatedStyle에서 읽는 계약 — 이산 콜백(onChange) 대신 연속값으로 실시간 추적이 필요한 다음 화면(캘린더 등)에도 재사용 가능"

requirements-completed: [REQ-today-view]

# Metrics
duration: ~35min (Task 1 체크포인트 대기 시간 제외 순수 실행 시간 추정치 — 정확한 시작 타임스탬프는 체크포인트 중단으로 기록되지 않음)
completed: 2026-08-31
---

# Phase 4 Plan 06: 오늘 뷰 바텀시트 배선 Summary

**오늘 화면에 3단 스냅 바텀시트를 체크인 상태와 상호 배타적으로 마운트하고(D-04), 플로팅 체크인/재센터 버튼이 reanimated useAnimatedStyle로 시트 상단을 실시간 추적하게(D-05) 배선 — 오늘 뷰가 제품 문서의 완성 형태(지도+시트+상시 접근 가능한 체크인 버튼+상시 탭바)에 도달**

## Performance

- **Duration:** ~35분 (체크포인트 대기 시간 제외 추정치)
- **Completed:** 2026-08-31T05:57:46Z
- **Tasks:** 3 (Task 1 checkpoint:decision + Task 2 auto + Task 3 auto)
- **Files modified:** 3

## Accomplishments

- 체크인 진행 중 재센터 버튼 노출 여부를 창업자 결정으로 확정(option-a)하고 문서-코드 불일치를 정정
- `TodayBottomSheet`를 `showActionCard`가 false인 분기에서만 마운트(언마운트 계약, D-04)
- `onLayout` 기반 `containerHeight` 측정 + `useSharedValue`/`useAnimatedStyle`로 플로팅 버튼이 시트 상단 + `spacing.lg`를 실시간 추적(D-05)
- D-04/D-05/D-09 배선 계약을 정적 소스 분석 테스트 31개로 고정, 전체 스위트 410개 테스트 green

## Task Commits

Each task was committed atomically:

1. **Task 1: 체크인 진행 중 재센터 버튼 노출 여부 확정** - `94d8343` (docs) — 코드 변경 없음, `04-UI-SPEC.md` z-order 정정만 커밋
2. **Task 2: 바텀시트 마운트 게이트(D-04) + 플로팅 버튼 연속 오프셋(D-05)** - `499df25` (feat)
3. **Task 3: D-04/D-05/D-09 배선 계약 회귀 가드 확장** - `699f788` (test)

_이 plan은 TDD 플랜이 아니다(`type="execute"`) — 위 세 커밋은 각 태스크 단위 원자적 커밋이다._

## Files Created/Modified

- `src/app/(tabs)/index.tsx` - `onLayout`으로 `containerHeight` 측정, `sheetPosition` SharedValue 생성, `TodayBottomSheet` 마운트(D-04), 체크인/재센터 버튼 컨테이너를 `Reanimated.View` + `floatingButtonStyle`로 전환(D-05)
- `src/app/__tests__/today-wiring.test.ts` - D-04/D-05/D-09/제스처-레이어/배너 불변 계약 회귀 가드 6개 describe 블록, 테스트 16개 추가(기존 15개 + 신규 16개 = 31개)
- `.planning/phases/04-today-view/04-UI-SPEC.md` - z-order 분기 B 줄을 실제 Phase 3 코드 동작(재센터 버튼도 언마운트)에 맞춰 정정, 결정 근거와 날짜 기록

## Decisions Made

- **Task 1 체크포인트 결정 — option-a 채택:** 체크인 진행 중(확인 핀/액션 카드 표시 중)에는 재센터 버튼도 계속 언마운트한다(Phase 3 기존 동작 유지). 창업자가 명시적으로 선택 — 근거는 기존 동작과 100% 동일해 회귀 위험 0, 액션 카드와 시각적 겹침 없음, 확인 핀 확정 중 지도를 옮길 이유가 없어 핀을 잃어버리는 혼란을 방지, 구현 비용 0. 반대급부로 04-UI-SPEC.md 문서 한 줄이 실제 코드와 불일치했던 것을 이번 plan에서 정정했다.
- **useSharedValue/useAnimatedStyle 카운트 테스트 표현 방식:** PLAN.md acceptance criteria가 예시로 든 셸 커맨드(`grep -c "useSharedValue"`)는 리터럴 문자열 매칭이라 import 선언 줄(`import Reanimated, { useAnimatedStyle, useSharedValue } from ...`)과 실제 호출 줄(`useSharedValue(0)`)을 모두 매칭해 값이 2가 되어 "정확히 1"이라는 문구와 문자 그대로는 충돌한다. Task 3 테스트는 실제 의도(단일 SharedValue 호출 지점)를 정확히 검증하도록 `/\buseSharedValue\(/g`(괄호 포함, 호출 구문만) 패턴으로 작성해 카운트 1을 확인했다 — 함수 호출 여부가 아니라 식별자 등장 여부만 보는 리터럴 grep의 한계를 보완한 것이며 실제 구현/의도와는 차이가 없다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] foundation-wiring Test 7(진행률 패턴 회귀 가드) 충돌 코멘트 수정**
- **Found during:** Task 2 (`npm test` 실행 중 실패 발견)
- **Issue:** 새로 추가한 헤더 코멘트에 `checkin-wiring Test 9/39`라는 표현이 있었는데, `foundation-wiring.test.ts` Test 7이 `indexSource`(주석 포함 원본) 전체에서 `\b\d+\s*\/\s*\d+\b`(진행률 N/M 패턴) 정규식으로 회귀를 검사한다 — `9/39`가 이 패턴에 우연히 매칭돼 테스트가 실패했다.
- **Fix:** 코멘트 문구를 `checkin-wiring gesture-handler 미사용 회귀 가드`로 바꿔 숫자/숫자 패턴을 제거했다(의미는 동일하게 유지).
- **Files modified:** `src/app/(tabs)/index.tsx`
- **Verification:** `npm test` 전체 스위트 396→410개(Task 3 반영 후) 전부 green
- **Committed in:** `499df25` (Task 2 커밋에 포함 — 별도 수정 커밋을 만들지 않고 같은 태스크 작업 중 발견/수정)

**2. [Rule 3 - Blocking] 워크트리에 `node_modules`가 없어 `npm install` 실행**
- **Found during:** Task 2 (`npx tsc --noEmit`/`npm test` 실행 시도 시 발견)
- **Issue:** 이 워크트리는 새로 생성된 상태라 `node_modules`가 아예 없었다(메인 저장소에는 존재) — `package.json`/`package-lock.json`에 이미 커밋된 의존성(react-native-reanimated 4.5.1, react-native-gesture-handler ~2.32.0, @gorhom/bottom-sheet ^5.2.14 등, 04-04에서 사람 승인 게이트를 거쳐 이미 설치 승인됨)을 그대로 materialize하는 표준 `npm install`이며, 새 패키지를 추가하는 것이 아니다.
- **Fix:** `npm install` 실행(lockfile 기준, 새 패키지 추가 없음).
- **Files modified:** 없음(node_modules는 .gitignore 대상, package-lock.json 변경 없음 확인됨)
- **Verification:** `git status --short`로 package-lock.json 미변경 확인, `npm test`/`npx tsc --noEmit` 정상 실행 확인
- **Committed in:** 해당 없음(git 추적 대상 아님)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** 둘 다 계획된 검증 단계(npm test, tsc)를 실행하기 위해 필요했던 수정/조치이며, 계획 범위를 벗어난 스코프 확장은 없음.

## Issues Encountered

- Task 1이 `checkpoint:decision`(gate="blocking")이라 자동 실행이 불가능했다 — `workflow.auto_advance`가 설정되지 않았고(`_auto_chain_active: false`) 이 plan이 `autonomous: false`로 명시돼 있어, GSD 체크포인트 프로토콜에 따라 여기서 실행을 중단하고 창업자 결정을 기다렸다. 이후 코디네이터를 통해 "option-a" 선택이 전달돼 Task 2/3을 이어서 진행했다.
- 워크트리에 `node_modules`가 없어 검증 명령을 바로 실행할 수 없었다 — 위 Deviation 2 참고.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 오늘 뷰가 제품 문서의 완성 형태(지도 + 3단 스냅 바텀시트 + 상시 접근 가능한 플로팅 체크인/재센터 버튼 + 상시 탭바)에 도달했다 — REQ-today-view의 남은 두 조각(바텀시트 실제 마운트, 시트 상태 무관 버튼 접근성)이 이번 plan으로 완결됐다.
- **04-07(다음 plan, 시뮬레이터 검증)이 확인해야 할 항목:**
  1. `(tabs)` 라우트 그룹 도입 후 콘텐츠 영역이 탭바 위에서 끝나는지 — `insets.bottom` 기준 오프셋 계산이 여전히 유효한지 실측(04-UI-SPEC.md "구현 시 확인 필요" 항목)
  2. 시트 컨테이너가 `MapView`의 팬/줌 터치를 삼키는지 여부(T-4-17, 04-RESEARCH.md Pitfall 1) — 구조적 준수(제스처 중첩 없음, 직접 import 없음)는 이번 plan에서 테스트로 게이트했으나 실제 터치 통과 여부는 시뮬레이터 확인 대상
  3. CLOSED/DRAGGING/OPEN 3단 스냅 애니메이션과 버튼 연속 추적이 실기기/시뮬레이터에서 시각적으로 매끄러운지
- 코드 레벨 회귀 가드(D-04/D-05/D-09, 크로스페이드, 카메라 호출 6개 지점, gesture-handler 미사용)는 이번 plan에서 테스트로 전부 고정됐다 — 다음 plan은 시각적/체감 검증에 집중할 수 있다.

---
*Phase: 04-today-view*
*Completed: 2026-08-31*
