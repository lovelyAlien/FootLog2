---
phase: 05-check-in-detail-edit
plan: 01
subsystem: navigation
tags: [expo-router, nested-stack, route-restructure, jest, regression-guard]

# Dependency graph
requires:
  - phase: 04-today-view
    provides: "(tabs)/index.tsx 오늘 뷰 화면(지도+바텀시트+체크인 배선), (tabs)/_layout.tsx Tabs 셸"
provides:
  - "(tabs)/index/ 폴더 구조 — index.tsx(오늘 뷰, 로직 무변경) + _layout.tsx(nested Stack, index 스크린 headerShown:false)"
  - "오늘 탭 안에서 push하면서도 탭바가 유지되는 네비게이션 셸(설정 화면과 동급 패턴)"
  - "5개 회귀 가드 테스트 파일이 새 경로를 읽도록 갱신 완료"
  - "라우트 구조 자체를 고정하는 신규 회귀 가드 3개(tabs-wiring Test 16~18)"
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns: ["expo-router nested Stack inside a tab segment (폴더=세그먼트, _layout.tsx=Stack)"]

key-files:
  created:
    - "src/app/(tabs)/index/_layout.tsx"
  modified:
    - "src/app/(tabs)/index/index.tsx (git mv from src/app/(tabs)/index.tsx, import depth only)"
    - "src/app/__tests__/checkin-wiring.test.ts"
    - "src/app/__tests__/foundation-wiring.test.ts"
    - "src/app/__tests__/notification-wiring.test.ts"
    - "src/app/__tests__/today-wiring.test.ts"
    - "src/app/__tests__/tabs-wiring.test.ts"

key-decisions:
  - "[id] 스크린은 이 plan에서 등록하지 않음 — 05-03-PLAN.md가 [id].tsx를 만들 때 함께 등록(계획서 명시 사항)"

requirements-completed: [REQ-checkin-detail-base]

# Metrics
duration: ~15min
completed: 2026-09-01
---

# Phase 5 Plan 1: 오늘 탭 라우트 폴더화 + nested Stack 셸 Summary

**`(tabs)/index.tsx`를 `(tabs)/index/{_layout,index}.tsx` 폴더로 git mv 재구성해 push 시 탭바가 유지되는 nested Stack을 만들고, 기존 회귀 가드 5개 파일의 경로 상수를 갱신 + 새 회귀 가드 3개를 추가했다.**

## Performance

- **Duration:** ~15min
- **Tasks:** 3/3 완료
- **Files modified:** 7 (1 신규 생성, 1 이동, 5 수정)

## Accomplishments
- `src/app/(tabs)/index.tsx`(1218줄)를 `git mv`로 `src/app/(tabs)/index/index.tsx`로 이동 — 파일 히스토리 보존(`git log --follow` 32커밋), 로직은 단 한 줄도 변경 없이 상대 import 접두사(`../../` → `../../../`, 21개 import 라인)만 갱신. `git show HEAD:<원본> | sed 's|../../|../../../|g' | diff -` 무출력으로 바이트 단위 검증 완료.
- `src/app/(tabs)/index/_layout.tsx` 신설 — `index` 스크린을 `headerShown: false`로 명시한 `Stack` export. 루트 `_layout.tsx`의 `headerShown: false`가 상속되지 않는 별도 Stack 인스턴스라는 점(05-RESEARCH.md Pitfall 2)을 파일 헤더 주석에 날짜 있는 근거로 남김. `[id]` 스크린은 아직 등록하지 않음(05-03에서 추가 예정, 계획서 명시).
- 5개 회귀 가드 테스트 파일(`checkin-wiring`, `foundation-wiring`, `notification-wiring`, `today-wiring`, `tabs-wiring`)의 하드코딩 경로 6곳을 전부 `path.join('(tabs)', 'index', 'index.tsx')`로 갱신 — `npm test` 전체 스위트(31 suites/415 tests) 그린, `ENOENT` 0건.
- `tabs-wiring.test.ts`의 "라우트 구조 계약" describe 블록에 Test 16~18 신설 — (1) 구 경로 `(tabs)/index.tsx` 부재, (2) `(tabs)/index/_layout.tsx`가 `Stack`+`headerShown: false`를 명시, (3) `(tabs)/_layout.tsx`가 여전히 `<Tabs.Screen name="index">`를 등록. Test 17은 `headerShown: false`를 임시로 지워 실제로 깨지는 것을 수동 확인 후 원복.

## Task Commits

1. **Task 1: `(tabs)/index.tsx`를 `(tabs)/index/index.tsx`로 이동하고 nested Stack 레이아웃을 만든다** - `6f40b14` (feat)
2. **Task 2: 회귀 가드 5개 파일의 경로 상수 6곳을 새 경로로 갱신한다** - `909d4d1` (fix)
3. **Task 3: 새 라우트 구조 자체에 대한 회귀 가드를 tabs-wiring에 추가한다** - `7105669` (test)

_Note: 이 plan은 `tdd="true"` 태스크가 없어 RED/GREEN/REFACTOR 게이트 대상이 아니다. Task 3은 신규 회귀 가드 테스트만 추가하는 성격이라 기존 코드(구현)에 대한 실패 테스트를 먼저 작성한 뒤 이미 통과하는 구현이 있는 상태를 확인하는 방식으로 진행했다(Task 1 산출물이 이미 존재하므로 "add-only" 형태)._

