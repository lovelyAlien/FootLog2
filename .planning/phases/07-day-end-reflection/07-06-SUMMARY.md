---
phase: 07-day-end-reflection
plan: 06
subsystem: ui
tags: [react-native, bottom-sheet, flatlist, gorhom-bottom-sheet, jest]

# Dependency graph
requires:
  - phase: 06-calendar-tab
    provides: TodayBottomSheet의 emptyText/sheetRef 선택적 prop 확장 선례(06-05, 06-07)
provides:
  - "TodayBottomSheet가 체크인 0건에서도 BottomSheetFlatList를 항상 마운트"
  - "선택적 ListHeaderComponent/ListFooterComponent 슬롯"
  - "합성 리스트 항목 삽입을 금지하는 회귀 테스트 게이트"
affects: [07-07-past-date-reflection-prompt, 07-09-today-reflection-entry-row]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "선택적 prop 확장 시 '넘기지 않는 호출부의 동작은 완전히 불변' 주석 규약을 emptyText/sheetRef에 이어 ListHeaderComponent/ListFooterComponent에도 적용"
    - "리스트 항목 타입에 합성 요소를 섞지 않고 ListHeaderComponent/ListFooterComponent 슬롯으로 분리 — 삭제 핸들러 오염 방지"

key-files:
  created: []
  modified:
    - src/today/TodayBottomSheet.tsx
    - src/app/__tests__/today-wiring.test.ts

key-decisions:
  - "체크인 0건 삼항 분기를 제거하고 BottomSheetFlatList를 항상 마운트, 빈 상태는 ListEmptyComponent로 이동(스타일/문구 완전 동일 유지)"
  - "\"오늘 돌아보기\" 행/회고 프롬프트를 checkins 배열에 unshift/prepend하지 않고 ListHeaderComponent/ListFooterComponent 슬롯으로 분리 — CheckinListRow의 스와이프 삭제/상세 진입 전제가 합성 항목에 오작동하는 것을 구조적으로 차단(07-RESEARCH.md Pitfall 1)"

patterns-established:
  - "리스트 슬롯 계약: 소비 플랜(07-07/07-09)이 자신의 UI를 ListHeaderComponent/ListFooterComponent로 주입하며, 시트 자신은 슬롯 내용에 대해 알지 못함"

requirements-completed: [REQ-reflection-today-entry, REQ-past-reflection-edit]

# Metrics
duration: 12min
completed: 2026-09-03
---

# Phase 07 Plan 06: TodayBottomSheet 리스트 슬롯화 Summary

**TodayBottomSheet가 체크인 0건에서도 BottomSheetFlatList를 상시 마운트하도록 바꾸고, 부모가 리스트 최상단/최하단에 요소를 주입할 수 있는 선택적 ListHeaderComponent/ListFooterComponent 슬롯을 열었다.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-03T13:47:00+09:00 (약)
- **Completed:** 2026-09-03T13:59:42+09:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `checkins.length === 0` 삼항 분기 제거 — `BottomSheetFlatList`가 항상 마운트되고 빈 상태는 `ListEmptyComponent`로 이동(스타일/문구 완전 동일)
- 선택적 `ListHeaderComponent`/`ListFooterComponent` prop 추가 — 미전달 시 기존 두 소비 화면(오늘 뷰, 과거 날짜 뷰) 동작 완전 불변
- 합성 리스트 항목 삽입(`unshift`/`prepend`) 금지 원칙을 코드 헤더 주석과 회귀 테스트 양쪽에 고정

## Task Commits

Each task was committed atomically:

1. **Task 1: 리스트 상시 마운트 + 빈 상태/헤더/푸터 슬롯** - `0c0dc41` (refactor)
2. **Task 2: 시트 슬롯 계약 회귀 가드** - `56f0cd7` (test)

_Note: worktree 모드 — STATE.md/ROADMAP.md는 오케스트레이터가 wave 종료 후 병합한다._

## Files Created/Modified
- `src/today/TodayBottomSheet.tsx` - 체크인 0건 삼항 분기 제거, `ListEmptyComponent`/`ListHeaderComponent`/`ListFooterComponent` 추가. `styles.emptyText`/`snapPoints` 계산/`containerHeight <= 0` 조기 반환은 변경 없음.
- `src/app/__tests__/today-wiring.test.ts` - `readSrcSource` 헬퍼(calendar-wiring.test.ts와 동일 패턴) 추가, 새 describe 블록에 `it(` 7개 추가(슬롯 상시 마운트, 빈 상태/헤더/푸터 슬롯 존재, 합성 항목 삽입 부재, 필수 prop 5개 비-옵셔널 유지). 기존 `it(` 블록은 전혀 수정되지 않음.

