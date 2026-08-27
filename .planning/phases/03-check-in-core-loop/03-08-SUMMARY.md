---
phase: 03-check-in-core-loop
plan: 08
subsystem: ui
tags: [react-native, expo-symbols, expo-image, state-machine, reducer, checkin]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (03-04)
    provides: checkinRepo.ts SaveResult 판별 유니온, insert 단일 재시도
  - phase: 03-check-in-core-loop (03-06)
    provides: photos.ts PickedPhoto, PHOTO_ACTION_SHEET_OPTIONS
  - phase: 03-check-in-core-loop (03-07)
    provides: location.ts ResolvedLocation, applyDraggedSource
provides:
  - "src/checkin/checkinFlow.ts — IDLE→CAPTURING→CONFIRM→SAVING→SAVED/SAVE_FAILED 순수 리듀서"
  - "canEditNoteAndPhoto — 메모/사진 입력 허용 여부 단일 판정 지점"
  - "CHECKIN_COPY — 03-UI-SPEC.md 확정 문구 12종 단일 출처 상수"
  - "src/components/CheckinActionCard.tsx — 상태별 액션 카드 프레젠테이셔널 컴포넌트"
affects: [03-09, 03-10, 03-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "순수 리듀서 + useReducer 소비 패턴(화면의 useState 뭉치 대신 테스트 가능한 상태 머신)"
    - "정적 소스 분석 회귀 가드(notificationUi.test.ts와 동일 stripComments 패턴)"
    - "미마운트(비활성화 아님)로 데이터 무결성 게이트 구현"

key-files:
  created:
    - src/checkin/checkinFlow.ts
    - src/checkin/checkinFlow.test.ts
    - src/components/CheckinActionCard.tsx
    - src/components/__tests__/checkinCardUi.test.ts
  modified: []

key-decisions:
  - "확인/다시 시도 버튼은 colors.accent 미사용, priming.tsx 선례를 그대로 계승해 colors.textPrimary 필 버튼 채택"
  - "메모/사진 입력 영역은 disabled/pointerEvents가 아니라 phase==='SAVED' 조건부 렌더로 미마운트(canEditNoteAndPhoto와 동치)"
  - "CheckinActionCardProps에 Task 3 소비 props(photo/photoError/note/onPickPhoto/onChangeNote)를 Task 2에서 미리 확정해 인터페이스 드리프트 방지"

patterns-established:
  - "체크인 플로우 상태 머신은 React를 import하지 않는 순수 모듈로 분리 — 03-07 location.ts와 동일 원칙(deps.ts만 런타임 import 허용)"
  - "CHECKIN_COPY 단일 출처 상수 — src/notifications/content.ts 규약 계승"

requirements-completed: [REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin, REQ-checkin-core]

# Metrics
duration: 14min
completed: 2026-08-27
---

# Phase 03 Plan 08: 체크인 상태 머신 + 액션 카드 Summary

**checkinFlow.ts 순수 리듀서(6-phase 상태 머신)와 CheckinActionCard.tsx 프레젠테이셔널 컴포넌트로 저장 실패 UI 미마운트 계약(REQ-checkin-write-failure-ui)을 정적 테스트로 고정**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-27T19:08:59+09:00
- **Completed:** 2026-08-27T19:23:04+09:00
- **Tasks:** 3
- **Files modified:** 4 (all created)

## Accomplishments
- `checkinReducer` 순수 리듀서가 IDLE→CAPTURING→CONFIRM→SAVING→SAVED/SAVE_FAILED 6개 phase 전이와 RESTORE_DRAFT(D-05 강제종료 복구 경로), 방어적 no-op을 13개 테스트로 검증
- `CheckinActionCard`가 CONFIRM/SAVING/SAVED/SAVE_FAILED 4개 상태를 03-UI-SPEC.md 확정 문구/토큰으로 렌더링하며, accent 미사용·44pt 터치 타겟·SAVED 전용 메모/사진 미마운트를 15개 정적 계약 테스트로 고정
- 메모 TextInput 하나에만 `typography.journalEntry`가 적용되고, 사진 실패는 모달 없이 인라인 문구로만 표시

## Task Commits

Each task followed RED→GREEN TDD cycle (test-driven-development skill applied even though tasks were not marked `tdd="true"`):

1. **Task 1: checkinFlow.ts 순수 상태 머신 리듀서**
   - `61b9bd6` test(03-08): checkinFlow 상태 머신 전이 실패 테스트 작성
   - `7782360` feat(03-08): checkinFlow 상태 머신 리듀서 + 확정 문구 상수 구현
2. **Task 2: CheckinActionCard.tsx 상태별 카드 렌더링**
   - `2cf3956` test(03-08): CheckinActionCard 상태별 렌더링 정적 계약 실패 테스트 작성
   - `35f6b06` feat(03-08): CheckinActionCard 상태별 카드 렌더링 구현 (CONFIRM/SAVING/SAVE_FAILED)
3. **Task 3: 메모/사진 입력 영역 (SAVED 상태에서만 마운트)**
   - `0f49f09` test(03-08): 메모/사진 입력 영역 SAVED 전용 미마운트 계약 실패 테스트 추가
   - `9ee1428` feat(03-08): 메모/사진 입력 영역을 SAVED 상태 분기 안에서만 마운트

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/checkin/checkinFlow.ts` — 순수 상태 머신 리듀서, `canEditNoteAndPhoto`, `CHECKIN_COPY` 확정 문구 12종
- `src/checkin/checkinFlow.test.ts` — 13개 전이/불변성/문구 테스트
- `src/components/CheckinActionCard.tsx` — 상태별 액션 카드(CONFIRM/SAVING/SAVED+메모·사진/SAVE_FAILED)
- `src/components/__tests__/checkinCardUi.test.ts` — 15개 정적 소스 분석 회귀 가드

## Decisions Made
- 확인/다시 시도 버튼은 `colors.accent`를 쓰지 않고 priming.tsx의 "허용하기" 버튼과 동일하게 `colors.textPrimary` 필 버튼 채택 — DESIGN.md accent 6개 승인 용도 확장 방지(03-UI-SPEC.md §Color 근거 그대로 계승)
- 메모/사진 입력 영역은 `disabled`/`pointerEvents`가 아니라 `phase === 'SAVED'` 조건부 렌더로 미마운트 구현 — `canEditNoteAndPhoto(state)`가 이 조건과 정확히 동치임을 헤더 주석에 명시
- `CheckinActionCardProps`에 Task 3이 소비할 photo/photoError/note/onPickPhoto/onChangeNote를 Task 2에서 미리 타입 확정해 인터페이스 드리프트 방지(플랜 지시대로)

## Deviations from Plan

None - plan executed exactly as written. Task 1/2/3의 `<behavior>`/`<action>`/acceptance_criteria를 그대로 구현했고, 모든 grep 기반 acceptance criteria(SAVE_FAILED 카운트, canEditNoteAndPhoto, 확정 문구, journalEntry 1회, expo-symbols 1회, minHeight 68 등)를 재확인해 통과시켰다.

## Issues Encountered
- Task 3 GREEN 1차 시도에서 파일 헤더 주석에 `typography.journalEntry` 식별자를 그대로 인용해 "정확히 1회 등장" 테스트가 실패(주석 포함 2회 카운트). 주석 문구를 "journalEntry 타이포 토큰"으로 바꿔 실제 코드상 참조를 1회로 유지 — 실제 동작 변경 없음, 문서화 방식만 조정.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `checkinReducer`/`CHECKIN_COPY`/`CheckinActionCard`가 03-09(체크인 알약버튼+지도 화면 배선)와 03-10(확인 핀 드래그)이 그대로 조립할 수 있는 상태로 준비됨
- `ActionSheetIOS.showActionSheetWithOptions` 실제 호출과 `onPickPhoto`/`onChangeNote` 부모 배선은 03-09/03-10 소관(이 plan은 콜백 인터페이스만 노출)
- 특이 블로커 없음

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*
