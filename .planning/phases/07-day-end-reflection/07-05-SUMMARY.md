---
phase: 07-day-end-reflection
plan: 05
subsystem: ui
tags: [react-native, react-native-maps, expo-image, expo-symbols, reflection]

# Dependency graph
requires:
  - phase: 07-day-end-reflection (07-04)
    provides: useReflectionDraft.ts(로드/디바운스/AppState flush/재시도 훅), ReflectionPrompts.tsx(프롬프트 2칸+실패 UI), content.ts(REFLECTION_COPY), reflection-wiring.test.ts(기존 파일)
provides:
  - "src/reflection/ReflectionModal.tsx — 하루 마무리 회고 화면 본체(닫기/정적 지도/읽기전용 리스트/프롬프트 2칸/닫기 시 강제 저장)"
  - "src/app/__tests__/reflection-wiring.test.ts — ReflectionModal 배선 회귀 가드 14개 추가(Test 13~26)"
affects: [07-07-reflection-route-wiring, 07-09-today-entry-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "화면 본체는 라우트 파일 밖에 둔다(CheckinDetailScreen.tsx와 동일 계약) — 07-07이 src/app/reflection.tsx에서 이 컴포넌트를 얇게 감싸 라우트로 등록한다"
    - "이 화면은 데이터 로직을 소유하지 않는다 — getTodayCheckins/buildTrajectoryCoordinates/useReflectionDraft/ReflectionPrompts를 그대로 소비만 한다"

key-files:
  created: []
  modified:
    - src/reflection/ReflectionModal.tsx (신규 파일, Task 1에서 생성)
    - src/app/__tests__/reflection-wiring.test.ts

key-decisions:
  - "닫기(✕)는 draft.flush() 후 router.back()만 호출하고, 아래로 스와이프해 닫는 경로에는 별도 화면 이탈 리스너를 달지 않는다 — useReflectionDraft가 언마운트 cleanup에서 이미 flush하므로 이중 저장 경로를 만들지 않는다"
  - "정적 지도 고정 높이는 MAP_BLOCK_HEIGHT=200 상수로 계획 단계 재량(05-CONTEXT.md Claude's Discretion 선례)으로 결정 — 원본 문서가 정확한 px 값을 지정하지 않았다"
  - "리스트 행은 기존 컴포넌트를 재사용하지 않고 이 파일 안에 신규 ReflectionCheckinRow를 정의한다 — 기존 행은 탭 진입/스와이프 삭제를 전제하고 사진 썸네일 슬롯이 없어 이 화면의 계약과 다르다"

patterns-established:
  - "회고 모달이 07-04의 공유 훅/컴포넌트를 소비하는 첫 실제 소비처가 됨 — 07-06(과거 날짜 뷰)이 동일 계약을 그대로 재사용할 예정"

requirements-completed: []  # REQ-reflection-base(M23)는 REQUIREMENTS.md 조건에 "진입점이 연결되어 있다"가 명시돼 있고, 진입점(라우트 등록/알림 딥링크는 07-07, "오늘 돌아보기" 행 배선은 07-09)이 아직 없다 — 조기 체크 방지. REQ-reflection-autosave/save-failure-ui/copy-fix는 모달 컴포넌트 내부 동작으로는 이 플랜이 완전히 구현·테스트했으나, 07-07 없이는 앱에서 실제로 도달 불가능한 상태라 오케스트레이터의 phase 종료 시점 재확인에 맡긴다.

# Metrics
duration: ~20min
completed: 2026-09-03
---

# Phase 07 Plan 05: 회고 모달 화면 본체 Summary

**하루 마무리 회고 화면(`ReflectionModal.tsx`)을 조립 완료 — 오늘 뷰가 이미 쓰는 `getTodayCheckins`/`buildTrajectoryCoordinates`로 정적 지도+읽기전용 체크인 리스트를 렌더하고, 07-04의 `useReflectionDraft`/`ReflectionPrompts`를 소비해 자동저장 프롬프트 2칸과 닫기 시 강제 저장을 배선했다.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-03 (approx)
- **Completed:** 2026-09-03T05:28:34+09:00 (approx, 마지막 태스크 커밋 기준)
- **Tasks:** 3
- **Files modified:** 2 (1개 신규 생성, 1개 append 수정)

## Accomplishments
- 정적 지도(잠금 5종) + 궤적선 + 신규 read-only 리스트 행(`ReflectionCheckinRow`, 40×40 썸네일 조건부 렌더)으로 회고 화면 상단부 완성
- 07-04의 `useReflectionDraft`/`ReflectionPrompts`를 그대로 소비 — 새 조회 함수/새 프롬프트 UI/새 실패 UI를 재구현하지 않음
- 닫기(✕) 시 `draft.flush()` → `router.back()` 순서로 강제 저장, 스와이프 닫기는 훅의 언마운트 flush가 커버(이중 저장 경로 없음)
- 배선 회귀 가드 14개(Test 13~26) 추가 — 단일 쿼리/탭바 미조작/accent 금지/지도 잠금 4종/공유 조각 1회 소비/자동저장 모델/닫기 순서/문구 단일 출처/진행률 수치 노출 금지를 전부 정적 소스 분석으로 고정

## Task Commits

Each task was committed atomically:

1. **Task 1: 회고 화면 상단부 — 닫기 버튼/정적 지도/읽기전용 체크인 리스트** - `74b772f` (feat)
2. **Task 2: 프롬프트/자동저장 배선 + 닫기 시 강제 저장** - `a952439` (feat)
3. **Task 3: ReflectionModal 배선 회귀 가드 추가** - `6cd946c` (test)

_이 플랜에는 TDD 태스크가 없다 — 전부 `type="auto"`._

## Files Created/Modified
- `src/reflection/ReflectionModal.tsx` - 회고 화면 본체(닫기/정적 지도/읽기전용 리스트/프롬프트 2칸/자동저장 배선), 284줄
- `src/app/__tests__/reflection-wiring.test.ts` - 07-04의 기존 Test 1~12는 수정 없이, ReflectionModal 대상 Test 13~26(14개) append

## Decisions Made
- 닫기 시 강제 저장은 `draft.flush()` 후 `router.back()` 순서 고정, 별도 화면 이탈 리스너 미추가(이중 저장 방지)
- 정적 지도 고정 높이 `MAP_BLOCK_HEIGHT=200`은 계획 단계 재량으로 결정(원본 문서 미지정)
- 신규 read-only 리스트 행(`ReflectionCheckinRow`)을 이 파일에 직접 정의, 기존 리스트 행 컴포넌트 재사용하지 않음(탭/스와이프 삭제 전제, 썸네일 슬롯 부재)

## Deviations from Plan

None - plan executed exactly as written.

(구현 중 acceptance criteria의 grep 계열 단언과 충돌하는 주석 문구 2건 — `CheckinListRow`/`beforeRemove` 리터럴 언급 — 을 07-04 SUMMARY.md가 남긴 것과 동일한 이유로 즉시 수정했다. 이는 코드 작성 과정에서 커밋 전에 발견·수정한 것으로, 별도 deviation으로 기록할 정도의 계획 이탈이 아니라 검증 스크립트 요구사항을 충족시키기 위한 문구 조정이다 — 동작/구조 변경 없음, 최종 커밋에는 이미 반영되어 있다.)

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `ReflectionModal.tsx`가 안정된 계약(`export type ReflectionModalProps = { db: MigratableDb }`, `export function ReflectionModal`)으로 준비됨 — 07-07이 `src/app/reflection.tsx`에서 그대로 감싸 라우트 등록(`presentation: 'modal'`)과 알림 탭 딥링크를 배선하면 된다.
- REQUIREMENTS.md의 REQ-reflection-base/autosave/save-failure-ui/copy-fix는 이 플랜만으로는 앱에서 실제로 도달 불가능하다(진입점 없음) — 의도적으로 체크하지 않았다. 07-07(라우트 등록) 완료 시 오케스트레이터가 재확인 요망.
- 09가 "오늘 돌아보기" 행을 오늘 뷰에 배선할 때 이 모달의 `db` prop 계약만 그대로 넘기면 된다.

---
*Phase: 07-day-end-reflection*
*Completed: 2026-09-03*
