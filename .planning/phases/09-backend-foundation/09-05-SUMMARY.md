---
phase: 09-backend-foundation
plan: 05
subsystem: backend-testing
tags: [spring-boot, actuator, testcontainers, staging-profile, requirements-doc]
dependency-graph:
  requires: [09-01, 09-02, 09-04]
  provides: [health-smoke-gate, staging-boot-gate, backend-requirements-section]
  affects: [09-06]
tech-stack:
  added:
    - "org.springframework.boot:spring-boot-starter-restclient-test (테스트 전용, Boot BOM 관리)"
  patterns:
    - "Boot 4.1: TestRestTemplate은 org.springframework.boot.resttestclient 패키지 + @AutoConfigureTestRestTemplate 필요(구 org.springframework.boot.test.web.client 경로 아님)"
    - "actuator 노출 잠금 검증은 401/403이 아니라 404 단언(exposure.include에 없는 엔드포인트는 매핑 자체가 안 됨)"
    - "staging 프로파일 DataSource 검증은 @ServiceConnection을 배제하고 @DynamicPropertySource로 직접 환경변수를 등록해야 우회 없이 실제 경로를 검증함"
key-files:
  created:
    - backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt
    - backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt
  modified:
    - backend/build.gradle.kts
    - .planning/REQUIREMENTS.md
decisions:
  - "TestRestTemplate/RestTemplateBuilder가 Boot 4.1에서 신규 모듈(spring-boot-restclient, spring-boot-resttestclient)로 분리된 것을 실행 중 발견 — spring-boot-starter-restclient-test를 testImplementation으로 추가(버전 미명시, Boot BOM이 4.1.1로 해석함을 gradlew dependencies로 확인)"
  - "actuator 노출 게이트가 실제로 회귀를 잡는지 exposure.include를 health,env,beans로 일시 확장해 Test2/3 실패를 확인한 뒤 원복 — 게이트가 장식이 아니라 실제로 작동함을 실행 로그로 증명"
metrics:
  duration: "약 20분"
  completed: 2026-09-02
---

# Phase 9 Plan 5: 헬스체크/actuator 노출 잠금 + staging 기동 검증 + REQUIREMENTS.md 갱신 Summary

Spring Boot 앱의 로컬/스테이징 기동과 actuator 노출 범위를 사람 확인이 아닌 자동 테스트로
고정하고, REQUIREMENTS.md에 09-CONTEXT.md가 참조하라고 지시했던 Phase 9~12 요구사항 섹션을
신설했다.

## What Was Built

- **`HealthCheckSmokeTest.kt`**: `@SpringBootTest(webEnvironment = RANDOM_PORT)` +
  `TestcontainersConfiguration`으로 실제 서블릿 컨테이너와 Postgres를 띄우고
  `TestRestTemplate`으로 `GET /actuator/health`(200 + `"status":"UP"`)와
  `GET /actuator/env`/`GET /actuator/beans`(둘 다 404 — T-9-02 회귀 게이트)를 검증하는 3개
  테스트.
- **`StagingProfileBootTest.kt`**: `@ActiveProfiles("staging")` + 클래스 내부에 직접 선언한
  `PostgreSQLContainer`(`@ServiceConnection` 미사용) + `@DynamicPropertySource`로
  `DATABASE_URL`/`DATABASE_USERNAME`/`DATABASE_PASSWORD`를 등록해
  `application-staging.yml`의 `${DATABASE_URL}` 플레이스홀더가 실제로 해석되는지 검증하는
  3개 테스트(컨텍스트 기동, Flyway V1~V3 적용 + `checkins` 조회, actuator 노출 잠금 유지).
- **`.planning/REQUIREMENTS.md`**: `## v1 Requirements`와 `## v2 Requirements` 사이에
  `## 백엔드/인증/클라우드 (Phase 9~12)` 섹션을 신설해 ROADMAP.md Phase 9~12 Success
  Criteria에 근거한 8개 원자 요구사항(REQ-backend-scaffold/db-schema,
  REQ-auth-kakao-oauth/session-token, REQ-storage-s3-upload/access-control,
  REQ-sync-local-first/conflict-resolution)을 추가하고, 기존 `REQ-phase2-backend` 버킷은
  삭제하지 않고 "분해됨" 안내를 덧붙였으며, Traceability 표에 8행(전부 Pending)을 추가했다.

