---
phase: 09-backend-foundation
plan: 04
subsystem: database
tags: [spring-data-jpa, kotlin, hibernate, testcontainers, tdd, entities]

# Dependency graph
requires:
  - phase: 09-01
    provides: "Spring Boot/Kotlin 백엔드 스캐폴드, TestcontainersConfiguration"
  - phase: 09-02
    provides: "Flyway V1~V3 실제 스키마(users/checkins/daily_reflections), FlywayMigrationTest 계약"
provides:
  - "JPA 엔티티 3종(User/Checkin/DailyReflection), 도메인별 패키지(user/checkin/dailyreflection)"
  - "리포지토리 3종(UserRepository/CheckinRepository/DailyReflectionRepository), JpaRepository<X, UUID>"
  - "EntityPersistenceTest — 클라이언트 발급 UUID 보존 + 전 필드 왕복 + UNIQUE(user_id, date) 제약 계약 테스트 6개"
  - "ddl-auto=validate 상태로 애플리케이션 컨텍스트가 기동됨(엔티티↔실제 스키마 정합 증명)"
affects: [09-05-ci, 09-06-gate, phase-10-auth, phase-12-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: ["도메인(feature)별 패키징(user/checkin/dailyreflection)", "JPA ID 자동생성 애노테이션 금지(클라이언트 발급 UUID 보존)", "timestamptz 왕복 비교는 OffsetDateTime.isEqual(인스턴트 비교)", "예외 변환은 리포지토리 프록시 경유 호출에서만 적용됨(raw EntityManager.flush() 아님)"]

key-files:
  created:
    - backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt
    - backend/src/main/kotlin/com/footlog/backend/user/User.kt
    - backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt
    - backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt
    - backend/src/main/kotlin/com/footlog/backend/checkin/CheckinRepository.kt
    - backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflection.kt
    - backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflectionRepository.kt
  modified: []

key-decisions:
  - "timestamptz 왕복 검증에 assertEquals(OffsetDateTime) 대신 isEqual 사용 - PostgreSQL timestamptz는 오프셋을 보존하지 않고 인스턴트만 저장하며 JDBC 드라이버가 UTC 오프셋으로 반환하므로, 저장 시 +09:00으로 넣은 값이 조회 시 Z(UTC)로 돌아와 오프셋까지 비교하는 equals()는 항상 거짓 실패한다"
  - "UNIQUE 제약 위반 검증을 entityManager.flush() 대신 dailyReflectionRepository.flush()로 변경 - Spring의 PersistenceExceptionTranslationPostProcessor는 @Repository 프록시 호출에만 적용되므로 raw EntityManager 호출은 Hibernate의 ConstraintViolationException을 그대로 던지고 DataIntegrityViolationException으로 변환되지 않는다"
  - "@GeneratedValue 관련 코드 주석에서 애노테이션 리터럴 표기를 '자동생성 애노테이션'으로 완곡화 - acceptance criteria의 grep -c '@GeneratedValue' == 0 게이트가 주석 인용까지 매칭해 오탐하는 것을 방지(09-02 SUMMARY의 동일 패턴 재사용)"

requirements-completed: [REQ-backend-db-schema]

# Metrics
duration: ~20min
completed: 2026-09-02
---

# Phase 9 Plan 4: Spring Data JPA 엔티티 + 리포지토리 Summary

**09-02가 만든 실제 PostgreSQL 스키마 위에 Spring Data JPA 엔티티 3종(User/Checkin/DailyReflection)과 리포지토리 3종을 도메인별 패키지로 얹고, `ddl-auto=validate` 통과와 클라이언트 발급 UUID 보존을 6개 왕복 테스트로 고정했다.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (Task 1 RED, Task 2 GREEN)
- **Files modified:** 7 (신규 생성 6, 테스트 파일 1건은 RED 커밋 후 GREEN 검증 중 수정)

## Accomplishments

- `EntityPersistenceTest.kt`가 6개 테스트로 다음을 고정: 플레이스홀더 사용자 조회, Checkin 저장 시 클라이언트 UUID 보존 + 전 필드 왕복, Checkin null 허용 필드 왕복, DailyReflection UUID 보존, `UNIQUE(user_id, date)` 위반 시 `DataIntegrityViolationException`, `Checkin.user` FK 연관 탐색
- User/Checkin/DailyReflection 엔티티 모두 JPA ID 자동생성 애노테이션을 붙이지 않아 클라이언트가 `crypto.randomUUID()`로 발급한 ID를 서버가 재발급하지 않음(09-RESEARCH.md Pitfall 5) — 테스트로 회귀 방지 고정
- `ddl-auto=validate` 상태로 `@SpringBootTest` 컨텍스트가 정상 기동됨 — 엔티티와 09-02 실제 스키마(V1~V3)가 완전히 일치한다는 구조적 증거
- 리포지토리 3종은 각각 `JpaRepository<X, UUID>` 한 줄 인터페이스로 작성(커스텀 쿼리 없음, 조회 API는 Phase 12 스코프)
- 마이그레이션 파일 3개(V1~V3)는 이 플랜에서 전혀 수정하지 않음(git diff 확인, T-9-15 게이트 충족)

## Task Commits

Each task was committed atomically:

1. **Task 1: EntityPersistenceTest 작성(RED)** - `cc3cb72` (test)
2. **Task 2: JPA 엔티티 3종 + 리포지토리 3종(GREEN)** - `21994fd` (feat)

**Plan metadata:** (아래 final_commit에서 기록)

## Files Created/Modified

- `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt` - `@SpringBootTest` + `@Transactional` + `TestcontainersConfiguration` 재사용, 왕복 테스트 6개
- `backend/src/main/kotlin/com/footlog/backend/user/User.kt` - `users` 테이블 엔티티(FK 대상)
- `backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt` - `JpaRepository<User, UUID>`
- `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt` - `checkins` 테이블 엔티티, `@ManyToOne` User FK
- `backend/src/main/kotlin/com/footlog/backend/checkin/CheckinRepository.kt` - `JpaRepository<Checkin, UUID>`
- `backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflection.kt` - `daily_reflections` 테이블 엔티티, `LocalDate` date 필드
- `backend/src/main/kotlin/com/footlog/backend/dailyreflection/DailyReflectionRepository.kt` - `JpaRepository<DailyReflection, UUID>`

## Decisions Made

- **RED 실행 로그 인용** (Task 1, 엔티티/리포지토리 작성 전):
  ```
  e: EntityPersistenceTest.kt:3:28 Unresolved reference 'checkin'.
  e: EntityPersistenceTest.kt:5:28 Unresolved reference 'dailyreflection'.
  e: EntityPersistenceTest.kt:7:28 Unresolved reference 'user'.
  e: EntityPersistenceTest.kt:38:34 Unresolved reference 'UserRepository'.
  ... (총 29개 Unresolved reference)
  > Task :compileTestKotlin FAILED
  BUILD FAILED
  ```
  엔티티/리포지토리 타입 자체가 없어 컴파일이 실패했다 — Task 1 `<action>` 지침이 명시한 "이 시점에는 컴파일 실패가 정상"인 RED 상태를 정확히 재현했다.

- **GREEN 실행 로그 인용** (Task 2, 엔티티/리포지토리 작성 후):
  ```
  > Task :test
  BUILD SUCCESSFUL in 14s
  ```
  `EntityPersistenceTest`(6개) + `FlywayMigrationTest`(12개) 전부 통과.

- timestamptz 비교와 예외 변환 관련 결정은 위 `key-decisions` 참고.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EntityPersistenceTest의 timestamptz 왕복 비교가 거짓 실패**
- **Found during:** Task 2 첫 GREEN 검증 실행
- **Issue:** `assertEquals(now, found.timestampUtc)`가 `expected: <2026-09-02T17:10:08.403534+09:00> but was: <2026-09-02T08:10:08.403534Z>`로 실패. 같은 인스턴트인데 오프셋 표기(+09:00 vs Z)가 달라 `OffsetDateTime.equals()`(오프셋까지 비교)가 거짓 실패를 낸 것 — PostgreSQL `timestamptz`는 오프셋을 보존하지 않고 인스턴트만 저장하며, JDBC 드라이버가 UTC 오프셋으로 값을 반환하는 것이 정상 동작이다. 엔티티/스키마의 버그가 아니라 테스트 단언 방식의 버그.
- **Fix:** `assertEquals`를 `assertTrue(now.isEqual(found.x))`(인스턴트 동등성)로 교체. timestampUtc/createdAt/updatedAt 3곳 모두 적용.
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt`
- **Verification:** 재실행 시 `BUILD SUCCESSFUL`
- **Committed in:** `21994fd` (Task 2 커밋에 포함)

**2. [Rule 1 - Bug] UNIQUE 제약 위반 테스트가 잘못된 예외 타입 기대**
- **Found during:** Task 2 첫 GREEN 검증 실행
- **Issue:** `assertThrows<DataIntegrityViolationException> { entityManager.flush() }`가 `Unexpected exception type thrown, expected: <DataIntegrityViolationException> but was: <ConstraintViolationException>`으로 실패. Spring의 `PersistenceExceptionTranslationPostProcessor`(예외 변환)는 `@Repository` 프록시를 통한 호출에만 적용되는데, 테스트가 raw `EntityManager.flush()`를 직접 호출해 변환이 일어나지 않은 것 — 계획의 `<action>` 지침은 "DataIntegrityViolationException 단언"만 명시했을 뿐 어떤 경로로 flush해야 하는지는 명시하지 않아, 최초 구현이 잘못된 경로(raw EntityManager)를 선택한 버그.
- **Fix:** `entityManager.flush()`를 `dailyReflectionRepository.flush()`(Spring Data 프록시 경유)로 교체. 나머지 테스트의 정상 흐름 flush는 원래대로 `entityManager.flush()` 유지(예외를 기대하지 않는 흐름이라 문제 없음).
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt`
- **Verification:** 재실행 시 해당 테스트 통과, `DataIntegrityViolationException` 정상 캐치
- **Committed in:** `21994fd` (Task 2 커밋에 포함)

**3. [Rule 3 - Blocking issue] acceptance criteria grep 카운트와 코드 주석 텍스트 충돌**
- **Found during:** Task 2 acceptance criteria 검증
- **Issue:** `grep -rc '@GeneratedValue' Checkin.kt`가 기대값 0 대신 1을 반환 — "@GeneratedValue를 절대 붙이지 않는다"는 설명 주석이 애노테이션 리터럴 문자열을 그대로 인용해 grep이 오탐. `User.kt`/`DailyReflection.kt`도 동일 패턴으로 오탐.
- **Fix:** 세 파일의 해당 주석을 "JPA ID 자동생성 애노테이션을 붙이지 않는다"로 재작성 — 의미는 동일하게 유지하며 애노테이션 리터럴 표기만 제거. 09-02-SUMMARY.md에 동일 패턴(gen_random_uuid/UNIQUE 인용 회피)이 이미 문서화되어 있어 동일 대응을 재사용.
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/checkin/Checkin.kt`, `.../dailyreflection/DailyReflection.kt`, `.../user/User.kt`
- **Verification:** `grep -c '@GeneratedValue'` 세 파일 모두 0 확인
- **Committed in:** `21994fd` (Task 2 커밋에 포함)

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking)
**Impact on plan:** 모두 테스트 정확성/게이트 통과를 위한 필수 수정이며, 엔티티 설계나 스코프 자체를 바꾸지 않았다. Scope creep 없음.

## Issues Encountered

위 Deviations 3건 외 추가 이슈 없음.

## User Setup Required

None — 이번 플랜은 로컬 Docker Desktop(이미 실행 중)만으로 전부 검증 가능했다.

## Next Phase Readiness

- Spring Data JPA 데이터 접근 계층(D-04)이 존재하고 실제 스키마와 정합함을 `ddl-auto=validate` 컨텍스트 기동 성공으로 증명했다.
- 클라이언트 발급 UUID 보존과 `UNIQUE(user_id, date)` 제약이 회귀 방지 테스트로 고정되어, Phase 12(클라이언트-서버 동기화)가 이 계약을 그대로 신뢰하고 위에 쌓을 수 있다.
- 컨트롤러/서비스 계층은 이번 플랜 스코프 밖 — 09-06(백엔드 파운데이션 최종 게이트) 또는 이후 phase에서 이 리포지토리들을 소비하는 API가 추가될 예정.
- `gsd-sdk query requirements.mark-complete REQ-backend-db-schema`는 이 worktree 실행자가 직접 호출하지 않는다(오케스트레이터가 웨이브 완료 후 처리) — 09-01/09-02-SUMMARY.md가 남긴 것과 동일한 REQUIREMENTS.md 미반영 블로커가 이 요구사항에도 동일하게 적용됨.

---
*Phase: 09-backend-foundation*
*Completed: 2026-09-02*
