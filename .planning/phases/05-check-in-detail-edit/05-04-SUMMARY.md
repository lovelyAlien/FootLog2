---
phase: 05-check-in-detail-edit
plan: 04
subsystem: ui
tags: [expo-router, beforeRemove, appstate, expo-linking, react-navigation]

# Dependency graph
requires:
  - phase: 05-check-in-detail-edit (05-03)
    provides: "CheckinDetailScreen.tsx 표시 계층(시각/정적 지도/사진 고정 레이아웃) + (tabs)/index/[id] 라우트 셸"
provides:
  - "메모 편집 + 명시적 flushNoteAndPhoto(단일 재시도) — 자동저장 아님(D-01)"
  - "인앱 이탈 시 3버튼 미저장 경고(beforeRemove, style: 'default' 전용, 헤더 뒤로가기/스와이프백 둘 다 커버)"
  - "AppState 백그라운드 전환 시 조용한 flush(D-02, active 가드 필수)"
  - "지도 앱에서 열기' 딥링크 — flush 선행 후 Linking.openURL(maps.apple.com)"
  - "저장 2회 연속 실패 시 CheckinActionCard SAVE_FAILED 패턴 복제 인라인 실패 UI"
  - "checkin-detail-wiring.test.ts를 24개 테스트(9 describe)로 확장한 회귀 가드"
