---
phase: 07-day-end-reflection
plan: 09
subsystem: ui
tags: [react-native, expo-router, bottom-sheet, jest]

# Dependency graph
requires:
  - phase: 07-day-end-reflection (07-06)
    provides: "TodayBottomSheet의 선택적 ListHeaderComponent 슬롯"
  - phase: 07-day-end-reflection (07-08)
    provides: "루트 Stack에 등록된 /reflection 모달 라우트(절대 경로로 유효)"
provides:
  - "src/today/ReflectionEntryRow.tsx — 오늘 뷰 바텀시트 리스트 최상단 '오늘 돌아보기' 진입 행"
  - "src/app/(tabs)/index/index.tsx — ReflectionEntryRow를 TodayBottomSheet의 ListHeaderComponent 슬롯에 배선, /reflection 절대 경로 진입"
  - "src/app/__tests__/today-wiring.test.ts — 진입 행 D-02 계약 + 오늘 뷰 개수 미표시 계약 회귀 가드 11개"
affects: [07-10-e2e-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "재사용 가능한 리스트 행 컴포넌트는 네비게이션을 내부에 갖지 않고 onPress 콜백만 받는다(CheckinListRow.tsx 계약을 ReflectionEntryRow.tsx에도 동일 적용)"
    - "리스트 헤더/푸터 슬롯에 전달하는 엘리먼트는 useMemo로 참조를 고정해 인라인 화살표 컴포넌트로 인한 불필요한 재마운트를 피한다"

key-files:
  created:
    - src/today/ReflectionEntryRow.tsx
  modified:
    - src/app/(tabs)/index/index.tsx
    - src/app/__tests__/today-wiring.test.ts

key-decisions:
  - "완료 여부/회고 존재 여부를 신호하는 어떤 필드도 ReflectionEntryRow에 두지 않았다(D-02) — accentSoft 배경은 상태 신호가 아니라 고정 스타일이라는 근거를 파일 헤더 주석에 명시"
  - "회고 모달은 탭 nested Stack 밖 루트 Stack 라우트이므로 이 파일의 다른 이동(설정/상세화면)이 쓰는 상대 경로 관용구를 복사하지 않고 절대 경로 router.push('/reflection')만 사용(07-RESEARCH.md Pitfall 3)"
  - "Phase 5가 남긴 스코프 경계 테스트(이 파일에 '오늘 돌아보기'/reflection 식별자가 등장하지 않는다)를 04-CONTEXT.md D-03 반전과 동일한 방식으로 의도적으로 반전 — Phase 7이 이 화면을 실제로 선점하는 시점이 이 플랜이기 때문"

patterns-established:
  - "07-06이 연 리스트 헤더 슬롯의 첫 소비 사례 — 이후 플랜이 같은 슬롯을 다시 쓸 때 이 패턴(useMemo 엘리먼트 고정 + 콜백만 받는 컴포넌트)을 참고할 수 있다"

requirements-completed: [REQ-reflection-today-entry, REQ-reflection-copy-fix, REQ-reflection-base]

# Metrics
duration: ~18min
completed: 2026-09-03
---

# Phase 07 Plan 09: 오늘 뷰 회고 진입 행 Summary

**오늘 뷰 바텀시트 리스트 최상단에 완료 여부와 무관하게 항상 동일한 모습으로 보이는 "오늘 돌아보기" 진입 행을 배선하고, 오늘 뷰에 체크인 개수/진행률이 표시되지 않는다는 계약을 회귀 테스트로 고정했다.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-03T05:35:00Z (약, worktree 진입 직후)
- **Completed:** 2026-09-03T05:51:14Z (Task 3 커밋 기준)
- **Tasks:** 3
- **Files modified:** 3 (1개 신규 생성, 2개 수정)

## Accomplishments

- `src/today/ReflectionEntryRow.tsx` 신규 생성 — `accentSoft` 고정 배경, `placeName` 롤 라벨, 완료 상태를 나타내는 필드 없음(D-02). 네비게이션은 `onPress` 콜백으로만 받는다(`CheckinListRow.tsx`와 동일한 재사용 컴포넌트 계약).
- 오늘 화면(`src/app/(tabs)/index/index.tsx`)에 `handleReflectionEntryPress`(절대 경로 `router.push('/reflection')`)와 `useMemo`로 고정한 `ReflectionEntryRow` 엘리먼트를 `TodayBottomSheet`의 `ListHeaderComponent` 슬롯에 배선 — 체크인 0건에서도(07-06이 리스트를 상시 마운트하므로) 항상 보인다.
- `today-wiring.test.ts`에 진입 행/D-02/개수 미표시 계약 회귀 테스트 11개 추가.

## Task Commits

Each task was committed atomically:

1. **Task 1: "오늘 돌아보기" 진입 행 컴포넌트** - `2609676` (feat)
2. **Task 2: 오늘 화면에 진입 행 배선** - `b4bf8e3` (feat)
3. **Task 3: 진입 행 + 개수 미표시 회귀 가드** - `3de389e` (test)

_이 플랜에는 TDD 태스크가 없다 — 전부 `type="auto"`._

_Note: worktree 모드 — STATE.md/ROADMAP.md는 오케스트레이터가 wave 종료 후 병합한다._

## Files Created/Modified

- `src/today/ReflectionEntryRow.tsx` - 신규. 완료 여부를 알지 못하는, 항상 동일한 모습의 진입 행.
- `src/app/(tabs)/index/index.tsx` - `ReflectionEntryRow` import, `handleReflectionEntryPress` 콜백, `useMemo`로 고정한 엘리먼트를 `TodayBottomSheet`의 `ListHeaderComponent`에 전달. `floatingButtonStyle`/`showActionCard` 분기/`handleDeleteRequest`는 변경 없음(`git diff`로 확인).
- `src/app/__tests__/today-wiring.test.ts` - 새 describe 블록 4개, `it(` 11개 추가(진입 행 배선 3, 컴포넌트 계약 4, 문구 계약 1, 개수 미표시 계약 3). 기존 `it(` 블록 중 정확히 1개(아래 Deviations 참고)만 부득이하게 수정.

## Decisions Made

- `ReflectionEntryRow`에 완료/회고존재 여부를 신호하는 필드를 전혀 두지 않음(props도, 내부 조회도 없음) — PROJECT.md CRITICAL 원칙("진행률/완료 수치 UI 노출 금지")이 숫자뿐 아니라 완료 여부를 신호하는 모든 시각 장치에 적용된다는 07-CONTEXT.md D-02 해석을 그대로 따름.
- 회고 모달 진입에 절대 경로 `router.push('/reflection')`만 사용 — 이 파일의 다른 네비게이션(`'./settings'`, `'./[id]'`)이 쓰는 상대 경로 관용구를 그대로 복사하지 않음(탭 nested Stack 밖 루트 Stack 라우트이기 때문, 07-RESEARCH.md Pitfall 3, STATE.md Phase 6 라우트 버그 선례).
- 인라인 화살표 컴포넌트(`ListHeaderComponent={() => <.../>}`) 대신 `useMemo`로 엘리먼트 참조를 고정 — 매 렌더 새 컴포넌트 타입이 생겨 불필요한 재마운트가 발생하는 것을 피함.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 5가 남긴 스코프 경계 테스트가 이 플랜의 목적과 정면 충돌 — 반전**
- **Found during:** Task 2 검증(`NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__`)
- **Issue:** `today-wiring.test.ts`의 기존 테스트(`'"오늘 돌아보기"/reflection 관련 식별자가 등장하지 않는다 (Phase 7 소관)'`)가 이 파일에 `reflection`/`오늘 돌아보기` 식별자가 전혀 없어야 한다고 단언하고 있었다 — Phase 5(05-05-PLAN.md)가 "Phase 7이 아직 이 화면을 선점하지 않았다"는 스코프 경계로 추가한 테스트였는데, 바로 이 플랜(07-09)이 그 경계를 의도적으로 반전시키는 플랜이라 Task 2 완료 즉시 이 테스트가 깨졌다.
- **Fix:** 같은 파일의 04-CONTEXT.md D-03 반전(바로 위 테스트)과 동일한 방식으로 이 테스트도 "이제는 등장한다"는 계약으로 반전 — 진입 행 배선이 존재하는지 확인하는 양성 단언으로 교체(`useRouter`/`<Link>` 미사용 계약은 그대로 유지). describe 블록 제목과 헤더 주석도 반전 근거를 추가로 남김. 같은 describe 블록의 다른 테스트(D-03 관련 상세화면 진입 배선 검증)는 손대지 않았다.
- **Files modified:** src/app/__tests__/today-wiring.test.ts
- **Verification:** `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__` 전체 324→324(신규 11개 포함 51개는 today-wiring.test.ts 자체 스위트) 전부 green. `npx tsc --noEmit` 0 에러.
- **Committed in:** `3de389e` (Task 3) — Task 3의 새 describe 블록 추가와 함께 같은 커밋에 포함(같은 파일, 같은 논리적 단위).

**2. [Rule 1 - Bug] 계획 acceptance criteria의 정적 소스 분석 grep 단언과 충돌하는 설명 주석 문구 다수 수정**
- **Found during:** Task 1/Task 2 자체 acceptance criteria grep 검증
- **Issue:** `ReflectionEntryRow.tsx`/`index.tsx`의 근거 설명 주석이 acceptance criteria가 부재를 요구하는 리터럴 토큰(`colors.accentSoft`, `colors.accent`, `expo-router`, `chevron`, `completed`/`hasReflection`/`isDone`, `ListHeaderComponent={() =>`)을 문장 안에 그대로 인용해 자기모순적으로 카운트를 오염시켰다(07-08-SUMMARY.md 배경/근거 문구에서 이미 한 번 발생한 것과 동일한 패턴).
- **Fix:** 동일한 근거/의미를 유지하면서 해당 식별자 리터럴을 우회 표현으로 재서술(예: "expo-router는 이 파일에서 import하지 않는다" → "라우팅 라이브러리는 이 파일에서 import하지 않는다"). 동작/구조 변경 없음.
- **Files modified:** src/today/ReflectionEntryRow.tsx, src/app/(tabs)/index/index.tsx
- **Verification:** 각 태스크의 acceptance criteria grep 단언 전부 정확한 기댓값으로 재확인, tsc/jest 재실행 전부 green.
- **Committed in:** `2609676` (Task 1), `b4bf8e3` (Task 2) — 최종 커밋에 이미 반영됨, 별도 수정 커밋 없음.

---

**Total deviations:** 2 auto-fixed (모두 Rule 1 - 버그, 하나는 스코프 경계 테스트 반전, 하나는 주석 문구 조정). 동작/구조 변경 없음, scope creep 없음.

## Issues Encountered

None.

## Requirements Tracking Note

이 플랜의 frontmatter `requirements`는 `REQ-reflection-today-entry`/`REQ-reflection-copy-fix`를
나열한다. 두 항목 모두 이 플랜 완료 시점에 REQUIREMENTS.md 조건이 완전히 참이 된다고 판단해
`requirements.mark-complete`로 체크 완료했다:

- **REQ-reflection-today-entry**: "'오늘 돌아보기' 행이 오늘 뷰 바텀시트 리스트 최상단에 고정되며, 체크인이 0건이어도 항상 보인다" — Task 1/2로 정확히 이 동작을 구현했고, `TodayBottomSheet`가 07-06부터 리스트를 상시 마운트하므로 0건에서도 헤더 슬롯이 보인다. tsc/jest로 검증됨.
- **REQ-reflection-copy-fix**: "'오늘의 흔적' 섹션명이 변경되고 더 이상 체크인 개수를 표시하지 않는다" — 섹션명 자체는 07-05(`ReflectionModal.tsx`)가 이미 렌더 중이었고 개수 미표시도 이미 구현돼 있었으나, 그 상태가 앱에서 실제로 도달 가능한지(진입점)는 이 플랜 이전엔 불확실했다(07-05-SUMMARY.md가 명시적으로 조기 체크를 보류함). 이 플랜이 두 번째 진입점("오늘 돌아보기" 행)을 연결하면서 도달 가능성이 확정됐고, 추가로 오늘 뷰 자체에도 개수가 표시되지 않는다는 계약을 회귀 테스트로 새로 고정했다(Task 3 테스트 9/10). 두 조건 모두 이제 완전히 참이라고 판단.

**오케스트레이터 지시에 따른 추가 판단 — REQ-reflection-base**: 이 플랜의 frontmatter에는 없지만,
오케스트레이터가 명시적으로 "이 플랜이 07-05(모달)·07-08(라우트)와 결합해 REQ-reflection-base의
'진입점이 연결되어 있다' 조건을 완성하는 조각"이라고 지시했다. 검증 결과:
- 07-05-SUMMARY.md가 이 조건을 명시적으로 미체크 상태로 남기며 "진입점(라우트 등록/알림 딥링크는
  07-08, '오늘 돌아보기' 행 배선은 07-09)이 아직 없다"고 이유를 남겼다.
