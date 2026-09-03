---
phase: 10-authentication-kakao-oauth2-pkce
plan: 03
subsystem: auth
tags: [jwt, spring-security, nimbus, kotlin, spring-boot]

# Dependency graph
requires:
  - phase: 09-backend-foundation
    provides: Spring Boot/Kotlin 백엔드 스캐폴드, users 테이블(Flyway V1), Testcontainers 기반 통합 테스트 인프라, actuator 노출 잠금(T-9-02)
provides:
  - Spring Security 7 stateless SecurityFilterChain(permitAll: /actuator/**, /api/auth/**, /error)
  - JwtEncoder + access/refresh 전용 JwtDecoder 2종 빈(token_use 클레임 검증, @Primary로 자동주입 모호성 해소)
  - JwtIssuerService(issueAccessToken/issueRefreshToken/accessTokenTtlSeconds) — 10-04/10-05가 그대로 소비할 계약
affects: [10-04-kakao-login-service, 10-05-auth-endpoints, 10-07]

# Tech tracking
tech-stack:
  added:
    - spring-boot-starter-security
    - spring-boot-starter-security-oauth2-resource-server (전이적으로 spring-security-oauth2-jose, com.nimbusds:nimbus-jose-jwt 포함)
    - spring-boot-starter-restclient
    - spring-boot-starter-security-test / spring-boot-starter-security-oauth2-resource-server-test (테스트 스코프)
  patterns:
    - "HS256 대칭키 JWT 발급/검증은 NimbusJwtEncoder.withSecretKey(...)/NimbusJwtDecoder.withSecretKey(...) 빌더로만 구성한다 — NimbusJwtEncoder(JWKSource) 공개 생성자를 직접 쓰면 defaultJwsHeader가 RS256으로 고정돼 HS256 키를 못 찾는다"
    - "access/refresh 토큰 구분은 token_use 커스텀 클레임 + DelegatingOAuth2TokenValidator로 강제하고, 두 디코더 중 하나에 @Primary를 붙여 oauth2ResourceServer 자동주입 모호성을 해소한다"
    - "Spring Security에서 노출되지 않은 엔드포인트(404 기대)를 permitAll로 열어도, 서블릿 컨테이너의 내부 /error 디스패치가 같은 필터 체인을 재통과하므로 /error도 permitAll에 포함해야 401로 덮어써지지 않는다"

key-files:
  created:
    - backend/src/main/kotlin/com/footlog/backend/config/JwtConfig.kt
    - backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/JwtIssuerService.kt
    - backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt
  modified:
    - backend/build.gradle.kts
    - backend/src/main/resources/application.yml
    - backend/src/main/resources/application-staging.yml
    - backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt

key-decisions:
  - "jwt.secret 기본값을 공통 프로파일(application.yml)에 두고 staging만 기본값 없는 ${JWT_SECRET}으로 덮어씀 — 활성 프로파일 없이 도는 통합 테스트가 컨텍스트를 띄울 수 있게 하면서도 배포 환경 노출 경로는 차단(D-11 계승)"
  - "리프레시 토큰 회전/서버측 폐기 목록을 두지 않음(A8, D-01 계승) — 유출 시 30일 만료까지 무효화 불가, 후속 phase 인계 사항으로 JwtIssuerService.kt 파일 주석에 명시"

patterns-established:
  - "Pattern: JwtConfig의 두 JwtDecoder(access용 @Primary, refresh용 명명 빈)는 tokenUseValidator(expected) 헬퍼로 검증기 중복을 제거한다"

requirements-completed: [REQ-auth-session-token]

duration: 55min
completed: 2026-09-03
---

# Phase 10 Plan 03: Spring Security 7 + 자체 JWT 발급/검증 인프라 Summary

**HS256 access/refresh JWT를 NimbusJwtEncoder/Decoder 빌더로 발급·검증하는 stateless Spring Security 7 필터 체인, token_use 클레임으로 두 토큰의 상호 오용을 차단**

## Performance

- **Duration:** 약 55분
- **Tasks:** 3 (전부 완료)
- **Files modified/created:** 8 (신규 4, 수정 4)

## Accomplishments
- Spring Security 7 stateless `SecurityFilterChain` — CSRF 비활성(근거 주석 포함), `/actuator/**`·`/api/auth/**`·`/error` permitAll, 나머지 authenticated
- `JwtConfig`: `JwtEncoder` 1개 + `JwtDecoder` 2개(access 전용 `@Primary`, refresh 전용 명명 빈) — `token_use` 클레임 기반 `DelegatingOAuth2TokenValidator`로 상호 오용 차단
- `JwtIssuerService`: `issueAccessToken`(30분)/`issueRefreshToken`(30일)/`accessTokenTtlSeconds` — TTL은 전부 `application.yml`의 `jwt.*` 설정에서 파생, 리터럴 하드코딩 없음
- `JwtIssuerServiceTest` 9개 계약 테스트 전부 GREEN(RED→GREEN 로그는 아래 인용)
- Phase 9의 `HealthCheckSmokeTest`/`StagingProfileBootTest`/`FlywayMigrationTest`/`EntityPersistenceTest` 전부 Spring Security 도입 후에도 그린 유지 확인

## Task Commits

Each task was committed atomically:

1. **Task 1: 의존성 3종 + JWT 시크릿 환경변수 배선 + JwtConfig/SecurityConfig** - `a01e419` (feat)
2. **Task 2: JwtIssuerServiceTest 작성(RED)** - `9f23053` (test)
3. **Task 3: JwtIssuerService 구현(GREEN)** - `9f20b10` (feat)

_TDD 플랜(type: tdd) — RED(test) → GREEN(feat) 게이트 순서 확인됨. 이 실행은 worktree 병렬
executor로, 계획 메타데이터(STATE.md/ROADMAP.md) 커밋은 오케스트레이터가 wave 종료 후
일괄 수행하므로 여기서는 생성하지 않는다._

## Files Created/Modified
- `backend/build.gradle.kts` - security/oauth2-resource-server/restclient 스타터 3종(+테스트 대응 2종) 추가
- `backend/src/main/resources/application.yml` - `jwt.*` 공통 프로퍼티(issuer/TTL/기본값 있는 secret) 추가
- `backend/src/main/resources/application-staging.yml` - `jwt.secret: ${JWT_SECRET}`(기본값 없음) 추가
- `backend/src/main/kotlin/com/footlog/backend/config/JwtConfig.kt` - `JwtProperties` + `JwtEncoder`/`JwtDecoder`×2 빈
- `backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt` - stateless `SecurityFilterChain`
- `backend/src/test/kotlin/com/footlog/backend/StagingProfileBootTest.kt` - `JWT_SECRET` 동적 프로퍼티 등록 추가
- `backend/src/main/kotlin/com/footlog/backend/auth/JwtIssuerService.kt` - access/refresh 토큰 발급 구현
- `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt` - 발급 계약 9종 테스트

## RED 로그 인용 (Task 2)

```
JwtIssuerServiceTest > accessTokenTtlSeconds는 1800이다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:150
JwtIssuerServiceTest > 서로 다른 userId의 access 토큰은 서로 다르다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:119
JwtIssuerServiceTest > issueAccessToken의 TTL은 30분이다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:58
JwtIssuerServiceTest > refresh 토큰은 access 전용 디코더를 통과하지 못한다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:85
JwtIssuerServiceTest > refresh 토큰은 refreshTokenDecoder를 통과하고 subject가 동일하다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:108
JwtIssuerServiceTest > access 토큰은 refresh 전용 디코더를 통과하지 못한다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:96
JwtIssuerServiceTest > issueAccessToken이 발급한 토큰은 subject issuer token_use 클레임이 정확하다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:46
JwtIssuerServiceTest > issueRefreshToken은 token_use=refresh이고 TTL은 30일이다() FAILED
    kotlin.NotImplementedError at JwtIssuerServiceTest.kt:71

9 tests completed, 8 failed
```

실패 사유는 전부 `kotlin.NotImplementedError`(`TODO()`)이지 컴파일 에러가 아니다 — `JwtIssuerService`
골격이 시그니처만 갖춘 채 컴파일은 통과했고, 구현이 없어 단언 이전에 `TODO()`가 던져지는
정확한 RED 상태다. 9번째 테스트(만료 토큰 검증)는 `JwtIssuerService`에 의존하지 않고
`JwtConfig`가 만든 `jwtEncoder`/`jwtDecoder`만 직접 쓰므로 이미 통과했다(인프라는 Task 1에서
이미 GREEN).

## GREEN 로그 인용 (Task 3)

```
> Task :test
BUILD SUCCESSFUL in 10s
```

`build/test-results/test/TEST-com.footlog.backend.auth.JwtIssuerServiceTest.xml`:
`tests="9" skipped="0" failures="0" errors="0"`. 전체 스위트(`./gradlew build`)도
`BUILD SUCCESSFUL`로 확인(34개 테스트 전부 통과 — Phase 9 6개 테스트 클래스 25개 +
`JwtIssuerServiceTest` 9개).

## Decisions Made
- `jwt.secret` 기본값을 공통 프로파일에 두고 staging만 기본값 없는 `${JWT_SECRET}`으로 덮어씀 — 프로파일 없이 도는 기존 통합 테스트들이 컨텍스트를 계속 띄울 수 있으면서도, 실제 배포 환경에는 환경변수 미주입 시 기동 실패라는 D-11의 안전장치가 그대로 유지됨
- 리프레시 토큰 회전/폐기 목록 미도입(A8, D-01 계승) — `JwtIssuerService.kt` 파일 상단 주석에 트레이드오프를 명시해 10-05 threat register가 인계받도록 함

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - 버그] SecurityConfig의 `/error` permitAll 누락으로 actuator 404 회귀 게이트가 401로 깨짐**
- **Found during:** Task 1 verify(`./gradlew build`) — `HealthCheckSmokeTest`의 `/actuator/env`·`/actuator/beans` 404 단언 2건과 `StagingProfileBootTest`의 동일 단언 1건이 401로 실패
- **Issue:** 노출되지 않은 actuator 엔드포인트에 접근하면 DispatcherServlet이 404 렌더링을 위해 컨테이너 내부에서 `/error`로 ERROR 디스패치를 하는데, Spring Security가 이 내부 디스패치도 원 요청과 동일하게 필터 체인을 재통과시킨다. `/error`가 permitAll 목록에 없어 `anyRequest().authenticated()`에 걸리고, `ExceptionTranslationFilter`가 401(Bearer 챌린지)로 응답을 덮어써 원래 기대했던 404가 사라짐. `@EnableWebSecurity(debug = true)` + 임시 진단 테스트로 `WWW-Authenticate: Bearer ...` 챌린지를 직접 확인해 근본 원인을 특정(systematic-debugging 스킬 Phase 1~3 적용)
- **Fix:** `requestMatchers("/actuator/**", "/api/auth/**", "/error").permitAll()`로 `/error`를 permitAll에 추가. `/error` 자체는 별도 정보를 노출하지 않으므로(원래 상태 코드/에러 메시지만 전달) 안전
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/config/SecurityConfig.kt`
- **Verification:** `./gradlew build` 전체 스위트 그린(Phase 9의 3개 404 단언 포함)
- **Committed in:** `a01e419` (Task 1 커밋)

**2. [Rule 1 - 버그] `NimbusJwtEncoder(JWKSource)` 공개 생성자 사용 시 HS256 키를 못 찾아 모든 인코딩이 실패**
- **Found during:** Task 2 RED 확인 중 Test 8(만료 토큰을 `jwtEncoder`로 직접 인코딩)이 예상 밖의 `JwtEncodingException`으로 실패
- **Issue:** RESEARCH.md Pattern 4 스니펫대로 `NimbusJwtEncoder(ImmutableJWKSet(JWKSet(jwk)))` 생성자를 쓰면 `defaultJwsHeader`가 Nimbus 내부 상수인 RS256으로 고정된다. HS256 전용 대칭키만 있는 JWKSet에서 RS256 서명 키를 찾으려 하니 매 인코딩 호출이 "Failed to select a JWK signing key"로 실패
- **Fix:** `NimbusJwtEncoder.withSecretKey(secretKey).algorithm(MacAlgorithm.HS256).build()` 빌더로 교체 — 이 빌더는 내부적으로 JWK의 실제 알고리즘을 기본 헤더에 반영한다
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/config/JwtConfig.kt`
- **Verification:** RED 재확인(`./gradlew test --tests "*JwtIssuerServiceTest"`) — Test 8이 의도대로 `JwtValidationException`으로 통과, 나머지 8개는 `NotImplementedError`로 RED 유지
- **Committed in:** `9f23053` (Task 2 커밋)

**3. [Rule 1 - 버그] 테스트 코드가 `jwt.issuer`(URL 강제 변환)를 잘못 사용**
- **Found during:** Task 3 GREEN 확인 — Test 1이 `IllegalArgumentException: Unable to convert claim 'iss' ... to URL`로 실패
- **Issue:** `org.springframework.security.oauth2.jwt.JwtClaimAccessor.getIssuer()`는 `iss` 클레임을 항상 URL로 변환하려 시도한다. `issuer = "footlog-backend"`는 유효한 URL이 아니므로 예외가 발생 — 구현(`JwtIssuerService`)이 아니라 테스트 자체의 API 오용
- **Fix:** `jwt.issuer.toString()` 대신 `jwt.getClaimAsString("iss")`로 원본 문자열 클레임을 그대로 비교하도록 테스트 수정
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt`
- **Verification:** `./gradlew test --tests "*JwtIssuerServiceTest"` 9/9 GREEN, `./gradlew build` 전체 그린
- **Committed in:** `9f20b10` (Task 3 커밋)

---

**Total deviations:** 3 auto-fixed (전부 Rule 1 — 버그 수정)
**Impact on plan:** 3건 모두 정확성/회귀 게이트 유지에 필수적이었고 스코프 확장은 없음. 1번은 Phase 9가 확립한 T-9-02 회귀 게이트를 그대로 지키기 위한 수정, 2번은 계획 문서 스니펫을 그대로 옮기면 재현되는 Nimbus API 함정 수정, 3번은 테스트 코드 자체의 API 오용 수정.

## Issues Encountered
없음 — 위 "Deviations from Plan"의 3건이 전부이며, 모두 즉시 원인을 특정해 해결함.

## User Setup Required

None - 이 플랜의 검증(`./gradlew build`, `./gradlew test`)은 실제 `.env`/`JWT_SECRET` 배포값
없이 전부 통과한다. `StagingProfileBootTest`는 `@DynamicPropertySource`로 테스트 전용
`JWT_SECRET`을 등록해 staging의 "기본값 없음" 제약을 검증만 하고, 실제 시크릿 생성은
10-01의 `.env.example`/창업자 확인 절차에 속한다(별도 pending 항목, 이 플랜의 스코프 밖).

## Next Phase Readiness
- 10-04(KakaoAuthService)와 10-05(AuthController)가 소비할 `JwtIssuerService` 계약
  (`issueAccessToken`/`issueRefreshToken`/`accessTokenTtlSeconds`)과 `JwtConfig`의 디코더 2종
  (access `@Primary` / `refreshTokenDecoder`)이 모두 준비됨
- `SecurityConfig`의 `/api/auth/**` permitAll이 이미 열려 있어 10-05가 로그인/리프레시
  엔드포인트를 추가하는 데 별도 Security 설정 변경이 필요 없음
- Blocker 없음. A8(리프레시 토큰 회전/폐기 없음)은 의도된 트레이드오프로 10-05의
  threat register가 인계받아야 함(위 Decisions Made 참고)

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*

## Self-Check: PASSED

모든 생성/수정 파일(9개)과 3개 태스크 커밋 해시(`a01e419`, `9f23053`, `9f20b10`)를
확인함 — 전부 FOUND.
