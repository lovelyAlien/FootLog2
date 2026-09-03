---
phase: 10-authentication-kakao-oauth2-pkce
plan: 04
subsystem: auth
tags: [kakao-oauth2, restclient, jpa, jwt, tdd, kotlin, spring-boot]

# Dependency graph
requires:
  - phase: 10-authentication-kakao-oauth2-pkce (plan 02)
    provides: "users.kakao_id/nickname/profile_image_url 컬럼 + UserRepository.findByKakaoId"
  - phase: 10-authentication-kakao-oauth2-pkce (plan 03)
    provides: "JwtIssuerService(issueAccessToken/issueRefreshToken/accessTokenTtlSeconds), Spring Security 7 필터 체인"
provides:
  - "KakaoUserInfoClient 인터페이스 + RestClient 기반 구현체(KakaoUserInfoRestClient) — kapi.kakao.com/v2/user/me 조회"
  - "KakaoAuthService.loginWithKakao(kakaoAccessToken): TokenResponse — find-or-create + JWT 발급 오케스트레이션"
  - "FakeKakaoUserInfoClient + FakeKakaoUserInfoClientConfiguration(@TestConfiguration) — 10-05가 재사용할 테스트 더블"
affects: [10-05-auth-endpoints, 10-06-client-token-storage, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "손수 작성한 인메모리 테스트 더블 + @TestConfiguration/@Primary — Mockito 없이 결정적 테스트(src/notifications/testing/fakeNotifications.ts 규약을 백엔드로 계승)"
    - "MockRestServiceServer를 RestClient.builder()에 수동 바인딩 — @AutoConfigureMockRestServiceServer류 자동설정 미사용, Boot 4에서 패키지 경로 불확실성 회피"
    - "RestClient의 retrieve().onStatus(...)로 4xx/5xx를 단일 도메인 예외(KakaoAuthException)로 변환 — 컨트롤러가 하위 예외 타입을 몰라도 됨"

key-files:
  created:
    - backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoClient.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoResponse.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/TokenResponse.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthException.kt
    - backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthService.kt
    - backend/src/test/kotlin/com/footlog/backend/auth/FakeKakaoUserInfoClient.kt
    - backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt
    - backend/src/test/kotlin/com/footlog/backend/auth/KakaoUserInfoRestClientTest.kt
  modified: []

key-decisions:
  - "카카오 토큰 교환 단계 없음(D-14 AMENDMENT 그대로 준수) — KakaoTokenClient/KakaoLoginRequest는 만들지 않고 GET /v2/user/me 조회만 구현"
  - "KakaoUserInfoResponse에 email 필드를 선언하지 않음 — 파싱 경로 자체를 없앰으로써 D-05를 구조적으로 보장(응답에 이메일이 와도 저장 불가능)"
  - "find-or-create에서 기존 로우 갱신 시 새 값이 null이어도 기존 값 유지하지 않고 덮어씀(D-06) — 카카오 최신 상태를 진실의 원천으로 취급"

requirements-completed: [REQ-auth-kakao-oauth]

duration: 약 20min
completed: 2026-09-03
---

# Phase 10 Plan 04: 카카오 로그인 서버 본체(KakaoAuthService) Summary

**클라이언트가 네이티브 SDK로부터 받은 카카오 액세스 토큰으로 `GET /v2/user/me`를 조회하고, 토큰은 즉시 폐기한 뒤 `kakao_id` 기준 find-or-create로 사용자 계정을 만들고 자체 access/refresh JWT를 발급하는 `KakaoAuthService`를 TDD(RED→GREEN)로 구현했다.**

## Performance

- **Duration:** 약 20분
- **Tasks:** 3/3 완료
- **Files modified:** 8 (신규 8, 수정 0 — Task 3은 Task 2가 만든 골격 파일을 채움)

## Accomplishments

- `KakaoUserInfoClient`(인터페이스) + `KakaoUserInfoRestClient`(RestClient 구현체)가 카카오 `GET /v2/user/me`를 호출해 사용자정보를 조회하고, 4xx/5xx를 `KakaoAuthException` 하나로 변환해 10-05가 401 매핑만 하면 되는 상태로 계약을 확정함
- `KakaoUserInfoResponse` DTO가 `id`를 `Long`으로 고정(Pitfall 3 회귀 방지)하고, `kakaoAccount`/`profile`을 nullable로 선언해 프로필 미동의 사용자도 로그인 가능(D-07). `email` 필드를 애초에 선언하지 않아 D-05(이메일 미저장)를 구조적으로 보장
- `KakaoAuthService.loginWithKakao`가 조회→find-or-create(D-08 UNIQUE 제약에 위임)→JWT 발급을 오케스트레이션하며, 카카오 회원번호(`info.id`)를 절대 `User.id`(서버 소유 UUID)에 넣지 않음(T-10-17)
- `kakaoAccessToken`이 `fetchUserInfo` 호출 1회 외에는 코드 어디에도 재사용/저장/로그되지 않음이 acceptance criteria 그레핑(2회 출현) + `KakaoAuthServiceTest` Test 12(users 테이블 전 컬럼에 토큰 문자열 부재)로 2중 고정됨(T-10-16)
- `FakeKakaoUserInfoClient` + `@TestConfiguration(FakeKakaoUserInfoClientConfiguration)` — Mockito 없이 실제 카카오 API 호출 없이 로그인 경로 전체를 결정적으로 테스트하는 더블. 10-05의 `AuthControllerTest`가 그대로 재사용할 수 있게 설계됨
- `KakaoAuthServiceTest` 12개 + `KakaoUserInfoRestClientTest` 5개, 총 17개 테스트로 find-or-create/D-05/D-06/D-07/D-08/D-14/Pitfall 3/JWT 발급 계약을 모두 자동 테스트로 고정

## Task Commits

Each task was committed atomically:

1. **Task 1: 인터페이스/DTO 계약 정의 + 테스트 더블** - `2d9073d` (feat)
2. **Task 2: KakaoAuthServiceTest + KakaoUserInfoRestClientTest 작성 (RED)** - `c4f42f5` (test)
3. **Task 3: KakaoAuthService 구현 (GREEN)** - `a626cbb` (feat)

_TDD 플랜(type: tdd) — RED(test) → GREEN(feat) 게이트 순서 확인됨. 이 실행은 worktree 병렬
executor로, 계획 메타데이터(STATE.md/ROADMAP.md) 커밋은 오케스트레이터가 wave 종료 후
일괄 수행하므로 여기서는 생성하지 않는다._

## RED/GREEN 로그 인용 (검증 항목)

**Task 2 RED (`KakaoAuthService`가 `TODO()` 골격 상태에서 실행, 17개 중 12개 실패 확인):**
```
KakaoAuthServiceTest > Int 범위를 초과하는 kakaoId로 로그인하면 값이 정확히 저장 조회된다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:160
KakaoAuthServiceTest > 로그인 후 users 테이블 어디에도 카카오 액세스 토큰 문자열이 저장되지 않는다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:246
KakaoAuthServiceTest > 처음 보는 kakaoId로 로그인하면 새 User가 생성되고 id는 kakaoId가 아닌 UUID다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:82
KakaoAuthServiceTest > kakaoAccount가 null인 응답으로도 로그인이 성공하고 nickname profileImageUrl은 null이다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:128
KakaoAuthServiceTest > 카카오 인증 실패 시 예외가 전파되고 계정이 생성되지 않는다() FAILED
    org.opentest4j.AssertionFailedError at KakaoAuthServiceTest.kt:175
        Caused by: kotlin.NotImplementedError at KakaoAuthServiceTest.kt:176
KakaoAuthServiceTest > 같은 kakaoId로 두 번 로그인하면 count 증가분이 정확히 1이다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:98
KakaoAuthServiceTest > 백엔드는 클라이언트가 준 카카오 토큰을 그대로 사용자정보 조회에 사용한다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:232
KakaoAuthServiceTest > 두 번째 로그인의 nickname profileImageUrl이 다르면 최신값으로 갱신된다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:111
KakaoAuthServiceTest > 발급된 refreshToken은 null이 아니고 같은 subject를 갖는다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:204
KakaoAuthServiceTest > 발급된 accessToken의 subject는 새로 생성된 user id이고 token_use는 access다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:189
KakaoAuthServiceTest > TokenResponse expiresIn은 accessTokenTtlSeconds와 같다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:219
KakaoAuthServiceTest > kakaoAccount profile이 null인 응답으로도 로그인이 성공한다() FAILED
    kotlin.NotImplementedError at KakaoAuthServiceTest.kt:145

17 tests completed, 12 failed
```
실패 사유 전부 `kotlin.NotImplementedError`(`TODO()`) — 컴파일 에러가 아니다. 나머지 5개
(`KakaoUserInfoRestClientTest`)는 Task 1의 `KakaoUserInfoRestClient` 구현이 이미 존재해
바로 GREEN이었다(계획이 명시적으로 허용한 정상 상태) — `build/test-results/test/TEST-
com.footlog.backend.auth.KakaoUserInfoRestClientTest.xml`에서 `tests="5" failures="0"
errors="0"` 확인.

**Task 3 GREEN (`./gradlew test --tests "*KakaoAuthServiceTest" --tests
"*KakaoUserInfoRestClientTest"`):**
```
> Task :test

BUILD SUCCESSFUL in 20s
```
17개 전부 통과. 전체 스위트(`./gradlew build`)도 `BUILD SUCCESSFUL`로 확인 — Phase 9/10-01~03의
기존 테스트 전부 그린 유지.

## Files Created/Modified

- `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoClient.kt` - 인터페이스 + RestClient 구현체(`KakaoUserInfoRestClient`), 4xx/5xx를 `KakaoAuthException`으로 변환
- `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoResponse.kt` - 카카오 `/v2/user/me` 응답 DTO(`id: Long`, `kakaoAccount`/`profile` nullable, `email` 필드 없음)
- `backend/src/main/kotlin/com/footlog/backend/auth/TokenResponse.kt` - 로그인/리프레시 공통 응답 DTO
- `backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthException.kt` - 카카오 사용자정보 조회 실패 단일 예외 타입
- `backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthService.kt` - 조회→find-or-create→JWT 발급 오케스트레이션(`loginWithKakao`)
- `backend/src/test/kotlin/com/footlog/backend/auth/FakeKakaoUserInfoClient.kt` - 손수 작성한 테스트 더블 + `@TestConfiguration`(`FakeKakaoUserInfoClientConfiguration`)
- `backend/src/test/kotlin/com/footlog/backend/auth/KakaoAuthServiceTest.kt` - find-or-create/D-05~D-08/D-14/Pitfall 3/JWT 발급 계약 12개
- `backend/src/test/kotlin/com/footlog/backend/auth/KakaoUserInfoRestClientTest.kt` - HTTP 계약 5개(GET/Bearer 헤더/email 무시/kakao_account null/401→예외 변환/토큰 미유출)

## Decisions Made

- D-14 AMENDMENT를 그대로 준수 — `KakaoTokenClient`/`KakaoLoginRequest`(code/codeVerifier/redirectUri)는 만들지 않았고, 카카오 토큰 교환 호출 경로가 `backend/src/main/`에 전혀 존재하지 않음을 grep으로 확인(`grep -rn 'oauth/token|client_secret|code_verifier' backend/src/main/` 결과 없음)
- `KakaoUserInfoResponse`에 `email` 필드 자체를 선언하지 않음 — Jackson이 미지 필드로 무시하게 해 D-05를 "저장하지 않기로 함"이 아니라 "저장할 방법이 코드에 없음"으로 구조적으로 강제
- find-or-create 갱신 시 기존 값 보존이 아니라 항상 카카오 최신값으로 덮어씀(D-06) — 사용자가 카카오에서 프로필을 지운 상태도 그대로 반영하는 것이 의도된 동작

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Acceptance criteria grep과 실제 엔드포인트 URL/API 문자열 리터럴 충돌**
- **Found during:** Task 1 (acceptance_criteria 검증 중)
- **Issue:** 계획이 요구한 코드/설명 그대로 작성하면 두 개의 grep 게이트가 오탐했다:
  (a) `KakaoUserInfoClient.kt`에 "RestClient.create()로 직접 만들지 않는 이유"를 설명하는
  주석 문구가 `grep -c 'RestClient.create()'` 게이트(기대값 0)를 오히려 1로 만들었고,
  (b) 같은 파일 상단 주석에 엔드포인트 URL을 한 번 더 언급해 `grep -c
  'kapi.kakao.com/v2/user/me'` 게이트(기대값 1)가 2가 됐다. 두 게이트 모두 "실제 코드가
  이 패턴을 쓰는지"를 검사하려는 의도였는데, 주석 프로즈의 리터럴 문자열까지 함께 잡혔다
  (10-02-SUMMARY.md에서 이미 한 번 발생한 것과 동일 계열 충돌).
- **Fix:** 의미를 유지하면서 리터럴 문자열만 회피 — "RestClient.create()" → "정적 팩토리로
  직접 생성", "kapi.kakao.com/v2/user/me 엔드포인트" → "카카오 사용자정보 조회 엔드포인트"로
  주석 표현 변경. 실제 `.uri("https://kapi.kakao.com/v2/user/me")` 코드는 그대로 유지.
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/auth/KakaoUserInfoClient.kt`
- **Verification:** 두 grep 게이트 모두 기대값(1, 0)으로 재확인, `./gradlew build` 그린
- **Committed in:** `2d9073d` (Task 1 커밋)

**2. [Rule 3 - Blocking] `KakaoUserInfoRestClientTest.kt` 상단 주석의 애노테이션 이름 언급이 "미사용 확인" grep 게이트와 충돌**
- **Found during:** Task 2 (acceptance_criteria 검증 중)
- **Issue:** `@AutoConfigureMockRestServiceServer`를 쓰지 않는다는 설명 주석이 그 애노테이션
  이름을 문자 그대로 포함해, "이 애노테이션이 코드에 없어야 한다"는 게이트(`grep -c
  'AutoConfigureMockRestServiceServer'` 기대값 0)를 1로 오탐시켰다.
- **Fix:** 주석에서 애노테이션 이름을 직접 인용하지 않고 "관련 자동설정 애노테이션"으로
  풀어서 설명. 실제 코드는 여전히 그 애노테이션을 쓰지 않음(수동 `bindTo` 방식 그대로).
- **Files modified:** `backend/src/test/kotlin/com/footlog/backend/auth/KakaoUserInfoRestClientTest.kt`
- **Verification:** grep 게이트 0으로 재확인, `./gradlew test --tests "*KakaoUserInfoRestClientTest"` 5/5 그린
- **Committed in:** `c4f42f5` (Task 2 커밋)

**3. [Rule 3 - Blocking] `KakaoAuthService.kt` 상단 주석의 "카카오 토큰 교환 엔드포인트" 인용이 plan-level `<verification>` grep과 충돌**
- **Found during:** Task 3 (plan `<verification>`의 `grep -rn 'oauth/token|client_secret|code_verifier' backend/src/main/` 검증 중)
- **Issue:** "kauth.kakao.com/oauth/token을 호출하는 코드를 나중에 여기 추가하지 말 것"이라는
  경고 주석이 그 문자열을 리터럴로 포함해, D-14 준수를 증명하려는 grep 게이트가 오히려
  실패 출력을 내게 됐다(의미상 위반이 아니라 경고 주석 자체가 매칭됨).
- **Fix:** "카카오 인증 서버의 토큰 발급 엔드포인트를 호출하는 코드를 나중에 여기 추가하지
  말 것"으로 의미는 동일하게 유지하되 리터럴 URL 패턴만 회피.
- **Files modified:** `backend/src/main/kotlin/com/footlog/backend/auth/KakaoAuthService.kt`
- **Verification:** `grep -rn 'oauth/token|client_secret|code_verifier' backend/src/main/` 결과 없음 재확인, `./gradlew build` 그린
- **Committed in:** `a626cbb` (Task 3 커밋)

**4. [Rule 3 - Tooling limitation, 문서화만] `grep -v '^\s*//' ... | grep -ci 'log\|print'` 게이트가 패키지명/메서드명과 오탐**
- **Found during:** Task 3 (acceptance_criteria 검증 중)
- **Issue:** `KakaoAuthService.kt`의 `grep -v '^\s*//' | grep -ci 'log\|print'` 결과가 기대값
  0이 아니라 4였다. 원인을 확인한 결과 실제 로그/print 호출이 아니라, 저장소 전체가 쓰는
  패키지명 `com.footlog.backend`(**"foot`log`"**)와, 이 플랜의 `<interfaces>`가 10-05 소비
  계약으로 명시한 메서드명 `loginWithKakao`(**"`log`inWithKakao"**)가 대소문자 무시(`-i`)
  검사에서 "log"와 우연히 일치했다. 패키지명은 저장소 전역 컨벤션이고 메서드명은 계획의
  `<interfaces>` 블록이 명시적으로 고정한 계약이라 둘 다 이름을 바꿀 수 없다.
- **Fix:** 코드를 바꾸지 않고 `grep -n 'println|\.log\(|logger\.|System\.out|print\('`로
  실제 로그/print 호출 부재를 직접 확인(결과 없음). 이 grep 게이트의 실제 의도(토큰이 로그로
  새어 나갈 경로가 없음)는 충족됐고, 리터럴 매칭의 한계로 인한 오탐임을 여기에 기록한다
  (10-02-SUMMARY.md의 동일 계열 게이트 한계와 같은 근본 원인).
- **Files modified:** 없음(문서화만)
- **Verification:** 실제 로그/print 호출 부재를 grep으로 직접 확인, `./gradlew build` 그린
- **Committed in:** N/A(코드 변경 없음)

---

**Total deviations:** 4 auto-fixed (전부 Rule 3 — acceptance criteria grep과 필수 코드/명명 계약 사이의 리터럴 문자열 충돌 또는 게이트 한계)
**Impact on plan:** 4건 모두 주석 표현 변경 또는 문서화 수준이며, 실제 코드의 동작·계약(인터페이스 시그니처/URL/예외 변환/D-05~D-14 준수)에는 영향 없음. 스코프 확장 없음.

## Issues Encountered

None beyond the four auto-fixed deviations above(전부 acceptance criteria grep의 리터럴 매칭 한계).

## User Setup Required

None - 이 플랜의 검증(`./gradlew build`, `./gradlew test`)은 실제 카카오 계정이나 `.env`
배포값 없이 전부 통과한다(`FakeKakaoUserInfoClient`로 카카오 API를 대체). 실제 카카오
계정으로의 전체 왕복 검증은 10-05(HTTP 엔드포인트 추가) 이후 D-16 검증 화면에서 확인 가능.

## Threat Model Follow-ups (from plan)

- **T-10-15(탈취된 카카오 토큰 재사용, accept)** — 이번 플랜은 이 잔여 위험을 그대로
  승계한다. 서버는 토큰을 자체 검증하지 않고 `/v2/user/me` 호출로 카카오가 직접 검증하게
  하므로 위조 토큰은 통하지 않으나, 탈취된 진짜 토큰의 재사용 창은 남는다. 후속 하드닝
  후보: 카카오의 앱 바인딩 확인 엔드포인트(`app_id` 일치 검증)로 2차 방어선을 추가하는 것 —
  이번 phase는 그 엔드포인트 계약을 직접 검증하지 않았으므로(추측 구현 금지) 채택하지
  않았다. 10-05/10-07 또는 후속 phase가 필요성을 재평가해야 한다.
- **T-10-18(카카오 nickname에 스크립트/HTML 삽입, accept)** — 이 플랜은 값을 저장만 하고
  렌더링하지 않으므로 영향 없음. 웹 클라이언트가 생기면 표준 이스케이프가 필요하다는 점을
  그대로 인계한다.

## Next Phase Readiness

- 10-05(AuthController)가 소비할 `KakaoAuthService.loginWithKakao(String): TokenResponse`
  계약이 존재하고 실제 Postgres 위에서 find-or-create/JWT 발급이 테스트로 증명됨
- 10-05의 `AuthControllerTest`가 `FakeKakaoUserInfoClientConfiguration`을 그대로
  `@Import`해서 재사용할 수 있음(이 플랜이 그렇게 설계함)
- `KakaoAuthException`이 단일 예외 타입으로 확정돼 10-05는 이 예외 하나만 401로
  매핑하면 됨
- Blocker 없음. A8(리프레시 토큰 회전 없음)은 10-03에서 이미 인계된 트레이드오프로
  이 플랜에서 새로 추가된 리스크 없음

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*

## Self-Check: PASSED

- 파일 9개(신규 8개 + 이 SUMMARY.md) 전부 FOUND
- 커밋 3건(`2d9073d`, `c4f42f5`, `a626cbb`) 전부 `git log --oneline --all`에서 FOUND
