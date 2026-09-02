---
phase: 09-backend-foundation
plan: 02
subsystem: infra
tags: [flyway, postgresql, spring-data-jpa, testcontainers, tdd, db-schema]

# Dependency graph
requires: ["09-01"]
provides:
  - "PostgreSQL 서버 스키마(users/checkins/daily_reflections) Flyway V1~V3로 버전관리"
  - "FlywayMigrationTest.kt — information_schema/pg_constraint/pg_indexes 기반 12개 스키마 계약 단언"
  - "클라이언트 발급 UUID 보존 계약(checkins.id/daily_reflections.id에 DB 기본값 생성기 없음) 테스트로 고정"
affects: [09-03-entities, 09-04-docker, 09-05-ci, 09-06-gate]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Flyway append-only V*.sql(체크섬 강제)", "서버 전용 user_id FK 컬럼(D-02)", "클라이언트-서버 UNIQUE 제약 의도적 divergence(A4)"]

key-files:
  created:
    - backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt
    - backend/src/main/resources/db/migration/V1__create_users_table.sql
    - backend/src/main/resources/db/migration/V2__create_checkins_table.sql
    - backend/src/main/resources/db/migration/V3__create_daily_reflections_table.sql
  modified: []

key-decisions:
  - "테스트 컬럼명 조회에 Kotlin 플랫폼 타입 널가능성 문제(queryForList(String::class.java)가 List<String?> 추론) 발생 - filterNotNull()로 해소, RESEARCH.md/PATTERNS.md에 사전 문서화되지 않은 컴파일 이슈"
  - "V2 주석에서 'gen_random_uuid' 문자열을, V3 주석에서 'UNIQUE(user_id, date)' 문자열을 직접 인용하지 않도록 재작성 - acceptance criteria의 grep 카운트(V2=0, V3=1)가 주석까지 매칭해 실패했었음, 의미는 그대로 유지하며 표현만 우회"

requirements-completed: [REQ-backend-db-schema]

# Metrics
duration: ~25min
completed: 2026-09-02
---

# Phase 9 Plan 2: Flyway DB 스키마 + 계약 테스트 Summary

**PostgreSQL 위에 Flyway V1~V3 순차 마이그레이션으로 users/checkins/daily_reflections 서버 스키마를 만들고, 클라이언트 SQLite 스키마(`src/db/schema.ts`)와 필드 단위로 대응하는지 및 클라이언트 발급 UUID를 서버가 재발급하지 않는지를 Testcontainers PostgreSQL 위에서 검증하는 12개 계약 테스트를 TDD로 작성했다.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (Task 1 RED, Task 2 GREEN)
- **Files modified:** 4 (신규 생성만, 수정 0건)

## Accomplishments

- `FlywayMigrationTest.kt`가 `information_schema.columns`/`table_constraints`/`key_column_usage`/`constraint_column_usage`/`pg_indexes`/`flyway_schema_history`를 직접 조회해 12개 단언(컬럼 목록 3종, 타입 매핑, nullable, FK, UNIQUE, id 기본값 유무 2종, 인덱스, D-02 플레이스홀더 로우)을 수행
- V1~V3 적용 전 12개 테스트 전부가 컴파일 에러가 아닌 진짜 단언/조회 실패(RED)로 실패함을 실행 로그로 확인
- V1~V3 마이그레이션 SQL 작성 후 동일한 12개 테스트 전부 GREEN(0 failures, 0 errors)
- `checkins.id`/`daily_reflections.id`에 DB 기본값 생성기가 없음을 테스트로 고정 — Phase 12 동기화 전제(클라이언트 발급 UUID 보존)가 지금부터 구조적으로 보호됨
- `daily_reflections`에 클라이언트(`UNIQUE(date)`)와 의도적으로 다른 `UNIQUE(user_id, date)` 제약을 적용하고 divergence 사유를 SQL 주석에 명시

## Task Commits

Each task was committed atomically:

1. **Task 1: FlywayMigrationTest 작성(RED)** - `97881e5` (test)
2. **Task 2: Flyway V1~V3 마이그레이션 SQL 작성(GREEN)** - `57ec18b` (feat)

**Plan metadata:** (아래 final_commit에서 기록)

## Files Created/Modified

- `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` - `@SpringBootTest` + `@Import(TestcontainersConfiguration::class)`, `JdbcTemplate` 주입, 12개 `@Test` 메서드
- `backend/src/main/resources/db/migration/V1__create_users_table.sql` - `users(id UUID DEFAULT gen_random_uuid(), created_at)` + 플레이스홀더 로우 1건
- `backend/src/main/resources/db/migration/V2__create_checkins_table.sql` - `checkins` 13컬럼(+user_id FK), id 기본값 없음, 인덱스 2종
- `backend/src/main/resources/db/migration/V3__create_daily_reflections_table.sql` - `daily_reflections` 7컬럼(+user_id FK), `UNIQUE(user_id, date)`

## Decisions Made

