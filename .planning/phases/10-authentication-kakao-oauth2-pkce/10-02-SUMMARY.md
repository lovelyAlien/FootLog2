---
phase: 10-authentication-kakao-oauth2-pkce
plan: 02
subsystem: database
tags: [flyway, postgresql, jpa, hibernate, kotlin, spring-boot, kakao-oauth2]

# Dependency graph
requires:
  - phase: 09-backend-foundation
    provides: "Flyway V1~V3 스키마, User/UserRepository 베이스, TestcontainersConfiguration, FlywayMigrationTest/EntityPersistenceTest 계약 테스트 뼈대"
provides:
  - "users 테이블에 kakao_id(BIGINT, UNIQUE)/nickname(TEXT)/profile_image_url(TEXT) nullable 컬럼 3개"
  - "User 엔티티에 kakaoId(val)/nickname(var)/profileImageUrl(var) 필드"
  - "UserRepository.findByKakaoId(Long): User? 파생 쿼리"
  - "동일 카카오 계정 중복 가입을 DB UNIQUE 제약으로 차단(D-08)"
affects: [10-04-kakao-auth-service, 10-05-auth-controller, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flyway ALTER TABLE 마이그레이션(V4) — 이 저장소 최초의 ALTER TABLE 파일, append-only 규율 유지"
    - "JPA @Column(nullable 기본) + UNIQUE 제약을 애플리케이션이 아닌 DB 레벨에서 강제"

key-files:
  created:
    - backend/src/main/resources/db/migration/V4__add_kakao_fields_to_users_table.sql
  modified:
    - backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt
    - backend/src/main/kotlin/com/footlog/backend/user/User.kt
    - backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt
    - backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt

key-decisions:
  - "kakao_id는 BIGINT/Long — Int 오버플로로 회원번호가 음수가 되는 실사고 사례를 회귀 테스트로 고정(Pitfall 3)"
  - "nickname/profile_image_url은 VARCHAR(N)이 아니라 TEXT — 카카오 공식 문서가 길이 상한을 명시하지 않음(A7)"
  - "kakao_id 단일 컬럼 UNIQUE + nullable 공존 — Postgres가 NULL을 UNIQUE 위반으로 취급하지 않아 플레이스홀더 로우와 실사용자 로우 유일성이 동시에 성립(D-11)"
  - "테스트에서 save() 반환값이 아닌 재조회로 얻은 관리 상태(managed) 엔티티를 수정 — id가 미리 채워진 엔티티는 Spring Data가 merge()를 호출해 원본 참조를 detached 상태로 남기기 때문"

patterns-established:
  - "클라이언트 발급 ID처럼 @Id가 이미 채워진 엔티티를 저장 후 즉시 수정해야 하는 테스트는 save() 반환값이 아니라 리포지토리 재조회로 관리 엔티티를 얻어야 한다(merge() vs persist() 함정)"

requirements-completed: [REQ-auth-kakao-oauth]

duration: 25min
completed: 2026-09-03
---

# Phase 10 Plan 02: Kakao 프로필 스키마 확장 Summary

**Flyway V4로 `users` 테이블에 kakao_id(BIGINT, UNIQUE)/nickname/profile_image_url(TEXT) nullable 컬럼 3개를 추가하고, User 엔티티·UserRepository.findByKakaoId를 같은 계약으로 확장해 DB 레벨에서 카카오 계정 중복 가입을 차단했다.**

## Performance

- **Duration:** 약 25min
- **Tasks:** 3/3 완료
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `users` 스키마가 카카오 로그인이 필요로 하는 프로필 필드(kakao_id/nickname/profile_image_url)를 갖추고, 타입(BIGINT/TEXT)·nullable·UNIQUE 형태가 스키마 계약 테스트(FlywayMigrationTest)로 고정됨
- 동일 카카오 계정의 중복 계정 생성이 애플리케이션 코드가 아니라 `uq_users_kakao_id` DB 제약으로 원천 차단됨(D-08) — `EntityPersistenceTest` Test C가 `DataIntegrityViolationException` 발생을 증명
- Phase 9의 플레이스홀더 사용자 로우(`00000000-0000-0000-0000-000000000001`)가 삭제되지 않고 그대로 살아 있으며, 새 3개 컬럼이 전부 NULL임을 스키마 테스트(FlywayMigrationTest Test 12)와 엔티티 테스트(EntityPersistenceTest Test E) 양쪽에서 증명(D-09~D-12)
- `Int.MAX_VALUE`를 초과하는 카카오 회원번호(`4_294_967_296L`)도 값 손상 없이 왕복 보존됨을 회귀 테스트로 고정(Pitfall 3)
- 10-04(KakaoAuthService)가 소비할 `findByKakaoId(Long): User?` 계약이 존재하고, 신규/미존재/변경 세 경로 모두 테스트로 증명됨

## Task Commits

1. **Task 1: FlywayMigrationTest V4 계약 확장 (RED)** - `b7b0b17` (test)
2. **Task 2: Flyway V4 마이그레이션 SQL 작성 (GREEN)** - `649790b` (feat)
3. **Task 3: User 엔티티/UserRepository 확장 + 영속성 계약 테스트** - `8a00449` (feat)

_Note: Task 3은 tdd="true"였으나 계획의 `<action>` 지시가 (1) User.kt (2) UserRepository.kt (3) EntityPersistenceTest.kt 순서를 명시적으로 지정함 — Kotlin이 정적 타입 언어라 생성자 필드/리포지토리 메서드가 존재하지 않으면 새 테스트 자체가 컴파일되지 않기 때문. 계획 텍스트의 명시적 순서를 그대로 따랐다._

## RED/GREEN 로그 인용 (검증 항목)

**Task 1 RED (V4 마이그레이션 없이 실행, 7개 테스트 실패 확인):**
```
FlywayMigrationTest > flyway_schema_history에 V1 V2 V3 V4가 success로 기록된다() FAILED
    org.opentest4j.AssertionFailedError at FlywayMigrationTest.kt:91
FlywayMigrationTest > nullable 제약이 계약대로다() FAILED
    org.springframework.dao.EmptyResultDataAccessException at FlywayMigrationTest.kt:66
FlywayMigrationTest > users 테이블에 플레이스홀더 로우가 정확히 1건 존재한다() FAILED
    org.springframework.jdbc.BadSqlGrammarException at FlywayMigrationTest.kt:316
FlywayMigrationTest > users kakao_id의 데이터 타입이 bigint다() FAILED
    org.springframework.dao.EmptyResultDataAccessException at FlywayMigrationTest.kt:48
FlywayMigrationTest > users 테이블 컬럼 집합이 정확히 id created_at kakao_id nickname profile_image_url이다() FAILED
    org.opentest4j.AssertionFailedError at FlywayMigrationTest.kt:102
FlywayMigrationTest > users에 kakao_id 단일 컬럼 UNIQUE 제약이 존재한다() FAILED
    org.opentest4j.AssertionFailedError at FlywayMigrationTest.kt:269
FlywayMigrationTest > users nickname과 profile_image_url의 데이터 타입이 text이고 길이 상한이 없다() FAILED
    org.springframework.dao.EmptyResultDataAccessException at FlywayMigrationTest.kt:48

16 tests completed, 7 failed
```
7개 전부 "kakao_id 컬럼이 없음 / V4 이력이 없음" 계열 실패(컬럼 부재로 인한 `EmptyResultDataAccessException`/`BadSqlGrammarException`, 또는 값 불일치로 인한 `AssertionFailedError`)이며 컴파일 에러는 없음 — RED로 유효함.

**Task 2 GREEN (V4 마이그레이션 적용 후):**
```
> Task :test
BUILD SUCCESSFUL in 17s
```
16개 테스트(기존 12개 + 신규 4개) 전부 통과.

**Task 3 이후 전체 스위트 (`./gradlew build`):**
```
> Task :test
> Task :check
> Task :build
BUILD SUCCESSFUL in 18s
```
`ddl-auto=validate`가 확장된 엔티티↔V4 스키마 일치를 기동 시점에 검증하며 통과.

## Files Created/Modified

- `backend/src/main/resources/db/migration/V4__add_kakao_fields_to_users_table.sql` - kakao_id/nickname/profile_image_url 3개 컬럼 추가 + kakao_id UNIQUE 제약
- `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` - usersColumns 확장, V4 이력/BIGINT·TEXT 타입/UNIQUE 제약/플레이스홀더 NULL/email 컬럼 부재 신규 테스트 7건 추가
- `backend/src/main/kotlin/com/footlog/backend/user/User.kt` - kakaoId(val)/nickname(var)/profileImageUrl(var) 필드 추가
- `backend/src/main/kotlin/com/footlog/backend/user/UserRepository.kt` - findByKakaoId(Long): User? 파생 쿼리 추가
- `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt` - Test A~F(kakaoId 왕복 보존, Int 오버플로 회귀, UNIQUE 위반, 미존재 조회, 플레이스홀더 NULL, nickname/profileImageUrl 갱신) 추가

## Decisions Made

- kakao_id를 BIGINT/Long으로 고정하고 Int 오버플로 회귀 테스트(`4_294_967_296L`)를 EntityPersistenceTest에 추가 — 10-RESEARCH.md Pitfall 3의 구체적 재발 방지책
- nickname/profile_image_url은 VARCHAR(N)이 아니라 TEXT — Phase 9의 VARCHAR(N) 관례에서 의도적으로 벗어남(A7, 카카오 공식 문서 길이 상한 미명시)
- UNIQUE 제약을 kakao_id 단일 컬럼에만 걸고 세 컬럼 모두 nullable로 유지 — 플레이스홀더 로우 공존을 위한 구조적 선택(D-11)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test F(nickname/profileImageUrl 갱신 반영) 최초 구현이 detached 엔티티를 수정하는 버그**
- **Found during:** Task 3 (EntityPersistenceTest 확장, GREEN 검증 중)
- **Issue:** `userRepository.save(user)` 직후 원본 `user` 참조를 직접 mutate하고 flush했으나 DB에 반영되지 않음(재조회 시 이전 값 유지). 원인: `user.id`가 저장 전에 이미 채워져 있어(`UUID.randomUUID()`로 미리 지정) Spring Data JPA의 `isNew()` 판정이 false가 되고, `save()`가 내부적으로 `entityManager.persist()`가 아니라 `entityManager.merge()`를 호출함 — `merge()`는 별도의 관리(managed) 복사본을 반환하고, 원본 `user` 참조는 detached 상태로 남아 그 위의 필드 수정이 영속성 컨텍스트에 반영되지 않음.
- **Fix:** 저장 후 `entityManager.clear()`로 컨텍스트를 비우고, `userRepository.findByKakaoId(...)`로 다시 조회해 얻은 관리 상태 엔티티를 수정하도록 변경(이 파일의 다른 테스트들이 이미 쓰는 save→flush→clear→재조회 패턴과 동일하게 정렬).
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/EntityPersistenceTest.kt`
- **Verification:** 수정 후 `./gradlew test --tests "*EntityPersistenceTest" --tests "*FlywayMigrationTest"` 전체 통과, `./gradlew build` 전체 스위트 그린
- **Committed in:** `8a00449` (Task 3 커밋에 포함)

**2. [Rule 3 - Blocking] Acceptance criteria grep과 계획 지정 주석 문구 충돌**
- **Found during:** Task 3 (acceptance_criteria 검증 중)
- **Issue:** 계획 `<action>`이 명시한 주석 문구("@GeneratedValue를 여전히 붙이지 않는 이유는...", "length를 붙이지 않는다...")를 그대로 쓰면 `grep -c 'GeneratedValue'`/`grep -c 'length'`가 각각 1이 되어 acceptance criteria(결과 0 기대)를 위반함 — 두 grep은 실제 애노테이션 사용 여부를 검사하려는 의도였으나 주석 프로즈의 리터럴 문자열까지 함께 잡힘.
- **Fix:** 같은 의미를 유지하면서 리터럴 문자열만 회피 — "@GeneratedValue" → "JPA ID 자동생성 애노테이션", "length를 붙이지 않는다" → "글자수 제한 속성을 붙이지 않는다"로 표현 변경.
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/user/User.kt`
- **Verification:** `grep -c 'length'`/`grep -c 'GeneratedValue'` 둘 다 0, `./gradlew build` 그린
- **Committed in:** `8a00449` (Task 3 커밋에 포함)

---

**Total deviations:** 2 auto-fixed (Rule 1 버그 수정 1건, Rule 3 차단 이슈 해결 1건)
**Impact on plan:** 둘 다 테스트/검증 스크립트 레벨의 수정이며 스키마·엔티티·리포지토리의 실제 계약(타입/제약/메서드 시그니처)에는 영향 없음. 스코프 확장 없음.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness

- 10-04(KakaoAuthService)가 소비할 `User.kakaoId/nickname/profileImageUrl` 필드와 `UserRepository.findByKakaoId`가 존재하고 동작이 테스트로 증명됨 — find-or-create 구현이 이 계약 위에서 바로 시작 가능
- DB 레벨 UNIQUE 제약이 존재해 10-04/10-05가 동시 요청 경합 상황에서도 애플리케이션 코드의 "먼저 조회 후 생성" 로직만으로는 막지 못하는 중복 계정 생성을 걱정하지 않아도 됨
- 블로커 없음

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*

## Self-Check: PASSED

- 파일 6개(V4 SQL, FlywayMigrationTest.kt, User.kt, UserRepository.kt, EntityPersistenceTest.kt, 이 SUMMARY.md) 전부 FOUND
- 커밋 3건(b7b0b17, 649790b, 8a00449) 전부 `git log --oneline --all`에서 FOUND
