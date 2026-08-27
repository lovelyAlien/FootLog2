---
phase: 03-check-in-core-loop
plan: 10
subsystem: ui
tags: [react-native, expo-sqlite, expo-image-picker, ActionSheetIOS, KeyboardAvoidingView, AppState]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (plan 09)
    provides: 최소 지도 화면(MapView) + 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert 배선
  - phase: 03-check-in-core-loop (plan 04)
    provides: checkinRepo(commitCheckin/updateCheckinNoteAndPhoto), draftRepo(loadRecoverableDraft/deleteDraft)
  - phase: 03-check-in-core-loop (plan 06)
    provides: photos.ts(pickAndCopyPhoto, PHOTO_ACTION_SHEET_OPTIONS 등)
  - phase: 03-check-in-core-loop (plan 08)
    provides: checkinFlow.ts(리듀서, CHECKIN_COPY, canEditNoteAndPhoto), CheckinActionCard.tsx
provides:
  - "확인"/"다시 시도" → commitCheckin 배선(재시도 시 id 재사용, 자동 재시도 1회는 리포지토리 소관)
  - 저장 실패 상태 이탈(백그라운드 전환) 시 미저장 이탈 Alert 1회 노출
  - 사진 액션시트(ActionSheetIOS) → pickAndCopyPhoto → updateCheckinNoteAndPhoto 반영
  - 메모 블러/백그라운드 전환 시점 flush(디바운스 자동저장 없음)
  - 카드 컨테이너 KeyboardAvoidingView(behavior=padding)
  - 앱 부팅 시 오늘 드래프트 → CONFIRM 상태 복구, 날짜 경계 만료 시 조용한 소멸
