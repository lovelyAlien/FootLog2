---
phase: 05-check-in-detail-edit
plan: 06
subsystem: ui
tags: [expo-image-picker, expo-file-system, ActionSheetIOS, react-native]

# Dependency graph
requires:
  - phase: 05-check-in-detail-edit (05-04)
    provides: "CheckinDetailScreen.tsx 편집 계층(메모/미저장 경고/AppState flush/Maps 딥링크) — 사진 슬롯은 표시 전용으로 남겨둔 상태"
provides:
  - "사진 슬롯 탭 → 기존 액션시트(촬영/앨범) 재사용 교체/추가(D-03)"
  - "사진 우상단 muted 톤 삭제 배지 — 확인/undo 없이 즉시 실행(D-04)"
  - "사진 교체·삭제 두 경로 공통 원자성 순서: DB 갱신 성공 → 그 다음에만 구 파일 non-blocking 정리(Pitfall 5)"
  - "checkin-detail-wiring.test.ts를 24개 → 36개 테스트(12 describe)로 확장한 회귀 가드"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "사진 편집(교체/삭제)은 isDirtyRef를 건드리지 않는다 — 메모(D-01, 명시적 미저장 경고)와 달리 즉시 저장이라 미저장 경고 다이얼로그 대상이 아니다(05-UI-SPEC.md 저장 트리거 매트릭스)"
    - "구 파일 정리는 항상 'DB 갱신 성공 → 그 다음에만 구 파일 delete, non-blocking'을 지킨다 — 순서를 뒤집으면 저장 실패 시 사진이 완전히 소실된다(Pitfall 5)"
    - "JSX 블록 주석({/* ... */})은 stripComments가 필터링하지 못한다(첫 줄이 '//'/'*'/'/*'로 시작하지 않으므로) — 정적 소스 분석 회귀 가드가 있는 파일에서는 JSX 주석 안에 금지 리터럴(예: '삭제')을 쓰지 않는다"
    - "사진 삭제 배지처럼 이미지 내부 오버레이가 필요한 경우에 한해 position: 'absolute'를 예외적으로 허용하고, 정확한 등장 횟수를 wiring 테스트로 게이트한다(프레젠테이셔널 계약의 '배치는 부모가 결정한다' 원칙과 공존)"

key-files:
  created: []
  modified:
    - "src/checkin/checkinFlow.ts"
    - "src/checkin/CheckinDetailScreen.tsx"
    - "src/app/__tests__/checkin-detail-wiring.test.ts"

key-decisions:
  - "사진 삭제 배지는 colors.textMuted(muted 톤)만 쓰고 colors.pin/colors.accent 둘 다 쓰지 않는다 — 체크인 전체 삭제(Pin)와 무게가 다른 가벼운 편집 액션이라는 D-04 계약을 색으로도 구분"
  - "체크인 전체 삭제의 4초 undo 스낵바(UndoSnackbar)를 사진 삭제에 재사용/import하지 않는다 — 두 삭제를 같은 컴포넌트로 묶으면 D-04(사진 삭제는 되돌림 없음)가 깨진다"
  - "D-05 회귀 가드(기존 Test 13)를 'trash/삭제 전면 부재'에서 'deleteCheckin/UndoSnackbar 부재'로 정교화 — 사진 삭제 배지가 생기면서 trash 아이콘/삭제 라벨 자체는 이 화면에 정당하게 존재하게 됐고, D-05의 본질(체크인 전체 삭제 진입점 부재)만 남겨 가드"

requirements-completed: [REQ-checkin-detail-base]

# Metrics
duration: ~35min
completed: 2026-09-01
---

# Phase 5 Plan 06: 사진 교체/삭제(D-03/D-04) Summary

**체크인 상세화면 사진 슬롯에 액션시트 기반 교체(D-03)와 muted 톤 즉시 삭제 배지(D-04, 확인/undo 없음)를 배선하고, 두 경로 모두 "DB 갱신 성공 후에만 구 파일 정리"라는 원자성 순서를 지키도록 wiring 테스트를 24개에서 36개로 확장했다.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2 완료
- **Files modified:** 3 (checkinFlow.ts, CheckinDetailScreen.tsx, checkin-detail-wiring.test.ts)

