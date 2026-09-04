---
phase: 07-day-end-reflection
plan: 07
subsystem: ui
tags: [react-native, expo-router, reflection, calendar, bottom-sheet, wiring-test]

# Dependency graph
requires:
  - phase: 07-day-end-reflection (07-04)
    provides: useReflectionDraft 훅 + ReflectionPrompts 프레젠테이셔널 컴포넌트(로드/디바운스/AppState flush/재시도)
  - phase: 07-day-end-reflection (07-06)
    provides: TodayBottomSheet의 ListHeaderComponent/ListFooterComponent 슬롯 + 항상 마운트되는 리스트
provides:
  - "과거 날짜 뷰(PastDateScreen.tsx)에 스크러버 활성 날짜 기준 인라인 회고 편집 UI"
  - "PastDateScreen이 새 flush 경로를 추가하지 않고 useReflectionDraft의 내부 flush에만 의존하는 배선 패턴"
  - "시트 푸터에 프롬프트 터치 시 snapToIndex(1)로 여는 관용구(스크러버의 snapToIndex(0)과 반대 방향)"
affects: [calendar-tab, day-end-reflection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ListFooterComponent에는 반드시 useMemo 엘리먼트를 전달한다(인라인 화살표 함수 금지 — 타입 안정성 없으면 TextInput이 매 렌더 재마운트된다)"
    - "화면이 훅 내부 flush(dateKey 전환 cleanup)에 의존할 때는 화면 레벨 AppState 리스너를 추가하지 않는다(이중 flush 방지)"

key-files:
  created: []
  modified:
    - src/calendar/PastDateScreen.tsx
    - src/app/__tests__/calendar-wiring.test.ts

key-decisions:
  - "라우트 파라미터 dateKey가 아니라 스크러버로 갱신되는 activeDateKey를 useReflectionDraft에 전달 — 스크럽 중 보고 있는 날짜의 회고를 편집해야 하므로 handleRowPress와 동일한 판단"
  - "07-06이 도입한 Test 18(파일 전체에서 snapToIndex(1) 부재를 단언)을 handleScrubStart 콜백 본문 범위로 좁힘 — 원래 T1 CRITICAL 불변식(스크러버가 시트를 강제로 열지 않음)은 유지하면서, 이 플랜이 요구하는 프롬프트 터치 시 OPEN 기능을 허용"

patterns-established:
  - "회고 편집 화면 확장 시 공유 훅/컴포넌트(useReflectionDraft, ReflectionPrompts)를 그대로 소비하고 화면별 로직(flush 타이머, TextInput)을 재구현하지 않는다"

requirements-completed: [REQ-past-reflection-edit]

# Metrics
duration: 8min
completed: 2026-09-03
---

# Phase 07 Plan 07: 과거 날짜 뷰 인라인 회고 편집 Summary

**PastDateScreen.tsx가 07-04의 useReflectionDraft/ReflectionPrompts를 재사용해 스크러버 활성 날짜 기준 인라인 회고 편집을 시트 푸터에 추가(복제 0건), calendar-wiring.test.ts에 8개 회귀 단언 추가**

## Performance

- **Duration:** 약 8분 (base 03dba2e → 첫 커밋 fc91372 → 마지막 커밋 09e3e87)
- **Started:** 2026-09-03T05:19:36Z (base)
- **Completed:** 2026-09-03T05:26:27Z
- **Tasks:** 2/2 완료
- **Files modified:** 2

## Accomplishments
- 과거 날짜 뷰(캘린더 탭 → 날짜 탭)에서 그날의 회고 프롬프트 2칸을 시트 하단 인라인으로 바로 편집 가능
- 스크러버로 날짜를 옮기면 useReflectionDraft 내부 로드/flush 가드 덕분에 프롬프트 내용이 자동으로 해당 날짜 회고로 전환되고, 전환 직전 미저장 답변은 이전 날짜 레코드에 정확히 flush됨
- 회고 모달(07-05가 아직 실행되지 않았어도)과 물리적으로 동일한 프롬프트 UI/저장 로직 재사용 — 이 플랜이 새로 만든 TextInput/디바운스/재시도 코드는 0건
- calendar-wiring.test.ts에 REQ-past-reflection-edit/D-04 계약을 고정하는 8개 회귀 단언 추가

## Task Commits

Each task was committed atomically:

1. **Task 1: 과거 날짜 뷰에 인라인 회고 프롬프트 배선** - `fc91372` (feat)
2. **Task 2: 과거 날짜 회고 편집 계약 회귀 가드** - `09e3e87` (test)

_Note: SUMMARY.md commit is separate (docs, worktree mode excludes STATE.md/ROADMAP.md)._

## Files Created/Modified
- `src/calendar/PastDateScreen.tsx` - `useReflectionDraft(db, activeDateKey)` 호출, `useMemo` 시트 푸터 엘리먼트(`ReflectionPrompts` 래핑), 프롬프트 터치 시 `snapToIndex(1)`로 여는 핸들러 추가
- `src/app/__tests__/calendar-wiring.test.ts` - Test 18을 `handleScrubStart` 콜백 본문 범위로 좁힘(Rule 1 자동수정) + 신규 describe 블록(Test 26~33, 8개 단언)

## Decisions Made
- 라우트 파라미터가 아니라 `activeDateKey`(스크러버 상태)를 훅에 전달 — 스크럽 중인 날짜를 편집 대상으로 삼기 위함(계획 지시 그대로, 코드 주석으로 근거 남김)
- 시트 푸터는 `useMemo` 엘리먼트로만 전달 — 인라인 화살표 컴포넌트 금지 게이트를 acceptance criteria 그대로 준수
- 화면 레벨 flush `useEffect`/`AppState` 리스너를 추가하지 않음 — `useReflectionDraft`가 `dateKey` 전환 cleanup에서 이미 flush하므로 이중 저장 경로를 만들지 않기 위함

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] calendar-wiring.test.ts Test 18의 과도하게 넓은 회귀 단언 좁힘**
- **Found during:** Task 1 검증(`NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__`)
- **Issue:** 06-07/07-06이 추가한 Test 18은 `pastDateScreenCodeOnly` 전체에서 `snapToIndex(1)`이 절대 등장하지 않아야 한다고 단언했다. 원래 취지(T1 CRITICAL)는 "스크러버가 시트를 강제로 열지 않는다"였는데, 이 플랜이 요구하는 신규 기능(프롬프트 터치 시 키보드를 가리지 않도록 시트를 OPEN으로 펴는 `snapToIndex(1)`)과 정면으로 충돌해 정당한 신규 동작을 파일 전체 금지 규칙이 막고 있었다.
- **Fix:** 단언 범위를 `handleScrubStart` 콜백 본문으로 좁혀, 원래 불변식(스크러버 콜백은 `snapToIndex(0)`만 호출)은 그대로 유지하면서 파일의 다른 곳(프롬프트 푸터)에서 `snapToIndex(1)`을 호출하는 것은 허용하도록 수정.
- **Files modified:** src/app/__tests__/calendar-wiring.test.ts
- **Verification:** `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__` 전체 스위트(299개) green
- **Committed in:** fc91372 (Task 1 커밋에 포함 — 이 화면 파일과 함께 이 규칙 수정이 없으면 Task 1 자체가 검증 통과 불가능했으므로 분리하지 않음)