- 07-08-SUMMARY.md도 동일하게 "오늘 뷰 '오늘 돌아보기' 행 배선(07-09)이 아직 필요해 체크하지
  않음"이라고 명시.
- 07-08이 알림 딥링크 진입점(`/reflection` 절대 경로 라우트 등록)을 이미 완성했고, 이번 플랜이
  두 번째 진입점("오늘 돌아보기" 행)을 완성했다 — 이제 두 진입점 모두 존재하고 정적 소스
  분석 테스트로 각각 게이트돼 있다. REQ-reflection-base의 나머지 조건(정적 지도 재사용/2개
  프롬프트/`DailyReflection` 저장)은 07-05가 이미 구현·테스트했다(이 플랜은 건드리지 않음).
  따라서 REQ-reflection-base 전체 조건이 이제 완전히 참이라고 판단해 함께 체크했다.

**의도적으로 체크하지 않은 항목 — REQ-reflection-autosave / REQ-reflection-save-failure-ui**:
07-05-SUMMARY.md가 "모달 컴포넌트 내부 동작으로는 완전히 구현·테스트했으나, 라우트 없이는
앱에서 실제로 도달 불가능한 상태라 오케스트레이터의 phase 종료 시점 재확인에 맡긴다"고 명시적으로
남긴 두 항목이다. 이 플랜과 07-08이 진입점 연결을 완료해 도달 가능성 자체는 해소됐지만, 이
두 항목은 이 플랜의 frontmatter에도 없고 오케스트레이터의 이번 지시에도 명시적으로 언급되지
않았다 — 07-05가 명시한 "phase 종료 시점 재확인"을 존중해 그대로 미체크 상태로 남기고, 오케스트레이터
또는 07-10(e2e 검증)이 재확인할 몫으로 넘긴다.