## Actuator 노출 게이트 실동작 확인 로그(계획 요구사항)

`exposure.include: health`(정상 상태)에서는 3개 테스트 전부 통과:

```
BUILD SUCCESSFUL in 17s
```

`exposure.include`를 일시적으로 `health,env,beans`로 넓히자(T-9-02 회귀 게이트 실동작 확인용
실험) 정확히 예상대로 Test2/3만 실패:

```
HealthCheckSmokeTest > actuator beans는 노출되지 않아 404를 반환한다() FAILED
    org.opentest4j.AssertionFailedError at HealthCheckSmokeTest.kt:59
HealthCheckSmokeTest > actuator env는 노출되지 않아 404를 반환한다() FAILED
    org.opentest4j.AssertionFailedError at HealthCheckSmokeTest.kt:51
3 tests completed, 2 failed
```

`exposure.include: health`로 원복 후 재실행해 다시 3/3 통과를 확인했다(원복된 최종 상태로
커밋됨). 이로써 게이트가 실제로 작동함을 증명했다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Boot 4.1의 TestRestTemplate/RestTemplateBuilder 모듈 분리**
- **Found during:** Task 1 (`HealthCheckSmokeTest` 최초 컴파일)
- **Issue:** `org.springframework.boot.test.web.client.TestRestTemplate` import가
  `Unresolved reference`로 실패. 조사 결과 Boot 4.1부터 `TestRestTemplate`이
  `org.springframework.boot.resttestclient` 패키지(신규 `spring-boot-resttestclient` 모듈)로
  이동했고, 그 자동설정이 요구하는 `RestTemplateBuilder`(`org.springframework.boot.restclient`
  패키지)는 `webmvc-test` 스타터에 포함되지 않아 별도 모듈이 필요했다. 09-RESEARCH.md에는
  이 breaking change가 기록돼 있지 않았다(조사 시점엔 REST 클라이언트 테스트 지원이
  필요하지 않았기 때문으로 추정).
- **Fix:** import를 `org.springframework.boot.resttestclient.TestRestTemplate`로 변경하고
  `@AutoConfigureTestRestTemplate` 애너테이션을 추가했으며,
  `spring-boot-starter-restclient-test`를 `testImplementation`에 추가(버전 미명시 — Boot BOM이
  4.1.1로 해석함을 `./gradlew dependencies --configuration testCompileClasspath`로 확인,
  Maven Central `repo1.maven.org` 디렉터리 목록으로 좌표 실재 확인).
- **Files modified:** `backend/build.gradle.kts`,
  `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt`,
  `backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt`
- **Commit:** `da99091`(Task 1), `f8316dd`(Task 2, 동일 패턴 재사용)

## Known Stubs

없음 — 이 플랜은 테스트 코드와 문서 갱신만 다루며 UI/데이터 배선이 없다.

## Threat Flags

없음 — 이 플랜은 새 엔드포인트/인증 경로/스키마를 추가하지 않았다(기존 표면에 대한 회귀
게이트만 추가). 09-05-PLAN.md `<threat_model>`의 T-9-02/T-9-01/T-9-18이 이번 플랜의 유일한
관련 위협이며 전부 `mitigate` 완료됨.

## Verification

- `cd backend && ./gradlew test --tests "*HealthCheckSmokeTest" --tests "*StagingProfileBootTest"` — BUILD SUCCESSFUL
- `cd backend && ./gradlew build`(전체 스위트 — 컴파일 + 기존 09-01/09-02/09-04 테스트 포함 + jar 패키징) — BUILD SUCCESSFUL
- REQUIREMENTS.md: 8개 요구사항 ID 각각 정확히 2회 출현(불릿 1 + Traceability 1), 기존 v1
  불릿 수 대비 정확히 8 증가(35 → 43) 확인

## Self-Check: PASSED

- FOUND: backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt
- FOUND: backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt
- FOUND commit: da99091
- FOUND commit: f8316dd
- FOUND commit: 889b9aa