## Accomplishments
- `CheckinDetailScreen.tsx`의 사진 슬롯을 `Pressable`로 감싸 `(tabs)/index/index.tsx`의 기존 액션시트(`ActionSheetIOS`, `photos.ts`의 옵션/취소 인덱스/출처 매핑 상수 재사용)로 교체/추가를 배선(D-03). 접근성 라벨은 사진 유무에 따라 `changePhoto`/`photoPlaceholderLabel`로 분기.
- 사진이 있을 때만 우상단에 조건부 마운트되는 삭제 배지(`colors.surface` 반투명 원형 배경 + `colors.textMuted` trash 아이콘, `hitSlop`으로 44×44pt 터치 타겟)를 추가하고 `handleDeletePhoto`로 확인/undo 없는 즉시 삭제를 배선(D-04).
- 교체·삭제 두 핸들러 모두 동일한 원자성 순서를 지킨다: `previousPhotoPath`를 갱신 전에 지역 변수로 붙잡음 → `updateCheckinNoteAndPhoto` 성공 → 그 다음에만 `defaultPhotoStorageDeps.deleteFile`을 non-blocking 호출(실패해도 `console.error`만, 고아 파일만 남기고 데이터 유실 없음).
- 사진 편집은 `isDirtyRef`를 전혀 건드리지 않는다 — 메모(D-01, 명시적 미저장 경고)와 다르게 즉시 저장이라 미저장 경고 다이얼로그 대상이 아니다.
- `PhotoStorageDeps.deleteFile`은 05-02-PLAN.md가 이미 추가해둔 포트를 그대로 소비 — 이번 plan에서 신규 포트 추가는 필요 없었다.
- `checkin-detail-wiring.test.ts`를 24개(9 describe)에서 36개(12 describe)로 확장: 기존 D-05 describe를 `deleteCheckin`/`UndoSnackbar` 부재로 정교화, 기존 "position: 'absolute' 부재" 단언을 "정확히 1회"로 조정, 신규 describe 3개(사진 교체/삭제, 파일 삭제 순서 원자성, 사진 편집은 미저장 경고 대상 아님) 추가.
- 의도적 파손 실험 2건(삭제 핸들러에서 `deleteFile` 호출을 `updateCheckinNoteAndPhoto` 앞으로 이동 / 삭제 배지에 `Alert.alert` 확인 다이얼로그 임시 추가)으로 회귀 가드가 실제로 실패함을 확인한 뒤 원복.
- `npm test` 33 suites/483 tests 전부 그린, `npx tsc --noEmit` 통과.

## Task Commits

1. **Task 1: 사진 탭 → 액션시트로 교체/추가(D-03), 파일 삭제 순서 원자성 보장** - `7296695` (feat)
2. **Task 2: 사진 삭제 배지(D-04, 즉시·undo 없음) + wiring 테스트를 사진 편집 계약으로 확장** - `0f06a7f` (test)

_Note: 이 plan은 `tdd="true"` 태스크가 없어 RED/GREEN/REFACTOR 게이트 대상이 아니다(05-04-SUMMARY.md와 동일 판정)._

## Files Created/Modified
- `src/checkin/checkinFlow.ts` - `CHECKIN_DETAIL_COPY`에 `changePhoto`('사진 변경')/`deletePhoto`('사진 삭제') 문구 추가
- `src/checkin/CheckinDetailScreen.tsx` - 사진 슬롯 `Pressable`화(교체), 삭제 배지+`handleDeletePhoto`(D-04), 원자성 순서 보장, `photoError` state로 사진 첨부 실패 인라인 표시
- `src/app/__tests__/checkin-detail-wiring.test.ts` - D-05 describe 정교화, `position: 'absolute'` 단언 조정, describe 3개(Test 25~35) 신규 추가

