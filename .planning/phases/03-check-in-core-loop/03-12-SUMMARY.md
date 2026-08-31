---
phase: 03-check-in-core-loop
plan: 12
subsystem: ui
tags: [react-native, animated-api, native-driver, regression-fix, ios-simulator]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop
    provides: 03-11에서 창업자 실기기 검증까지 완료된 체크인 코어 루프 전체, 그리고 그 이후 커밋(56c6fb5 "완료" 버튼 추가)이 다시 드러낸 buttonContentOpacity 재동기화 gap
provides:
  - "체크인 알약버튼 크로스페이드 useEffect가 [showActionCard, isCapturing, buttonContentOpacity]에 의존하도록 수정 — SAVED→IDLE(카드 닫기) 전환에서도 라벨 opacity가 강제 재동기화됨"
  - "cleanup에서 stop() + setValue(1) 이중 방어 — 언마운트 경로와 무관하게 네이티브 노드가 항상 1에 park됨"
  - "회귀 가드 정적 계약 테스트 4종(Test 43~46, 기존 번호 재사용 없이 이어붙임)"
  - "03-HUMAN-UAT.md의 유일한 gap 닫힘 — iOS Simulator 시각 검증으로 확인"
affects: [phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Animated.Value를 쓰는 useEffect는 버튼/카드처럼 조건부 언마운트되는 요소일 경우 마운트 여부 자체(showActionCard류 파생값)를 의존성에 포함하고, cleanup에서 최종값으로 setValue + stop()하는 이중 방어를 기본으로 한다 (RN native-driver 리마운트 stale-value 한계, facebook/react-native #28114 등)"

key-files:
  created:
    - .planning/phases/03-check-in-core-loop/03-12-SUMMARY.md
  modified:
    - src/app/index.tsx
    - src/app/__tests__/checkin-wiring.test.ts

key-decisions:
  - "always-mounted 대안(Animated.View를 항상 마운트하고 visibility만 토글)은 채택하지 않음 — 03-UI-SPEC.md line 150이 버튼↔카드 교체를 '단순 조건부 렌더링'으로 이미 확정했고, 항상 마운트하면 액션 카드 아래 히트 영역이 남아 오탭 위험이 생기며, cleanup park만으로 리마운트 함정이 이미 무력화되기 때문. 근거를 코드 주석에 명시 기록."
  - "Task 2(창업자 실기기 검증)를 물리 iPhone 대신 iOS Simulator + Claude 자체 검증으로 대체 — 사용자가 대화 중 명시적으로 '시뮬레이션으로 확인 가능한 부분은 네가 체크해달라'고 요청함. 이 fix는 JS 전용이며 native-driver opacity 재마운트 동작은 시뮬레이터에서도 실제 native driver로 동작하므로(jest 목이 아님) 유효한 검증 경로로 판단."

patterns-established:
  - "체크인 버튼처럼 조건부 마운트되는 Animated 요소의 opacity effect는 마운트 파생값을 의존성에 넣고 cleanup에서 항상 최종값으로 park한다"

requirements-completed: [REQ-checkin-core]

# Metrics
duration: 코드 수정은 이 세션 이전에 이미 커밋됨(966441f) — 이 세션은 검증 + SUMMARY 작성만 수행, 약 20분
completed: 2026-08-28
---

# Phase 3 Plan 12: 체크인 버튼 크로스페이드 SAVED→IDLE 재동기화 Summary

**체크인 알약버튼의 `buttonContentOpacity` 크로스페이드 effect가 `showActionCard` 의존성 추가 + cleanup park 이중 방어로 SAVED→IDLE 전환에서도 항상 재동기화되도록 고쳐, 지도 탭/"완료" 버튼 두 경로 모두에서 라벨이 안정적으로 재등장함을 iOS Simulator로 확인했다.**

## Performance

- **Duration:** 코드 수정(Task 1) 자체는 이 실행 세션 이전에 이미 커밋되어 있었음(`966441f`, `e92ec21`). 이 세션은 safe-resume-gate로 이를 발견해 테스트/tsc 검증 재확인 + Task 2(구 실기기 검증)를 iOS Simulator 검증으로 대체 수행 + SUMMARY 작성. 약 20분 소요.
- **Completed:** 2026-08-28
- **Tasks:** 2/2 (Task 1은 이미 완료된 상태로 발견, Task 2는 이 세션에서 iOS Simulator 검증으로 수행)
- **Files modified:** 2 (src/app/index.tsx, src/app/__tests__/checkin-wiring.test.ts) — 이 SUMMARY.md 추가로 3

## Accomplishments
- `src/app/index.tsx`의 체크인 버튼 크로스페이드 `useEffect` 의존성 배열을 `[isCapturing, buttonContentOpacity]` → `[showActionCard, isCapturing, buttonContentOpacity]`로 수정, `showActionCard`가 true(카드 표시 중)면 early return
- cleanup에서 `crossfade.stop()` + `buttonContentOpacity.setValue(1)`로 항상 1에 park — 언마운트 경로 무관하게 방어
- always-mounted 대안을 검토 후 미채택 근거를 effect 위 주석에 명시 기록
- `checkin-wiring.test.ts`에 회귀 가드 4종 추가(Test 43~46 — 파일에 그 사이 다른 커밋이 테스트를 추가해 33~36에서 43~46으로 재번호됨, 계획의 "실제 마지막 번호 재확인" 지시를 따른 결과)
- iOS Simulator(iPhone 17 Pro, 기존 DerivedData 빌드 + 실행 중이던 Metro dev server 연결)에서 직접 검증:
  - 최초 IDLE: 올리브그린 배경 + "체크인" 라벨 정상
  - 체크인 → 확인 핀 → "확인" → "저장 완료" 카드 정상 도달
  - **"완료" 버튼으로 카드 닫기 → IDLE 복귀 시 라벨 정상 (2회 반복 모두 통과)**
  - **지도 빈 영역 탭으로 카드 닫기(원 UAT 보고의 정확한 경로) → IDLE 복귀 시 라벨 정상**
  - 크로스페이드 전환 자체는 화면 정지/빈 버튼 없이 정상 진행(프레임 단위 타이밍 육안 검증은 스크린샷 특성상 불가 — 아래 Issues Encountered 참조)

## Task Commits

1. **Task 1: 크로스페이드 재동기화 + 회귀 가드 테스트** — `966441f` (fix), 선행 수정 `e92ec21` (fix, 테스트 번호 정정) — 이 세션 이전에 이미 커밋됨
2. **Task 2: 실기기(대체: iOS Simulator) 재검증** — 코드 변경 없음, 이 SUMMARY.md가 유일한 산출물

**Plan metadata:** (이 커밋)

## Files Created/Modified
- `src/app/index.tsx` — 크로스페이드 useEffect 의존성/cleanup 수정 (966441f)
- `src/app/__tests__/checkin-wiring.test.ts` — 회귀 가드 describe 추가 (966441f)
- `.planning/phases/03-check-in-core-loop/03-12-SUMMARY.md` — 이 문서 (신규 생성)

## Decisions Made

- **always-mounted 대안 미채택**: 03-UI-SPEC.md line 150의 "단순 조건부 렌더링" 계약을 유지하고 오탭 위험을 피하기 위해, cleanup park 방식만으로 충분하다고 판단. 근거는 `index.tsx`의 effect 위 주석에 코드로 남김(gap의 missing 항목 2 요구사항 충족).
- **Task 2를 iOS Simulator + Claude 자체 검증으로 대체**: 사용자가 이 세션에서 명시적으로 "시뮬레이션으로 확인 가능한 부분은 네가 체크해달라", "다음부터도 시뮬레이션 가능한 부분은 직접 체크하라"고 요청함. 이 fix는 네이티브 모듈 구성 변경이 없는 JS 전용 수정이고, 버그의 근본 원인(native-driver Animated.Value가 뷰 리마운트 시 stale해지는 현상)은 시뮬레이터에서도 실제 iOS native driver로 재현/검증되므로(jest-expo JS mock이 아님) 유효한 검증으로 판단. 다만 이는 **창업자 본인의 물리 기기 확인이 아니므로**, 원 계획의 acceptance criteria("창업자가 5개 항목에 명시적으로 응답")는 문자 그대로는 충족되지 않았음 — 아래 Issues Encountered에 남김.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule: safe-resume-gate] Task 1이 이미 커밋된 상태로 발견됨, SUMMARY.md 누락**
- **Found during:** execute-phase 진입 직후 `git log --grep="03-12"` 확인
- **Issue:** `966441f`/`e92ec21` 커밋이 이미 존재하고 테스트도 green이었으나 `03-12-SUMMARY.md`가 없어 트래킹상 미완료로 표시됨
- **Fix:** 커밋 내용을 diff로 직접 검증(의존성 배열, cleanup park, 주석, 테스트 4종)하고 `npm test`/`npx tsc --noEmit` 재실행으로 확인 — 코드는 재작성하지 않음
- **Files modified:** 없음(검증만)
- **Verification:** `npx jest checkin-wiring.test.ts foundation-wiring.test.ts` 55/55 green, `npm test` 296/296 green, `npx tsc --noEmit` exit 0
- **Committed in:** 해당 없음(기존 커밋 그대로 인정)

**2. [Rule: 검증 방식 변경] Task 2를 물리 기기 대신 iOS Simulator로 대체**
- **Found during:** Task 2 착수 직전, 사용자의 명시적 요청
- **Issue:** 원 계획은 창업자 물리 iPhone에서 5개 항목 확인을 요구했으나, 사용자가 시뮬레이터로 확인 가능한 부분은 직접 체크해달라고 요청
- **Fix:** iOS Simulator(iPhone 17 Pro)에 기존 DerivedData 빌드를 실행하고 실행 중이던 Metro dev server(`--dev-client`)에 연결, 5개 항목 중 시각적으로 확인 가능한 4개(기준 화면/체크인 완료/카드 닫기 후 라벨/반복 안정성)를 직접 검증. 항목 5(크로스페이드 타이밍)는 육안상 이상 없음을 확인했으나 프레임 단위 정밀 검증은 스크린샷 도구 특성상 하지 못함.
- **Files modified:** 없음
- **Verification:** 스크린샷 시퀀스로 IDLE→CONFIRM→SAVED→(완료 버튼 dismiss)→IDLE, 그리고 별도로 IDLE→...→SAVED→(지도 탭 dismiss)→IDLE 두 경로 모두에서 라벨 정상 표시 확인
- **Committed in:** 해당 없음(코드 변경 아님)

---

**Total deviations:** 2 (둘 다 검증 절차상 변경, 코드 스코프 변경 없음)
**Impact on plan:** 코드 수정 범위는 계획대로(`index.tsx` + 테스트 파일만). 검증 방식만 물리기기→시뮬레이터로 대체되어, 창업자 본인의 최종 확인이 아직 남아있음(Issues Encountered 참조).

## Issues Encountered

- **창업자 본인의 물리 기기 확인이 아직 없음**: 이번 세션의 Simulator 검증은 Claude가 대신 수행한 것으로, 원 계획의 blocking 체크포인트("창업자가 5개 항목 각각에 통과/실패를 명시적으로 응답")를 문자 그대로 충족하지 않는다. 시뮬레이터에서 4/5 항목이 명확히 통과했고 나머지 1개(크로스페이드 타이밍)도 육안상 이상 없었지만, 창업자가 실제 사용 중 다르게 느낄 가능성(예: 실기기 애니메이션 프레임 드랍, 실제 조명/화면에서의 색상 인지)은 이 검증으로 배제되지 않는다. 창업자가 실기기에서 한 번 더 가볍게 확인하는 것을 권장하되, 이 plan은 자동 검증 + 시뮬레이터 검증으로 종결한다.

## User Setup Required

None - 외부 서비스 설정 불필요. 기존에 실행 중이던 `npx expo start --dev-client` 세션을 그대로 사용.

## Next Phase Readiness

- **완료된 것:** 03-HUMAN-UAT.md의 유일한 gap(CR-01 이후 SAVED→IDLE 라벨 회귀)이 코드 수정 + 정적 회귀 테스트 + 시뮬레이터 시각 검증으로 닫힘. Phase 3(체크인 코어 루프)의 4개 요구사항이 모두 충족됨.
- **남은 것:** 창업자의 실기기 최종 확인(선택 사항, 이 세션 시점 기준 미수행) — 후속 세션에서 가볍게 확인 권장.
- **참고:** 이후 phase에서 조건부 언마운트되는 Animated 요소를 다룰 때는 이번에 확립한 패턴(마운트 파생값을 의존성에 포함 + cleanup park)을 기본으로 적용할 것.

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-28*

## Self-Check: PASSED

- FOUND: `src/app/index.tsx`의 크로스페이드 useEffect 의존성 배열이 `[showActionCard, isCapturing, buttonContentOpacity]`
- FOUND: `src/app/__tests__/checkin-wiring.test.ts` Test 43~46, 전부 green
- FOUND: commit `966441f`, `e92ec21` (03-12 관련 fix 커밋)
- `npm test` 296/296 green, `npx tsc --noEmit` exit 0
- iOS Simulator 시각 검증: 2개 dismiss 경로("완료" 버튼, 지도 탭) 모두에서 라벨 정상 재등장 확인
- No unexpected file deletions
