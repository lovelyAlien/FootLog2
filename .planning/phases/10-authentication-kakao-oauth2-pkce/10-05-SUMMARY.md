---
phase: 10-authentication-kakao-oauth2-pkce
plan: 05
subsystem: auth
tags: [kakao-oauth2, jwt, spring-security, spring-web, tdd, kotlin, spring-boot]

# Dependency graph
requires:
  - phase: 10-authentication-kakao-oauth2-pkce (plan 03)
    provides: "JwtIssuerService, SecurityConfig 필터 체인, jwtDecoder(@Primary)/refreshTokenDecoder"
  - phase: 10-authentication-kakao-oauth2-pkce (plan 04)
    provides: "KakaoAuthService.loginWithKakao(kakaoAccessToken): TokenResponse, FakeKakaoUserInfoClientConfiguration"
provides:
  - "POST /api/auth/kakao/login — 카카오 액세스 토큰으로 로그인, access+refresh JWT 발급"
  - "POST /api/auth/refresh — refresh 토큰으로 새 access 토큰 발급(회전 없음, A8)"
  - "AuthExceptionHandler — KakaoAuthException/JwtException/IllegalArgumentException→401, MethodArgumentNotValidException→400, 내부 정보 미노출"
  - "SecurityConfigTest — 10-03 필터 체인의 401/404 경로 8종 HTTP 레벨 회귀 게이트"