## Decisions Made
- 사진 삭제 배지는 `colors.textMuted`만 쓰고 `colors.pin`/`colors.accent` 둘 다 배제 — 체크인 전체 삭제(Pin, 테라코타)와 시각적으로 분명히 구분되는 muted 편집 액션으로 취급(D-04).
- `UndoSnackbar`를 사진 삭제에 재사용하지 않음 — 두 삭제(체크인 전체 vs 사진 필드)를 같은 컴포넌트로 묶으면 "사진 삭제는 undo 없음"이라는 D-04 계약이 깨진다.
- 기존 D-05 회귀 가드(Test 13)의 "trash/삭제 전면 부재" 단언을 "deleteCheckin/UndoSnackbar 부재"로 좁힘 — 05-03-PLAN.md가 남긴 "05-06이 조정할 예정" 주석을 이 변경으로 소진. D-05의 본질(체크인 전체 삭제 진입점 부재)은 그대로 유지.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX 블록 주석 첫 줄이 stripComments 필터를 통과하지 못해 회귀 가드를 오염시킨 문제(05-04와 동일 계열 재발)**
- **Found during:** Task 1/2 자체 검증 단계(wiring 테스트 실행)
- **Issue:** `stripComments`는 `//`/`*`/`/*`로 시작하는 줄만 걸러내는데, JSX 블록 주석(`{/* ... */}`)의 **모든 줄**(첫 줄 포함)은 `{`로 시작해 이 조건에 걸리지 않는다. 새로 추가한 사진 삭제 배지 관련 JSX 주석 첫 줄에 "삭제"라는 한글 리터럴이 등장해 D-05 describe의 "'삭제' 문자열 부재" 단언(Test 13b)이 실패했다.
- **Fix:** 해당 주석의 "삭제"를 의미 보존하며 "제거"로 재서술(예: "삭제 배지" → "제거 배지"). 실제 회귀 가드가 원하는 계약("삭제" 관련 문구는 전부 `CHECKIN_DETAIL_COPY` 상수를 통해서만 노출되고 소스에 하드코딩되지 않는다)은 그대로 유지된다.
- **Files modified:** `src/checkin/CheckinDetailScreen.tsx`
- **Verification:** 재서술 후 `checkin-detail-wiring.test.ts` 36/36 통과.
- **Committed in:** `0f06a7f` (Task 2 커밋에 포함, 별도 커밋 아님)

**2. [Rule 1 - Bug] `changePhoto` 문구 도입 시 설명 주석이 checkinFlow.ts의 정확한-카운트 acceptance criteria를 깨뜨린 문제**
- **Found during:** Task 1 acceptance criteria 자체 검증(`grep -c "changePhoto" src/checkin/checkinFlow.ts`가 1이어야 함)
- **Issue:** 키 정의 위에 "changePhoto — ..."로 시작하는 설명 주석을 달았더니 같은 파일 안에서 "changePhoto" 리터럴이 2회(주석 1 + 키 정의 1) 등장해 acceptance criteria의 정확한-카운트 요구(1)를 벗어났다.
- **Fix:** 설명 주석에서 식별자를 직접 언급하지 않도록 재서술(예: "changePhoto — 05-06-PLAN.md Task 1." → "05-06-PLAN.md Task 1 —"), 키 정의 자체는 그대로 유지.
- **Files modified:** `src/checkin/checkinFlow.ts`
- **Verification:** `grep -c "changePhoto" src/checkin/checkinFlow.ts` 결과 1로 확인.
- **Committed in:** `7296695` (Task 1 커밋에 포함, 별도 커밋 아님)

---

**Total deviations:** 2 auto-fixed (2건 모두 acceptance criteria를 문자 그대로 충족시키기 위한 주석 재서술 — 기능 로직 변경 없음)
**Impact on plan:** 스코프 확장 없음. 두 건 모두 실제 회귀 가드(jest, `stripComments` 기반)가 의도한 계약을 정확히 충족시키는 수정이었다.

