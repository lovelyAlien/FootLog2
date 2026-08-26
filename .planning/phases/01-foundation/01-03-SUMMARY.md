---
phase: 01-foundation
plan: 03
subsystem: database
tags: [expo-sqlite, sqlite, node-sqlite, jest, migrations, typescript]

# Dependency graph
requires:
  - phase: 01-foundation (01-01)
    provides: "jest-expo 테스트 러너 + NODE_OPTIONS=--experimental-sqlite 플래그 전달 경로"
provides:
  - "PRAGMA user_version 기반 SQLite 마이그레이션 러너(migrateDbIfNeeded, MigratableDb)"
  - "Checkin/DailyReflection 테이블 DDL + snake_case 행 타입(schema.ts)"
  - "node:sqlite 실엔진 기반 테스트 어댑터(nodeSqliteAdapter.ts) — 이후 phase 재사용 가능"
affects: [01-04, phase-3, phase-4, phase-5, phase-6, phase-7, phase-8]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL DDL 다중 문을 하나의 템플릿 리터럴에 몰아넣지 않고 execAsync를 여러 번 호출 — PRAGMA user_version 갱신 라인 단 하나만 템플릿 보간을 사용하도록 강제(T-1-01 grep 게이트)"
    - "node:sqlite DatabaseSync를 MigratableDb Pick 타입으로 감싸 expo-sqlite 없이 Node 환경에서 마이그레이션 로직을 실제 SQLite 엔진으로 검증(테스트 헬퍼는 src/db/testing/에 격리, 프로덕션 코드에서 import 금지)"

key-files:
  created:
    - src/db/schema.ts
    - src/db/migrations.ts
    - src/db/migrations.test.ts
    - src/db/testing/nodeSqliteAdapter.ts
  modified: []

key-decisions:
  - "migrations.ts의 execAsync 호출을 RESEARCH.md 원본 레시피(하나의 템플릿 리터럴에 3개 DDL을 ${} 보간으로 삽입)에서 벗어나 4번의 개별 execAsync 호출로 분리 — Task 2 acceptance criteria가 '\\${' 출현 횟수를 PRAGMA user_version 라인 하나로 정확히 게이트하므로, DDL 상수를 스키마 파일에서 import한 후 보간 없이 그대로 실행하는 방식으로 구현"

requirements-completed: [REQ-sqlite-migrations]

# Metrics
duration: 6min
completed: 2026-08-26
---

# Phase 1 Plan 3: SQLite 마이그레이션 프레임워크 Summary

**PRAGMA user_version 기반 migrateDbIfNeeded 러너를 node:sqlite 실엔진 8개 회귀 테스트로 검증하고, checkins(13컬럼)/daily_reflections(6컬럼) DDL을 schema.ts로 확정.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-26T09:26:00Z (RED 테스트 작성 시작 기준)
- **Completed:** 2026-08-26T09:32:01Z
- **Tasks:** 2
- **Files modified:** 4 (신규 생성만, 수정 없음)

## Accomplishments
- `node:sqlite`(Node v22.21.1 내장, `--experimental-sqlite` 플래그) `DatabaseSync`를 `MigratableDb` 인터페이스로 감싸는 테스트 전용 어댑터를 신규 npm 패키지 없이 구현
- idempotency(재실행 안전성), 데이터 보존, 컬럼 계약(13/6개), NOT NULL/UNIQUE 제약, 조기 반환, 미래 컬럼 확장 가능성, SQL 인젝션 선례를 검증하는 8개 테스트를 RED로 먼저 작성한 뒤 GREEN으로 전환
- `PRAGMA user_version`으로 스키마 버전을 추적하는 `migrateDbIfNeeded`를 구현 — 빈 DB에서 `checkins`/`daily_reflections` 테이블과 `idx_checkins_local_date_key` 인덱스를 생성하고 버전을 1로 올리며, 재실행 시 기존 데이터를 보존한 채 조기 반환
- SQL 문자열 보간을 `PRAGMA user_version = ${currentDbVersion}` 단 한 줄로 제한(보간값은 모듈 내부 정수 지역 변수)하고, 이 사실이 Test 8과 acceptance criteria grep 게이트로 회귀 고정됨

## Task Commits

Each task was committed atomically:

1. **Task 1: node:sqlite 테스트 어댑터와 실패하는 마이그레이션 테스트 작성 (RED)** - `6887cdd` (test)
2. **Task 2: schema.ts/migrations.ts로 PRAGMA user_version 마이그레이션 프레임워크 구현 (GREEN)** - `6ff6e5f` (feat)