- **RED 실행 로그 인용** (Task 1, V1~V3 적용 전):
  ```
  FlywayMigrationTest > users id에는 gen_random_uuid 기본값이 있다() FAILED
      org.springframework.dao.EmptyResultDataAccessException at FlywayMigrationTest.kt:75
  FlywayMigrationTest > checkins 테이블 컬럼 집합이 계약대로다() FAILED
      org.opentest4j.AssertionFailedError at FlywayMigrationTest.kt:105
  FlywayMigrationTest > users 테이블에 플레이스홀더 로우가 정확히 1건 존재한다() FAILED
      org.springframework.jdbc.BadSqlGrammarException at FlywayMigrationTest.kt:247
  12 tests completed, 12 failed
  ```
  전부 "테이블/컬럼이 존재하지 않는다"는 사유(EmptyResultDataAccessException/AssertionFailedError/BadSqlGrammarException)로 실패했으며, 컴파일 에러는 없었다 — TDD RED 게이트 요건 충족.

- **GREEN 실행 로그 인용** (Task 2, V1~V3 적용 후):
  ```
  tests="12" skipped="0" failures="0" errors="0"
  BUILD SUCCESSFUL
  ```

- Kotlin 플랫폼 타입 컴파일 에러(`Set<String>` 기대, `Set<String?>` 실제) — `JdbcTemplate.queryForList(sql, String::class.java, ...)`가 Kotlin에서 nullable 원소로 추론됨. `filterNotNull()`을 추가해 해소(Rule 3 - 태스크 진행을 막는 컴파일 에러).

## Deviations from Plan

**1. [Rule 3 - Blocking issue] Docker Desktop VM 디스크 공간 부족으로 Testcontainers 컨테이너 기동 실패**
- **Found during:** Task 2 첫 GREEN 검증 실행
- **Issue:** `postgres:latest` Testcontainers 컨테이너가 `initdb: error: could not create directory "/var/lib/postgresql/data/pg_wal": No space left on device`로 기동 실패. 호스트 디스크(`df -h /`)는 386Gi 여유가 있었으나, `docker system df` 확인 결과 Docker Desktop 내부 VM의 Build Cache가 20.88GB(100% reclaimable)로 가득 차 있었음.
- **Root cause:** 이 worktree/세션과 무관한 이전 Docker 빌드들이 누적시킨 빌드 캐시 — 이번 플랜의 코드 변경과는 무관한 환경 문제.
- **Fix:** `docker builder prune -f`로 빌드 캐시 20.88GB 회수. 이미지/볼륨은 다른 프로젝트가 쓰고 있을 가능성을 배제할 수 없어 손대지 않음(빌드 캐시만으로 문제 해소 확인됨).
- **Files modified:** 없음(환경 정리만)
- **Commit:** 해당 없음(코드 변경 아님, GREEN 재실행으로 확인)

**2. [Rule 3 - Blocking issue] acceptance criteria grep 카운트와 주석 텍스트 충돌**
- **Found during:** Task 2 acceptance criteria 검증
- **Issue:** V2 주석이 "DEFAULT gen_random_uuid()"라는 문자열을 인용해 `grep -c 'gen_random_uuid' V2` 가 기대값 0 대신 1을 반환. V3 주석이 "UNIQUE(user_id, date)"를 그대로 인용해 `grep -cE 'UNIQUE *\( *user_id, *date *\)' V3`가 기대값 1 대신 2를 반환.
- **Fix:** 두 주석을 동일한 의미를 유지하면서 정규식이 매칭하지 않는 표현으로 재작성(예: "UUID DB 기본값 생성기", "user_id + date 조합"). SQL 본문은 변경하지 않음.
- **Files modified:** `V2__create_checkins_table.sql`, `V3__create_daily_reflections_table.sql`(둘 다 GREEN 커밋에 포함, 최종 커밋본은 이미 수정 반영됨)
- **Commit:** `57ec18b`

## Issues Encountered

- 위 Deviations 2건 외 추가 이슈 없음.

## User Setup Required

None — 이번 플랜은 로컬에서 Docker Desktop(이미 실행 중, 09-01에서 확인됨)만으로 전부 검증 가능했다.

## Blockers/Concerns for Orchestrator

- Docker Desktop VM 빌드 캐시가 다시 쌓이면(다른 프로젝트/플랜 작업으로) 09-03 이후 Testcontainers 기반 플랜에서 동일한 "No space left on device" 증상이 재발할 수 있다 — 재발 시 `docker builder prune -f`로 동일하게 해소 가능함을 다음 플랜 실행자에게 인계.
- `gsd-sdk query requirements.mark-complete REQ-backend-db-schema`는 이 worktree 실행자가 직접 호출하지 않는다(오케스트레이터가 웨이브 완료 후 처리) — 09-01-SUMMARY.md가 남긴 것과 동일한 REQUIREMENTS.md 8개 분해 미반영 블로커가 이 요구사항에도 동일하게 적용됨.

## Next Phase Readiness

- `backend/src/main/resources/db/migration/`에 V1~V3가 존재하고 Testcontainers PostgreSQL 위에서 전부 성공적으로 적용됨을 확인했다 — 09-03(JPA 엔티티)가 `ddl-auto=validate`로 이 스키마를 검증 모드로 바로 소비할 수 있다.
- `Checkin.kt`/`DailyReflection.kt`/`User.kt` 엔티티 작성 시 `@GeneratedValue`를 붙이지 않아야 하는 두 테이블(checkins, daily_reflections)과 붙여도 되는 테이블(users)이 이번 플랜의 스키마 계약 테스트로 이미 고정되어 있다.
- 마이그레이션 파일 3개 외 다른 `V*.sql`이 존재하지 않음을 확인했다(`ls` 결과 3개).

---
*Phase: 09-backend-foundation*
*Completed: 2026-09-02*