affects: [05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "flushNoteAndPhoto를 [db, checkinId]에만 의존하는 useCallback으로 고정하고, 최신 note/photoPath/dirty 값은 ref 미러(noteRef/photoPathRef/isDirtyRef)로 읽는다 — 여러 트리거(beforeRemove/AppState/딥링크/재시도)가 매 렌더 재구독 없이 같은 저장 함수를 공유"
    - "checkin state를 참조하는 핸들러(handleOpenInMaps)는 반드시 'if (!checkin) return null;' 이후, const 화살표 함수로 선언한다 — function 선언(호이스팅)은 TS의 null narrowing을 잃는다"
    - "CHECKIN_DETAIL_COPY를 CHECKIN_COPY와 분리된 단일 출처 상수로 둔다 — 캡처 흐름 문구와 편집 흐름 문구의 회귀 가드가 서로 간섭하지 않게"
    - "레이아웃 순서 회귀 테스트는 반드시 JSX 렌더 블록(<ScrollView 이후)만 슬라이스해 indexOf 비교한다 — 데이터 로드 useEffect 안의 동일 식별자(photo_path) 재등장이 순서 단언을 오염시킬 수 있다"

key-files:
  created: []
  modified:
    - "src/checkin/checkinFlow.ts"
    - "src/checkin/CheckinDetailScreen.tsx"
    - "src/app/__tests__/checkin-detail-wiring.test.ts"

key-decisions:
  - "CheckinActionCard를 import해 재사용하지 않고 시각 스타일만 복제 — phase 상태 머신 없는 화면에 가짜 phase를 넘기는 오염을 피함(플랜이 사전 확정한 결정, 그대로 따름)"
  - "handleOpenInMaps를 'if (!checkin) return null;' 뒤 const 화살표 함수로 재배치 — function 선언 위치에서는 TS가 checkin의 null narrowing을 closure에 전파하지 않아 checkin?.lat 옵셔널 체이닝이 필요했는데, 이는 acceptance criteria가 요구하는 'URL 보간 인자는 checkin.lat/checkin.lng뿐'이라는 문자 그대로의 계약과 충돌 — 위치를 옮겨 옵셔널 체이닝 없이 타입 안전하게 satisfy"
  - "레이아웃 순서 테스트(Test 5)를 <ScrollView 이후로 슬라이스해 검사 — Task 1이 추가한 'photoPathRef.current = row?.photo_path' 데이터 로드 코드가 photo_path 문자열을 JSX보다 먼저 등장시켜 순서 단언이 깨지는 것을 막음"

requirements-completed: [REQ-checkin-detail-flush, REQ-maps-deeplink]

# Metrics
duration: ~20min
completed: 2026-09-01
---

# Phase 5 Plan 04: 체크인 상세화면 편집 계층(메모/미저장 경고/AppState flush/Maps 딥링크) Summary

**메모 TextInput + 명시적 flush(자동저장 아님), beforeRemove 3버튼 미저장 경고(전부 style: 'default'), AppState 백그라운드 조용한 flush, "지도 앱에서 열기" 딥링크(flush 선행)를 CheckinDetailScreen.tsx에 배선하고 wiring 테스트를 13개에서 24개로 확장했다.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 완료
- **Files modified:** 3 (checkinFlow.ts, CheckinDetailScreen.tsx, checkin-detail-wiring.test.ts)

## Accomplishments
- `checkinFlow.ts`에 `CHECKIN_DETAIL_COPY`(미저장 경고 3버튼 문구 + "지도 앱에서 열기" 라벨) 단일 출처 상수를 `CHECKIN_COPY`와 분리 추가.
- `CheckinDetailScreen.tsx`에 메모 편집 상태(dirty ref 추적, blur 저장 없음) + `flushNoteAndPhoto`(runWithSingleRetry 재사용, 성공 시 dirty 해제, 2회 연속 실패 시 인라인 실패 UI 마운트) 배선.
- "지도 앱에서 열기" 텍스트 버튼(muted 톤, 레이아웃 3번 슬롯)을 flush 선행 후 `Linking.openURL(maps.apple.com/?ll=lat,lng)`로 연결, `canOpenURL` 사전 체크 생략.
- `AppState` 리스너로 background 전환 시 `active` 가드를 거쳐 dirty할 때만 조용히 flush(Alert 없음, D-02).
- `beforeRemove` 리스너로 dirty할 때만 3버튼(계속 편집/저장하지 않고 나가기/저장하고 나가기) `Alert` — 세 버튼 모두 `style: 'default'`, `destructive` 금지.
- `checkin-detail-wiring.test.ts`를 5요소 레이아웃 순서(시각→지도→딥링크→사진→메모)로 확장하고 4개 describe(미저장 경고/AppState flush/Maps 딥링크/자동저장 미채택)를 신규 추가, 총 24개 테스트. `npm test` 32 suites/448 tests 그린, `npx tsc --noEmit` 통과.
- 두 가지 mutation 실험(discardAndLeave 버튼에 `style: 'destructive'` 임시 주입, `handleOpenInMaps` 안에서 flush/openURL 순서 뒤집기)으로 회귀 가드가 실제로 실패함을 확인한 뒤 원복.

## Task Commits

1. **Task 1: 메모 편집 + 명시적 저장(flushNoteAndPhoto) + 저장 실패 인라인 UI** - `26c6c81` (feat)
2. **Task 2: "지도 앱에서 열기" 딥링크(flush 선행) + AppState 백그라운드 조용한 flush** - `d596f55` (feat)
3. **Task 3: beforeRemove 3버튼 미저장 경고(D-01) + wiring 테스트 확장** - `135c411` (test)
4. **문서: 파일 헤더 주석 갱신** - `d891a9e` (docs, 스코프 외 소규모 후속 정리)

_Note: 이 plan은 `tdd="true"` 태스크가 없어 RED/GREEN/REFACTOR 게이트 대상이 아니다._

## Files Created/Modified
- `src/checkin/checkinFlow.ts` - `CHECKIN_DETAIL_COPY` 상수 추가(미저장 경고 3버튼 + 지도 앱 열기 문구, `CHECKIN_COPY`와 분리)
- `src/checkin/CheckinDetailScreen.tsx` - 메모 편집/저장, beforeRemove 경고, AppState flush, Maps 딥링크, 저장 실패 UI 전부 배선
- `src/app/__tests__/checkin-detail-wiring.test.ts` - Test 5를 5요소로 확장 + describe 4개(Test 14~24) 신규 추가

## Decisions Made
- `CheckinActionCard`를 import해 재사용하지 않고 시각 스타일만 복제(플랜이 사전 확정한 결정을 그대로 따름) — phase 상태 머신이 없는 이 화면에 가짜 phase를 넘기는 것은 재사용이 아니라 오염이라는 근거.
- `handleOpenInMaps`를 `if (!checkin) return null;` 뒤 `const` 화살표 함수로 재배치 — `function` 선언 위치에서는 TypeScript가 `checkin`의 null narrowing을 클로저에 전파하지 않아 `checkin?.lat` 옵셔널 체이닝이 필요했는데, 이는 acceptance criteria가 요구하는 "URL 보간 인자는 `checkin.lat`/`checkin.lng`뿐"이라는 계약과 충돌 — 위치를 옮겨 옵셔널 체이닝 없이 타입 안전하게 만족시켰다.
- 레이아웃 순서 테스트(Test 5)를 `<ScrollView` 이후로 슬라이스해 검사 — Task 1이 추가한 `photoPathRef.current = row?.photo_path` 데이터 로드 코드가 `photo_path` 문자열을 실제 JSX보다 먼저 등장시켜, 파일 전체를 대상으로 한 단순 `indexOf` 비교가 깨지는 것을 방지.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX 블록 주석이 다시 `stripComments`/문자 그대로의 grep 검증을 오염시킨 문제(05-03과 동일 계열 재발)**
- **Found during:** Task 2 acceptance criteria 자체 검증 단계
- **Issue:** JSX `{/* ... */}` 블록 주석의 연속 줄이 실제 소스 텍스트로 취급되면서, `colors.accent`/`colors.pin`/`'삭제'`/`canOpenURL` 같은 금지 리터럴이 주석 설명 안에 우연히 등장해 3개 wiring 테스트(Test 9/10/13)가 일시 실패했다.
- **Fix:** 주석 문구를 의미는 보존하되 금지 리터럴과 겹치지 않게 재서술(예: "colors.pin" → "목록 행 스와이프 어포던스 전용 토큰"). 함수 선언 위 일반 `//` 주석(들여쓰기 있음)에 등장한 `onBlur`/`canOpenURL`/`e.data.action`/`destructive`/`style: 'default'` 리터럴도 동일 이유로 재서술 — 플랜의 acceptance criteria가 쓰는 `grep -v '^//'`는 들여쓰기된 주석 줄을 걸러내지 못하기 때문(반면 실제 jest 회귀 가드가 쓰는 `stripComments` 유틸은 들여쓰기를 정확히 처리해 통과함).
- **Files modified:** `src/checkin/CheckinDetailScreen.tsx`
- **Verification:** 재서술 후 `checkin-detail-wiring.test.ts` 24/24 통과, 문자 그대로의 acceptance criteria bash 명령도 전부 기대값과 일치하도록 재확인.
- **Committed in:** `26c6c81`/`d596f55`/`135c411` (해당 태스크 커밋에 포함, 별도 커밋 아님)

**2. [Rule 1 - Bug] `function` 선언이 TypeScript null narrowing을 잃어 `checkin?.lat` 옵셔널 체이닝이 필요했던 문제**
- **Found during:** Task 2 `npx tsc --noEmit` 검증 단계
- **Issue:** `handleOpenInMaps`를 `function` 선언으로 두면 TS가 `if (!checkin) return null;` 이후의 narrowing을 클로저에 전파하지 않아 `checkin.lat`/`checkin.lng` 접근에 `TS18047` 에러가 발생, `checkin?.lat`로 우회하면 URL 보간 인자가 acceptance criteria가 요구하는 정확한 리터럴(`checkin.lat`)과 달라짐.
- **Fix:** `handleOpenInMaps`를 `if (!checkin) return null;` 이후 위치의 `const` 화살표 함수로 재배치 — `const` 바인딩은 narrowing이 이후 클로저에도 전파되어 옵셔널 체이닝 없이 타입 안전.
- **Files modified:** `src/checkin/CheckinDetailScreen.tsx`
- **Verification:** `npx tsc --noEmit` 통과, `grep -o 'll=\${[^\`]*'` 출력이 `ll=${checkin.lat},${checkin.lng}`로 정확히 일치.
- **Committed in:** `d596f55` (Task 2 커밋)

---

**Total deviations:** 2 auto-fixed (2 bugs — 회귀 가드/타입 안전성 관련, 둘 다 acceptance criteria를 문자 그대로 충족시키기 위한 수정)
**Impact on plan:** 스코프 확장 없음, 기능 로직 변경 없음(주석 재서술 + 함수 선언 위치/형태만 변경). 두 건 모두 계획이 명시한 acceptance criteria를 정확히 충족시키기 위한 수정이었다.

## Known Limitations (계획 문서 자체의 오차, 코드 결함 아님)

- **PLAN.md Task 1/2 acceptance criteria의 문자 그대로의 grep 카운트 일부가 실제 코드와 불일치:** 예) `runWithSingleRetry`/`updateCheckinNoteAndPhoto`는 import 문 자체도 함수명을 포함하므로 "정확히 1회 등장" 기준이 아니라 "import 1회 + 호출 1회"로 2회 이상 매치된다. `saveFailedHeadline|saveFailedHelper|retryCta` 카운트도 JSX 텍스트 참조 + `StyleSheet` 키 이름(`saveFailedHeadline` 스타일 객체 등)이 함께 매치돼 3이 아니라 8이 나온다. 이 항목들은 실제 회귀 가드인 `checkin-detail-wiring.test.ts`(stripComments 기반, 24/24 통과)로는 검증되지 않는, PLAN.md의 예시 bash 스니펫 자체의 근사치 오차다 — 함수가 정확히 1회씩 호출되고 3개 문구 상수가 모두 등장한다는 의도(semantic intent)는 충족했다.
- **Task 3 acceptance criteria의 `grep -c "describe("`가 10이 아니라 9다:** PLAN.md 본문이 나열한 신규 describe는 4개(미저장 경고/AppState flush/Maps 딥링크/자동저장 미채택)뿐인데, acceptance criteria 문구는 "10(기존 5 + 신규 5)"로 적혀 있어 산술이 어긋난다. 본문이 명시적으로 나열한 assertion을 전부 구현했으므로(총 24개 `it`), 이 불일치는 계획 문서의 표기 오차로 판단하고 임의로 다섯 번째 describe를 만들어 채우지 않았다.