## Known Limitations (계획 문서 자체의 오차, 코드 결함 아님)

- **Task 2 acceptance criteria의 `grep -c "describe("`가 13이 아니라 12다:** PLAN.md는 "기존 10 + 신규 3 = 13"이라고 적었지만, 05-04-SUMMARY.md가 이미 기록했듯 이 파일의 실제 기존 describe 수는 10이 아니라 9였다(같은 산술 오차가 이번 plan의 acceptance criteria에도 그대로 전파됨). 이번 plan이 실제로 추가한 신규 describe는 계획 본문이 명시적으로 나열한 3개(사진 교체/삭제, 파일 삭제 순서 원자성, 사진 편집은 미저장 경고 대상 아님)뿐이며, 9+3=12가 정확한 실측값이다. 임의로 네 번째 describe를 만들어 숫자만 맞추지 않았다 — 본문이 명시한 assertion은 전부 구현했고(신규 11개 `it`), 실제 회귀 가드인 jest 스위트는 36/36 그린이다.

## Issues Encountered

None — 위 Deviations 항목 둘 다 정상적인 auto-fix 흐름(Rule 1) 안에서 해결됨.

## User Setup Required

None - 외부 서비스 설정 불필요. 신규 npm 패키지 설치 없음(`expo-file-system`/`expo-image-picker`는 Phase 3부터 쓰이던 기존 의존성, `deleteFile` 포트도 05-02-PLAN.md가 이미 추가해둔 것을 재사용).

## Simulator/Manual Verification Notes

이 plan의 검증은 전부 정적 소스 분석(jest `stripComments` 기법) + `tsc` + 2건의 의도적 파손 실험으로 이뤄졌다 — RN 렌더나 실제 액션시트/제스처 상호작용은 이 plan 범위에서 시뮬레이터로 검증하지 않았다(05-04-SUMMARY.md와 동일한 검증 범위 판단). 다음 항목은 시뮬레이터 확인이 유효한 후보이나 이번 실행에서는 수행하지 않았다(다음 QA/디자인 리뷰 단계 권장 — CLAUDE.md 시뮬레이터 우선 검증 원칙, 네이티브 모듈 구성 변경이 없는 JS 레이어 인터랙션이라 시뮬레이터로 재현 가능한 범주):
- 사진 탭 → 액션시트(촬영/앨범/취소) 실제 노출 및 각 옵션 동작 시각 확인.
- 사진 삭제 배지 탭 → 확인 다이얼로그 없이 즉시 빈 슬롯으로 전환되는지, 배지가 muted 톤(빨강/Pin 아님)으로 렌더되는지 시각 확인.
- 사진 교체/삭제 후에도 메모 편집 중이던 내용이 유지되는지(같은 갱신 호출이 note 필드도 함께 보내므로 유실되지 않아야 함) 실제 상호작용으로 확인.

## Next Phase Readiness

- `CheckinDetailScreen.tsx`가 표시/편집(메모)/사진 교체·삭제까지 05-UI-SPEC.md 레이아웃 계약 전체를 구현 완료 — 05-03~05-06이 이 화면의 전체 스코프를 완결했다.
- `checkin-detail-wiring.test.ts`가 12개 describe/36개 테스트로 이 화면의 회귀 가드를 포괄한다.
- Phase 6(캘린더 과거 날짜 뷰)이 `CheckinDetailScreen`을 재사용할 때 참고할 사진 편집 계약(즉시 저장, dirty 비추적, 원자성 파일 삭제 순서)이 이 plan으로 확정됨.
- 블로커 없음.

---
*Phase: 05-check-in-detail-edit*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: `src/checkin/CheckinDetailScreen.tsx`
- FOUND: `src/checkin/checkinFlow.ts`
- FOUND: `src/app/__tests__/checkin-detail-wiring.test.ts`
- FOUND: `.planning/phases/05-check-in-detail-edit/05-06-SUMMARY.md`
- FOUND commit: `7296695` (Task 1)
- FOUND commit: `0f06a7f` (Task 2)
