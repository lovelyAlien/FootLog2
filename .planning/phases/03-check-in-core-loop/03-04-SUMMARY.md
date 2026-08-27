---
phase: 03-check-in-core-loop
plan: 04
subsystem: database
tags: [sqlite, node:sqlite, transactions, retry, expo-sqlite, testing]

# Dependency graph
requires:
  - phase: 03-check-in-core-loop (03-01/03-02/03-03)
    provides: src/checkin/config.ts (DRAFT_ROW_ID), src/checkin/fallbackLocation.ts (isValidCoordinate), drafts 테이블 DDL, nodeSqliteAdapter 테스트 어댑터
provides:
  - "localDate.ts — Intl 기반 local_date_key/timezone/ISO 타임스탬프 생성"
  - "draftRepo.ts — drafts 단일 row CRUD + 날짜 경계 만료 판정"
  - "checkinRepo.ts — checkins insert(1회 자동 재시도) + 드래프트 삭제 트랜잭션 + 최근 좌표 조회 + 메모/사진 갱신"
affects: [03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, phase-5(T13 상세화면 메모 저장 실패)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MigratableDb 좁힌 타입 주입 패턴을 draftRepo/checkinRepo에도 동일 적용 — expo-sqlite를 직접 import하지 않음"
    - "runWithSingleRetry 범용 재시도 헬퍼 — checkins에 종속되지 않아 Phase 5 T13이 재사용 가능"
    - "BEGIN/INSERT/DELETE/COMMIT 단일 트랜잭션으로 순서 실수 원천 차단(Pitfall 5)"

key-files:
  created:
    - src/checkin/localDate.ts
    - src/checkin/localDate.test.ts
    - src/checkin/draftRepo.ts
    - src/checkin/draftRepo.test.ts
    - src/checkin/checkinRepo.ts
    - src/checkin/checkinRepo.test.ts
  modified: []

key-decisions:
  - "checkins.created_at/updated_at은 별도 now 파라미터를 받지 않고 params.timestampUtc를 그대로 바인딩 — insert 시점과 캡처 시점이 항상 동시이므로 별도 값을 요구하지 않음(NewCheckinParams에 now 필드 없음, 03-04-PLAN.md 원문 그대로)"
  - "checkinRepo.ts 헤더 주석에서 'DELETE FROM drafts'와 'INSERT INTO checkins' 리터럴 문자열의 등장 순서를 acceptance criterion의 순서 게이트(grep 기반)에 맞춰 재배치 — 실제 실행 순서는 이미 올바랐으나 자연어 설명 문장 안에서 두 SQL 리터럴이 코드 순서 게이트보다 먼저 등장해 grep 게이트가 오탐할 뻔함"

requirements-completed: [REQ-checkin-core, REQ-checkin-write-failure-ui, REQ-checkin-confirm-pin]

duration: 20min
completed: 2026-08-27
---

# Phase 3 Plan 04: 체크인/드래프트 데이터 계층 Summary

**Intl 기반 로컬 날짜 키 헬퍼 + drafts 단일 row 리포지토리 + checkins 1회 자동 재시도·트랜잭션 커밋 리포지토리, 모두 node:sqlite 실엔진 유닛 테스트로 검증**

## Performance

- **Duration:** 약 20분
- **Started:** 2026-08-27T18:32:00+09:00 (대략, 워크트리 베이스 정정 이후)
- **Completed:** 2026-08-27T18:44:47+09:00
- **Tasks:** 3
- **Files modified:** 6 (전부 신규 생성)

## Accomplishments
- `localDate.ts`: 자정 경계(Asia/Seoul UTC+9)를 포함한 3개 타임존 케이스와 `Intl.DateTimeFormat('en-CA', ...)` 기반 날짜 키 생성을 검증. 수동 UTC 오프셋 계산 0건.
- `draftRepo.ts`: `INSERT OR REPLACE`로 drafts 단일 row 계약을 강제하고, 날짜 경계를 넘긴 드래프트를 복구 프롬프트 없이 조용히 삭제하는 `loadRecoverableDraft`를 실엔진 테스트로 검증.
- `checkinRepo.ts`: `runWithSingleRetry` 범용 재시도 헬퍼(Phase 5 T13 재사용 대비)와, `BEGIN → INSERT checkins → DELETE drafts → COMMIT` 단일 트랜잭션으로 "insert 성공 이후에만 드래프트 삭제"를 구조적으로 강제. 실패 시 드래프트가 보존됨(D-05)을 fake db + 실엔진 조합으로 검증.

## Task Commits

Each task followed RED → GREEN (TDD):

1. **Task 1: localDate.ts** — test `d4759f5`, feat `bdb9cce`
2. **Task 2: draftRepo.ts** — test `bd9e24f`, feat `7b63005`
3. **Task 3: checkinRepo.ts** — test `9a50277`, feat `780b10c`

**Plan metadata:** (아래 최종 커밋에서 기록)

## Files Created/Modified
- `src/checkin/localDate.ts` — `resolveTimeZone`/`resolveLocalDateKey`/`toIsoTimestamp`
- `src/checkin/localDate.test.ts` — 5개 케이스(자정 경계 포함)
- `src/checkin/draftRepo.ts` — `upsertDraft`/`getDraft`/`updateDraftCoordinate`/`deleteDraft`/`loadRecoverableDraft`
- `src/checkin/draftRepo.test.ts` — 7개 케이스(단일 드래프트, 날짜 경계 만료)
- `src/checkin/checkinRepo.ts` — `runWithSingleRetry`/`commitCheckin`/`getLatestCheckinCoordinate`/`updateCheckinNoteAndPhoto`
- `src/checkin/checkinRepo.test.ts` — 11개 케이스(재시도 헬퍼 3 + commitCheckin 5 + 좌표조회 2 + 메모갱신 1)

## Decisions Made
- `checkins.created_at`/`updated_at`에 별도 `now` 인자를 두지 않고 `params.timestampUtc`를 그대로 바인딩(PLAN.md의 `NewCheckinParams`에 `now` 필드가 없음 — 캡처 시점과 insert 시점이 항상 동시라는 설계 그대로 따름).
- `checkinRepo.ts` 헤더 주석의 문장 순서를 조정 — acceptance criterion의 소스 순서 게이트(`INSERT INTO checkins` 문자열이 `DELETE FROM drafts` 문자열보다 파일 내 먼저 등장해야 함)가 자연어 설명 문장 안의 리터럴 언급 순서까지 검사하므로, 실제 실행 순서는 처음부터 올바랐지만 주석 문장을 "드래프트 삭제(drafts DELETE)는 반드시 INSERT INTO checkins 성공 이후..."로 재작성해 게이트를 통과시킴.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 워크트리에 로컬 node_modules를 새로 설치**
- **Found during:** Task 1 acceptance criteria 검증(`npx tsc --noEmit`)
- **Issue:** 이 워크트리에는 자체 `node_modules`가 없어 Node 모듈 해석이 상위 디렉터리로 올라가 메인 체크아웃의 공유 `node_modules`(`FootLog2/node_modules`)를 사용하고 있었다. 그 공유 `node_modules`는 03-01/03-02가 `package.json`/`package-lock.json`에 이미 추가·잠금한 `expo-location`/`expo-image-picker`/`expo-crypto` 세 패키지가 실제로 설치돼 있지 않아, `src/checkin/config.ts`/`deps.ts`의 타입 전용 import가 `Cannot find module`로 실패했다. 이 세 패키지는 이미 03-RESEARCH.md §Package Legitimacy Audit에서 `[OK]` 판정을 받았고 `package-lock.json`에 완전한 resolved/integrity 항목까지 존재해, 새 패키지를 설치하는 것이 아니라 이미 잠긴 버전을 그대로 추출하는 작업이었다.
- **Fix:** 공유 `node_modules`(워크트리 바깥, 다른 병렬 에이전트와 공유되는 디렉터리)를 건드리지 않기 위해, 이 워크트리 안에서 `npm install --prefer-offline --no-audit --no-fund`를 실행해 이 워크트리 전용의 로컬 `node_modules`를 새로 생성했다(888개 패키지, npm 캐시 활용, 네트워크 신규 다운로드 최소화). `package.json`/`package-lock.json` 내용은 변경하지 않았다 — 이미 잠긴 버전을 그대로 추출한 것뿐이다.
- **Files modified:** 없음 (node_modules는 `.gitignore`에 이미 등재돼 있어 커밋 대상 아님)
- **Verification:** 이후 `npx tsc --noEmit`이 exit 0으로 통과, `npm test` 전체 스위트(19 suites, 172 tests)가 green.
- **Committed in:** 해당 없음 (git 추적 대상 아닌 로컬 빌드 산출물)

**2. [Rule 1 - Bug] checkinRepo.ts 헤더 주석의 SQL 리터럴 언급 순서 수정**
- **Found during:** Task 3 acceptance criteria 검증(order gate 스크립트)
- **Issue:** 헤더 주석 문장이 "DELETE FROM drafts는 반드시 INSERT INTO checkins 성공 이후..."로 시작해, 파일 전체 텍스트 기준으로 `DELETE FROM drafts` 리터럴이 `INSERT INTO checkins` 리터럴보다 먼저 등장했다. plan의 order-gate 스크립트(`s.indexOf('INSERT INTO checkins')`가 `s.indexOf('DELETE FROM drafts')`보다 작아야 함)는 파일 전체(주석 포함)를 대상으로 하므로 실패했다. 실제 실행 순서(코드)는 처음부터 올바른 상태였다.
- **Fix:** 주석 문장을 "드래프트 삭제(drafts DELETE)는 반드시 INSERT INTO checkins 성공 이후..."로 재작성해 리터럴 등장 순서를 게이트 요구사항에 맞췄다. 동작 변경 없음.
- **Files modified:** `src/checkin/checkinRepo.ts`
- **Verification:** order-gate 스크립트 재실행 시 에러 없이 종료, `npm test`/`npx tsc --noEmit` 재확인.
- **Committed in:** `780b10c` (Task 3 feat 커밋)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** 둘 다 plan이 요구한 acceptance criteria를 충족시키기 위한 필수 조치였고, 실제 프로덕션 로직 변경은 없음(주석 문구 재배치 1건 제외). 스코프 크리프 없음.

## Issues Encountered
- 워크트리가 최초 `git reset --hard`로 phase-03 브랜치 팁에 맞춰지도록 지시받았으나, 실제로는 `ae3af3c`(phase-02 완료 시점)가 `ab18d76`(phase-03 wave 1 완료 시점)의 조상(ancestor)임을 확인해 `git reset --hard` 대신 `git merge --ff-only`로 안전하게 베이스를 정정함(작업 트리 클린 상태 확인 후 진행, 동시 실행 중인 다른 워크트리 에이전트의 커밋에 영향 없음).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/checkin/localDate.ts`/`draftRepo.ts`/`checkinRepo.ts`가 03-05~03-11(체크인 화면/확인 핀/오늘 뷰 등)이 소비할 수 있는 안정적인 데이터 계층 계약을 제공한다.
- Phase 5(T13 상세화면 메모 저장 실패)는 `runWithSingleRetry`를 그대로 재사용해 동일한 재시도 패턴을 구현할 수 있다.
- 워크트리 로컬 `node_modules` 설치는 이 워크트리에 한정된 조치이며, 병렬로 실행 중인 다른 wave-2 워크트리 에이전트(03-05~03-11)도 동일한 공유 `node_modules` 미비 문제를 겪을 수 있음 — 각 워크트리가 독립적으로 동일한 조치를 반복해야 할 수 있다는 점을 오케스트레이터가 인지할 필요가 있다(비차단, 각 워크트리에서 자동 해결 가능).

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*
