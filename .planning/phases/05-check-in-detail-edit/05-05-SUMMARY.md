---
phase: 05-check-in-detail-edit
plan: 05
subsystem: ui
tags: [react-native-gesture-handler, expo-router, reanimated, delayed-delete, undo-snackbar]

# Dependency graph
requires:
  - phase: 05-check-in-detail-edit (05-02)
    provides: "deleteCheckin(db, id), PhotoStorageDeps.deleteFile(uri) — 지연 삭제 커밋이 소비하는 데이터 레이어"
  - phase: 05-check-in-detail-edit (05-03)
    provides: "(tabs)/index/[id] 라우트 — 이 plan의 router.push 진입점 대상"
provides:
  - "createPendingDeleteController(pendingDelete.ts) — 4초 지연 삭제 순수 로직(단일 대기 항목, dispose 시 즉시 확정)"
  - "UndoSnackbar — 4초 undo 스낵바 프레젠테이셔널 컴포넌트"
  - "CheckinListRow가 Pressable(탭→상세화면)+ReanimatedSwipeable(스와이프→삭제)로 전환(Phase 4 D-03 반전)"
  - "오늘 화면 배선: 행 탭 네비게이션 + 지연 삭제/undo 상태 + 스낵바 배치"
affects: [05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "지연 삭제(delayed-commit) 패턴: UI에서 즉시 숨기고 실제 DELETE는 4초 타이머 만료 시점에 실행 — 재삽입 방식보다 단순"
    - "dispose() 시 clearTimeout이 아니라 즉시 onCommit 확정 — 언마운트 시 삭제가 조용히 취소되는 것을 방지(T-05-13)"
    - "ReanimatedSwipeable(react-native-gesture-handler@2.32.0)에는 activeOffsetX/failOffsetY가 없다 — dragOffsetFromLeftEdge/dragOffsetFromRightEdge가 내부적으로 동일 효과"

key-files:
  created:
    - src/today/pendingDelete.ts
    - src/today/pendingDelete.test.ts
    - src/today/UndoSnackbar.tsx
  modified:
    - src/today/content.ts
    - src/today/CheckinListRow.tsx
    - src/today/TodayBottomSheet.tsx
    - src/today/__tests__/todayUi.test.ts
    - "src/app/(tabs)/index/index.tsx"
    - src/app/__tests__/checkin-wiring.test.ts
    - src/app/__tests__/today-wiring.test.ts

key-decisions:
  - "ReanimatedSwipeable의 activeOffsetX/failOffsetY는 설치된 버전(2.32.0)에 존재하지 않아 dragOffsetFromLeftEdge/dragOffsetFromRightEdge로 대체 — failOffsetY 대응 public prop 자체가 없어 세로 제스처 경합 완화는 가로 활성화 임계값(10px)만으로 처리, 실기기 검증은 05-07 몫으로 남김"
  - "today-wiring.test.ts의 Phase 4 D-03 스코프 경계('상세화면 진입 식별자 없음')를 근거 주석과 함께 반전 — files_modified에 없던 파일이지만 Phase 5가 정확히 반전시키기로 확정한 계약이라 빌드를 위해 필수"
  - "commitPendingDelete를 ref로 미러링(commitPendingDeleteRef)해 마운트 시 1회만 생성되는 컨트롤러가 항상 최신 db/reloadTodayCheckins를 참조하게 함 — stateRef와 동일한 관용구"

requirements-completed: [REQ-checkin-detail-base, REQ-checkin-swipe-delete]

# Metrics
duration: 17min
completed: 2026-09-01
---

# Phase 5 Plan 05: 리스트 행 탭 네비게이션 + 스와이프 삭제 + 4초 undo 스낵바 Summary

**Phase 4가 의도적으로 탭 불가능하게 남긴 리스트 행을 상세화면 진입점으로 뒤집고, 같은 행에 지연 삭제(delayed-commit) 패턴 기반 스와이프 삭제 + 4초 undo 스낵바를 얹었다.**

## Performance

- **Duration:** ~17 min (첫 RED 커밋 02:42:25 ~ 마지막 배선 커밋 02:59:13)
- **Tasks:** 3/3 완료
- **Files modified:** 10 (3 신규, 7 수정)

## Accomplishments
- `pendingDelete.ts`의 `createPendingDeleteController` — setTimeout 하나 + 대기 항목 하나만 유지하는 순수 TS 컨트롤러. `dispose()`가 `clearTimeout`이 아니라 즉시 `onCommit`을 확정하는 것이 핵심 계약(T-05-13) — 8개 동작 케이스 유닛 테스트(TDD RED/GREEN)로 고정.
- `UndoSnackbar` — `visible=false`면 미마운트, 기존 `saveStateCrossfadeMs`(180ms) 토큰으로 등장 크로스페이드, 배치는 부모 소유.
- `CheckinListRow`가 `Pressable`(탭→`onPress`)+`ReanimatedSwipeable`(왼쪽 스와이프→`colors.pin` 삭제 어포던스)로 전환 — Phase 4 D-03("탭 불가능") 계약을 근거 주석과 함께 반전, `colors.accent` 미등장(Test 6)은 무수정 유지 + `colors.pin` 정확히 1회 새 가드 추가.
- 오늘 화면(`(tabs)/index/index.tsx`)에 `router.push({ pathname: '/[id]', params })` 행 탭 배선, `hiddenIds`/`pendingId` 상태, 지연 삭제 커밋 로직(`runWithSingleRetry(deleteCheckin)` → 성공 시 사진 파일 non-blocking 정리 + `reloadTodayCheckins`, 실패 시 `hiddenIds`에서 제거해 행이 자연 부활), `filteredTodayCheckins`를 시트/지도 핀/궤적선 3곳이 공유.
- `checkin-wiring.test.ts`에 Test 71~77(행 탭/지연 삭제 배선), `today-wiring.test.ts`에 Phase 4 D-03 반전 계약 갱신 — `npm test` 460/460, `npx tsc --noEmit` 통과.

## Task Commits

TDD 태스크(Task 1)는 RED/GREEN을 별도 커밋으로 분리했다:

1. **Task 1: 지연 삭제 컨트롤러 + undo 스낵바 + 문구 상수**
   - `0f6af29` (test) — RED: 8개 동작 케이스 작성, 스텁 구현으로 7개 실패 확인
   - `b4d76c0` (feat) — GREEN: 실제 구현, 8/8 통과 + UndoSnackbar/content.ts 문구
2. **Task 2: CheckinListRow 탭 가능 + 스와이프 삭제 전환(D-03 반전)** - `6efe610` (feat)
3. **Task 3: 오늘 화면 행 탭/지연 삭제 배선** - `be4ed58` (feat, today-wiring.test.ts 갱신 포함)

## Files Created/Modified
- `src/today/pendingDelete.ts` - 지연 삭제 컨트롤러(순수 TS, `UNDO_WINDOW_MS=4000`)
- `src/today/pendingDelete.test.ts` - 8개 동작 케이스(`@jest-environment node`, `jest.useFakeTimers`)
- `src/today/UndoSnackbar.tsx` - 4초 undo 스낵바 프레젠테이셔널 컴포넌트
- `src/today/content.ts` - `deletedSnackbar`/`undoCta`/`deleteAffordanceLabel` 추가
- `src/today/CheckinListRow.tsx` - Pressable+ReanimatedSwipeable 이중 래핑, D-03 반전 헤더 주석
- `src/today/TodayBottomSheet.tsx` - `onRowPress`/`onDeleteRequest` 순수 전달
- `src/today/__tests__/todayUi.test.ts` - Test 1 반전 + Test 6 무수정 + Pin 색상 가드/스와이프 가드/시트 전달 계약 추가(28 tests)
- `src/app/(tabs)/index/index.tsx` - 행 탭 네비게이션 + 지연 삭제/undo 상태 + 스낵바 배치 배선
- `src/app/__tests__/checkin-wiring.test.ts` - Test 71~77 신규 배선 가드
- `src/app/__tests__/today-wiring.test.ts` - Phase 4 D-03 스코프 경계 반전 + `reloadTodayCheckins`/핀 map 소스 변수명 갱신

## Decisions Made
- `ReanimatedSwipeable`(react-native-gesture-handler@2.32.0, `node_modules` 소스 직접 확인)에는 `activeOffsetX`/`failOffsetY` prop이 없다 — 내부적으로 `dragOffsetFromLeftEdge`/`dragOffsetFromRightEdge`(기본값 10)를 `activeOffsetX([-dragOffsetFromRightEdge, dragOffsetFromLeftEdge])`로 변환해 동일 효과를 낸다. `failOffsetY` 대응 public prop은 이 버전에 없어 세로 제스처 경합 완화는 가로 10px 활성화 임계값만으로 처리하고, 실기기 검증은 05-07-PLAN.md에 위임.
- `deleteCheckin`의 사진 파일 정리는 성공 후 non-blocking으로 수행하고, 실패(2회 재시도 다 실패)해도 새 오류 UI를 띄우지 않고 `hiddenIds`에서 제거해 다음 `reloadTodayCheckins`에서 행이 자연스럽게 부활하도록 함(05-RESEARCH.md Open Question #1 권장안).
- `commitPendingDelete`를 ref로 미러링해, 마운트 시 1회만 생성되는 컨트롤러의 `onCommit` 클로저가 항상 최신 `db`/`reloadTodayCheckins`를 참조하게 함(이 파일의 `stateRef` 관용구와 동일).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 워크트리에 `node_modules`가 없어 `tsc`/`jest`가 잘못된 툴체인으로 "성공"을 보고**
- **Found during:** Task 1 검증 직후, `npx tsc --version`이 6.0.3을 반환했으나 초기엔 `node_modules` 부재 상태에서 npx가 전역/캐시 리졸브로 침묵 성공했음을 뒤늦게 발견
- **Issue:** 워크트리는 `node_modules`를 git으로 추적하지 않으며(`.gitignore`), 심볼릭 링크 없이 `npx tsc --noEmit`/`npx jest`를 실행하면 실제 프로젝트 의존성이 아닌 다른 리졸브 경로를 탈 위험이 있어 검증이 무의미해질 수 있었다
- **Fix:** 메인 체크아웃의 `node_modules`를 워크트리에 심볼릭 링크(`ln -s`)로 연결, 이후 모든 `tsc`/`jest` 실행이 실제 프로젝트 의존성(`typescript@6.0.3` 등 `package-lock.json`과 일치)을 사용함을 확인
- **Files modified:** 없음(워크트리 로컬 심볼릭 링크만 생성, git 추적 대상 아님)
- **Verification:** 심볼릭 링크 생성 후 `npx tsc --version`이 메인 체크아웃과 동일한 버전 반환, `npm test` 460/460 통과
- **Committed in:** 해당 없음(커밋 대상 아님)

**2. [Rule 1 - Bug] `ReanimatedSwipeable`에 `activeOffsetX`/`failOffsetY` prop이 존재하지 않음**
- **Found during:** Task 2, `npx tsc --noEmit` 실행 시 `SwipeableProps`에 해당 prop이 없다는 타입 에러
- **Issue:** 05-RESEARCH.md/05-05-PLAN.md의 Pattern 3 예시 코드가 가정한 `activeOffsetX`/`failOffsetY` prop이 실제 설치된 `react-native-gesture-handler@2.32.0`의 `ReanimatedSwipeable`(`node_modules` 소스 직접 확인)에는 존재하지 않음
- **Fix:** 실존하는 `dragOffsetFromLeftEdge`/`dragOffsetFromRightEdge`(기본값 10, 내부적으로 동일한 `activeOffsetX` 효과)로 대체. `failOffsetY` 대응 prop은 이 버전에 없어 세로 경합 완화는 가로 임계값만으로 처리하고 실기기 검증을 05-07로 명시적으로 위임하는 주석을 남김. `todayUi.test.ts` Test 1c 가드도 실제 prop명에 맞춰 갱신
- **Files modified:** `src/today/CheckinListRow.tsx`, `src/today/__tests__/todayUi.test.ts`
- **Verification:** `npx tsc --noEmit` 통과, mutation 테스트(두 prop 제거 시 Test 1c 실패 확인 후 원복)
- **Committed in:** `6efe610` (Task 2 커밋에 포함)

**3. [Rule 3 - Blocking] `today-wiring.test.ts`(Phase 4 D-03 회귀 가드)가 Task 3 배선과 충돌**
- **Found during:** Task 3 완료 후 `npm test` 전체 스위트 실행 시 4건 실패
- **Issue:** `today-wiring.test.ts`가 04-CONTEXT.md D-03("상세화면 진입 식별자가 아직 없다")을 검증하는 가드를 갖고 있었는데, 이 plan이 정확히 그 경계를 반전시키는 배선(`router.push`)을 추가하면서 충돌. 또한 `reloadTodayCheckins()` 호출 횟수(4→5, 지연 삭제 성공 경로 추가)와 지도 핀 `map` 소스 정규식 앵커(`todayCheckins`→`filteredTodayCheckins`)도 함께 어긋남
- **Fix:** "상세화면 진입 식별자 없음" 단언을 CheckinListRow의 D-03 반전과 동일한 근거 주석과 함께 반전(`router.push`/`pathname: '/[id]'` 등장을 확인하되 `useRouter`/`<Link>`는 여전히 미사용 확인), `reloadTodayCheckins()` 횟수 기대값 갱신, 핀 map 정규식 변수명 갱신
- **Files modified:** `src/app/__tests__/today-wiring.test.ts`
- **Verification:** `npm test` 460/460 통과
- **Committed in:** `be4ed58` (Task 3 커밋에 포함)

**4. [Rule 1 - Bug] 인라인(들여쓰기된) 주석이 `stripComments`의 `^//` 필터를 통과하지 못해 실행자 자체 grep 검증에서 오탐**
- **Found during:** Task 1/2 acceptance criteria grep 검증
- **Issue:** `UndoSnackbar.tsx`의 함수 내부 들여쓰기 주석이 `motion.saveStateCrossfadeMs` 리터럴을 중복 언급해 grep 카운트가 2가 되고, `CheckinListRow.tsx`/`index.tsx`의 들여쓰기 주석이 `clearTimeout` 리터럴을 언급해 관련 acceptance 카운트가 부풀려짐(05-03-SUMMARY.md가 이미 겪은 것과 동일 계열 문제)
- **Fix:** 리터럴 문자열이 겹치지 않도록 주석 문구를 재서술(의미는 보존)
- **Files modified:** `src/today/UndoSnackbar.tsx`, `src/app/(tabs)/index/index.tsx`
- **Verification:** 재서술 후 grep 카운트가 기대값과 일치, 실제 jest 테스트(진짜 검증 게이트)는 처음부터 영향받지 않았음(`stripComments`는 들여쓰기 주석도 올바르게 필터링)
- **Committed in:** `b4d76c0`, `6efe610`, `be4ed58` (각 해당 Task 커밋에 포함)

### 미해결 acceptance criteria 불일치 (문서화만, 코드 수정 아님)

- **`grep -c "createPendingDeleteController"`가 1이어야 한다는 05-05-PLAN.md 조건은 문자 그대로 충족 불가능** — import 문과 실제 호출(`createPendingDeleteController({...})`) 두 줄이 모두 필요하므로 실제 카운트는 2다. 이 저장소의 기존 named-import 관례(`checkinRepo.ts`의 다른 함수들과 동일 스타일)를 깨고 namespace import로 우회하는 것은 부자연스러운 코드를 낳으므로 채택하지 않았다 — plan의 acceptance criterion 자체가 "import 1회 + 사용 1회"라는 정상적인 코드 형태를 고려하지 못한 것으로 판단, 의도(컨트롤러가 정확히 배선됨)는 `npm test`/`tsc` 실제 검증으로 충분히 확인됨.
- **`grep -c "clearTimeout"`이 0이어야 한다는 조건도 파일 전체 기준으로는 불가능** — `resolveInstantPosition`(GPS-vs-타임아웃 레이스, Phase 3부터 존재, 이 plan과 무관)이 이미 `clearTimeout(timer!)`를 쓰고 있다. 지연 삭제 컨트롤러의 cleanup effect 블록만 좁혀 `clearTimeout` 미등장을 확인하는 `checkin-wiring.test.ts` Test 73으로 실질적 계약(언마운트 시 즉시 확정)을 대신 고정했다.

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug — API 불일치, 1 bug — grep 오탐 재발) + 2 acceptance criteria 불일치 문서화
**Impact on plan:** 모두 계획 실행을 정상 궤도로 되돌리거나(node_modules 심볼릭 링크, D-03 반전 전파) 실제 설치된 라이브러리 API와 일치시키는 데(ReanimatedSwipeable prop) 필요했다. 스코프 확장 없음 — 실제 동작(스와이프 임계값, 언마운트 즉시 확정)은 계획 의도와 동일하게 구현됨.

## Issues Encountered
없음 — 위 Deviations 절에서 모두 다룸.

## User Setup Required
None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- 지연 삭제 컨트롤러/undo 스낵바/스와이프 삭제/행 탭 네비게이션이 모두 구현·테스트로 고정됨 — 05-06(사진 교체/삭제), 05-07(제스처 실기기 검증)이 이어받을 수 있는 상태.
- `Pitfall 3`(BottomSheetFlatList와 ReanimatedSwipeable의 세로/가로 제스처 경합)는 시뮬레이터/실기기 확인이 필요 — 05-07-PLAN.md 몫으로 명시적으로 남겼다(코드 주석 포함).
- 블로커 없음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: src/today/pendingDelete.ts
- FOUND: src/today/pendingDelete.test.ts
- FOUND: src/today/UndoSnackbar.tsx
- FOUND: src/today/content.ts
- FOUND: src/today/CheckinListRow.tsx
- FOUND: src/today/TodayBottomSheet.tsx
- FOUND: src/today/__tests__/todayUi.test.ts
- FOUND: src/app/(tabs)/index/index.tsx
- FOUND: src/app/__tests__/checkin-wiring.test.ts
- FOUND: src/app/__tests__/today-wiring.test.ts
- FOUND commits: 0f6af29, b4d76c0, 6efe610, be4ed58
