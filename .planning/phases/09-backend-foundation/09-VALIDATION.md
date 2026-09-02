---
phase: 9
slug: backend-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-02
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (Spring Boot 4 기본) + `kotlin-test-junit5`, Testcontainers (`testcontainers-postgresql`) |
| **Config file** | `backend/build.gradle.kts` (`tasks.withType<Test> { useJUnitPlatform() }`) — 별도 설정 파일 없음 |
| **Quick run command** | `cd backend && ./gradlew test --tests "*MigrationTest" -q` |
| **Full suite command** | `cd backend && ./gradlew build` |
| **Estimated runtime** | ~60-90초 (Testcontainers Postgres 컨테이너 기동 포함) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "<관련 테스트 클래스>"`
- **After every plan wave:** Run `cd backend && ./gradlew build` (전체 스위트, Testcontainers 포함)
- **Before `/gsd:verify-work`:** `cd backend && ./gradlew build` 전체 그린 확인
- **Max feedback latency:** ~90초

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 01 | 1 | REQ-backend-scaffold | — | N/A | smoke | `./gradlew test --tests "*BackendApplicationTests"` | ✅ | ✅ green |
| 09-02-T1 | 02 | 2 | REQ-backend-db-schema | — | N/A | integration | `./gradlew test --tests "*FlywayMigrationTest"` | ✅ | ✅ green |
| 09-04-T1 | 04 | 3 | REQ-backend-db-schema | — | N/A | integration | `./gradlew test --tests "*EntityPersistenceTest"` | ✅ | ✅ green |
| 09-05-T1 | 05 | 4 | REQ-backend-scaffold | T-9-02 | actuator 노출 잠금(health만) | integration | `./gradlew test --tests "*HealthCheckSmokeTest"` | ✅ | ✅ green |
| 09-05-T2 | 05 | 4 | REQ-backend-scaffold | T-9-18 | 스테이징 프로파일 env var DataSource 기동 | integration | `./gradlew test --tests "*StagingProfileBootTest"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` — Testcontainers Postgres에 V1~V3 마이그레이션이 에러 없이 적용되는지, 기대 컬럼/타입/제약(FK, UNIQUE)이 실제로 존재하는지 검증 — REQ-backend-db-schema 커버
- [x] `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt` — `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)`로 컨텍스트 로딩 + `/actuator/health` 200 확인 — REQ-backend-scaffold 성공 기준 1 커버
- [x] `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt` — start.spring.io 스캐폴딩 태스크가 자동 생성(추가 작업 불필요, 존재만 확인)
- [x] `.github/workflows/backend-ci.yml` — 신규 작성 필요(D-10, 아직 저장소에 없음)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 스테이징 환경 실제 배포·기동 확인 | REQ-backend-scaffold | 프로파일 + 자동 테스트로 대체됨, 실제 PaaS 배포는 이번 phase 범위 밖 | 09-06 창업자 결정(option-a): `StagingProfileBootTest`가 `application-staging.yml` 프로파일 + 환경변수 DataSource 기동을 자동 테스트로 커버. 실제 PaaS(Railway 등) 배포는 Phase 10 이후 별도 플랜 스코프로 이관 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant` set to `true` in frontmatter

**Approval:** approved (09-06)
