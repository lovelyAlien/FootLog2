---
phase: 09-backend-foundation
plan: 01
subsystem: infra
tags: [spring-boot, kotlin, gradle, flyway, postgresql, docker-compose, backend-scaffold]

# Dependency graph
requires: []
provides:
  - "backend/ Gradle Kotlin DSL 프로젝트(Spring Boot 4.1.1 + Kotlin 2.3.21)"
  - "Flyway starter + allOpen + developmentOnly docker-compose가 이미 경화된 build.gradle.kts"
  - "공통/local/staging Spring Profiles 3종, 비밀값 하드코딩 0건"
affects: [09-02-migration, 09-03-entities, 09-04-docker, 09-05-ci, 09-06-gate]

# Tech tracking
tech-stack:
  added: [spring-boot 4.1.1, kotlin 2.3.21, gradle 9.7.1, flyway 12.4.0, hibernate-core 7.4.5, postgresql-jdbc 42.7.13, spring-boot-docker-compose, testcontainers-postgresql]
  patterns: ["Flyway 단일 스키마 소유권(ddl-auto=validate)", "Spring Profiles(local/staging) + 환경변수 비밀값 주입", "actuator health-only 노출"]

key-files:
  created:
    - backend/build.gradle.kts
    - backend/settings.gradle.kts
    - backend/compose.yaml
    - backend/gradlew
    - backend/gradle/wrapper/gradle-wrapper.properties
    - backend/src/main/kotlin/com/footlog/backend/BackendApplication.kt
    - backend/src/main/resources/application.yml
    - backend/src/main/resources/application-local.yml
    - backend/src/main/resources/application-staging.yml
    - backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt
    - backend/src/test/kotlin/com/footlog/backend/TestBackendApplication.kt
    - backend/src/test/kotlin/com/footlog/backend/BackendApplicationTests.kt
  modified: []

key-decisions:
  - "build.gradle.kts는 start.spring.io 생성기가 이미 allOpen/flyway-starter/developmentOnly docker-compose/useJUnitPlatform을 모두 포함해 생성 — Task 2는 검증만 하고 변경 없이 종료"
  - "application-local.yml의 spring.docker.compose.enabled를 중첩 YAML 대신 flat dotted key(spring.docker.compose.enabled: true)로 작성 — acceptance criteria grep이 한 줄 매칭을 요구했고, Spring 관점에서 두 표기는 동등하다"

patterns-established:
  - "Flyway 마이그레이션 파일은 append-only, 이미 적용된 V*.sql은 절대 수정하지 않는다(09-02+ 적용 예정)"
  - "체크인/회고 엔티티는 서버가 ID를 재발급하지 않는다(@GeneratedValue 금지, 클라이언트 발급 UUID 그대로 사용) — 09-03+ 적용 예정"

requirements-completed: [REQ-backend-scaffold]

# Metrics
duration: ~10min
completed: 2026-09-02
---

# Phase 9 Plan 1: Backend Foundation Scaffold Summary

**start.spring.io 공식 생성기로 Spring Boot 4.1.1(Kotlin, Gradle Kotlin DSL) `backend/` 프로젝트를 스캐폴딩하고, Boot 4의 Flyway 스타터 필수화/allOpen 함정을 빌드 설정에서 이미 해결한 상태로 확인했으며, 비밀값 하드코딩 0건인 공통/local/staging 3개 Spring Profiles를 작성했다.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3 (Task 2는 변경 없이 검증만 수행)
- **Files modified:** 17 (14 생성 - Task 1, 3 생성 + 1 삭제 - Task 3)

## Accomplishments

