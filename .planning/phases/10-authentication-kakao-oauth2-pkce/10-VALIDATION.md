---
phase: 10
slug: authentication-kakao-oauth2-pkce
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-02
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Testcontainers(Postgres) — 09-RESEARCH.md와 동일 스택 계승 |
| **Config file** | `backend/build.gradle.kts` (`tasks.withType<Test> { useJUnitPlatform() }`) |
| **Quick run command** | `cd backend && ./gradlew test --tests "*KakaoAuth*" --tests "*Jwt*" -q` |
| **Full suite command** | `cd backend && ./gradlew build` |
| **Estimated runtime** | ~60초(전체 스위트, Testcontainers 포함) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "<관련 테스트 클래스>"`
- **After every plan wave:** Run `cd backend && ./gradlew build`
- **Before `/gsd:verify-work`:** Full suite must be green, and (가능하면) D-16 검증 화면으로 실제
  카카오 계정 1개 이상 로그인 성공을 시뮬레이터에서 직접 확인
- **Max feedback latency:** ~60초

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-XX | 01 | 1 | REQ-auth-kakao-oauth | — | N/A | integration | `./gradlew test --tests "*FlywayMigrationTest"` | ❌ W0 | ⬜ pending |
| 10-02-XX | 02 | — | REQ-auth-kakao-oauth | — | 카카오 토큰/사용자정보 교환, client_secret 미노출 | integration | `./gradlew test --tests "*KakaoAuthServiceTest"` | ❌ W0 | ⬜ pending |
| 10-03-XX | 03 | — | REQ-auth-session-token | — | access/refresh JWT 발급, token_use 클레임 구분 | unit/integration | `./gradlew test --tests "*JwtIssuerServiceTest"` | ❌ W0 | ⬜ pending |
| 10-04-XX | 04 | — | REQ-auth-session-token | — | 보호된 엔드포인트는 401, refresh는 token_use 검증 | integration | `./gradlew test --tests "*SecurityConfigTest"` | ❌ W0 | ⬜ pending |
| 10-05-XX | 05 | — | REQ-auth-session-token | — | `/api/auth/refresh`가 유효 refresh로 새 access 발급 | integration | `./gradlew test --tests "*AuthControllerTest"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Plan ID는 계획 단계에서 확정.*

---

## Wave 0 Requirements

- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt` — REQ-auth-kakao-oauth
- [ ] `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` 확장(V4 컬럼/UNIQUE 제약 + 플레이스홀더 로우 보존 검증 테스트 추가) — REQ-auth-kakao-oauth
- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt` — REQ-auth-session-token
- [ ] `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt` — REQ-auth-session-token
- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt` — REQ-auth-session-token
- [ ] `MockRestServiceServer` 기반 카카오 API 모킹 헬퍼(공통 테스트 유틸) — 신규 작성 필요

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 카카오 개발자 콘솔 앱 등록(REST API 키, client_secret, redirect URI) | REQ-auth-kakao-oauth | 창업자 본인의 카카오 개발자 계정 접근이 필요 — 이 세션에서 확인 불가, 대체 경로 없음 | 계획 단계 첫 태스크로 명시. 창업자가 카카오 개발자 콘솔에서 앱 생성 후 REST API 키/시크릿/redirect URI를 확인해 환경변수로 제공 |
| 실제 카카오 계정으로 전체 OAuth 왕복 완주 | REQ-auth-kakao-oauth, REQ-auth-session-token | 실제 네트워크 호출 + 실제 카카오 계정 필요. 화면 전환/텍스트 렌더링/토큰 저장 배선은 시뮬레이터로 검증 가능하나, 카카오 서버와의 실제 왕복은 계획 단계에서 검증 주체(Claude 시뮬레이터 vs 창업자 실기기)를 확정할 것 | D-16 검증 화면에서 카카오 로그인 버튼 탭 → 카카오 인증 → 백엔드가 JWT 발급 → 클라이언트가 안전 저장 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
