---
phase: 07-day-end-reflection
plan: 02
subsystem: database
tags: [sqlite, tdd, jest, autosave, debounce]

# Dependency graph
requires:
  - phase: 03-checkin-core-loop
    provides: runWithSingleRetry / commitCheckin 트랜잭션 셰이프(checkinRepo.ts) — 재사용
  - phase: 05-checkin-detail-edit
    provides: pendingDelete.ts 단일 타이머 클로저 패턴 — 의미 반전 참고
provides:
  - "REFLECTION_COPY 회고 문구 단일 출처(src/reflection/content.ts)"
  - "daily_reflections CRUD/upsert(getReflectionByDate, upsertReflection)"
  - "5초 디바운스 자동저장 컨트롤러(createAutosaveController, flush/dispose 분리)"
affects: [07-day-end-reflection 이후 플랜(회고 모달/과거 날짜 뷰 화면), day-end-reflection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "select-then-branch upsert(BEGIN → SELECT → UPDATE/INSERT → COMMIT, catch에서 ROLLBACK)로 ON CONFLICT DO UPDATE 문법 대신 checkinRepo.commitCheckin과 동일 셰이프 재사용"
    - "재시도 헬퍼(runWithSingleRetry)를 도메인 경계를 넘어 import로 재사용 — Rule of Three 미달 시 공용 위치로 조기 이동하지 않음"
    - "디바운스 컨트롤러가 대상 식별자(dateKey/id)를 draft에 함께 담아 지연 저장 시점의 화면 상태 변경(날짜 전환)으로부터 격리"

key-files:
  created:
    - src/reflection/content.ts
    - src/reflection/reflectionRepo.ts
    - src/reflection/reflectionRepo.test.ts
    - src/reflection/autosaveController.ts
    - src/reflection/autosaveController.test.ts
  modified: []

key-decisions:
  - "runWithSingleRetry를 checkinRepo.ts에서 그대로 import해 재사용 — 공용 모듈로 이동하지 않음(소비처 2곳, Rule of Three 미달)"
  - "SQLite ON CONFLICT 문법 대신 select-then-branch upsert 채택 — 저장소 선례와 검증된 형태 일관성"
  - "ReflectionDraft에 dateKey/id 포함 — 디바운스 타이머 만료 시점과 draft 생성 시점의 화면 날짜가 달라도 잘못된 레코드에 쓰이지 않도록 구조적으로 차단(T-07-05)"
  - "autosaveController.dispose()는 저장하지 않고 타이머만 정리 — pendingDelete.dispose()(즉시 확정)와 의도적으로 반대 의미"

patterns-established:
  - "Pattern: 순수 로직 레이어(문구/repo/컨트롤러)를 화면보다 먼저 만들어 @jest-environment node로 완전히 검증 — 이후 화면 플랜은 UI 배선에만 집중"

requirements-completed: [REQ-reflection-base, REQ-reflection-autosave, REQ-reflection-save-failure-ui, REQ-reflection-copy-fix]

# Metrics
duration: 3min
completed: 2026-09-03
---

# Phase 07 Plan 02: 회고 순수 로직 레이어(문구/repo/자동저장 컨트롤러) Summary

**daily_reflections upsert(select-then-branch, runWithSingleRetry 재사용)와 5초 디바운스 자동저장 컨트롤러(dateKey/id로 날짜 전환 경합 차단)를 15개 테스트로 고정한 순수 TS 도메인 레이어**

## Performance

- **Duration:** 3분 (커밋 기준, e69d52c ~ f92fb10)
- **Started:** 2026-09-03T13:59:06+09:00
- **Completed:** 2026-09-03T14:01:50+09:00
- **Tasks:** 2 (각 RED→GREEN 2커밋, 총 4커밋)
- **Files modified:** 5 (전부 신규 생성)

## Accomplishments
- `REFLECTION_COPY` 단일 출처로 회고 화면 8개 문구를 07-UI-SPEC.md에서 그대로 전사(발명 없음)
- `daily_reflections` upsert가 날짜 기준 정확히 1행을 유지하며, 실패 시 1회 재시도 후 조용히 `ok:false` 반환
- 5초 디바운스 자동저장 컨트롤러가 flush(즉시 저장+draft 정리)/dispose(저장 없이 타이머만 정리) 계약을 fake timers로 고정

## Task Commits

1. **Task 1: REFLECTION_COPY 문구 단일 출처 + reflectionRepo CRUD**
   - `e69d52c` (test) — daily_reflections CRUD/upsert/재시도 실패 테스트 작성 (RED)
   - `e04e8e8` (feat) — REFLECTION_COPY + reflectionRepo 구현 (GREEN)
2. **Task 2: 5초 디바운스 자동저장 컨트롤러**
   - `6b92b90` (test) — autosaveController 디바운스/flush/dispose 실패 테스트 작성 (RED)
   - `f92fb10` (feat) — createAutosaveController 구현 (GREEN)

_TDD 플랜 — RED/GREEN 사이클마다 커밋 분리됨._

## Files Created/Modified
- `src/reflection/content.ts` - REFLECTION_COPY 8개 키(런타임 import 없는 순수 상수 모듈)
- `src/reflection/reflectionRepo.ts` - getReflectionByDate/upsertReflection, checkinRepo.runWithSingleRetry 재사용
- `src/reflection/reflectionRepo.test.ts` - 6개 behavior 검증(실 SQLite 엔진 + 인라인 fake db)
- `src/reflection/autosaveController.ts` - createAutosaveController, REFLECTION_AUTOSAVE_DEBOUNCE_MS(5000)
- `src/reflection/autosaveController.test.ts` - 8개 behavior + 상수값 검증(fake timers)

## Decisions Made
- `runWithSingleRetry`를 `../checkin/checkinRepo`에서 그대로 import해 재사용 — 아직 소비처가 2곳뿐이라 공용 위치로 이동하지 않음(07-RESEARCH.md Open Question #1을 이 플랜이 확정)
- upsert는 `ON CONFLICT ... DO UPDATE` 대신 select-then-branch(BEGIN→SELECT→UPDATE/INSERT→COMMIT) 채택 — 저장소가 한 번도 쓴 적 없는 문법 도입보다 검증된 셰이프 재사용이 리뷰 일관성에서 우위
- `ReflectionDraft`에 `dateKey`/`id`를 포함 — 과거 날짜 뷰 스크러버로 날짜를 바꿔도 디바운스 만료 시점에 이전 날짜 답변이 잘못된 레코드에 기록되는 경합을 구조적으로 차단(T-07-05)
- `autosaveController.dispose()`는 저장하지 않고 타이머만 정리 — `pendingDelete.dispose()`(즉시 확정)와 의도적으로 반대 의미이며, 강제 저장 책임은 호출자의 명시적 `flush()` 호출로 분리

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] acceptance_criteria 문자열 게이트 위반(자기모순적 주석 문구) 2건 수정**
- **Found during:** Task 1/2 GREEN 구현 직후 acceptance_criteria 자동 검증 실행 중
- **Issue:** `reflectionRepo.ts` 헤더 주석이 "SQLite `ON CONFLICT ... DO UPDATE` 문법은 쓰지 않는다"고 설명하면서 정작 "ON CONFLICT" 리터럴을 포함해 `grep -c 'ON CONFLICT'`가 1을 반환(게이트 요구값 0 위반). 같은 이유로 `autosaveController.ts` 헤더 주석이 "undo()가 없고"라고 설명하며 "undo" 리터럴을 포함해 `grep -c 'undo'`가 1을 반환(게이트 요구값 0 위반). 둘 다 코드 동작에는 영향 없는 순수 문서화 자기모순.
- **Fix:** 두 주석을 "충돌 시 갱신 upsert 전용 구문"/"되돌리기 API"처럼 리터럴을 피하는 표현으로 재서술 — 설명 내용(의도)은 그대로 유지.
- **Files modified:** src/reflection/reflectionRepo.ts, src/reflection/autosaveController.ts
- **Verification:** `grep -c 'ON CONFLICT' src/reflection/reflectionRepo.ts` → 0, `grep -c 'undo' src/reflection/autosaveController.ts` → 0, 재실행한 jest/tsc 모두 그대로 green.
- **Committed in:** e04e8e8 (Task 1 GREEN), f92fb10 (Task 2 GREEN) — 각 GREEN 커밋에 포함(별도 커밋 아님)

---

**Total deviations:** 1 auto-fixed (Rule 1, 게이트 문자열과 충돌하는 자기모순적 주석)
**Impact on plan:** 코드 동작 변경 없음, 문서화 표현만 조정. Scope creep 없음.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 07-VALIDATION.md Wave 0 gap 중 `reflectionRepo.test.ts`/`autosaveController.test.ts` 2건이 닫혔다.
- 이후 회고 화면 플랜(모달/과거 날짜 뷰)이 이 순수 로직 레이어(`REFLECTION_COPY`, `getReflectionByDate`/`upsertReflection`, `createAutosaveController`) 위에 UI만 얹으면 된다 — 저장/디바운스 계약은 이미 테스트로 고정됨.
- 블로커 없음.

---
*Phase: 07-day-end-reflection*
*Completed: 2026-09-03*