- `backend/` Gradle Kotlin DSL 프로젝트가 존재하고 `./gradlew compileKotlin`이 성공한다
- 런타임 클래스패스에 `flyway-core:12.4.0`, `flyway-database-postgresql`, `org.postgresql:postgresql:42.7.13`, `hibernate-core:7.4.5.Final`이 실제로 해석되어 존재함을 `./gradlew dependencies`로 실측 확인
- `application.yml`(공통) `ddl-auto: validate` + actuator `health`만 노출, `application-local.yml`(Docker Compose 자동 기동), `application-staging.yml`(환경변수 참조 전용) 3개 프로파일 완성
- 어떤 `application*.yml`에도 평문 비밀값이 0건임을 grep으로 재확인(T-9-01 게이트 통과)

## Task Commits

Each task was committed atomically:

1. **Task 1: start.spring.io 공식 생성기로 backend/ 스캐폴딩** - `aba89d4` (feat)
2. **Task 2: build.gradle.kts 경화 — allOpen + Flyway 스타터 + 테스트 의존성** - 변경 없음(검증만, 커밋 없음 — 아래 Deviations 참고)
3. **Task 3: Spring Profiles 3종(공통/local/staging) 작성** - `b780f1b` (feat)

**Plan metadata:** (아래 final_commit에서 기록)

## Files Created/Modified

- `backend/build.gradle.kts` - Spring Boot 4.1.1/Kotlin 2.3.21/Gradle 9.7.1, allOpen 블록, Flyway starter, developmentOnly docker-compose 전부 생성기가 이미 포함
- `backend/settings.gradle.kts` - `rootProject.name = "backend"`
- `backend/compose.yaml` - 생성기 산출물 그대로 유지(postgres:latest, 로컬 전용) — 계획 지침에 따라 손대지 않음
- `backend/gradlew`, `backend/gradle/wrapper/gradle-wrapper.properties` - Gradle 9.7.1 wrapper
- `backend/src/main/kotlin/com/footlog/backend/BackendApplication.kt` - `@SpringBootApplication` 엔트리포인트
- `backend/src/main/resources/application.yml` - 공통 프로파일(ddl-auto=validate, open-in-view=false, actuator health-only)
- `backend/src/main/resources/application-local.yml` - `spring.docker.compose.enabled: true`
- `backend/src/main/resources/application-staging.yml` - `${DATABASE_URL}`/`${DATABASE_USERNAME}`/`${DATABASE_PASSWORD}` 환경변수 참조
- `backend/src/main/resources/application.properties` - 삭제(application.yml로 대체)
- `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt` - 생성기 산출물(`@ServiceConnection` PostgreSQLContainer), 확인만 함
- `backend/src/test/kotlin/com/footlog/backend/TestBackendApplication.kt` - 생성기 산출물
- `backend/src/test/kotlin/com/footlog/backend/BackendApplicationTests.kt` - `@Import(TestcontainersConfiguration::class)` 이미 포함됨을 확인

## Decisions Made

- Task 2에서 `build.gradle.kts`를 수정하지 않기로 결정 — start.spring.io 생성기가 이미 allOpen 블록(jakarta.persistence.Entity/MappedSuperclass/Embeddable 3종), `spring-boot-starter-flyway` + `flyway-database-postgresql`, `developmentOnly("...spring-boot-docker-compose")`, `tasks.withType<Test> { useJUnitPlatform() }`을 전부 포함해 생성했다. 계획 지침("이미 생성기가 넣어준 좌표/버전은 절대 다시 쓰지 않는다")에 따라 추가 편집 없이 acceptance criteria 8개 전부를 grep/컴파일/의존성 해석으로 검증만 하고 종료했다.
- `application-local.yml`의 `spring.docker.compose.enabled`를 RESEARCH.md Pattern 3의 중첩 YAML 대신 flat dotted key로 작성 — acceptance criteria의 단일 라인 grep(`docker` 포함 줄에 `compose`도 포함)을 충족시키기 위한 표기법 변경이며, Spring의 relaxed binding 하에서 두 표기는 완전히 동등하다(기능적 차이 없음).
- `backend/compose.yaml`은 계획 지침에 따라 생성기 산출물(`postgres:latest`, `mydatabase`/`myuser`)을 그대로 유지하고 손대지 않았다 — RESEARCH.md 예시(`postgres:17`, `POSTGRES_DB=backend` 등)와 다르지만, 09-01-PLAN.md Task 1 action이 "생성됐다면 확인만 하고 손대지 않는다"고 명시적으로 지시했다. 실제 DB명/사용자명 값은 09-02(마이그레이션) 착수 전 재검토가 필요할 수 있음을 다음 플랜에 남긴다.