affects: [04-today-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "저장/재시도 공유 핸들러 + ref 기반 pendingCheckinId로 재시도 시 id 재사용(중복 row 방지)"
    - "stateRef 미러링으로 AppState 리스너를 컴포넌트 생명주기 동안 1회만 구독(매 렌더 재구독 방지)"
    - "메모/사진 DB flush는 블러/백그라운드 전환에서만 수행(디바운스 자동저장은 Phase 7 스코프)"

key-files:
  created: []
  modified:
    - src/app/index.tsx
    - src/app/__tests__/checkin-wiring.test.ts
    - src/components/CheckinActionCard.tsx

key-decisions:
  - "CheckinActionCard에 onNoteBlur prop 추가(계획 frontmatter의 files_modified에 없었지만, '블러 시점 flush' 요구를 files_modified=index.tsx만으로는 충족할 수 없어 Rule 3로 최소 확장)"
  - "미저장 이탈 Alert과 메모/사진 백그라운드 flush를 하나의 AppState 구독으로 통합(리스너 중복 최소화, stateRef로 최신 상태 참조)"

requirements-completed: [REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin]

# Metrics
duration: ~25min
completed: 2026-08-27
---

# Phase 3 Plan 10: 체크인 저장 → 사진/메모 → 드래프트 복구 배선 Summary

**"확인" 탭이 commitCheckin으로 실제 저장되고, 실패 시 재시도 버튼과 미저장 이탈 안내가 뜨며, 저장 성공 후 사진/메모가 체크인 row에 반영되고, 앱 재실행 시 같은 날짜 드래프트가 확인 핀 화면으로 자동 복구된다.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-27 (직전 wave 완료 직후)
- **Completed:** 2026-08-27T21:04:52+09:00
- **Tasks:** 3
- **Files modified:** 3 (src/app/index.tsx, src/app/__tests__/checkin-wiring.test.ts, src/components/CheckinActionCard.tsx)

## Accomplishments
- "확인"/"다시 시도"가 `handleSaveCheckin` 단일 함수를 공유해 `commitCheckin`을 호출하고 SAVED/SAVE_FAILED로 분기, 재시도 시 첫 TAP_CONFIRM에서 만든 id를 ref에 보관해 재사용(T-3-25 중복 row 방지)
- SAVE_FAILED 상태에서 앱이 백그라운드로 전환되면 OS 네이티브 Alert("이 체크인은 저장되지 않았어요")을 정확히 1회 노출, 드래프트는 삭제하지 않아 D-05 복구 경로로 자연스럽게 이어짐
- 사진 액션시트(`ActionSheetIOS` + `photos.ts` 상수)로 촬영/앨범 선택 → `pickAndCopyPhoto` → `updateCheckinNoteAndPhoto`로 체크인 row 반영, 실패 시 인라인 문구만(모달 없음)
- 메모는 매 키 입력마다 로컬 상태만 갱신하고 TextInput 블러 또는 앱 백그라운드 전환 시점에만 DB에 flush(디바운스 자동저장 없음, Phase 7 스코프 보존)
- 카드 컨테이너에 `KeyboardAvoidingView(behavior="padding")` 적용으로 메모 입력 시 키보드가 카드를 가리지 않음
- 앱 부팅 시 `loadRecoverableDraft`로 오늘 드래프트를 확인 핀(CONFIRM) 상태로 즉시 복구, 위치 권한 재확인이나 GPS 재캡처 없이 드래프트 좌표를 그대로 사용, 날짜가 바뀐 드래프트는 안내 없이 조용히 사라짐

## Task Commits

Each task was committed atomically:

1. **Task 1: "확인" 탭 → commitCheckin 배선 + 재시도 + 미저장 이탈 안내** - `357899a` (feat)
2. **Task 2: 메모/사진 저장 배선 + 액션시트 + 키보드 회피** - `b52c910` (feat)
3. **Task 3: 앱 부팅 시 드래프트 복구 + 날짜 경계 만료** - `4807048` (feat)

**Plan metadata:** (worktree mode — orchestrator commits STATE.md/ROADMAP.md centrally after merge)

## Files Created/Modified
- `src/app/index.tsx` - 저장/재시도 배선, 미저장 이탈 Alert, 사진 액션시트, 메모 flush, KeyboardAvoidingView, 드래프트 복구 useEffect
- `src/app/__tests__/checkin-wiring.test.ts` - Task 1~3 배선 계약 테스트 15개 추가(총 47개, 기존 32개 + 15개)
- `src/components/CheckinActionCard.tsx` - `onNoteBlur` prop 추가, TextInput에 `onBlur` 연결

## Decisions Made
- 재시도 시 새 id를 만들지 않고 첫 TAP_CONFIRM에서 생성한 id를 `pendingCheckinIdRef`에 보관해 재사용 — `id TEXT PRIMARY KEY` 스키마 제약과 함께 이중 방어(T-3-25)
- 미저장 이탈 안내와 메모/사진 백그라운드 flush를 하나의 `AppState` 구독으로 통합하고 `stateRef`로 최신 상태를 참조 — 매 상태 변경마다 구독을 재생성하지 않도록 구독 자체는 `[flushNoteAndPhoto]`(사실상 `[db]`)에만 의존
- `CheckinActionCard`에 `onNoteBlur` prop을 추가(계획 frontmatter의 `files_modified`에는 없었지만, "TextInput 블러 시점 flush" 요구를 충족하려면 카드 컴포넌트가 블러 이벤트를 부모로 전달해야 했음 — Rule 3 최소 확장, 기존 `onChangeNote`/`onPickPhoto`와 동일한 패턴의 필수 prop으로 추가)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CheckinActionCard에 onNoteBlur prop 추가**
- **Found during:** Task 2 (메모/사진 저장 배선)
- **Issue:** Plan의 files_modified는 `src/app/index.tsx`와 테스트 파일만 명시했지만, "TextInput의 onEndEditing/블러 시점"에 DB flush를 하려면 TextInput을 렌더링하는 `CheckinActionCard.tsx`가 블러 이벤트를 부모(index.tsx)로 전달할 방법이 없었음(기존 props에 onBlur 계열 훅 부재)
- **Fix:** `CheckinActionCardProps`에 `onNoteBlur: () => void`를 추가하고 메모 `TextInput`의 `onBlur`에 연결. index.tsx는 `flushNoteAndPhoto`를 그대로 전달
- **Files modified:** src/components/CheckinActionCard.tsx, src/app/index.tsx
- **Verification:** `npm test` 전체 스위트(275개) green, `npx tsc --noEmit` exit 0, `src/components/__tests__/checkinCardUi.test.ts`(정적 소스 분석, prop 인스턴스화 없음)도 회귀 없이 green
- **Committed in:** b52c910 (Task 2 commit)

**2. [Rule 1 - Bug] 계획 문서 acceptance-criteria grep과 충돌하는 주석 문구 3곳 수정**
- **Found during:** Task 1~3 (grep 기반 acceptance_criteria 검증)
- **Issue:** `grep -v '^//'`는 정확히 열 1부터 `//`로 시작하는 줄만 걸러내므로, 들여쓰기된 주석(`  // ...`) 안에 `deleteDraft`, `Platform.OS`, `이어서`/`계속하시겠`, 그리고 기존 회귀 가드가 금지하는 진행률 패턴(`\d+/\d+`, 예: "1/4")이 등장하면 실제로는 주석일 뿐인데도 acceptance-criteria 원샷 grep과 `foundation-wiring.test.ts`의 진행률 회귀 가드에 거짓양성으로 걸림
- **Fix:** 해당 식별자/문구를 코드에서 직접 사용하지 않는 설명 문장으로 다시 표현(의미는 동일, 리터럴만 회피) — 예: "deleteDraft를 호출하지 않는다" → "드래프트 row 삭제 함수는 여기서 호출하지 않는다", "T24 edge case 1/4" → "T24 엣지케이스 1번과 4번"
- **Files modified:** src/app/index.tsx (주석만, 로직 변경 없음)
- **Verification:** 수정 후 각 task의 acceptance_criteria grep 명령을 재실행해 기대값과 일치함을 확인, `npm test` green 유지
- **Committed in:** 357899a, b52c910, 4807048 (각 task 커밋에 포함)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug/false-positive)
**Impact on plan:** 두 deviation 모두 계획의 의도(메모 블러 flush, acceptance-criteria 통과)를 정확히 달성하기 위한 최소 조정 — 스코프 확장이나 아키텍처 변경 없음.

## Issues Encountered
- 첫 번째 정적 테스트(Test 27) 초안이 정규식 탐욕(non-greedy)으로 파일 내 여러 `useEffect` 블록을 한꺼번에 포함해 거짓 실패를 냈음 — anchor를 `let isMounted = true;\s*loadRecoverableDraft`로 좁혀 해당 useEffect 블록만 정확히 매칭하도록 수정 후 통과.

## User Setup Required

None - 외부 서비스 설정 없음.

## Next Phase Readiness
- Phase 3 성공 기준(체크인 저장, 저장 실패 UI, 드래프트 복구, 미저장 이탈 안내)이 모두 실제 화면 배선으로 구현됨
- Phase 4(오늘 뷰)는 이 화면의 지도/캡처/핀/카드 로직을 그대로 재사용해 바텀시트만 씌우면 됨 — 별도 블로커 없음
- 확인 핀 드래그의 VoiceOver 대체 경로는 여전히 유예된 gap(P3, 이 plan 스코프 아님)

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*