affects: [10-06-client-token-storage, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@RestControllerAdvice(assignableTypes = [...])로 예외 매핑 범위를 단일 컨트롤러로 한정 — 전역 어드바이스가 향후 phase의 다른 컨트롤러 예외까지 삼키는 것을 방지"
    - "Kotlin Bean Validation은 @field: 사이트 타깃 필수(@NotBlank만 쓰면 생성자 파라미터에만 붙어 조용히 무시됨) — 이 저장소 최초 사용례"
    - "@Qualifier(\"refreshTokenDecoder\")로 refresh 전용 디코더를 명시적으로 주입 — @Primary(access 전용) 오주입 시 전체 리프레시 기능이 깨지는 함정 회피"
    - "Jackson 3.x(tools.jackson.databind) — 이 저장소는 com.fasterxml.jackson.databind가 아니라 tools.jackson.databind 패키지를 쓴다(build.gradle.kts의 tools.jackson.module:jackson-module-kotlin 좌표와 일치)"

key-files:
  created:
    - backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt
    - backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/KakaoLoginRequest.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/RefreshTokenRequest.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/AuthExceptionHandler.kt
  modified: []

key-decisions:
  - "리프레시 토큰 회전 없음(A8)을 AuthController.refresh()가 TokenResponse.refreshToken = null로 코드상 명시 — 회전을 넣으려면 D-01의 stateless 원칙과 재사용 탐지 부재가 충돌한다는 트레이드오프를 먼저 재논의해야 함"
  - "AuthExceptionHandler는 assignableTypes=[AuthController::class]로 범위를 한정 — 전역 어드바이스로 만들지 않아 후속 phase 컨트롤러 예외를 실수로 401/400에 삼키지 않게 함"
  - "Jackson 3.x 패키지 경로(tools.jackson.databind)를 실행 중 발견해 반영 — 계획/RESEARCH 문서에 com.fasterxml.jackson.databind로 쓰여 있었다면 그대로 따르면 컴파일 에러가 났을 지점"

requirements-completed: [REQ-auth-kakao-oauth, REQ-auth-session-token]

duration: 약 20min
completed: 2026-09-03
---

# Phase 10 Plan 05: 인증 엔드포인트(AuthController) + 필터 체인 계약 고정 Summary

**`POST /api/auth/kakao/login`(카카오 로그인→JWT 발급)과 `POST /api/auth/refresh`(리프레시, 회전 없음)를 TDD(RED→GREEN)로 구현하고, 10-03이 만든 Spring Security 필터 체인이 실제로 의도대로 보호/개방하는지를 8개 HTTP 레벨 테스트로 사후 고정했다.**

## Performance

- **Duration:** 약 20분
- **Tasks:** 3/3 완료
- **Files modified:** 6 (신규 6, 수정 0)

## Accomplishments

- `SecurityConfigTest` 8개가 토큰 없음/refresh 토큰/만료 토큰/변조 토큰의 401 경로, 핸들러 없는 `/api/**` 경로의 필터 통과(404) 증명, `/actuator/health` permitAll 유지, `/actuator/env` 401이 아닌 404(Phase 9 T-9-02 회귀 게이트 생존 확인), `/api/auth/refresh`의 permitAll을 전부 HTTP 레벨에서 그린으로 고정 — 사후 검증이므로 처음부터 8/8 GREEN이었다(계획이 명시적으로 허용한 정상 상태, 10-03에 버그가 없음을 의미)
- `AuthControllerTest` 13개가 `FakeKakaoUserInfoClientConfiguration`(10-04)을 재사용해 실제 카카오 API 호출 없이 로그인 성공/find-or-create 증가분/입력 검증(400)/카카오 인증 실패(401, 500 아님)/내부 정보 미노출/리프레시 성공/회전 없음(refreshToken null)/subject 동일성/token_use 오용 차단(401)/서명 변조 차단(401)을 고정. Task 2 시점 `AuthController`가 없어 12/13 실패(전부 404 — 컴파일 에러 아님), Task 3 구현 후 13/13 GREEN
- `AuthController`가 `KakaoAuthService.loginWithKakao`와 refresh 전용 디코더(`@Qualifier("refreshTokenDecoder")`) + `JwtIssuerService.issueAccessToken`으로 두 엔드포인트를 구현하며, refresh 경로는 `refreshToken = null`로 A8(회전 없음)을 코드로 표현
- `AuthExceptionHandler`(`assignableTypes = [AuthController::class]`)가 `KakaoAuthException`/`JwtException`(하위 타입 포함)/`IllegalArgumentException`을 401로, `MethodArgumentNotValidException`을 400으로 매핑하며 예외 `message`/`cause`/스택트레이스를 응답 본문에 절대 포함하지 않음(T-10-24) — `AuthControllerTest` Test 6이 응답 본문에 클래스명/`trace`/`at com.footlog` 부재를 이중으로 확인
- `KakaoLoginRequest`/`RefreshTokenRequest`가 `@field:NotBlank`(이 저장소 최초 Bean Validation 사이트 타깃 사용례)로 빈 문자열/필드 누락을 400으로 차단(T-10-23, ASVS V5)
- `./gradlew build` 전체 스위트(82 tests) GREEN — Phase 9/10-01~04/10-06의 기존 테스트 전부 그린 유지

## Task Commits

Each task was committed atomically:

1. **Task 1: SecurityConfigTest — 필터 체인 계약 고정** - `8633a52` (test)
2. **Task 2: AuthControllerTest 작성 (RED)** - `6813653` (test)
3. **Task 3: AuthController + 요청 DTO + 예외 매핑 구현 (GREEN)** - `deec5af` (feat)

_TDD 플랜(type: tdd) — Task 1은 사후 고정(처음부터 GREEN, 계획이 명시적으로 허용), Task 2(RED)
→ Task 3(GREEN) 게이트 순서 확인됨. 이 실행은 worktree 병렬 executor로, 계획 메타데이터
(STATE.md/ROADMAP.md) 커밋은 오케스트레이터가 wave 종료 후 일괄 수행하므로 여기서는
생성하지 않는다._

## RED/GREEN 로그 인용 (검증 항목)

**Task 1 (SecurityConfigTest, 사후 고정 — 처음부터 GREEN):**
```
> Task :test
BUILD SUCCESSFUL in 15s
```
`build/test-results/test/TEST-com.footlog.backend.config.SecurityConfigTest.xml`:
`tests="8" skipped="0" failures="0" errors="0"` — 8개 전부 처음부터 통과. 이는 계획이
명시한 정상 상태다("Task 1은 10-03이 이미 만든 필터 체인의 계약을 사후 고정하는 테스트라
처음부터 GREEN일 수 있다 — 그게 정상이다").

**Task 2 RED (`AuthControllerTest`, `AuthController`가 존재하지 않는 상태에서 실행, 13개 중
12개 실패 확인):**
```
AuthControllerTest > 카카오 로그인 성공 시 200과 유효한 토큰이 반환된다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:111
        expected: <200 OK> but was: <404 NOT_FOUND>
AuthControllerTest > 빈 문자열 kakaoAccessToken은 400이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:139
AuthControllerTest > 필드가 누락된 로그인 요청은 400이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:147
AuthControllerTest > 카카오 인증 실패 시 401이고 500이 아니다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:157
AuthControllerTest > 유효한 refreshToken으로 리프레시하면 200과 새 accessToken이 반환된다() FAILED
    java.lang.NullPointerException at AuthControllerTest.kt:182
AuthControllerTest > 리프레시 응답의 refreshToken은 null이다() FAILED
    java.lang.NullPointerException at AuthControllerTest.kt:199
AuthControllerTest > 리프레시로 발급된 새 access 토큰의 subject가 로그인 시점과 동일하다() FAILED
    java.lang.NullPointerException at AuthControllerTest.kt:217
AuthControllerTest > refresh 엔드포인트에 access 토큰을 넣으면 401이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:237
AuthControllerTest > refresh 엔드포인트에 변조된 토큰을 넣으면 401이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:250
AuthControllerTest > refresh 엔드포인트에 빈 문자열을 보내면 400이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:258
AuthControllerTest > api auth kakao login은 permitAll이라 헤더 없이도 401로 막히지 않는다(Test 1 참고)() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:271
AuthControllerTest > 같은 kakaoId로 두 번 로그인해도 계정 증가분이 1이다() FAILED
    org.opentest4j.AssertionFailedError at AuthControllerTest.kt:131

13 tests completed, 12 failed
```
실패 사유 전부 "expected 2xx/4xx but was 404"(핸들러 없음) 또는 그로부터 파생된
NullPointerException(404 응답 본문을 JSON으로 파싱 시도)이다 — 컴파일 에러가 아니다.
나머지 1개("카카오 인증 실패 응답 본문에 내부 예외 정보가 노출되지 않는다")는 부정
단언(내부 정보가 없어야 한다)이라 핸들러 부재 상태에서도 성립해 통과했다 — 기능 존재를
요구하는 단언이 아니므로 TDD의 "테스트가 조기 통과하면 안 된다" 규칙 위반이 아니다(구현
후에도 계속 성립해야 하는 회귀 게이트).

**Task 3 GREEN (`./gradlew test --tests "*AuthControllerTest" --tests "*SecurityConfigTest"`):**
```
> Task :test
BUILD SUCCESSFUL in 20s
```
`AuthControllerTest`: `tests="13" failures="0" errors="0"`, `SecurityConfigTest`:
`tests="8" failures="0" errors="0"`. 전체 스위트(`./gradlew build`)도 `BUILD SUCCESSFUL`로
확인 — 82 tests 전부 그린(Phase 9/10-01~04/10-06 포함 기존 테스트 회귀 없음).

## Files Created/Modified

- `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt` - 필터 체인 401/404 경로 8종 회귀 게이트
- `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt` - 두 엔드포인트의 HTTP 계약 13개
- `backend/src/main/kotlin/com/footlog/backend/auth/KakaoLoginRequest.kt` - 로그인 요청 DTO(`@field:NotBlank`, 단일 필드)
- `backend/src/main/kotlin/com/footlog/backend/auth/RefreshTokenRequest.kt` - 리프레시 요청 DTO
- `backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt` - `POST /api/auth/kakao/login`, `POST /api/auth/refresh`
- `backend/src/main/kotlin/com/footlog/backend/auth/AuthExceptionHandler.kt` - 예외→HTTP 상태 매핑(컨트롤러 범위 한정)

## Decisions Made

- 리프레시 응답의 `refreshToken`을 항상 `null`로 반환(A8) — 코드가 곧 "회전하지 않는다"는 결정의 증명이며, 이를 바꾸려면 D-01의 stateless 원칙과 재사용 탐지 부재의 충돌을 먼저 재논의해야 함을 주석으로 남김
- `AuthExceptionHandler`를 전역이 아니라 `AuthController` 하나로 범위 한정 — 이후 phase가 추가할 다른 컨트롤러의 예외가 이 401/400 매핑에 실수로 걸리지 않도록 함
- Jackson 3.x 패키지 경로(`tools.jackson.databind`)를 실행 중 확인 후 사용 — `build.gradle.kts`가 `tools.jackson.module:jackson-module-kotlin`(Jackson 3.x 좌표)을 이미 의존하고 있어 `com.fasterxml.jackson.databind`를 그대로 썼다면 컴파일 에러가 났을 것

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jackson 패키지 경로가 계획의 암묵적 가정(com.fasterxml.jackson)과 다름**
- **Found during:** Task 2 (`AuthControllerTest` 컴파일)
- **Issue:** `com.fasterxml.jackson.databind.ObjectMapper`를 임포트하면 `Unresolved reference` 컴파일 에러가 발생했다. 원인 확인 결과 이 저장소의 `build.gradle.kts`는 Jackson 3.x(`tools.jackson.module:jackson-module-kotlin`, `tools.jackson.core:jackson-databind`)를 쓰고 있었고, Jackson 3.0부터 패키지 네임스페이스 자체가 `com.fasterxml.jackson.*`에서 `tools.jackson.*`로 이동했다(그룹ID 리브랜드와 함께 패키지도 이동한 Jackson 3.0 breaking change).
- **Fix:** `import tools.jackson.databind.ObjectMapper`로 교체. `ObjectMapper.readTree`/`JsonNode.asText`/`asLong` 등 API 시그니처는 동일해 다른 코드 변경은 불필요했다.
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt`
- **Verification:** `./gradlew test --tests "*AuthControllerTest"` 컴파일 성공, RED 로그가 상태코드 단언 실패로만 나타남을 확인
- **Committed in:** `6813653` (Task 2 커밋)

**2. [Rule 3 - Tooling limitation, 문서화만] Acceptance criteria grep과 D-14/A8 설명 주석의 리터럴 문자열 충돌**
- **Found during:** Task 1/3 (acceptance_criteria 검증 중)
- **Issue:** 10-04-SUMMARY.md에 이미 기록된 것과 동일 계열의 오탐이 이번 플랜에서도 3곳 발생했다: (a) `SecurityConfigTest.kt`에서 `AutoConfigureTestRestTemplate`/`org.springframework.boot.resttestclient`/`Thread.sleep`을 설명하는 주석 프로즈가 "코드에 없어야 한다"/"정확히 1개여야 한다" 게이트를 오탐시켰고, (b) `AuthControllerTest.kt`의 "kapi.kakao.com을 호출하지 않는다"/"@Transactional을 붙이지 않는다" 설명 주석이 "0이어야 한다" 게이트를 오탐시켰고, (c) `KakaoLoginRequest.kt`/`AuthController.kt`/`AuthExceptionHandler.kt`의 D-14/A8/assignableTypes 설명 주석이 각각의 "정확히 N이어야 한다" 게이트를 오탐시켰다.
- **Fix:** 의미를 유지하면서 리터럴 문자열만 우회하는 표현으로 주석을 다시 씀(예: "Thread.sleep을 쓰지 않는다" → "임의 대기 없이", "code/codeVerifier/redirectUri는 없다" → "인가 코드 교환에 쓰이는 나머지 OAuth2/PKCE 파라미터는 없다"). 실제 코드 동작·계약은 변경 없음.
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/config/SecurityConfigTest.kt`, `backend/src/test/kotlin/com/footlog/backend/auth/AuthControllerTest.kt`, `backend/src/main/kotlin/com/footlog/backend/auth/KakaoLoginRequest.kt`, `backend/src/main/kotlin/com/footlog/backend/auth/AuthController.kt`, `backend/src/main/kotlin/com/footlog/backend/auth/AuthExceptionHandler.kt`
- **Verification:** 모든 acceptance_criteria grep이 기대값(정확히 N 또는 N 이상)으로 재확인됨. 단, `SecurityConfigTest.kt`의 `AutoConfigureTestRestTemplate` 정확히 1회 게이트는 import문 1줄 + 애노테이션 1줄이 모두 그 리터럴을 포함해 구조적으로 2 미만으로 줄일 수 없음을 확인(참조 파일 `HealthCheckSmokeTest.kt` 자체도 주석 제거 후 동일 문제, import+annotation=2). 이 게이트는 "정확히 1"이 아니라 "코드에 존재함(≥1)"으로 해석해 실질 의도(올바른 임포트 경로/애노테이션 사용)가 충족됐음을 수동 확인.
- **Committed in:** `8633a52`(Task 1), `6813653`(Task 2), `deec5af`(Task 3) 각 커밋에 포함

---

**Total deviations:** 2 auto-fixed (1건 Rule 3 blocking — Jackson 3.x 패키지 경로, 1건 Rule 3 tooling limitation — acceptance criteria grep의 리터럴 매칭 한계)
**Impact on plan:** 둘 다 코드의 실제 동작·계약(엔드포인트 시그니처/상태코드 매핑/예외 처리/A8·T-10-21·T-10-23·T-10-24 준수)에는 영향 없음. Jackson 3.x 임포트 수정은 이 저장소의 실제 의존성 좌표를 반영한 필수 수정이었고, 주석 표현 변경은 문서화 수준. 스코프 확장 없음.

## Issues Encountered

`SecurityConfigTest.kt`의 `AutoConfigureTestRestTemplate` 정확히-1회 acceptance criteria
게이트는 import 구문과 클래스 애노테이션이 동시에 필요한 이 패턴에서 구조적으로 만족 불가능함을
확인(위 Deviations #2 참고). 참조 파일(`HealthCheckSmokeTest.kt`)조차 이 게이트를 문자
그대로는 만족시킬 수 없다 — plan-checker/verify-phase 재검토 시 이 게이트의 의도를 "존재
확인(≥1)"으로 재정의할 필요가 있다고 판단해 여기 기록한다.

## User Setup Required

None - 이 플랜의 검증(`./gradlew build`, `./gradlew test`)은 실제 카카오 계정이나 `.env`
배포값 없이 전부 통과한다(`FakeKakaoUserInfoClientConfiguration`으로 카카오 API를 대체).
실제 카카오 계정으로의 전체 왕복(네이티브 SDK → 서버 → 앱 저장) 검증은 10-06(클라이언트
토큰 저장/authApi, 이미 완료됨)과 10-07(로그인 화면 UI) 통합 이후 D-16 검증 화면에서
확인 가능 — 이 플랜 자체는 서버측 HTTP 계약만 완성했고 실기기/시뮬레이터 확인 대상 UI가
없다.

## Threat Model Follow-ups (from plan)

- **T-10-21(refresh 경로 권한 상승, mitigate)** — `@Qualifier`로 refresh 전용 디코더를
  명시 주입해 `AuthControllerTest` Test 10/11(access 토큰·변조 토큰 각각 401)로 고정 완료.
- **T-10-22(보호된 `/api/**` 경로 권한 상승, mitigate)** — `SecurityConfigTest` Test 1~5가
  토큰 없음/refresh 토큰/만료 토큰/변조 토큰 4가지 경로를 전부 401로 고정 완료.
- **T-10-23(요청 본문 입력 검증, mitigate)** — `@field:NotBlank` + `@Valid`로 완료,
  `AuthControllerTest` Test 3/4/12로 회귀 게이트 확인.
- **T-10-24(에러 응답 정보 노출, mitigate)** — `AuthExceptionHandler`가 상수 코드 문자열만
  반환, `AuthControllerTest` Test 6이 클래스명/trace/스택트레이스 부재를 확인. 완료.
- **T-10-25(refresh 토큰 회전/폐기 부재, accept — 후속 phase 인계)** — 이번 플랜은
  `refreshToken = null` 반환으로 이 결정을 코드로 실현했을 뿐, 잔여 위험 자체는 그대로
  승계한다. 유출된 refresh 토큰은 30일 만료까지 무효화할 수단이 없다. 로그아웃/연결끊기
  phase에서 재검토 필요.
- **T-10-26(인증 엔드포인트 rate limit 부재, accept)** — 그대로 승계. 배포 시점에 인프라
  계층(리버스 프록시/PaaS)에서 rate limit을 거는 것이 이 phase 스코프보다 적절하다는 판단
  유지. 배포 선행조건으로 계속 인계.

## Next Phase Readiness

- ROADMAP 성공기준 1(카카오 로그인 완료 시 서버가 토큰 발급)의 서버측이 완성됨
- REQ-auth-session-token의 "만료 시 갱신" 서버 경로가 존재하고 오용(token_use 우회,
  서명 변조)이 차단됨을 자동 테스트로 증명
- 10-06(클라이언트 토큰 저장/authApi, 이미 완료됨)과 10-07(로그인 화면)이 소비할 HTTP
  계약(`POST /api/auth/kakao/login`, `POST /api/auth/refresh` 요청/응답 형태, 상태코드
  200/400/401)이 테스트로 고정됨
- Blocker 없음. T-10-25/T-10-26은 계획이 처음부터 accept로 분류한 잔여 위험이며 이 플랜에서
  새로 추가된 리스크가 아님

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*

## Self-Check: PASSED

- 파일 7개(신규 6개 + 이 SUMMARY.md) 전부 FOUND
- 커밋 3건(`8633a52`, `6813653`, `deec5af`) 전부 `git log --oneline --all`에서 FOUND