## Issues Encountered

None — 위 Deviations 항목 둘 다 정상적인 auto-fix 흐름(Rule 1) 안에서 해결됨.

## User Setup Required

None - 외부 서비스 설정 불필요. 신규 npm 패키지 설치 없음(`expo-linking`은 `permissions.ts`가 이미 쓰던 기존 의존성).

## Simulator/Manual Verification Notes

이 plan의 검증은 전부 정적 소스 분석(jest `stripComments` 기법) + `tsc`로 이뤄졌다 — RN 렌더나 실제 제스처/Alert 상호작용은 이 plan 범위에서 시뮬레이터로 검증하지 않았다. 다음 항목은 시뮬레이터 확인이 유효한 후보이나 이번 실행에서는 수행하지 않았다(다음 QA/디자인 리뷰 단계 권장 — CLAUDE.md 시뮬레이터 우선 검증 원칙):
- 메모 TextInput 편집 → 뒤로가기 시 실제 iOS `Alert.alert` 3버튼이 담담한 톤(빨강 없음)으로 뜨는지 시각 확인.
- "지도 앱에서 열기" 탭 시 실제 Apple Maps 전환 및 복귀 후 화면 상태.
- AppState 백그라운드 전환(홈 버튼) 시 조용한 flush가 실제로 일어나는지(네이티브 모듈 구성 변경 없는 JS 레이어 인터랙션이라 시뮬레이터로 재현 가능한 범주).