## Decisions Made
- 체크인 0건 삼항 분기 제거 — `BottomSheetFlatList`를 항상 마운트하고 빈 상태를 `ListEmptyComponent`로 이동. 스타일(`typography.helperText` + `styles.emptyText`)과 문구(`emptyText` prop)는 완전히 동일하게 유지해 오늘 뷰/과거 날짜 뷰의 빈 상태 시각이 바뀌지 않도록 함.
- "오늘 돌아보기" 행(07-09)과 과거 날짜 회고 프롬프트(07-07)를 `checkins` 배열에 합성 항목으로 끼워 넣지 않고 `ListHeaderComponent`/`ListFooterComponent` 슬롯으로 완전히 분리 — `checkins`의 타입이 `CheckinRow[]`이고 `CheckinListRow`가 스와이프 삭제/상세 진입을 전제하므로, 합성 항목을 섞으면 삭제 핸들러가 잘못된 대상을 받는 구조적 위험이 생김(07-RESEARCH.md Pitfall 1 Warning signs). 이 결정은 threat_model T-07-16(Tampering)의 mitigation으로도 문서화됨.

## Deviations from Plan

None - plan executed exactly as written. 다만 acceptance criteria가 요구한 정확한 grep count(`checkins.length === 0` == 0, `unshift|prepend` == 0)를 맞추기 위해, 계획이 예시로 든 설명 문구("이전에는 `checkins.length === 0`일 때...", "합성 항목을 unshift하지 않는다") 그대로를 헤더 주석에 쓰지 않고 같은 의미를 다른 표현("체크인 배열 길이가 0인지 확인하는 삼항 분기", "checkins 배열 맨 앞에 합성으로 끼워 넣는 접근")으로 바꿔 썼다 — 코드/테스트 내용에는 영향 없는 순수 문구 조정이라 별도 deviation 규칙으로 분류하지 않음.

## Issues Encountered
None.

## Requirements Tracking Note

이 플랜의 frontmatter `requirements`는 `REQ-reflection-today-entry`/`REQ-past-reflection-edit`를
나열하지만, `.planning/REQUIREMENTS.md`의 체크박스는 **의도적으로 완료 처리하지 않았다**.
07-06 자신의 objective가 명시하듯 이 플랜은 두 소비 플랜(07-07, 07-09)이 붙을 구조적 슬롯만
열 뿐, "오늘 돌아보기" 행이나 편집 가능한 회고 프롬프트라는 사용자 체감 동작 자체는 만들지
않는다. 두 요구사항은 각각 07-09(REQ-reflection-today-entry)와 07-07/07-04
(REQ-past-reflection-edit)가 실제 동작을 배선하는 시점에 완료 처리되는 것이 맞다고 판단해
`requirements.mark-complete`를 실행했다가 되돌렸다(`git checkout -- .planning/REQUIREMENTS.md`).
SUMMARY 프론트매터의 `requirements-completed`는 GSD 관례대로 "이 플랜이 다룬 요구사항 ID"
메타데이터로만 남겨둔다.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 07-07(과거 날짜 회고 프롬프트)과 07-09(오늘 돌아보기 행)가 각각 `ListFooterComponent`/`ListHeaderComponent`로 UI를 주입할 수 있는 슬롯이 열렸다.
- @gorhom/bottom-sheet v5의 `BottomSheetFlatList`가 `ListHeaderComponent`/`ListFooterComponent`/`ListEmptyComponent`를 타입 수준에서 받아들이는 것은 `npx tsc --noEmit` 통과로 1차 확인됐으나(07-RESEARCH.md Assumptions Log A2, MEDIUM confidence), 런타임 실제 렌더 동작은 시뮬레이터 검증(07-10)에서 최우선으로 확인 필요.
- 소비 화면 2곳(`src/app/(tabs)/index/index.tsx`, `src/calendar/PastDateScreen.tsx`)은 이 플랜에서 수정되지 않았고 `git diff --exit-code`로 확인됨 — 다음 플랜이 새 prop을 실제로 전달하는 시점부터 소비 화면 수정이 시작된다.

## Self-Check: PASSED

- FOUND: src/today/TodayBottomSheet.tsx
- FOUND: src/app/__tests__/today-wiring.test.ts
- FOUND: 0c0dc41 (refactor(07-06): TodayBottomSheet 리스트 상시 마운트 + 헤더/푸터 슬롯 추가)
- FOUND: 56f0cd7 (test(07-06): TodayBottomSheet 슬롯 계약 회귀 가드 추가)

---
*Phase: 07-day-end-reflection*
*Completed: 2026-09-03*