## Files Created/Modified
- `src/app/(tabs)/index/_layout.tsx` - 오늘 탭 전용 nested Stack, `index` 스크린 `headerShown: false` 명시
- `src/app/(tabs)/index/index.tsx` - `(tabs)/index.tsx`에서 이동(git mv), import 경로 깊이만 변경, 로직 무변경
- `src/app/__tests__/checkin-wiring.test.ts` - `TODAY_SCREEN_PATH` 상수를 새 경로로 갱신
- `src/app/__tests__/foundation-wiring.test.ts` - 동일
- `src/app/__tests__/notification-wiring.test.ts` - 동일
- `src/app/__tests__/today-wiring.test.ts` - 동일
- `src/app/__tests__/tabs-wiring.test.ts` - `todayIndexSource` 읽기 경로 + Test 1 existsSync 리터럴 갱신, `todayIndexLayoutSource`/`CodeOnly` 상수 신설, Test 16~18 추가

## Decisions Made
- `[id]` 스크린은 이 plan에서 등록하지 않음 — 계획서가 명시적으로 "05-03-PLAN.md가 `[id].tsx`를 만들면서 함께 등록"하라고 지시했고, 05-PATTERNS.md의 예시 코드(둘 다 등록된 버전)보다 05-01-PLAN.md 본문 지시가 우선한다고 판단(같은 phase 안에서 더 구체적이고 이 plan 전용으로 작성된 문서를 따름).

## Deviations from Plan

None — plan 태스크 3개 모두 명시된 그대로 실행했다. 코드 변경 관점의 편차는 없다.

### 계획 문서 자체의 서술 오차(코드 아님, 정보용 기록)

Task 1/2의 `acceptance_criteria`에 적힌 일부 grep 리터럴 카운트가 실제 파일 구조와 어긋났다 — 코드 결함이 아니라 계획서가 grep 패턴을 작성할 때 세었던 기준(고유 모듈 수, 또는 `path.join` 호출부의 정확한 인자 나열)과 실제 정규식 매칭 결과(라인 수, 접두사 차이)가 서로 달랐던 것으로 판단된다. 두 경우 모두 계획이 의도한 실질적 목표(import 경로 전부 이전, 회귀 가드 2곳 모두 갱신)는 다른 방식으로 완전히 검증했다:

1. **Task 1 — `grep -c "from '\.\./\.\./\.\./"` 기대값 17, 실제값 21.** 원본 파일도 이미 `from '../../` 접두사 라인이 21개였다(`checkinFlow`/`checkinRepo`/`location`/`notifications/permissions` 4개 모듈이 값 import와 `import type` import를 별도 라인으로 나눠 써서 17개 고유 모듈이 21개 라인이 됨) — 이동 전/후 모두 21이 맞는 값이었다. 대신 계획이 제시한 더 엄격한 바이트 단위 diff 검증(`git show HEAD:<원본> | sed 's|../../|../../../|g' | diff -`)이 무출력으로 통과해, "import 접두사만 바뀌고 로직은 무변경"이라는 진짜 목표는 확실히 충족됨을 확인했다.
2. **Task 2 — `tabs-wiring.test.ts`의 `grep -c "path.join('(tabs)', 'index', 'index.tsx')"` 기대값 2, 실제값 1.** 22번째 줄(`todayIndexSource`)은 `path.join('(tabs)', 'index', 'index.tsx')` 형태 그대로지만, 32번째 줄(Test 1의 `existsSync`)은 `path.join(APP_DIR, '(tabs)', 'index', 'index.tsx')`로 `APP_DIR` 인자가 앞에 붙어 정확히 같은 리터럴 문자열이 아니다. `grep -n "'(tabs)', 'index', 'index.tsx'"`로 두 위치(22줄, 32줄) 모두 갱신됐음을 개별 확인했다.

두 항목 모두 코드나 테스트 로직을 바꾸지 않았다(계획 문서를 임의로 수정하지도 않았다) — 다음 phase의 plan 작성/검증 단계가 참고할 수 있도록 기록만 남긴다.

## Issues Encountered

None.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- 오늘 탭이 이동 전과 동일하게 동작함을 `npm test`(31 suites/415 tests) + `npx tsc --noEmit`으로 확인.
- `(tabs)/index/_layout.tsx`가 이미 존재하므로 05-03-PLAN.md는 `[id].tsx` 라우트 파일만 추가하고 이 `_layout.tsx`에 `<Stack.Screen name="[id]">` 한 줄만 더하면 된다.
- 05-02~05-07(같은 wave 또는 후속 wave)의 나머지 plan들이 `(tabs)/index/index.tsx` 경로를 기준으로 코드를 추가/수정할 수 있는 상태.
- 블로커 없음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: `src/app/(tabs)/index/index.tsx`
- FOUND: `src/app/(tabs)/index/_layout.tsx`
- FOUND: `.planning/phases/05-check-in-detail-edit/05-01-SUMMARY.md`
- CONFIRMED GONE: `src/app/(tabs)/index.tsx` (구 경로)
- FOUND commit: `6f40b14` (Task 1)
- FOUND commit: `909d4d1` (Task 2)
- FOUND commit: `7105669` (Task 3)
