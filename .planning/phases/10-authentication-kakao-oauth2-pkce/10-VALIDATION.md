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
| 10-01-XX | 01 | 1 | REQ-auth-kakao-oauth | — | 카카오 콘솔 앱 키/시크릿이 env var로만 존재(D-11 계승) | checkpoint | N/A(창업자 확인) | ❌ W0 | ⬜ pending |
| 10-02-XX | 02 | 1 | REQ-auth-kakao-oauth | — | V4 마이그레이션 nullable+UNIQUE, 플레이스홀더 로우 보존 | integration | `./gradlew test --tests "*FlywayMigrationTest"` | ❌ W0 | ⬜ pending |
| 10-03-XX | 03 | 1 | REQ-auth-session-token | T-10-25 | access/refresh JWT 발급, token_use 클레임 구분(2개 디코더) | unit/integration | `./gradlew test --tests "*JwtIssuerServiceTest"` | ❌ W0 | ⬜ pending |
| 10-04-XX | 04 | 2 | REQ-auth-kakao-oauth | T-10-15 | `/v2/user/me` 조회(client_secret/code_verifier 사용 안 함), find-or-create, JWT 발급 | integration | `./gradlew test --tests "*KakaoAuthServiceTest"` | ❌ W0 | ⬜ pending |
| 10-06-XX | 06 | 2 | REQ-auth-session-token | — | SecureStore 토큰 보관, 만료 임박 선제 갱신, authorizedFetch | unit | `npm test -- --testPathPattern=auth` | ❌ W0 | ⬜ pending |
| 10-05-XX | 05 | 3 | REQ-auth-kakao-oauth, REQ-auth-session-token | T-10-01(actuator permitAll 유지) | 두 엔드포인트 계약, 보호된 엔드포인트 401, refresh는 token_use 검증 | integration | `./gradlew test --tests "*AuthControllerTest" --tests "*SecurityConfigTest"` | ❌ W0 | ⬜ pending |
| 10-07-XX | 07 | 4 | REQ-auth-kakao-oauth, REQ-auth-session-token | — | 개발자 검증 화면, 실기기 카카오 왕복 확인 | manual + simulator | 시뮬레이터 화면 전환/배선 확인 + 실기기 카카오 계정 로그인(창업자) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task ID 접미사(`-XX`)는 실행 단계에서 실제 태스크 번호로 확정.*

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
| ✅ 완료(2026-09-03) 카카오 개발자 콘솔 앱 등록(네이티브 앱 키만 발급 — REST API 키/client_secret은 D-14 AMENDMENT 이후 백엔드 코드 경로에서 불필요해 발급하지 않음) | REQ-auth-kakao-oauth | 창업자 본인의 카카오 개발자 계정 접근이 필요 — 이 세션에서 확인 불가, 대체 경로 없음 | 10-01-PLAN.md Task 1 체크포인트로 수행 완료. 창업자가 `FootLog` 앱 생성, iOS 플랫폼 등록(번들 ID `com.jaeseungchoun.footlog`), 카카오 로그인 활성화, 동의항목(닉네임/프로필 사진만, 카카오계정(이메일)은 설정 안 함 — D-05/D-07)까지 마친 뒤 로컬 `.env`(git-ignored)에 `KAKAO_NATIVE_APP_KEY`/`JWT_SECRET`/`EXPO_PUBLIC_API_BASE_URL` 3개 값을 채움. 값 존재/길이만 자동 검증(`ENV_CONTRACT_OK`), 실제 값은 어떤 문서에도 인용하지 않음 |
| 실제 카카오 계정으로 전체 OAuth 왕복 완주 | REQ-auth-kakao-oauth, REQ-auth-session-token | 실제 네트워크 호출 + 실제 카카오 계정 필요. 화면 전환/텍스트 렌더링/토큰 저장 배선은 시뮬레이터로 검증 가능하나, 카카오 서버와의 실제 왕복은 실기기(카카오톡 앱 전환 필요)가 요구됨 — 10-07-PLAN.md에서 검증 주체를 확정(시뮬레이터: 화면/배선, 실기기: 창업자 본인) | D-16 검증 화면에서 카카오 로그인 버튼 탭 → 카카오 SDK가 accessToken 반환 → 백엔드가 `/v2/user/me`로 JWT 발급 → 클라이언트가 안전 저장 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
