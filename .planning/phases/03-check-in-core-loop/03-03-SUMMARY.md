---
phase: 03-check-in-core-loop
plan: 03
subsystem: database
tags: [sqlite, expo-sqlite, migrations, drafts, pragma-user-version, jest, node-sqlite]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "PRAGMA user_version 기반 마이그레이션 프레임워크(migrateDbIfNeeded), CheckinRow/DailyReflectionRow 스키마, node:sqlite 테스트 어댑터"
provides:
  - "drafts 테이블 DDL(CREATE_DRAFTS_TABLE_SQL, 9컬럼) 및 DraftRow 타입"
  - "DATABASE_VERSION 2, v1→v2 마이그레이션 블록(currentDbVersion === 1)"
  - "v1→v2 업그레이드 시 기존 checkins 데이터 보존을 검증하는 회귀 테스트"
affects: [03-04, 03-05, 03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "고정 PK 단일 row 테이블 패턴: drafts.id는 항상 'draft' 리터럴, PRIMARY KEY NOT NULL로 단일 row를 스키마 레벨에서 강제"
    - "마이그레이션 블록 append-only 패턴 반복: if (currentDbVersion === N) 블록을 순서대로 추가하고 이전 블록은 절대 수정하지 않음 (Phase 1의 관례를 Phase 3에서 2번째로 반복 적용)"

key-files:
  created: []
  modified:
    - src/db/schema.ts
    - src/db/migrations.ts
    - src/db/migrations.test.ts

key-decisions:
  - "drafts 테이블 DDL 계약 테스트(Task 1)는 migrateDbIfNeeded를 거치지 않고 CREATE_DRAFTS_TABLE_SQL을 raw.exec로 직접 실행해 검증 - migrations.ts 배선은 Task 2 책임이므로 Task 1이 자체 완결적으로 RED/GREEN 사이클을 돌 수 있도록 스코프를 분리함"

requirements-completed: [REQ-checkin-confirm-pin]

# Metrics
duration: 15min
completed: 2026-08-27
---

# Phase 03 Plan 03: drafts 테이블 마이그레이션 Summary

**SQLite `drafts` 테이블(9컬럼, 고정 PK 단일 row) 추가 및 DATABASE_VERSION 1→2 마이그레이션 블록, 데이터 보존 회귀 테스트 구현**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-27T09:03:00Z (approx)
- **Completed:** 2026-08-27T09:18:20Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `src/db/schema.ts`에 `CREATE_DRAFTS_TABLE_SQL`(9컬럼 DDL)과 `DraftRow` 타입 추가 — 확인 핀 구간의 드래프트를 SQLite에 영속화하는 D-03 계약의 기반
- `id` 컬럼을 `PRIMARY KEY NOT NULL`로 고정해 D-04("항상 최대 1개 드래프트") 계약을 스키마 레벨에서 강제
- `src/db/migrations.ts`의 `DATABASE_VERSION`을 1→2로 올리고 `currentDbVersion === 1` 블록을 append, 기존 `currentDbVersion === 0` 블록은 무변경 유지
- v1 기기(checkins에 기존 데이터 존재)를 재현해 업그레이드 후 데이터가 보존되고 drafts가 추가됨을 검증하는 회귀 테스트(Test 15) 추가 — ROADMAP Phase 1 Success Criteria 3을 처음으로 실증

## Task Commits

Each task was committed atomically:

1. **Task 1: CREATE_DRAFTS_TABLE_SQL DDL + DraftRow 타입 (schema.ts 확장)** - `33f5c22` (feat, TDD)
2. **Task 2: DATABASE_VERSION 2 + v1→v2 마이그레이션 블록 + 데이터 보존 회귀** - `501f84e` (feat, TDD)

**Plan metadata:** (to be committed after this summary)

_Note: Each task followed RED (failing test) → GREEN (implementation) within a single commit per this project's task-scoped TDD convention — tests were verified to fail before implementation and pass after, per test-driven-development skill._

## Files Created/Modified
- `src/db/schema.ts` - `CREATE_DRAFTS_TABLE_SQL` 상수(9컬럼 DDL) + `DraftRow` 인터페이스 append. 기존 `CheckinRow`/`DailyReflectionRow`/`CREATE_CHECKINS_TABLE_SQL` 등은 무변경.
- `src/db/migrations.ts` - `DATABASE_VERSION` 1→2, import에 `CREATE_DRAFTS_TABLE_SQL` 추가, `if (currentDbVersion === 1) { ... currentDbVersion = 2; }` 블록 추가. `if (currentDbVersion === 0)` 블록 내부는 한 글자도 수정하지 않음.
- `src/db/migrations.test.ts` - `DRAFTS_COLUMNS` 상수, Task 1의 drafts DDL 계약 테스트 5개(Test 10~14), Task 2의 v1→v2 데이터 보존 회귀 테스트(Test 15) + idempotent 재검증(Test 16), 기존 Test 1/Test 5를 `DATABASE_VERSION = 2` 기준으로 갱신.

## Decisions Made
- Task 1의 drafts DDL 계약 테스트는 `migrateDbIfNeeded`를 거치지 않고 `raw.exec(CREATE_DRAFTS_TABLE_SQL)`로 직접 실행해 검증했다. 이유: `<files>` 태그상 Task 1은 `migrations.ts`를 건드리지 않으므로, `migrateDbIfNeeded` 경유 검증은 아직 drafts가 배선되지 않아 실패할 수밖에 없다. 이렇게 스코프를 분리함으로써 Task 1이 자체적으로 완결된 RED→GREEN 사이클을 돌 수 있었고, Task 2가 실제 마이그레이션 배선 + 데이터 보존 회귀(Test 15)를 전담하도록 역할을 명확히 나눴다. plan의 `<behavior>` 서술("migrateDbIfNeeded 실행 후...")은 두 Task를 합친 최종 상태를 서술한 것으로 해석했으며, Task 2 완료 후 이 최종 상태는 Test 1/Test 15/Test 16으로 실제 검증됨.

## Deviations from Plan

None - plan executed exactly as written. schema.ts/migrations.ts 변경은 plan의 `<action>` 지시를 그대로 따랐고, threat_model의 T-3-01(문자열 보간 게이트, Test 8 계속 green)과 T-3-11(v1→v2 데이터 보존, Test 15) 모두 acceptance criteria로 명시된 대로 충족됨.

## Issues Encountered

DATABASE_VERSION을 2로 올리는 코드 변경 직후, 새로 추가한 안내 주석 한 줄이 `currentDbVersion === 0`과 `currentDbVersion === 1` 문자열을 모두 포함해 `grep -c` acceptance criteria(각각 정확히 1이어야 함)를 위반했다. 주석 문구를 "이전 버전 블록 두 개(위쪽 두 개의 if문)"로 재작성해 리터럴 문자열 중복을 제거하고 재검증했다.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `drafts` 테이블과 `DraftRow` 타입이 준비되어, 03-04(확인 핀 드래그 + 드래프트 저장/삭제 로직)가 바로 `INSERT OR REPLACE INTO drafts (id, ...) VALUES ('draft', ...)` 패턴으로 단일 드래프트를 다룰 수 있다.
- `local_date_key` 컬럼이 날짜 경계 만료 판정(03-04의 T24 edge case 1)에 쓰일 준비가 됨.
- 03-04는 이 plan에서 만든 `DraftRow` 타입과 `CREATE_DRAFTS_TABLE_SQL`을 그대로 재사용하며, 새로운 스키마 변경 없이 CRUD 로직만 추가하면 된다.
- 블로커 없음.

---
*Phase: 03-check-in-core-loop*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: src/db/schema.ts
- FOUND: src/db/migrations.ts
- FOUND: src/db/migrations.test.ts
- FOUND: .planning/phases/03-check-in-core-loop/03-03-SUMMARY.md
- FOUND commit: 33f5c22
- FOUND commit: 501f84e
- FOUND commit: ed37b63