## Next Phase Readiness

- `CheckinDetailScreen.tsx`가 메모 편집/저장/미저장 경고/AppState flush/Maps 딥링크까지 전부 갖춘 상태 — 05-06-PLAN.md(사진 교체/삭제)가 사진 블록에 이어 붙일 수 있다.
- 05-05-PLAN.md(리스트 스와이프 삭제)는 이 plan과 파일이 겹치지 않아(별도 `CheckinListRow.tsx`) 독립적으로 진행 가능.
- `checkin-detail-wiring.test.ts`가 9개 describe로 정리돼 있어 05-06이 사진 교체/삭제 관련 새 describe를 이어서 추가하기 쉽다 — 특히 D-05 describe(Test 13)의 "'삭제' 문자열 부재" 가드는 05-06이 "사진 삭제" 접근성 라벨을 추가하면 정규식을 조정해야 한다는 주석이 이미 코드에 남아 있다.
- 블로커 없음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: `src/checkin/checkinFlow.ts`
- FOUND: `src/checkin/CheckinDetailScreen.tsx`
- FOUND: `src/app/__tests__/checkin-detail-wiring.test.ts`
- FOUND: `.planning/phases/05-check-in-detail-edit/05-04-SUMMARY.md`
- FOUND commit: `26c6c81` (Task 1)
- FOUND commit: `d596f55` (Task 2)
- FOUND commit: `135c411` (Task 3)
- FOUND commit: `d891a9e` (문서 후속 정리)