**2. [Rule 1 - Bug] 계획 acceptance criteria grep이 설명 주석과 충돌**
- **Found during:** Task 1 acceptance criteria 검증(`grep -c 'ListFooterComponent={() =>' / 'AppState' / 'TextInput'`)
- **Issue:** 코드에 왜 인라인 화살표 컴포넌트/AppState 리스너/TextInput 재구현을 쓰지 않았는지 설명하는 주석에 해당 금지 문자열을 그대로 인용했더니, grep이 코드와 주석을 구분하지 못해 acceptance criteria(카운트 0)를 위반했다.
- **Fix:** 동일한 설명을 유지하되 금지 리터럴 문자열을 코드에 등장시키지 않는 표현으로 주석을 재작성(예: "AppState 리스너" → "앱 포그라운드/백그라운드 전환 리스너").
- **Files modified:** src/calendar/PastDateScreen.tsx
- **Verification:** 4개 grep(`ListFooterComponent={() =>`/`AppState`/`sectionTitle\|REFLECTION_THUMBNAIL`/`TextInput`) 전부 0으로 통과
- **Committed in:** fc91372 (Task 1 커밋에 포함)

---

**Total deviations:** 2 auto-fixed (2 bugs, Rule 1)
**Impact on plan:** 둘 다 이 플랜 자체의 acceptance criteria를 충족시키기 위해 필수였다. 화면 로직/스코프 확장 없음 — 회귀 테스트 정밀도 조정과 주석 표현 변경뿐.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REQ-past-reflection-edit 요구사항이 이 플랜 하나로 완전히 충족됨(과거 날짜 뷰 회고 편집 + 회귀 가드 모두 이 플랜 범위 안에서 완료).
- 07-05(회고 모달)와 이 플랜은 07-04 공유 산출물만 소비하므로 상호 의존 없음 — 병렬 웨이브 실행과 호환.
- 실기기 검증 불필요 항목: 이 플랜은 순수 JS 레이어(상태 배선, 시트 open/close, 리스트 푸터 슬롯)만 다루며 네이티브 모듈 변경이 없다. 실기기에서만 검증 가능한 항목(GPS, 카메라 등)은 이 플랜과 무관.

---
*Phase: 07-day-end-reflection*
*Completed: 2026-09-03*

## Self-Check: PASSED

- FOUND: src/calendar/PastDateScreen.tsx
- FOUND: src/app/__tests__/calendar-wiring.test.ts
- FOUND: .planning/phases/07-day-end-reflection/07-07-SUMMARY.md
- FOUND commit: fc91372 (feat(07-07))
- FOUND commit: 09e3e87 (test(07-07))
- FOUND commit: 390bebd (docs(07-07))
