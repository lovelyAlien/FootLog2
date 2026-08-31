---
phase: 05-check-in-detail-edit
plan: 03
subsystem: ui
tags: [expo-router, react-native-maps, expo-image, nested-stack, wiring-test]

# Dependency graph
requires:
  - phase: 05-check-in-detail-edit (05-01)
    provides: "(tabs)/index/_layout.tsx nested Stack 셸(index 스크린만 등록된 상태)"
  - phase: 05-check-in-detail-edit (05-02)
    provides: "getCheckinById(db, id), formatLocalMonthDay(iso, tz?) — 상세화면 데이터 레이어"
provides:
  - "(tabs)/index/[id] 라우트 — push 시 탭바 유지, 헤더 타이틀은 로컬 날짜로 동적 설정"
  - "CheckinDetailScreen.tsx — 시각 → 정적 지도 미리보기(5중 인터랙션 잠금) → 사진(또는 빈 슬롯) 고정 레이아웃, Phase 6이 다른 라우트에서 그대로 재사용 가능"
  - "checkin/config.ts의 MAP_REGION_DELTA 단일 출처화(오늘 뷰와 상세화면이 공유)"
  - "checkin-detail-wiring.test.ts — 라우트 구조/레이아웃 순서/지도 잠금/토큰 규율/D-05를 고정하는 13개 회귀 가드"
