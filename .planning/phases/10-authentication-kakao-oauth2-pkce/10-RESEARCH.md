# Phase 10: Authentication (Kakao OAuth2/PKCE) - Research

**Researched:** 2026-09-03
**Domain:** 카카오 OAuth2/PKCE 인가 코드 교환, Spring Security 7(Boot 4.1.1) 기반 자체 JWT 발급/검증, Flyway V4 스키마 확장
**Confidence:** HIGH (Kakao 엔드포인트 계약은 OIDC discovery 문서 실측 + 공식 REST API 문서로 교차검증, Spring Security/Boot 스택은 start.spring.io 생성 + `./gradlew dependencies` 실측으로 검증) / MEDIUM (클라이언트 네이티브 SDK 동작 방식 — README 기반, 실제 SDK 실행 검증은 안 함)

> ## ⚠️ AMENDMENT (2026-09-02, 계획 단계에서 반영) — 이 문서 작성 직후 D-14가 수정됨
>
> 이 문서는 D-14 원안("클라이언트는 인가 코드+PKCE `code_verifier`만 백엔드로 전달, 백엔드가
> 카카오와 토큰 교환")을 전제로 작성됐다. 아래 Open Questions #1이 최우선으로 지적한 대로,
> 계획 단계에서 `@react-native-seoul/kakao-login` v6.0.4를 실제로 설치해 타입 정의를 확인한
> 결과 `login()`/`loginWithKakaoAccount()`는 인가 코드가 아니라 카카오 `accessToken`을 포함한
> `KakaoOAuthToken` 전체를 JS로 직접 반환하며, 인가 코드만 받는 저수준 API는 존재하지 않음이
> 확인됐다(10-CONTEXT.md D-14 수정 이력 참고).
>
> **결과적으로 D-14가 수정됨:** 클라이언트는 SDK가 반환한 카카오 `accessToken`을 백엔드로
> 전달하고, 백엔드는 그 토큰으로 `GET /v2/user/me`만 호출한다(저장하지 않고 폐기). **카카오
> `POST /oauth/token` 교환 자체가 이번 phase의 백엔드 코드 경로에서 완전히 사라진다** —
> `client_secret`도, PKCE `code_verifier`도 이 경로에서 쓰이지 않는다.
>
> **아래 섹션 중 이 변경의 영향을 받는 것:**
> - `## Architecture Patterns`의 System Architecture Diagram, Recommended Project
>   Structure, **Pattern 1은 전부 원안 기준이라 무효** — 이 AMENDMENT 바로 아래 정정된
>   버전을 대신 참고할 것(원문은 감사 기록으로 남겨둠, 코드 작성 시 참고 금지).
> - Pattern 2, Pattern 3(V4 마이그레이션), Pattern 4/5, JWT 발급/검증 관련 내용은 **영향
>   없음** — 그대로 유효.
> - Pitfall 4(`client_secret` 필수 quirk)는 카카오 API에 대한 사실로서는 여전히 정확하지만,
>   **이번 phase의 실제 구현에는 적용되지 않는다**(회피가 아니라 애초에 그 API를 호출하지
>   않으므로). 감사 기록으로 남겨두되 실행 태스크에 반영하지 말 것.
> - `KakaoLoginRequest`는 `{ code, codeVerifier, redirectUri }`가 아니라
>   `{ kakaoAccessToken }` 단일 필드다.
>
> 상세 근거는 10-PATTERNS.md(패턴 매핑 단계에서 이 불일치를 처음 발견하고 정리함) 및
> 10-CONTEXT.md D-14 항목 참고.

## Summary

이 phase는 두 개의 서로 다른 계약을 연결하는 다리를 놓는 작업이다: (1) 카카오의 OAuth2/OIDC
서버가 실제로 무엇을 요구·반환하는지, (2) Spring Boot 4.1.1/Spring Security 7 생태계가 "자체
JWT를 발급하고 검증하는" 문제를 어떤 표준 모듈로 푸는지. 두 계약 모두 이번 조사에서 직접
검증했다 — 카카오 쪽은 `https://kauth.kakao.com/.well-known/openid-configuration`(공식 OIDC
discovery 문서)를 실제로 fetch해 `code_challenge_methods_supported: ["S256"]`(PKCE 지원)과
`token_endpoint_auth_methods_supported: ["client_secret_post"]`(PKCE를 쓰든 안 쓰든
`client_secret`이 항상 필요함 — 표준 공개 클라이언트 PKCE와 다른 카카오 고유의 quirk)를
확인했다. Spring 쪽은 Phase 9와 동일한 방법론(`start.spring.io`로 실제 프로젝트 생성 +
`./gradlew dependencies`로 Maven Central 해석 결과 실측)으로 `spring-boot-starter-security-
oauth2-resource-server`가 `spring-security-oauth2-jose:7.1.1`(`NimbusJwtEncoder`/
`NimbusJwtDecoder` 포함)과 `com.nimbusds:nimbus-jose-jwt:10.9.1`을 함께 끌어옴을 확인했다 —
즉 **별도의 서드파티 JWT 라이브러리(`io.jsonwebtoken:jjwt`) 없이 Spring Security 표준 모듈만으로
자체 JWT 발급·검증이 가능**하다. 이는 우연이 아니라 필요한 선택이기도 하다: `jjwt`의 Jackson
직렬화 모듈(`jjwt-jackson`)은 아직 Jackson 3(Boot4의 기본 JSON 엔진, 09-RESEARCH.md 확인)을
지원하지 않는다(`[CITED]`, State of the Art 참고) — `jjwt`를 썼다면 Jackson 2/3 공존이라는
불필요한 복잡도가 추가됐을 것이다.

가장 중요한 발견은 **client_secret 발견보다 더 상위의 아키텍처 리스크**다: D-13이 지정한
`@react-native-seoul/kakao-login`(현재는 `crossplatformkorea/react-native-kakao-login` 포크로
이전, npm 최신 버전 6.0.4, 2026-08-05 배포)의 `login()`/`loginWithKakaoAccount()` 편의
메서드는 카카오 인가 코드↔토큰 교환을 **SDK 내부에서 전부 완료하고 카카오 액세스 토큰을 JS
레이어에 직접 반환**한다(`KakaoOAuthToken { accessToken, refreshToken?, idToken?, ... }`) —
"클라이언트는 인가 코드 + PKCE code_verifier만 백엔드로 전달한다"는 D-14의 전제와 정면으로
충돌한다. D-13(카카오톡 앱 전환 자동 처리를 위한 네이티브 SDK 채택)과 D-14(카카오 액세스
토큰이 클라이언트에 노출되지 않아야 함)를 문자 그대로 동시에 만족시키려면, 이 SDK의 편의
로그인 메서드를 쓰지 않고 `expo-auth-session`(Expo 공식, PKCE 내장 지원) 등으로
`https://kauth.kakao.com/oauth/authorize`를 직접 구동해 인가 코드만 캡처하는 수동 구현이
필요하며, 그 경우 카카오톡 앱 전환 자동 처리(D-13의 채택 근거)는 사라진다. 이 phase는 **백엔드
연구**가 스코프이므로 백엔드 엔드포인트는 D-14 계약(코드+code_verifier를 받아 서버가 교환)
그대로 설계하되, 이 클라이언트 측 긴장은 Open Questions에 최우선 순위로 플래그해 계획 단계에서
검증 화면(D-16) 구현 방식을 결정할 때 반드시 인지해야 한다.

**Primary recommendation(AMENDMENT 반영):** 백엔드는 `spring-boot-starter-security` +
`spring-boot-starter-security-oauth2-resource-server` + `spring-boot-starter-restclient`
(카카오 사용자정보 엔드포인트 호출용 `RestClient`) 3개 스타터만 추가하고, 자체 JWT는
`NimbusJwtEncoder`(발급)/`NimbusJwtDecoder`(검증)로 HMAC(HS256, env var 시크릿) 서명한다.
`POST /api/auth/kakao/login`(공개, 클라이언트가 SDK로부터 받은 카카오 accessToken→
`/v2/user/me`→find-or-create→자체 JWT 발급)과 `POST /api/auth/refresh`(공개, refresh JWT 검증→새 access
JWT 발급) 2개 엔드포인트만 이번 phase에 필요하며, 그 외 모든 `/api/**`는
`oauth2ResourceServer(jwt)`로 보호한다. `users` 테이블은 V4 마이그레이션으로 `kakao_id
BIGINT`(카카오 회원번호는 Int 오버플로 사고가 실제 보고된 Long 타입, `checkins`/
`daily_reflections`처럼 length-bound `VARCHAR`가 아니라 `TEXT`로 nickname/
profile_image_url을 저장), `nickname`, `profile_image_url` 3개 컬럼을 nullable로 추가하고
`kakao_id`에만 UNIQUE 제약을 건다(D-08/D-11, Postgres는 NULL을 UNIQUE 위반으로 취급하지
않으므로 플레이스홀더 로우와 공존 가능).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**세션/토큰 정책**
- D-01: 토큰 형식은 JWT(stateless) — Redis/세션 스토어 인프라 추가 없이 Spring Security로 바로
  검증 가능.
- D-02: Access + Refresh 이중 토큰 구조.
- D-03: TTL은 access 15분~1시간 / refresh 30일.
- D-04: 클라이언트는 만료 임박 선제 갱신(proactive refresh).

**카카오 프로필 저장 범위**
- D-05: users 테이블에 저장할 프로필 필드는 `kakao_id` + `nickname` + `profile_image_url`.
  이메일은 저장하지 않음.
- D-06: 닉네임/프로필사진은 매 로그인 시 카카오 최신값으로 갱신.
- D-07: 카카오 이메일 제공에 동의하지 않은 사용자도 로그인 허용.
- D-08: `kakao_id` 컬럼에 UNIQUE 제약.

**플레이스홀더 사용자 전환**
- D-09: 플레이스홀더 사용자 로우는 실데이터가 전혀 없는 테스트/스캐폴딩 fixture.
- D-10: 플레이스홀더 로우는 그대로 두고 테스트 전용으로 유지.
- D-11: V4 마이그레이션의 신규 컬럼은 NULL 허용(nullable), UNIQUE 제약은 실사용자 로우에만
  적용.
- D-12: 창업자 본인이 카카오로 로그인하면 새 UUID로 새 계정이 생성돼 로우 2개가 남아도 문제없음.

**클라이언트 로그인 트리거 방식**
- D-13: 카카오 공식 네이티브 SDK(`@react-native-seoul/kakao-login` 계열)를 쓴다.
- D-14: 인가 코드↔토큰 교환은 백엔드가 처리 — 클라이언트는 카카오 인가 코드 + PKCE
  `code_verifier`만 백엔드로 전달.
- D-15: 로그인 실패/취소 시 에러 메시지 + 재시도 버튼.
- D-16: 로그인 화면은 Phase 10 백엔드 검증용으로만 존재 — 1단계 앱 UI에는 통합하지 않음.

### Claude's Discretion

- 로그인 검증 메커니즘의 정확한 형태(테스트용 최소 화면 vs 순수 백엔드 통합 테스트 vs 둘 다).
- `backend/` 패키지 구조 내부 클래스 분할(컨트롤러/서비스/DTO 경계).
- 카카오 SDK의 정확한 버전/네이티브 설정(Config Plugin 여부 등).
- V4 마이그레이션의 정확한 컬럼 타입/길이.

### Deferred Ideas (OUT OF SCOPE)

None — 10-CONTEXT.md 논의는 phase 스코프 안에 머물렀다. 로그아웃/카카오 연결끊기(unlink),
계정 탈퇴, 1단계 UI 통합은 명시적으로 이 phase가 만들지 않는 것으로 확정됐다.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-auth-kakao-oauth | 사용자가 카카오 로그인 화면에서 OAuth2/PKCE 플로우를 완료하면 서버가 사용자 계정을 생성/조회한다 | `## Standard Stack`(카카오 사용자정보 엔드포인트 계약, RestClient) + `## Architecture Patterns`(AMENDMENT 반영 diagram/구조) Pattern 2~3(사용자정보 조회, find-or-create, V4 마이그레이션) + `## Common Pitfalls`(kakao_id Long) |
| REQ-auth-session-token | 서버가 인증 토큰을 발급하고, 클라이언트는 안전하게 저장·만료 시 갱신·재사용한다 | `## Architecture Patterns` Pattern 4~5(NimbusJwtEncoder/Decoder, access/refresh 구분 claim, 리프레시 엔드포인트) + `## Don't Hand-Roll`(JWT 서명/검증 자체 구현 금지) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 카카오 로그인(액세스 토큰 획득) | Browser/Client | — | 네이티브 SDK가 기기 내에서 인가+토큰 교환까지 전부 처리, 서버는 관여하지 않음(D-13, ⚠️ AMENDMENT — D-14 수정으로 인가 코드↔토큰 교환은 서버 책임에서 완전히 제외됨) |
| 카카오 사용자 정보 조회(`/v2/user/me`) | API/Backend | 외부 서비스(카카오) | 백엔드가 클라이언트로부터 전달받은 카카오 액세스 토큰으로 즉시 호출, 토큰 자체는 저장하지 않고 폐기(D-14 AMENDMENT) |
| 사용자 계정 find-or-create(kakao_id 매칭) | API/Backend | Database/Storage | 리포지토리 계층이 UNIQUE(kakao_id) 제약에 기대어 조회/생성 분기 |
| 자체 JWT 발급(access+refresh) | API/Backend | — | `NimbusJwtEncoder`가 프로세스 내에서 서명, 외부 IdP 위임 없음(D-01 stateless 원칙) |
| 자체 JWT 검증(보호된 엔드포인트) | API/Backend | — | Spring Security `oauth2ResourceServer(jwt)` 필터 체인이 모든 요청에서 검증 |
| 토큰 안전 저장·선제 갱신 | Browser/Client | — | D-04, 이번 phase 산출물이 아니라 클라이언트 구현 지침으로만 존재(SecureStore 등) |
| `users` 스키마 확장 | Database/Storage | API/Backend | Flyway V4가 스키마 소유, JPA는 `ddl-auto=validate`로 검증만(09-RESEARCH.md 패턴 계승) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `spring-boot-starter-security` | Boot 4.1.1 BOM (Spring Security **7.1.1**) | 인증/인가 프레임워크 진입점 | Spring 생태계 표준. Boot 4.1.1과 짝을 이루는 버전은 Security 7.1.1 `[VERIFIED: ./gradlew dependencies 직접 실행]` |
| `spring-boot-starter-security-oauth2-resource-server` | Boot 4.1.1 BOM | JWT 검증 필터 체인 + `NimbusJwtEncoder`/`NimbusJwtDecoder`(JOSE 모듈 포함) | 이 스타터 하나가 `spring-security-oauth2-jose:7.1.1`과 `com.nimbusds:nimbus-jose-jwt:10.9.1`을 함께 가져온다 — 자체 JWT 발급·검증에 별도 서드파티 라이브러리가 불필요해짐 `[VERIFIED: ./gradlew dependencies 실측]`. **주의: Boot4의 스타터 아티팩트명은 `spring-boot-starter-oauth2-resource-server`가 아니라 `spring-boot-starter-security-oauth2-resource-server`다**(start.spring.io가 실제로 생성한 이름, Boot3와 다름) |
| `spring-boot-starter-restclient` | Boot 4.1.1 BOM | `RestClient.Builder` 자동설정 — 카카오 토큰/사용자정보 엔드포인트 호출 | Boot 4.1부터 REST 클라이언트 지원이 별도 모듈로 분리됐다(09-05 실행 중 이미 발견된 패턴, `backend/build.gradle.kts`의 `spring-boot-starter-restclient-test` 주석 참고) — main 스코프에도 동일 모듈이 필요하다 `[VERIFIED: start.spring.io 생성 + ./gradlew dependencies]` |
| `com.nimbusds:nimbus-jose-jwt` | **10.9.1** (전이 의존성) | JWS 서명/검증 엔진(`NimbusJwtEncoder`/`NimbusJwtDecoder`가 내부적으로 사용) | 별도로 `implementation`에 추가할 필요 없음 — resource-server 스타터가 전이적으로 가져옴 `[VERIFIED]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `spring-boot-starter-security-test` / `spring-boot-starter-security-oauth2-resource-server-test` | Boot 4.1.1 BOM | `@WithMockUser`, `SecurityMockMvcRequestPostProcessors.jwt()` 등 테스트 유틸 | 보호된 엔드포인트 통합 테스트, 로그인/리프레시 엔드포인트가 JWT 발급을 정확히 수행하는지 검증 |
| `spring-boot-starter-restclient-test` | Boot 4.1.1 BOM | `MockRestServiceServer` | 카카오 토큰/사용자정보 API 호출을 모킹해 실제 카카오 서버 없이 단위/통합 테스트 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `NimbusJwtEncoder`/`NimbusJwtDecoder`(Spring Security 표준) | `io.jsonwebtoken:jjwt` | jjwt는 더 간결한 API를 제공하지만, 현재(2026-09) `jjwt-jackson` 모듈이 Jackson 3을 지원하지 않아 `jjwt-gson`으로 우회하거나 Jackson 2/3를 공존시켜야 하는 불필요한 복잡도가 생긴다(State of the Art 참고). Spring Security 표준 모듈은 이미 의존성 트리에 있어 추가 비용이 0이다 |
| Spring Security `spring-boot-starter-oauth2-client`(OAuth2 로그인 클라이언트 모듈) | 이번 phase에서 채택 안 함 | 이 모듈은 Spring 자신이 브라우저 리다이렉트(`/oauth2/authorization/{id}`, `/login/oauth2/code/{id}`)를 관장하는 시나리오용이다. D-14는 "클라이언트(모바일 SDK)가 이미 인가 코드를 받아 백엔드로 전달"하는 구조라 이 모듈의 전제(Spring이 인가 요청 자체를 생성)와 맞지 않는다 — 커스텀 `RestClient` 호출로 직접 토큰 엔드포인트를 치는 편이 이 아키텍처에 더 적합하다 |
| HMAC(HS256, 대칭키) 서명 | RSA/EC(비대칭키) 서명 | 이 프로젝트는 access/refresh 토큰을 발급하는 주체와 검증하는 주체가 동일한 단일 백엔드 프로세스이므로(외부 서비스가 토큰을 검증할 필요 없음) 비대칭키의 이점(공개키만 배포)이 없다. HMAC이 키 관리가 더 단순하다 |

**Installation:**
```kotlin
// backend/build.gradle.kts에 추가 (기존 09-01 스캐폴딩 위에 증분)
implementation("org.springframework.boot:spring-boot-starter-security")
implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
implementation("org.springframework.boot:spring-boot-starter-restclient")

testImplementation("org.springframework.boot:spring-boot-starter-security-test")
testImplementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server-test")
testImplementation("org.springframework.boot:spring-boot-starter-restclient-test")
```

**Version verification (이 조사에서 실제로 수행함):**
```bash
curl -s "https://start.spring.io/starter.zip?type=gradle-project-kotlin&language=kotlin&bootVersion=4.1.1&dependencies=web,security,oauth2-resource-server,validation,spring-restclient&javaVersion=21" -o auth.zip
unzip auth.zip && cd <project> && ./gradlew dependencies --configuration runtimeClasspath | grep -Ei "nimbus|spring-security|restclient"
```
실측 결과(2026-09-03):
```
org.springframework.security:spring-security-core:7.1.1
org.springframework.security:spring-security-oauth2-core:7.1.1
org.springframework.security:spring-security-oauth2-jose:7.1.1
org.springframework.security:spring-security-oauth2-resource-server:7.1.1
org.springframework.security:spring-security-web:7.1.1
org.springframework.security:spring-security-config:7.1.1
org.springframework.security:spring-security-crypto:7.1.1
com.nimbusds:nimbus-jose-jwt:10.9.1
org.springframework.boot:spring-boot-starter-restclient (spring-web:7.0.9 기반 RestClient.Builder 자동설정)
```

## Package Legitimacy Audit

> 백엔드 신규 의존성은 전부 **JVM/Maven Central 생태계**다 — Phase 9와 동일한 이유로
> `slopcheck`/`npm view` 절차 대신 `start.spring.io`(공식 Spring 팀 큐레이션 카탈로그) 생성
> + `./gradlew dependencies`(Maven Central 실제 해석) 이중 검증을 사용했다. 이 경로는 위
> Standard Stack 표에 이미 반영됨.

| Package | Registry | Verification Method | Disposition |
|---------|----------|---------------------|-------------|
| `org.springframework.boot:spring-boot-starter-security` | Maven Central | start.spring.io 생성 + gradlew dependencies | Approved `[VERIFIED]` |
| `org.springframework.boot:spring-boot-starter-security-oauth2-resource-server` | Maven Central | 동일 | Approved `[VERIFIED]` |
| `org.springframework.boot:spring-boot-starter-restclient` | Maven Central | 동일 | Approved `[VERIFIED]` |
| `com.nimbusds:nimbus-jose-jwt` | Maven Central | 동일(전이 의존성) | Approved `[VERIFIED]` |

**클라이언트 측(참고용, 이 phase의 1차 스코프는 백엔드지만 D-16 검증 화면 구현에 필요) —
Node/npm 생태계이므로 slopcheck 적용:**

| Package | Registry | Age/Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-----------|-------------|
| `@react-native-seoul/kakao-login` | npm | v6.0.4, 2026-08-05 배포(최근 유지보수 중) | `github.com/crossplatformkorea/react-native-kakao-login` | `[OK]` | Approved `[VERIFIED: npm registry + slopcheck]` — 단, 아키텍처적으로 D-14와 충돌하는 동작 방식은 별도로 Open Questions #1에서 다룸 |

**Packages removed due to slopcheck `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** none

## Architecture Patterns

### System Architecture Diagram (AMENDMENT 반영 — 정정된 버전)

```
[Expo 클라이언트 — D-16 백엔드 검증용 로그인 화면]
  네이티브 카카오 SDK(D-13)의 login()/loginWithKakaoAccount() 호출
        │
        ▼ SDK가 카카오 accessToken을 JS로 직접 반환(KakaoOAuthToken)
        ▼
POST /api/auth/kakao/login  { kakaoAccessToken }
[Spring Security 필터 체인 — 이 엔드포인트는 permitAll]
        │
        ▼
[AuthController → KakaoAuthService]
        │
        ├─▶ RestClient GET https://kapi.kakao.com/v2/user/me
        │     (Authorization: Bearer <kakaoAccessToken>)
        │       ◀── { id, kakao_account.profile.{nickname,profile_image_url} }
        │       (카카오 토큰은 여기서 폐기 — DB에 저장하지 않음, D-14)
        │
        ▼
[UserRepository.findByKakaoId(id) 조회]
        │
        ├─ 있으면: nickname/profile_image_url을 최신값으로 갱신(D-06)
        └─ 없으면: 새 User(kakao_id, nickname, profile_image_url) 생성(D-08 UNIQUE 보장)
        │
        ▼
[JwtIssuerService: NimbusJwtEncoder]
        │  access JWT(15분~1시간, claim: token_use=access)
        │  refresh JWT(30일, claim: token_use=refresh)
        ▼
응답: { accessToken, refreshToken, expiresIn }
        │
        ▼
[클라이언트가 안전 저장(SecureStore) — 만료 임박 시 아래 경로로 선제 갱신(D-04)]

──────────────────────────────────────────────────────────────

POST /api/auth/refresh  { refreshToken }
[permitAll — 단, 내부에서 NimbusJwtDecoder로 수동 검증 + token_use=refresh 클레임 확인]
        │
        ▼
[JwtIssuerService: 새 access JWT 발급, refresh는 재발급하지 않음(회전 없음, Claude's Discretion)]
        │
        ▼
응답: { accessToken, expiresIn }

──────────────────────────────────────────────────────────────

GET /api/** (미래 phase가 추가할 보호된 엔드포인트)
[Spring Security oauth2ResourceServer(jwt) 필터]
        │  Authorization: Bearer <access JWT>
        │  NimbusJwtDecoder로 서명 검증 + exp 검증 +
        │  커스텀 OAuth2TokenValidator로 token_use=access 강제
        │  (token_use=refresh인 토큰은 여기서 401 — 리프레시 토큰으로 보호된 API를 못 침)
        ▼
[SecurityContext에 인증된 사용자(kakao_id 또는 내부 UUID) 주입]
```

### Recommended Project Structure (AMENDMENT 반영 — 정정된 버전)

```
backend/src/main/kotlin/com/footlog/backend/
├── auth/                              # 신규 도메인 패키지(09-RESEARCH.md 도메인별 패키징 관례 계승)
│   ├── AuthController.kt              # POST /api/auth/kakao/login, POST /api/auth/refresh
│   ├── KakaoAuthService.kt            # 카카오 사용자정보 조회 + find-or-create
│   ├── KakaoUserInfoClient.kt         # RestClient 래퍼(kapi.kakao.com/v2/user/me 전용,
│   │                                   # Pattern 2 그대로) — Pattern 1의 KakaoTokenClient는
│   │                                   # 더 이상 필요 없음(토큰 교환 자체가 없어짐)
│   ├── KakaoUserInfoResponse.kt       # 카카오 /v2/user/me 응답 DTO(Pattern 2, 변경 없음)
│   ├── JwtIssuerService.kt            # NimbusJwtEncoder 래퍼 — access/refresh 발급
│   ├── KakaoLoginRequest.kt           # { kakaoAccessToken } 요청 DTO(단일 필드)
│   └── TokenResponse.kt               # { accessToken, refreshToken?, expiresIn } 응답 DTO
├── config/
│   └── SecurityConfig.kt              # SecurityFilterChain(Lambda DSL 필수, Pitfall 참고),
│                                       # JwtDecoder/JwtEncoder Bean 정의
└── user/                              # 09-01이 만든 기존 패키지 — 이번 phase가 확장
    └── User.kt                        # kakaoId/nickname/profileImageUrl 필드 추가
```

### Pattern 1 — 삭제됨(AMENDMENT)

원안의 "카카오 토큰 교환 RestClient" 패턴(`KakaoTokenClient`, `POST /oauth/token` 호출,
`client_secret` 폼 파라미터)은 D-14 수정으로 이번 phase의 백엔드 코드 경로에서 완전히
불필요해졌다 — 클라이언트가 이미 카카오 accessToken을 갖고 있으므로 백엔드는 그 토큰 교환
단계 자체를 건너뛴다. 아래 Pattern 2(사용자정보 조회)만 그대로 쓰면 된다. 원본 코드는
Pitfall 4 근처에 감사 기록으로만 남겨둠 — 실행 태스크에서 참고하지 말 것.

### Pattern 2: 카카오 사용자정보 조회 — email 미동의도 허용(D-07)

```kotlin
// Source: https://developers.kakao.com/docs/ko/kakaologin/rest-api (CITED, GET /v2/user/me
// 응답 구조 실측). D-05(이메일 미저장)/D-07(이메일 미동의자도 로그인 허용)에 따라
// kakao_account.email 필드는 애초에 파싱하지 않는다 — 존재하든 안 하든 무시.
fun fetchUserInfo(kakaoAccessToken: String): KakaoUserInfoResponse {
    return restClient.get()
        .uri("https://kapi.kakao.com/v2/user/me")
        .header(HttpHeaders.AUTHORIZATION, "Bearer $kakaoAccessToken")
        .retrieve()
        .body(KakaoUserInfoResponse::class.java)
        ?: throw KakaoAuthException("카카오 사용자정보 응답이 비어있음")
}

// 응답 DTO — kakao_id는 반드시 Long(Pitfall 참고), email 필드는 매핑하지 않음(D-05/D-07)
data class KakaoUserInfoResponse(
    val id: Long,
    @JsonProperty("kakao_account") val kakaoAccount: KakaoAccount,
) {
    data class KakaoAccount(val profile: Profile?) {
        data class Profile(
            val nickname: String?,
            @JsonProperty("profile_image_url") val profileImageUrl: String?,
        )
    }
}
```

카카오 앱 콘솔의 "카카오 로그인 > 동의항목" 설정에서 이메일 항목을 **선택 동의(또는 미설정)**로
두면, `/oauth/authorize` 요청에 `scope=profile_nickname,profile_image`만 지정해 애초에
이메일 동의를 요청하지 않을 수 있다 — D-07("이메일 동의 안 해도 로그인 허용")을 UX 차원에서
가장 깔끔하게 만족시키는 방법. `[ASSUMED]` — 카카오 콘솔 설정 화면 자체는 실제로 열어보지
않고 공식 문서 서술에 근거한 추정(A6, Assumptions Log 참고).

### Pattern 3: Flyway V4 — users 테이블 확장(NULL 허용 + UNIQUE 공존, D-11)

```sql
-- backend/src/main/resources/db/migration/V4__add_kakao_fields_to_users_table.sql
-- (a) 대응 클라이언트 DDL: 없음 — 카카오 프로필 필드는 서버 전용(클라이언트는 인증 개념이 없음).
-- (b) 플레이스홀더 로우(00000000-0000-0000-0000-000000000001)는 이 3개 컬럼이 전부 NULL인
--     채로 남는다 — V1의 INSERT문을 수정하지 않으므로(append-only 규율) 자동으로 그렇게 된다.
-- (c) kakao_id는 BIGINT다(INTEGER 아님) — 카카오 "회원번호"는 Long 타입으로 명시되고,
--     Int로 캐스팅하다 overflow로 음수가 된 실제 사례가 보고됨(Pitfall 참고).
-- (d) nickname/profile_image_url은 VARCHAR(N)이 아니라 TEXT다 — 카카오는 두 필드 모두
--     공식 문서에 문자 길이 상한을 명시하지 않는다(A7). 임의의 길이를 잘못 추정해 실사용자
--     닉네임/CDN URL이 잘리는 것보다, Postgres에서 성능 차이가 없는 TEXT로 상한을 두지 않는
--     편이 안전하다(09-RESEARCH.md의 VARCHAR(N) 관례에서 의도적으로 벗어남).
ALTER TABLE users
    ADD COLUMN kakao_id BIGINT,
    ADD COLUMN nickname TEXT,
    ADD COLUMN profile_image_url TEXT;

-- (e) UNIQUE 제약은 kakao_id에만 — Postgres는 NULL을 UNIQUE 위반으로 취급하지 않으므로
--     kakao_id가 NULL인 플레이스홀더 로우와, 실제 카카오 사용자 로우들의 유일성 보장이 공존한다.
ALTER TABLE users
    ADD CONSTRAINT uq_users_kakao_id UNIQUE (kakao_id);
```

`FlywayMigrationTest.kt`의 `usersColumns` 집합(현재 `{id, created_at}`)과
`플레이스홀더 로우가 정확히 1건 존재` 테스트는 이 V4 이후에도 그대로 유효해야 한다 — 다만
컬럼 집합 검증 테스트는 `{id, created_at, kakao_id, nickname, profile_image_url}`로 갱신이
필요하다(Wave 0 gap, Validation Architecture 참고).

### Pattern 4: JWT 발급 — NimbusJwtEncoder + access/refresh 구분 클레임

```kotlin
// Source: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
// (공식 Spring Security 레퍼런스 패턴 — NimbusJwtEncoder 표준 사용법)
@Configuration
class JwtConfig(@Value("\${jwt.secret}") private val secret: String) {

    // HS256은 최소 256비트(32바이트) 키를 요구한다 — 짧은 시크릿을 넣으면 즉시
    // "signing key's size is X bits which is not secure enough"로 기동 실패한다(Pitfall 참고).
    private val secretKey: SecretKey
        get() = SecretKeySpec(secret.toByteArray(), "HmacSHA256")

    @Bean
    fun jwtEncoder(): JwtEncoder {
        val jwk = OctetSequenceKey.Builder(secretKey).algorithm(JWSAlgorithm.HS256).build()
        return NimbusJwtEncoder(ImmutableJWKSet(JWKSet(jwk)))
    }

    @Bean
    fun jwtDecoder(): JwtDecoder {
        val decoder = NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build()
        // 보호된 엔드포인트(oauth2ResourceServer 필터)는 token_use=access인 토큰만 통과시킨다.
        // 이 검증기가 없으면 refresh 토큰으로도 보호된 API를 호출할 수 있게 되는 취약점이 생긴다.
        decoder.setJwtValidator(
            DelegatingOAuth2TokenValidator(
                JwtValidators.createDefault(),
                OAuth2TokenValidator { jwt ->
                    if (jwt.getClaimAsString("token_use") == "access") OAuth2TokenValidatorResult.success()
                    else OAuth2TokenValidatorResult.failure(OAuth2Error("invalid_token", "access 토큰이 아님", null))
                },
            ),
        )
        return decoder
    }
}

@Service
class JwtIssuerService(private val jwtEncoder: JwtEncoder) {
    fun issueAccessToken(userId: UUID): String = issue(userId, "access", Duration.ofMinutes(30))
    fun issueRefreshToken(userId: UUID): String = issue(userId, "refresh", Duration.ofDays(30))

    private fun issue(userId: UUID, use: String, ttl: Duration): String {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .issuer("footlog-backend")
            .subject(userId.toString())
            .issuedAt(now)
            .expiresAt(now.plus(ttl))
            .claim("token_use", use)
            .build()
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).tokenValue
    }
}
```

### Pattern 5: SecurityConfig — Spring Security 7 Lambda DSL 필수(Pitfall 참고)

```kotlin
// Source: https://docs.spring.io/spring-security/reference/migration-7/configuration.html
// (CITED — Security 7 마이그레이션 가이드, .and() 체이닝 완전 제거 확인)
@Configuration
@EnableWebSecurity
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }  // stateless JWT API — 세션 쿠키 기반 CSRF 벡터 없음
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/actuator/health", "/api/auth/**").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2ResourceServer { it.jwt(Customizer.withDefaults()) }
        return http.build()
    }
}
```

### Anti-Patterns to Avoid

- **`jjwt`를 새로 추가하기:** Jackson 3 비호환(State of the Art 참고) — Spring Security가
  이미 제공하는 `NimbusJwtEncoder`/`NimbusJwtDecoder`로 충분하다.
- **`spring-boot-starter-oauth2-client`를 이 phase에 추가하기:** 이 모듈은 Spring이 브라우저
  리다이렉트를 관장하는 시나리오용이다. D-14 아키텍처(모바일 SDK가 이미 인가 코드를 받아옴)와
  맞지 않는다 — 불필요한 의존성과 자동설정 충돌 위험만 늘어난다.
- **access/refresh 토큰을 구분하는 클레임 없이 발급하기:** `token_use` 같은 구분 클레임이
  없으면 탈취된 refresh 토큰으로 보호된 API를 직접 호출할 수 있게 된다(Pattern 4).
- **`.and()` 체이닝 스타일로 `SecurityFilterChain` 작성하기:** Spring Security 7에서
  컴파일 자체가 안 된다(Pitfall 1).
- **카카오 `id`를 `Int`/`Integer`로 매핑하기:** 실제 overflow 사고 보고 사례 존재(Pitfall 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT 서명/검증 | 커스텀 Base64+HMAC 서명 로직 | `NimbusJwtEncoder`/`NimbusJwtDecoder`(`spring-security-oauth2-jose`) | 알고리즘 negotiation, 클레임 검증(exp/nbf/iss), 서명 상수시간 비교까지 이미 검증된 구현 — 자체 구현 시 타이밍 공격/파싱 버그 위험 |
| 보호된 엔드포인트 인증 필터 | 커스텀 `OncePerRequestFilter`로 `Authorization` 헤더 파싱 | Spring Security `oauth2ResourceServer(jwt)` | `SecurityContext` 전파, 예외를 401/403으로 변환하는 표준 흐름, `@AuthenticationPrincipal` 등 생태계 통합까지 한 번에 얻음 |
| OAuth2 폼 인코딩 요청 직렬화 | 수동 문자열 조합(`"grant_type=" + ...`) | `RestClient` + `LinkedMultiValueMap` + `APPLICATION_FORM_URLENCODED` | URL 인코딩 이스케이프 누락(예: redirect_uri의 `://`)으로 인한 은밀한 버그를 원천 차단 |
| 카카오 OIDC 메타데이터 하드코딩 | 엔드포인트 URL을 상수로만 박아넣기 | (선택) `kauth.kakao.com/.well-known/openid-configuration` 참조 | 필수는 아니지만, 카카오가 엔드포인트를 변경하면 discovery 문서가 먼저 반영된다 — 이번 phase 스코프에서는 하드코딩해도 무방(카카오 엔드포인트는 안정적)하나 존재 자체는 인지해둘 것 |

**Key insight:** 이 phase의 진짜 "커스텀 코드"는 카카오 API 계약을 자바/코틀린 DTO로 옮기는
얇은 어댑터 계층뿐이다 — 서명/검증/필터체인이라는 보안 크리티컬한 부분은 전부 Spring Security
표준 모듈이 담당한다.

## Common Pitfalls

### Pitfall 1: Spring Security 7에서 `.and()` 체이닝이 완전히 제거됨

**What goes wrong:** Boot3/Security6 시절 블로그·튜토리얼(Baeldung 구버전 포함)을 그대로
따라 `.authorizeRequests().anyRequest().authenticated().and().csrf().disable()` 같은 체이닝
스타일을 쓰면 컴파일 자체가 안 된다.
**Why it happens:** Security 7이 Lambda DSL을 유일한 설정 방식으로 강제하며 `.and()` 메서드
자체를 제거했다(`[CITED: Spring Security 7 Migration Guide]`).
**How to avoid:** 모든 설정을 `http.csrf { it.disable() }` 같은 람다 인자로 작성한다
(Pattern 5). `authorizeHttpRequests`도 반드시 람다 인자를 받는다(파라미터 없이 호출하는
구버전 오버로드는 Deprecated/제거 대상).
**Warning signs:** `HttpSecurity` 관련 컴파일 에러, "and() is not a member of..." 류 에러.

### Pitfall 2: HMAC 서명 키가 256비트보다 짧으면 기동 즉시 실패

**What goes wrong:** `jwt.secret` 환경변수에 짧은 문자열(예: "mysecret")을 넣으면
`NimbusJwtEncoder`/`NimbusJwtDecoder`가 "The signing key's size is X bits which is not secure
enough" 예외를 던지며 앱이 기동조차 안 된다.
**Why it happens:** HS256은 JWA 스펙상 최소 256비트(32바이트) 키를 요구하고, Nimbus 구현체가
이를 엄격히 검사한다.
**How to avoid:** `openssl rand -base64 32`(또는 `-hex 32`)로 최소 32바이트 이상의 무작위
값을 생성해 `JWT_SECRET` 환경변수로 주입한다. `application-local.yml`에는 "로컬 전용,
운영에 쓰지 말 것"이라고 명시한 플레이스홀더 기본값(`${JWT_SECRET:local-dev-only-insecure-
placeholder-32bytes-min}`)만 두고, staging에는 기본값 없이 강제로 env var를 요구한다(D-11
정신 계승, Phase 9 `application-staging.yml` DB 비밀값 패턴과 동일).
**Warning signs:** 앱 기동 로그에 `IllegalArgumentException`/`JOSEException`, `HealthCheckSmokeTest`류가 컨텍스트 로딩 단계에서 즉시 실패.

### Pitfall 3: 카카오 `id`(회원번호)를 `Int`로 다루면 오버플로 위험

**What goes wrong:** 카카오 `/v2/user/me`가 반환하는 `id`를 `Int`/`Integer`로 역직렬화하면,
자리수가 `Int.MAX_VALUE`(2,147,483,647)를 넘는 회원번호에서 값이 음수로 뒤집히는 실제 사고가
보고돼 있다.
**Why it happens:** 카카오 공식 문서가 이 필드를 Long으로 명시하는데, JSON 라이브러리
기본 매핑이나 개발자의 습관적 `Int` 선언이 이를 조용히 놓친다.
**How to avoid:** `KakaoUserInfoResponse.id`와 `users.kakao_id` 컬럼(V4) 모두 `Long`/
`BIGINT`로 선언한다(Pattern 2, 3). Kotlin data class에서 `Int`로 잘못 선언해도 Jackson이
타입 불일치를 관대하게 처리하지 않고 역직렬화 예외를 던지는 경우도 있으나, 값이 우연히
Int 범위 안에 있는 테스트 계정으로는 이 버그가 절대 드러나지 않는다는 점이 위험하다.
**Warning signs:** 특정 카카오 계정(회원번호가 큰 오래된 계정 등)에서만 로그인 후 잘못된
사용자로 매핑되거나 예외 발생. `[MEDIUM confidence — 카카오 개발자 커뮤니티(devtalk) 보고
사례 기반, 공식 문서가 "Long 타입"이라고 명시한다는 서술은 재확인됨]`

### Pitfall 4 (⚠️ AMENDMENT로 이번 phase에는 적용 안 됨 — 감사 기록용): `client_secret`은 PKCE를 쓰든 안 쓰든 항상 필요(표준 공개 클라이언트 PKCE와 다름)

**What goes wrong:** RFC 7636 표준 PKCE의 핵심 이점 중 하나는 "공개 클라이언트(모바일 앱)가
`client_secret` 없이도 안전하게 인가 코드를 토큰으로 교환할 수 있다"는 것인데, 카카오는 이
전제를 따르지 않는다 — `code_verifier`를 보내도 `client_secret`이 없으면 토큰 교환이
거부된다.
**Why it happens:** 카카오의 OIDC discovery 문서(`token_endpoint_auth_methods_supported`)가
`["client_secret_post"]`만 나열하고 `"none"`(공개 클라이언트 인증 없음)을 지원하지 않는다
`[VERIFIED: kauth.kakao.com/.well-known/openid-configuration 실측]`.
**How to avoid:** 백엔드의 `KakaoTokenClient`(Pattern 1)는 `client_secret`을 항상 폼
파라미터에 포함한다 — 이는 서버에서만 가능하므로(모바일 클라이언트에 시크릿을 심으면 안 됨),
D-14의 "토큰 교환은 반드시 서버가 수행"이라는 결정과 정확히 맞아떨어진다.
**Warning signs:** 카카오 토큰 엔드포인트가 `KOE010`(client_secret 관련 에러 코드류)을
반환하며 교환 실패.

### Pitfall 5: Boot4에서 `RestClient.Builder` 자동설정을 위해 별도 스타터가 필요

**What goes wrong:** `spring-boot-starter-webmvc`만 추가하면 `RestClient` 클래스 자체는
클래스패스에 있지만(스프링 프레임워크 코어), Boot의 자동설정이 만들어주는
`RestClient.Builder` 빈이 없어 매번 `RestClient.create()`로 수동 생성해야 하는 상황에
빠지기 쉽다.
**Why it happens:** Boot 4.1부터 REST 클라이언트 자동설정이 `spring-boot-starter-restclient`
라는 별도 모듈로 분리됐다(09-05 실행 중 이미 발견된 패턴 — `backend/build.gradle.kts`의
`spring-boot-starter-restclient-test` 관련 주석 참고, 이번엔 main 스코프에도 동일하게
적용됨).
**How to avoid:** `implementation("org.springframework.boot:spring-boot-starter-restclient")`를
추가해 `RestClient.Builder`를 주입받아 쓴다(Standard Stack 참고).
**Warning signs:** `RestClient.Builder` 타입 빈을 찾을 수 없다는 `NoSuchBeanDefinitionException`.

## Code Examples

Verified patterns from official sources — 위 Architecture Patterns 섹션의 Pattern 1~5가 이
phase에서 실제로 쓰일 전체 코드 예시다(카카오 토큰 교환, 사용자정보 조회, V4 마이그레이션,
JWT 발급/검증, SecurityFilterChain). 중복을 피하기 위해 여기서는 반복하지 않는다.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `io.jsonwebtoken:jjwt` + `jjwt-jackson`으로 직접 JWT 서명/검증 | Spring Security `spring-security-oauth2-jose`의 `NimbusJwtEncoder`/`NimbusJwtDecoder` | Boot4/Jackson3 전환(2026-06 GA)과 맞물려 jjwt의 Jackson3 미지원이 드러남 | 기존 Boot3 시절 "JWT 튜토리얼"이 jjwt를 표준처럼 다루지만, Boot4 환경에서는 jjwt-jackson이 Jackson2를 끌어와 불필요한 이중 Jackson 스택이 생김(`[CITED: 2026년 jjwt Jackson3 이슈 리포트]`) — Spring 표준 모듈로 우회하는 편이 더 단순 |
| `HttpSecurity` 설정에 `.and()` 체이닝 | Lambda DSL만 사용(`http.oauth2ResourceServer { it.jwt(...) }`) | Spring Security 7(Boot4와 짝) | 기존 예제 코드 대부분이 컴파일 안 됨, OpenRewrite 마이그레이션 레시피가 있으나 신규 코드는 처음부터 Lambda DSL로 작성하는 편이 안전 |
| `spring-boot-starter-oauth2-resource-server` | `spring-boot-starter-security-oauth2-resource-server` | Boot4 스타터 명명 규칙 변경(09-RESEARCH.md에서 이미 확인된 `spring-boot-starter-flyway`류 패턴과 동일 계열) | 구버전 문서의 아티팩트 좌표를 그대로 복사하면 의존성 해석 실패 |

**Deprecated/outdated:**
- `HttpSecurity.authorizeRequests()`(Security 5 시절 API): `authorizeHttpRequests()`로 완전
  대체됨, Security 7에서는 전자가 제거됨.
- jjwt 기반 수제 JWT 필터: 이 프로젝트 규모에서는 Spring Security 표준 모듈로 완전히 대체 가능.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A6 | 카카오 앱 콘솔의 "동의항목"에서 이메일을 선택/미설정으로 두면 `/oauth/authorize`에 `scope=profile_nickname,profile_image`만 넘겨 이메일 동의 자체를 요청하지 않을 수 있다는 서술 | Architecture Patterns > Pattern 2 | 낮음~중간 — 콘솔 설정이 다르게 동작하면 이메일 동의 화면이 계속 노출될 수 있으나, D-05(이메일 미저장)/D-07(미동의자도 로그인 허용)은 백엔드가 이메일 필드를 아예 파싱하지 않는 것만으로도 이미 만족됨(Pattern 2 코드가 이를 보장) — 콘솔 설정은 UX 개선일 뿐 정합성에는 영향 없음 |
| A7 | 카카오 `nickname`/`profile_image_url`에 공식 문서상 문자 길이 상한이 없다고 판단해 `VARCHAR(N)` 대신 `TEXT`를 채택 | Architecture Patterns > Pattern 3 | 낮음 — Postgres에서 TEXT와 VARCHAR(N)은 성능 차이가 없고, 오히려 길이를 보수적으로 잘못 추정해 실사용자 데이터가 잘리는 리스크를 원천 차단하는 더 안전한 선택 |
| A8 | 리프레시 토큰을 회전(rotation)하지 않고(재사용 가능한 단일 refresh JWT를 30일간 유지) 서버측 폐기(revocation) 목록도 두지 않는다는 설계(D-01의 "Redis/세션 스토어 없이" 원칙을 리프레시 토큰에도 그대로 적용) | Architecture Patterns > System Architecture Diagram | 중간 — 리프레시 토큰이 유출되면 만료(30일)까지 무효화할 방법이 없음. 1인 프로젝트 초기 규모에서는 D-01의 "인프라 추가 없이" 원칙과 일관되지만, 사용자 수가 늘면 재검토 필요(로그아웃/연결끊기 자체가 이번 phase 스코프 밖이므로 자연스러운 후속 논의 대상) |
| A9 | `@react-native-seoul/kakao-login`(`crossplatformkorea/react-native-kakao-login`)의 `login()`/`loginWithKakaoAccount()`가 인가 코드가 아니라 카카오 액세스 토큰을 직접 반환한다는 판단 — WebFetch로 GitHub README를 요약 조회한 결과에 근거, 실제 SDK를 설치·실행해 검증하지는 않음 | Summary, Open Questions #1 | 높음 — 이 판단이 틀렸다면(즉 SDK에 인가 코드만 반환하는 저수준 메서드가 실제로 존재한다면) Open Questions #1의 권고(expo-auth-session으로 수동 PKCE 구현)가 불필요한 우회가 된다. 계획/실행 단계에서 SDK를 실제로 설치해 타입 정의(`.d.ts`)를 직접 확인하는 검증이 필요 |

## Open Questions (RESOLVED — 계획 단계에서 전부 해소됨)

1. **[최우선] (RESOLVED) D-13(네이티브 SDK)과 D-14(인가 코드+PKCE만 클라이언트→백엔드 전달)가 실제
   SDK 동작과 충돌할 가능성**
   - **RESOLVED (2026-09-02, 계획 단계):** `@react-native-seoul/kakao-login` v6.0.4를 실제
     설치해 `src/index.d.ts`/`src/types/index.d.ts`를 직접 확인한 결과, "인가 코드만 받는"
     저수준 API는 존재하지 않음을 확인(HIGH confidence로 격상). 창업자가 D-14를 완화하는
     쪽(옵션 a)을 선택 — 10-CONTEXT.md D-14 AMENDMENT 및 이 문서 최상단 ⚠️ AMENDMENT 블록
     참고. 10-04/10-05/10-07 PLAN.md에 그대로 반영되어 plan-checker 검증 통과.
   - What we know: `@react-native-seoul/kakao-login` 계열 SDK의 표준 `login()` API는 카카오
     인가 코드↔토큰 교환을 SDK 내부에서 완료하고 `KakaoOAuthToken`(액세스/리프레시/ID
     토큰)을 JS 레이어에 직접 반환한다(README 기반, A9 — MEDIUM confidence).
   - What's unclear: 이 SDK(또는 기반 네이티브 iOS/Android SDK)에 "인가 코드만 받고 토큰
     교환은 하지 않는" 저수준 API가 별도로 존재하는지는 이번 조사에서 확인하지 못했다. 만약
     존재하지 않는다면, D-14의 "카카오 액세스 토큰이 클라이언트에 노출되지 않는다"는 목표를
     달성하려면 `@react-native-seoul/kakao-login`의 편의 메서드를 쓰지 않고
     `expo-auth-session`(Expo 공식, PKCE 내장 지원, `useAuthRequest`)으로
     `kauth.kakao.com/oauth/authorize`를 직접 구동해야 하며, 이 경우 D-13의 채택 근거였던
     "카카오톡 설치 시 앱 전환 자동 처리"는 사라진다(브라우저/CustomTabs 기반 웹 로그인만
     가능).
   - Recommendation: 계획 단계 착수 전, `@react-native-seoul/kakao-login` 패키지를 실제로
     설치해 TypeScript 타입 정의를 확인하거나 네이티브 SDK 공식 문서에서 "인가 코드만 받기"
     저수준 API 존재 여부를 먼저 검증한다. 존재하면 D-13/D-14 둘 다 그대로 만족 가능. 존재하지
     않으면 두 가지 선택지 중 하나를 창업자에게 확인 필요: (a) D-14를 완화해 "클라이언트가
     카카오 액세스 토큰을 받아 백엔드로 전달하고, 백엔드가 그 토큰으로 `/v2/user/me`만
     호출"하는 더 단순한(그리고 한국 앱 생태계에서 실제로 더 흔한) 패턴으로 바꾸거나,
     (b) D-13을 완화해 앱 전환 자동화를 포기하고 수동 PKCE 브라우저 플로우를 쓴다. 백엔드
     엔드포인트 설계(Pattern 1)는 D-14 원안 그대로 준비해뒀으므로, 어느 쪽으로 결론나든
     백엔드 쪽 재작업은 최소화된다(코드 경로만 다르고 요청 DTO 형태가 약간 달라질 뿐).

2. **(RESOLVED) 리프레시 토큰 회전(rotation) 여부**
   - **RESOLVED:** 회전 없음(A8 그대로 확정) — 10-03/10-05/10-06 PLAN.md에 구현됨.
   - What we know: D-01~D-04는 access/refresh 이중 토큰과 TTL만 명시했고, 리프레시 시
     refresh 토큰 자체를 재발급(회전)할지는 명시하지 않았다(Claude's Discretion 범위로 보임).
   - What's unclear: 회전을 도입하면 탈취된 refresh 토큰의 재사용 탐지(reuse detection)가
     가능해지지만, 그러려면 "마지막으로 발급된 refresh 토큰의 식별자"를 서버가 어딘가에
     기억해야 해서 D-01의 "Redis/세션 스토어 없이"라는 완전 stateless 원칙과 정면으로 부딪힌다.
   - Recommendation: 이번 phase는 A8에 기록한 대로 **회전 없음**(단일 refresh JWT를 만료까지
     재사용 가능)으로 계획하고, 이 트레이드오프를 PLAN.md에도 명시적으로 남긴다. 사용자 규모가
     커지면 별도 phase에서 재검토.

3. **(RESOLVED) JWT 시크릿의 로컬 개발 기본값 정책**
   - **RESOLVED:** Pitfall 2 절충안을 채택하되, 계획 단계에서 한 단계 더 정확히 다듬음 — 이
     프로젝트의 통합 테스트가 프로파일 없이(`no active profile`) 실행되므로 기본값은
     `application-local.yml`이 아니라 **공통(`application.yml`)** 프로파일에 둬야 모든
     `@SpringBootTest`가 기동한다(10-03 PLAN.md 반영). staging은 여전히 기본값 없는
     `${JWT_SECRET}`으로 강제.
   - What we know: Phase 9의 D-11("비밀값은 환경변수로만, 하드코딩 금지")은 DB 접속정보를
     염두에 둔 결정이었고, 로컬은 `spring-boot-docker-compose`가 자동으로 접속정보를 주입해
     사람이 직접 값을 다룰 필요가 없었다.
   - What's unclear: JWT 서명 키는 DB 접속정보와 달리 자동 주입 메커니즘이 없다 — 로컬
     개발자가 매번 `JWT_SECRET`을 수동으로 export해야 하는지, 아니면 Pitfall 2에서 제안한 것
     처럼 `application-local.yml`에 "로컬 전용" 딱지가 붙은 비-시크릿 placeholder 기본값을
     둬도 되는지는 D-11의 문면만으로는 완전히 명확하지 않다.
   - Recommendation: Pitfall 2의 절충안(`${JWT_SECRET:local-dev-only-insecure-placeholder}`
     — local 프로파일에만 기본값 존재, staging은 기본값 없이 강제)을 기본 계획으로 삼되,
     계획 단계에서 D-11의 원 의도(비밀값 완전 배제)에 더 엄격히 맞추고 싶다면 로컬도 필수
     env var로 바꿀 수 있다는 점을 PLAN.md에 옵션으로 남긴다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Java(JDK) / Docker / Docker Compose / Git | 09-RESEARCH.md에서 이미 검증 완료(변경 없음) | ✓ | 09-RESEARCH.md 참고 | — |
| 카카오 개발자 앱 등록(REST API 키/네이티브 앱 키 발급) | 클라이언트 SDK(D-13) 초기화에 필요한 앱 키. AMENDMENT 이후 백엔드 코드 경로는 `client_secret`을 쓰지 않으므로 그 발급/활성화는 더 이상 필수 선행조건이 아님(등록 자체는 여전히 필요) | ✗(이 세션에서 확인 불가 — 창업자의 카카오 개발자 콘솔 계정 필요) | — | 없음 — 이 phase의 end-to-end 검증(D-16 검증 화면 포함) 진행의 핵심 전제. 계획 단계 첫 태스크로 "카카오 개발자 콘솔에서 앱 생성 + REST API/네이티브 앱 키 발급"을 명시적 선행 태스크로 넣어야 한다 |
| `@react-native-seoul/kakao-login` npm 패키지 | D-13(클라이언트 SDK), D-16(검증 화면) | ✓(npm 레지스트리에 v6.0.4 존재, slopcheck `[OK]`) | 6.0.4 | — (단, Open Questions #1의 아키텍처 검증 필요) |

**Missing dependencies with no fallback:** 카카오 개발자 콘솔 앱 등록(REST API 키/시크릿) —
이 세션에서 창업자 계정 접근 권한이 없어 확인 불가, 계획 단계 선행 태스크로 명시 필요.
**Missing dependencies with fallback:** 없음.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Testcontainers(Postgres) — 09-RESEARCH.md와 동일 스택 계승 |
| Config file | `backend/build.gradle.kts`(`tasks.withType<Test> { useJUnitPlatform() }`) |
| Quick run command | `cd backend && ./gradlew test --tests "*KakaoAuth*" --tests "*Jwt*" -q` |
| Full suite command | `cd backend && ./gradlew build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| REQ-auth-kakao-oauth | 인가 코드+PKCE를 카카오 토큰으로 교환하고 사용자를 find-or-create한다 | integration | `./gradlew test --tests "*KakaoAuthServiceTest"` (`MockRestServiceServer`로 kauth.kakao.com/kapi.kakao.com 응답 모킹, Testcontainers Postgres로 실제 find-or-create 검증) | ❌ Wave 0(신규 작성) |
| REQ-auth-kakao-oauth | V4 마이그레이션이 kakao_id/nickname/profile_image_url을 nullable+UNIQUE로 추가하고 플레이스홀더 로우가 그대로 보존된다 | integration | `./gradlew test --tests "*FlywayMigrationTest"`(기존 파일 확장, `usersColumns` 갱신 + UNIQUE 제약 검증 테스트 추가) | 부분 존재 — 기존 파일 확장 필요(Wave 0) |
| REQ-auth-session-token | 로그인 성공 시 access+refresh JWT가 올바른 `token_use`/`exp` 클레임으로 발급된다 | unit/integration | `./gradlew test --tests "*JwtIssuerServiceTest"` | ❌ Wave 0(신규 작성) |
| REQ-auth-session-token | 만료된/`token_use=refresh`인 토큰으로 보호된 엔드포인트를 호출하면 401이 반환된다 | integration | `./gradlew test --tests "*SecurityConfigTest"`(`@SpringBootTest` + `MockMvc`) | ❌ Wave 0(신규 작성) |
| REQ-auth-session-token | `POST /api/auth/refresh`가 유효한 refresh 토큰으로 새 access 토큰을 발급한다 | integration | `./gradlew test --tests "*AuthControllerTest"` | ❌ Wave 0(신규 작성) |

### Sampling Rate

- **Per task commit:** `./gradlew test --tests "<관련 테스트 클래스>"`
- **Per wave merge:** `./gradlew build`(Testcontainers 포함 전체 스위트)
- **Phase gate:** `/gsd:verify-work` 전 `./gradlew build` 전체 그린 + (가능하면) D-16 검증 화면으로
  실제 카카오 계정 1개 이상 로그인 성공을 시뮬레이터에서 직접 확인(CLAUDE.md "실기기 확인이
  필요한 검증 단계" 원칙 — 카카오 로그인 화면 전환/텍스트 렌더링/토큰 저장 배선은 시뮬레이터로
  검증 가능하나, 실제 카카오 계정으로 완주하는 전체 OAuth 왕복은 네트워크 호출이 필요해
  시뮬레이터에서도 가능하지만 카카오 앱 콘솔 실제 설정과 결합되므로 창업자의 카카오 계정
  정보가 필요할 수 있음 — 계획 단계에서 검증 주체를 명확히 할 것)

### Wave 0 Gaps

- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt` — REQ-auth-kakao-oauth
- [ ] `backend/src/test/kotlin/com/footlog/backend/FlywayMigrationTest.kt` 확장(V4 컬럼/제약 검증 테스트 추가) — REQ-auth-kakao-oauth
- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/JwtIssuerServiceTest.kt` — REQ-auth-session-token
- [ ] `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt` — REQ-auth-session-token
- [ ] `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt` — REQ-auth-session-token
- [ ] `MockRestServiceServer` 기반 카카오 API 모킹 헬퍼(공통 테스트 유틸) — 신규 작성 필요

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | Yes | 카카오 위임 인증(OAuth2) — 자체 비밀번호를 저장/검증하지 않음. 클라이언트가 SDK로부터 받은 카카오 accessToken은 백엔드가 `/v2/user/me` 조회 1회에만 쓰고 저장하지 않음(D-14 AMENDMENT) |
| V3 Session Management | Yes | Stateless JWT(D-01) — 세션 고정/하이재킹 벡터 자체가 없음. `token_use` 클레임으로 access/refresh 오용 방지(Pattern 4), CSRF는 stateless라 비활성화(Pattern 5, 쿠키 기반 세션이 아니므로 CSRF 벡터 없음) |
| V4 Access Control | Yes(최소) | `anyRequest().authenticated()` 기본 정책 — 이번 phase에는 도메인 API가 없어 세밀한 인가 규칙은 다음 phase(Phase 12) 소관 |
| V5 Input Validation | Yes | `spring-boot-starter-validation`(Phase 9에서 이미 포함) — `KakaoLoginRequest`(kakaoAccessToken)에 `@NotBlank` 등 적용 |
| V6 Cryptography | Yes | JWT 서명 키(HMAC 256비트+)는 환경변수로만 주입(D-11 계승), `openssl rand`로 생성(Pitfall 2). 자체 해시/암호화 알고리즘 구현 금지 — Nimbus 라이브러리에 위임 |

### Known Threat Patterns for Kakao OAuth2/PKCE + Spring Security JWT 백엔드

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| 탈취된 카카오 accessToken을 `/api/auth/kakao/login`에 재전송해 타인 명의로 세션 발급(AMENDMENT로 새로 생긴 벡터 — 인가 코드가 아니라 토큰 자체를 백엔드가 신뢰) | Spoofing | 카카오 accessToken 자체가 짧은 수명(카카오 발급 TTL)을 가지며 HTTPS 전송만 허용. 백엔드는 이 토큰으로 `/v2/user/me`를 직접 호출해 카카오가 실제로 유효성을 검증하게 하므로(위조 불가), 위험은 "탈취된 진짜 토큰의 재사용 창"으로 제한됨 — 카카오 토큰 TTL 내로 노출 시간이 한정되는 것을 리스크로 계획 단계에 명시할 것 |
| refresh 토큰 탈취 후 access 토큰 무한 재발급 | Elevation of Privilege | `token_use` 클레임 검증(Pattern 4)으로 refresh 토큰이 보호된 API에 직접 쓰이는 것을 차단. 탈취된 refresh 토큰 자체의 무효화는 A8에 기록된 대로 이번 phase 스코프 밖(회전/블랙리스트 없음) — 계획 단계에서 리스크로 명시할 것 |
| `client_secret` 클라이언트 번들 유출 | Information Disclosure | AMENDMENT 이후 이번 phase의 백엔드 코드는 `client_secret`을 전혀 사용하지 않으므로(토큰 교환 단계 자체가 없음) 이 벡터는 이번 phase에 적용되지 않음 — 향후 phase가 카카오의 다른 서버간 API(예: 연결끊기 admin API)를 위해 `client_secret`을 도입한다면 재검토 |
| JWT 서명 키 하드코딩/커밋 | Information Disclosure / Tampering | D-11 계승 — `application-*.yml`에 실제 시크릿 하드코딩 금지, 환경변수 참조만(Pitfall 2) |
| 카카오 사용자정보 응답의 `nickname`/닉네임에 스크립트/HTML 삽입 후 프론트엔드 미이스케이프 렌더링(저장형 XSS 벡터) | Tampering | 이번 phase는 백엔드가 값을 그대로 저장만 하고 렌더링하지 않음 — 렌더링 책임은 클라이언트(향후 phase)에 있으며, 그 시점에 표준 이스케이프(React Native Text 컴포넌트는 기본적으로 HTML을 해석하지 않아 저위험) 필요성을 인지해둘 것 |

## Sources

### Primary (HIGH confidence)
- `https://kauth.kakao.com/.well-known/openid-configuration` — 공식 OIDC discovery 문서 실측
  fetch. `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`(OIDC 전용),
  `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported:
  ["client_secret_post"]` 전부 원문 JSON으로 확인
- `https://start.spring.io` 공식 생성기 + `./gradlew dependencies --configuration
  runtimeClasspath` 실제 실행 — Spring Security 7.1.1, `spring-security-oauth2-jose`,
  `com.nimbusds:nimbus-jose-jwt:10.9.1`, `spring-boot-starter-security-oauth2-resource-server`/
  `spring-boot-starter-restclient` 정확한 아티팩트명 확인
- `https://developers.kakao.com/docs/ko/kakaologin/rest-api`(및 영문/최신 버전) — 토큰
  엔드포인트 요청/응답 파라미터, `GET /v2/user/me` 응답 구조
- npm registry(`npm view @react-native-seoul/kakao-login`) — 버전 6.0.4, 최근 배포일
  (2026-08-05), GitHub 저장소 링크 확인
- `slopcheck install @react-native-seoul/kakao-login` — `[OK]` 판정 확인

### Secondary (MEDIUM confidence)
- `https://github.com/crossplatformkorea/react-native-kakao-login` README(WebFetch 요약) —
  `login()`/`loginWithKakaoAccount()`가 `KakaoOAuthToken`을 직접 반환한다는 서술(A9)
- 카카오 개발자 커뮤니티(devtalk.kakao.com) 스레드 — `id` 필드 Long 오버플로 실사고 보고(Pitfall 3)
- `https://docs.spring.io/spring-security/reference/migration-7/configuration.html` 관련
  검색 요약 — `.and()` 체이닝 제거, Lambda DSL 강제(Pitfall 1)
- 2026년 커뮤니티 리포트(jjwt Jackson3 미지원, `jjwt-gson` 우회 사례) — State of the Art

### Tertiary (LOW confidence)
- 없음 — 이 조사의 핵심 아키텍처 주장(카카오 엔드포인트 계약, Spring 의존성 좌표)은 전부
  공식 소스 직접 실측 또는 공식 문서 인용으로 뒷받침됨. 유일하게 LOW~MEDIUM에 머무는 항목은
  A9(SDK 세부 동작)뿐이며 이는 Open Questions #1로 명시적으로 격상해뒀다.

## Metadata

**Confidence breakdown:**
- Standard stack(Spring 측): HIGH — `start.spring.io` 생성 + `gradlew dependencies` 실측
- Standard stack(카카오 측): HIGH — OIDC discovery 문서 실측 + 공식 REST API 문서 인용
- Architecture: HIGH(백엔드 엔드포인트 설계) / MEDIUM(클라이언트 SDK와의 통합 지점, A9 참고)
- Pitfalls: HIGH(Security7 Lambda DSL, HMAC 키 길이, client_secret 필수 — 전부 공식 문서/
  실측 근거) / MEDIUM(카카오 id Long 오버플로 — 커뮤니티 보고 사례 기반)

**Research date:** 2026-09-03
**Valid until:** 2026-10-03(Spring Boot 4.x/Security 7.x는 아직 신생 major 버전대라 패치가
빠르게 나올 수 있음 — 계획 착수 시점에 `start.spring.io` 기본 버전 재확인 권장). 카카오 API
계약(토큰/사용자정보 엔드포인트)은 훨씬 안정적이라 이 부분만 놓고 보면 유효기간을 더 길게
잡아도 되지만, 패키지 전체를 하나의 만료일로 관리하기 위해 보수적으로 30일을 적용.