## Deviations from Plan

None (Rule 1-4 기준) - 계획에 정의된 acceptance criteria/verify를 모두 충족했고, 버그 수정이나 구조 변경이 필요한 지점이 없었다. Task 2는 "빠진 것만 추가한다"는 계획 지침대로 아무것도 추가하지 않은 것 자체가 계획을 정확히 따른 결과이며 이탈이 아니다.

## Issues Encountered

- acceptance criteria의 `grep -E '^[^#]*docker' backend/src/main/resources/application-local.yml` 검사가 "출력에 compose가 포함된다"를 요구했는데, RESEARCH.md Pattern 3의 중첩 YAML(`docker:` / `compose:`가 별도 줄)로는 단일 라인 grep으로 두 키워드를 동시에 잡을 수 없었다. 해결: 동등한 flat dotted key(`docker.compose.enabled: true`)로 표기를 바꿔 재검증 통과.

## User Setup Required

None - 이번 phase 스코프(로컬/스테이징 프로파일 존재 확인)에는 외부 서비스 설정이 필요하지 않다. 실제 스테이징 배포(PaaS 계정 프로비저닝)는 RESEARCH.md Open Question 1에 따라 이후 플랜/단계에서 확정된다.

## Blockers/Concerns for Orchestrator

- `gsd-sdk query requirements.mark-complete REQ-backend-scaffold` 결과 `not_found` — `.planning/REQUIREMENTS.md`에 아직 `REQ-phase2-backend` 단일 백로그 버킷만 존재하고, 09-CONTEXT.md/09-01-PLAN.md가 전제하는 8개 원자적 요구사항(`REQ-backend-scaffold`, `REQ-backend-db-schema` 등)으로의 분해가 실제 REQUIREMENTS.md에는 반영되어 있지 않다. 이 플랜 실행 범위 밖의 구조적 문서 갱신이라 직접 수정하지 않았다 — 오케스트레이터가 웨이브 완료 후 REQUIREMENTS.md를 8개 항목으로 분해하고 `REQ-backend-scaffold`를 완료 처리해야 한다.

## Next Phase Readiness

- 09-02(Flyway 마이그레이션)가 올라설 `backend/` Gradle 프로젝트와 `db/migration/` 디렉터리를 받아들일 준비가 된 `build.gradle.kts`가 존재한다.
- `application.yml`의 `ddl-auto: validate`가 이미 고정되어 있어, 09-04(JPA 엔티티) 작업 시 스키마 소유권 충돌 없이 바로 검증 모드로 동작한다.
- `backend/compose.yaml`의 DB명(`mydatabase`)/사용자명(`myuser`)이 RESEARCH.md 예시(`backend`)와 다르다는 점을 09-02 플랜 착수 시 명시적으로 재확인할 것 — Flyway 마이그레이션 SQL 자체에는 영향 없지만, 로컬 실행 시 접속 정보를 혼동하지 않도록 주의.
- 전체 `./gradlew build` 그린은 이번 플랜의 목표가 아니다(마이그레이션/엔티티가 아직 없음) — 09-06 게이트에서 확인 예정.

---
*Phase: 09-backend-foundation*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: backend/build.gradle.kts
- FOUND: backend/src/main/resources/application.yml
- FOUND: backend/src/main/resources/application-local.yml
- FOUND: backend/src/main/resources/application-staging.yml
- FOUND: .planning/phases/09-backend-foundation/09-01-SUMMARY.md
- FOUND commit: aba89d4 (Task 1)
- FOUND commit: b780f1b (Task 3)
- FOUND commit: 6e1ae14 (SUMMARY)