**Plan metadata:** (본 커밋에서 처리 예정)

_Note: RED → GREEN 2커밋 구조 — 플랜 frontmatter는 `type: execute`이나 태스크 자체가 RED/GREEN 사이클로 설계됨._

## Files Created/Modified
- `src/db/testing/nodeSqliteAdapter.ts` - `node:sqlite`의 `DatabaseSync`를 `execAsync`/`getFirstAsync`/`runAsync` 3개 Promise 메서드로 감싸는 테스트 전용 어댑터. `as unknown as MigratableDb` 단일 캐스트만 export 경계에 존재
- `src/db/migrations.test.ts` - `@jest-environment node` docblock 하에서 8개 테스트(빈 DB 초기화, 컬럼 계약 2개, 제약조건, idempotency, 조기 반환, 컬럼 확장 가능성, SQL 인젝션 선례) 실행
- `src/db/schema.ts` - `LocationSource`(5개 유니온), `CheckinRow`(13필드)/`DailyReflectionRow`(6필드) 타입, `CREATE_CHECKINS_TABLE_SQL`/`CREATE_DAILY_REFLECTIONS_TABLE_SQL`/`CREATE_CHECKINS_INDEXES_SQL` DDL 리터럴 상수. `expo-sqlite`를 값으로 import하지 않아 순수 Node에서도 로드 가능
- `src/db/migrations.ts` - `DATABASE_NAME`('footlog.db'), `DATABASE_VERSION`(1), `MigratableDb`(`SQLiteDatabase`의 3메서드 Pick 타입), `migrateDbIfNeeded` 함수. `expo-sqlite`를 `type` 전용으로만 import

## Decisions Made
- RESEARCH.md Pattern 2가 제시한 "하나의 템플릿 리터럴에 3개 DDL을 `${}` 보간으로 삽입" 레시피 대신, DDL 상수를 스키마 파일에서 import해 `execAsync`를 4번(journal_mode 1회 + DDL 상수 3회) 개별 호출하는 방식으로 구현 — 플랜의 Task 2 acceptance criteria 자체가 "`${` 출현 횟수는 정확히 1(PRAGMA user_version 라인)"을 요구하므로, 원본 레시피 그대로 옮기면 이 게이트를 통과할 수 없음. 동작은 완전히 동일(같은 DDL이 같은 순서로 실행됨), 문자열 조합 방식만 변경

## Deviations from Plan

None - 계획된 두 태스크(RED 테스트 작성 → GREEN 구현)를 그대로 실행. 위 "Decisions Made"에 기록한 execAsync 호출 분리는 플랜 자체의 acceptance criteria(정확히 1회의 `${` 보간)를 충족시키기 위한 구현 세부사항 선택이며, RESEARCH.md Pattern 2가 "레시피"로 제시한 것이지 태스크의 강제 사양은 아니었으므로 별도 deviation 규칙 적용 없이 계획 범위 내 처리.

## Issues Encountered
없음.

## User Setup Required
없음 - 신규 npm 패키지 설치 없음(`node:sqlite`는 Node 내장 모듈), 외부 서비스 설정 불필요.

## Next Phase Readiness
- Plan 01-04(루트 레이아웃 배선)가 `migrateDbIfNeeded`/`DATABASE_NAME`을 `SQLiteProvider`의 `onInit`/`databaseName` prop으로 그대로 소비할 수 있음 — `MigratableDb`는 `SQLiteDatabase`가 할당 가능하도록 설계되어 있어 별도 캐스트 없이 타입 호환.
- Phase 3~8의 데이터 접근 코드가 `schema.ts`의 `CheckinRow`/`DailyReflectionRow`/`LocationSource`를 그대로 import해 쓸 수 있음.
- `src/db/testing/nodeSqliteAdapter.ts`는 테스트 전용이며 프로덕션 코드에서 import되지 않음이 grep으로 확인됨 — 이후 phase가 SQLite 관련 테스트를 추가할 때 재사용 가능.
- 블로킹 요소 없음.

## Self-Check: PASSED

- FOUND: src/db/schema.ts, src/db/migrations.ts, src/db/migrations.test.ts, src/db/testing/nodeSqliteAdapter.ts
- FOUND commits: 6887cdd, 6ff6e5f

---
*Phase: 01-foundation*
*Completed: 2026-08-26*