affects: [05-04, 05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "라우트 파일은 얇은 래퍼(id/db만 읽어 화면 컴포넌트에 전달), 화면 본체는 src/checkin/ 아래 — 다른 탭의 다른 nested stack(Phase 6)이 재사용 가능하게"
    - "정적 지도 미리보기는 MapView를 scrollEnabled/zoomEnabled/rotateEnabled/pitchEnabled={false} + pointerEvents=\"none\" 5중으로 잠근다"
    - "값을 두 곳에 선언하지 않는다 — MAP_REGION_DELTA를 화면 지역 상수에서 checkin/config.ts로 승격해 공유"

key-files:
  created:
    - "src/app/(tabs)/index/[id].tsx"
    - "src/checkin/CheckinDetailScreen.tsx"
    - "src/app/__tests__/checkin-detail-wiring.test.ts"
  modified:
    - "src/app/(tabs)/index/_layout.tsx"
    - "src/checkin/config.ts"
    - "src/app/(tabs)/index/index.tsx"

key-decisions:
  - "MAP_REGION_DELTA를 (tabs)/index/index.tsx 지역 상수에서 checkin/config.ts로 옮겨 오늘 뷰와 상세화면이 같은 상수를 import — 계획서가 명시한 '값을 두 곳에 중복 선언하지 않는다' 규약을 그대로 따름"
  - "사진 표시는 expo-image의 contentFit=\"contain\" + 고정 height(240) 조합으로 '전체 너비, 비율 유지, 최대 높이 240px' 계약을 만족 — 원본 이미지 치수를 별도로 측정하지 않고 letterbox로 처리"

requirements-completed: [REQ-checkin-detail-base, REQ-checkin-detail-layout]

# Metrics
duration: ~35min
completed: 2026-09-01
---

# Phase 5 Plan 03: 체크인 상세화면 라우트 셸 + 표시 계층 Summary

**`[id]` 라우트를 nested Stack에 등록하고 `CheckinDetailScreen.tsx`에 시각 → 잠긴 정적 지도 미리보기(pinSoft 마커) → 사진 고정 레이아웃을 구현, 신규 wiring 테스트 13건으로 D-05(상세화면 삭제 진입점 없음)까지 회귀 가드로 고정했다.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 완료
- **Files modified:** 6 (3 신규 생성, 3 수정)

## Accomplishments
- `(tabs)/index/_layout.tsx`에 `<Stack.Screen name="[id]" options={{ headerShown: true }} />` 등록 — 이 Stack이 루트의 `headerShown: false`를 상속하지 않는 별도 인스턴스라는 이유를 주석으로 남김(05-RESEARCH.md Pitfall 2). `(tabs)/index/[id].tsx` 신규(9 non-comment lines) — `useLocalSearchParams`/`useSQLiteContext`로 id/db를 읽어 `CheckinDetailScreen`에 전달만 하는 얇은 래퍼.
- `src/checkin/CheckinDetailScreen.tsx` 신규 — `getCheckinById`로 단건 조회(언마운트 가드 포함), 로드 완료 후 `navigation.setOptions`로 헤더 타이틀에 `formatLocalMonthDay` 결과를 채움. 화면 상단 시각(`formatLocalTime`, `typography.timestamp` + fontVariant 얕은 복사 관용구) → 잠긴 정적 지도 미리보기(`colors.pinSoft` 단일 teardrop 마커, (tabs)/index/index.tsx의 pinWrapper/pinDrop/pinSaved 스타일 그대로 복제) → 사진(있으면 `expo-image`의 `Image contentFit="contain"`, 없으면 160px 빈 슬롯 + 카메라 아이콘 + `CHECKIN_COPY.photoPlaceholderLabel`) 고정 순서로 렌더. D-05(체크인 전체 삭제 진입점 없음) 준수, "지도 앱에서 열기"/메모/사진 교체·삭제 슬롯에는 05-04/05-06-PLAN.md 몫이라는 주석만 남기고 스텁을 넣지 않음.
- `MAP_REGION_DELTA`를 `(tabs)/index/index.tsx` 지역 상수에서 `src/checkin/config.ts`로 승격해 오늘 뷰와 상세화면이 같은 상수를 import(중복 선언 금지 규약).
- `src/app/__tests__/checkin-detail-wiring.test.ts` 신규 — `tabs-wiring.test.ts`와 동일한 `fs.readFileSync` + `stripComments` 정적 분석 기법으로 5개 describe(라우트 구조/레이아웃 순서/지도 잠금/토큰 규율/D-05), 13개 `it` 작성. `npm test` 32 suites/437 tests 그린, `npx tsc --noEmit` 통과.

## Task Commits

1. **Task 1: [id] 라우트를 Stack에 등록하고 얇은 라우트 래퍼를 만든다** - `3f69b3f` (feat)
2. **Task 2: CheckinDetailScreen에 조회 + 시각/정적지도/사진 고정 레이아웃을 구현한다** - `7cb1517` (feat)
3. **Task 3: checkin-detail-wiring 회귀 가드 테스트 파일을 신규 생성한다** - `aabf5da` (test)

_Note: 이 plan은 `tdd="true"` 태스크가 없어 RED/GREEN/REFACTOR 게이트 대상이 아니다._

## Files Created/Modified
- `src/app/(tabs)/index/_layout.tsx` - `[id]` 스크린을 `headerShown: true`로 등록
- `src/app/(tabs)/index/[id].tsx` - 신규, id/db를 읽어 `CheckinDetailScreen`에 전달만 하는 얇은 래퍼(9줄)
- `src/checkin/CheckinDetailScreen.tsx` - 신규, 체크인 상세화면 본체(표시 계층)
- `src/checkin/config.ts` - `MAP_REGION_DELTA` 상수 추가(오늘 뷰/상세화면 공유 단일 출처)
- `src/app/(tabs)/index/index.tsx` - 지역 `MAP_REGION_DELTA` 선언 제거, `checkin/config`에서 import
- `src/app/__tests__/checkin-detail-wiring.test.ts` - 신규, 13개 회귀 가드 테스트

## Decisions Made
- `MAP_REGION_DELTA`를 `checkin/config.ts`로 승격 — 계획서 Task 2 지시 사항을 그대로 따름, index.tsx의 기존 사용처(확인 핀 카메라 이동, animateToRegion 등 다수 지점)는 import 대상만 바뀌고 값·동작은 그대로 유지됨을 `tsc --noEmit` + 전체 테스트 스위트로 확인.
- 사진 렌더는 `contentFit="contain"` + 고정 `height: 240`으로 "비율 유지 + 최대 높이 240px" 계약을 만족 — 원본 이미지 실측 치수 없이도 letterbox로 크롭 없는 표시가 가능해 이 plan 스코프(표시 전용) 안에서 추가 복잡도(Image.getSize 등) 없이 계약을 지킴.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX 블록 주석이 `stripComments` 필터를 통과하지 못해 wiring 테스트 가드가 실제로 물지 않던 문제**
- **Found during:** Task 3 acceptance criteria의 "가드가 실제로 무는지 확인" 단계(mutation 테스트)
- **Issue:** `CheckinDetailScreen.tsx`의 `{/* ... */}` JSX 블록 주석 2곳이 `stripComments`(줄 시작이 `//`/`*`/`/*`인 줄만 필터링)를 통과하지 못해, 주석 안에 적어둔 설명 문구(`pointerEvents="none"까지`, "사진 교체/삭제 인터랙션")가 실제 코드 텍스트에 섞여 남았다. 그 결과 (a) `pointerEvents="none"` 프로퍼티를 실제로 지워도 wiring 테스트가 주석 속 리터럴 때문에 계속 통과하는 거짓 안전(가드 무력화), (b) D-05 가드(`'삭제'` 문자열 부재 단언)가 실제로는 항상 실패하는 상태였다.
- **Fix:** 두 주석을 의미는 보존하되 리터럴 문자열이 겹치지 않게 재서술 — `pointerEvents="none"` 언급을 "터치 이벤트 자체를 완전히 무시하는 속성"으로, "사진 교체/삭제"를 "사진 교체/제거"로 변경. 이후 `pointerEvents="none"` 제거 실험과 `colors.pinSoft`→`colors.pin` 치환 실험 둘 다 wiring 테스트가 실제로 실패함을 확인한 뒤 원복.
- **Files modified:** `src/checkin/CheckinDetailScreen.tsx`
- **Verification:** 두 mutation 실험 모두 실패 확인 → 원복 → `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__/checkin-detail-wiring.test.ts` 13/13 통과, `npm test` 32 suites/437 tests 통과, `npx tsc --noEmit` 통과
- **Committed in:** `aabf5da` (Task 3 커밋에 포함, 별도 커밋 아님 — 테스트 파일과 원인 파일을 함께 다뤄야 검증 가능했음)

---

**Total deviations:** 1 auto-fixed (1 bug — 회귀 가드 무력화 방지)
**Impact on plan:** wiring 테스트가 계획서가 요구한 "가드가 실제로 무는지" acceptance criteria를 문자 그대로 충족하도록 만드는 데 필요한 수정이었다. 스코프 확장 없음, 코드 로직 변경 없음(주석 문구만 재서술).

## Issues Encountered

- **워크트리 절대경로 오사용 자가 발견(#3099 범주):** 실행 초반 Read 도구로 컨텍스트 파일을 읽을 때 워크트리 경로(`.claude/worktrees/agent-a6b0b0d025521226d/...`)가 아니라 메인 체크아웃 절대경로(`/Users/lovelyalien/Documents/workspace/FootLog2/...`)를 그대로 사용했다. 첫 Edit 시도에서 "워크트리 밖 경로" 오류로 즉시 발견 — 두 경로가 우연히 같은 커밋(`53ff885`)을 가리키고 있어 읽은 내용 자체는 정확했음을 `cat`으로 확인한 뒤, 이후 모든 Read/Edit/Write 호출을 워크트리 절대경로로 전환해 진행했다. 실제 파일 변경/커밋은 전부 워크트리 경로에서만 수행됨.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- `(tabs)/index/[id]` 라우트가 존재하고, `CheckinDetailScreen`이 시각/지도/사진 3요소를 고정 순서로 렌더 — 05-04-PLAN.md(메모 편집·저장·미저장 경고·AppState flush·지도 앱 딥링크)가 같은 화면 파일에 이어 붙일 수 있는 상태.
- 05-06-PLAN.md(사진 교체/삭제)가 참고할 수 있도록 사진 블록에 "여기서는 표시 전용" 주석을 남겨둠.
- `checkin-detail-wiring.test.ts`의 5개 describe가 목적별로 분리돼 있어 05-04/05-06이 같은 파일에 assertion을 이어서 추가하기 쉬움 — Test 5(레이아웃 순서)는 05-04가 5요소로 확장할 예정이라는 주석이 이미 달려 있음.
- 블로커 없음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: `src/app/(tabs)/index/[id].tsx`
- FOUND: `src/checkin/CheckinDetailScreen.tsx`
- FOUND: `src/app/__tests__/checkin-detail-wiring.test.ts`
- FOUND commit: `3f69b3f` (Task 1)
- FOUND commit: `7cb1517` (Task 2)
- FOUND commit: `aabf5da` (Task 3)
