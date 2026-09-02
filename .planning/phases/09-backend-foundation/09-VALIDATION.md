---
phase: 9
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 09-01-XX | 01 | 1 | REQ-backend-scaffold | — | N/A | smoke/integration | `./gradlew test --tests "*HealthCheckSmokeTest"` | ❌ W0 | ⬜ pending |
| 09-02-XX | 02 | 1 | REQ-backend-db-schema | — | N/A | integration | `./gradlew test --tests "*FlywayMigrationTest"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` — Testcontainers Postgres에 V1~V3 마이그레이션이 에러 없이 적용되는지, 기대 컬럼/타입/제약(FK, UNIQUE)이 실제로 존재하는지 검증 — REQ-backend-db-schema 커버
- [ ] `backend/src/test/kotlin/com/footlog/backend/HealthCheckSmokeTest.kt` — `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)`로 컨텍스트 로딩 + `/actuator/health` 200 확인 — REQ-backend-scaffold 성공 기준 1 커버
- [ ] `backend/src/test/kotlin/com/footlog/backend/TestcontainersConfiguration.kt` — start.spring.io 스캐폴딩 태스크가 자동 생성(추가 작업 불필요, 존재만 확인)
- [ ] `.github/workflows/backend-ci.yml` — 신규 작성 필요(D-10, 아직 저장소에 없음)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 스테이징 환경 실제 배포·기동 확인 | REQ-backend-scaffold | PaaS 계정 프로비저닝 여부가 계획 단계 미확정 사안(RESEARCH.md Open Question 1) — 자동화된 CI로는 실제 스테이징 인프라까지 검증 불가 | `application-staging.yml` 프로파일로 로컬에서 기동 확인 후, 실제 PaaS(Railway 등) 배포는 계획 단계에서 범위가 확정되면 수동으로 1회 검증 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