## User Setup Required

None - no external service configuration required.

## Simulator/Device Verification Note

이 플랜은 코드 배선만 다뤘다(정적 소스 분석 테스트만 작성) — 실제 시뮬레이터/실기기 탭 확인은
수행하지 않았다. CLAUDE.md의 "실기기 확인이 필요한 검증 단계" 규칙에 따르면 화면 상태 전환/탭
배선 같은 JS 레이어 항목은 시뮬레이터로 직접 확인 가능한 범주이지만, 이 플랜의 산출물은 이미
07-10(e2e 시뮬레이터 검증, 이 phase의 마지막 플랜)에 명시적으로 배정된 검증 스코프와 겹친다.
`npx tsc --noEmit`(정적 타입)과 `NODE_OPTIONS=--experimental-sqlite npx jest`(정적 소스 분석
회귀 테스트, 전체 스위트 41개 스위트 721개 전부 green)만 이 플랜에서 직접 확인했다 — "오늘
돌아보기" 행이 실제로 렌더되고 탭하면 모달이 열리는지의 시각/런타임 확인은 07-10이 시뮬레이터로
최우선 확인해야 한다(07-08-SUMMARY.md와 동일한 근거 — 타입체크만으로 신뢰하지 않음, STATE.md
Phase 6 라우트 버그 선례).

## Next Phase Readiness

- 오늘 뷰 진입점과 알림 딥링크 진입점이 모두 연결됐다 — 07-10이 시뮬레이터로 두 경로 모두 실제
  런타임에서 회고 모달이 열리는지, "오늘 돌아보기" 행이 체크인 0건에서도 실제로 보이는지 확인해야
  한다.
- REQUIREMENTS.md의 REQ-reflection-autosave/REQ-reflection-save-failure-ui는 여전히 미체크 —
  07-10 또는 phase 종료 재확인 시점에 처리 필요(위 Requirements Tracking Note 참고).

## Self-Check: PASSED

- FOUND: src/today/ReflectionEntryRow.tsx
- FOUND: src/app/(tabs)/index/index.tsx
- FOUND: src/app/__tests__/today-wiring.test.ts
- FOUND commit: 2609676 (Task 1)
- FOUND commit: b4bf8e3 (Task 2)
- FOUND commit: 3de389e (Task 3)

---
*Phase: 07-day-end-reflection*
*Completed: 2026-09-03*
