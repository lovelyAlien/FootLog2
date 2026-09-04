---
phase: 10-authentication-kakao-oauth2-pkce
plan: 06
subsystem: auth
tags: [expo-secure-store, jwt-session, react-native, tdd, dependency-injection]

# Dependency graph
requires:
  - phase: 10-01
    provides: "EXPO_PUBLIC_API_BASE_URL 환경변수 계약 + expo-secure-store 패키지 정통성 창업자 승인"
provides:
  - "src/auth/config.ts — AuthTokens/SecureStoreDeps/AuthApiDeps 타입 계약, TOKEN_STORAGE_KEY, PROACTIVE_REFRESH_WINDOW_MS(D-04), AuthError(kind 구분)"
  - "src/auth/tokenStore.ts — saveTokens/loadTokens/clearTokens (단일 키 저장, 손상 방어)"
  - "src/auth/authApi.ts — exchangeKakaoToken/getValidAccessToken(선제 갱신)/authorizedFetch/defaultAuthApiDeps"
  - "src/auth/testing/fakeSecureStore.ts — 인메모리 SecureStore 더블(테스트 전용)"
affects: [10-07, 12]

# Tech tracking
tech-stack:
  added: ["expo-secure-store@~57.0.3"]
  patterns:
    - "src/notifications/의 DI 규약을 src/auth/에도 그대로 적용: 런타임 import는 deps.ts 단일 소유, 로직 파일은 config.ts의 좁힌 타입 계약만 받는다, 테스트는 testing/ 아래 손수 작성한 인메모리 더블을 주입(목킹 프레임워크 미사용)"
    - "in-flight 프로미스 재사용(모듈 스코프 변수 + finally로 해제)으로 동시 요청 시 리프레시 중복 호출을 1회로 합치는 패턴"
    - "defaultXxxDeps 객체의 필드를 getter로 선언해 '값 조립 시점'과 '값 검증 시점(최초 사용)'을 분리하는 패턴 — 모듈 로드/import만으로는 에러가 나지 않는다"

key-files:
  created:
    - src/auth/config.ts
    - src/auth/deps.ts
    - src/auth/tokenStore.ts
    - src/auth/authApi.ts
    - src/auth/testing/fakeSecureStore.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "expo install이 app.json에 자동으로 추가한 expo-secure-store config plugin 항목을 되돌림 — expo-secure-store는 이 용도에 config plugin이 불필요하고, app.json은 10-07이 소유하는 파일이라 충돌을 피함"
  - "authorizedFetch의 헤더 병합은 전역 Headers 인스턴스로 정규화하지 않고 평범한 객체 스프레드로 처리 — Headers 인스턴스 반복 시 헤더 이름이 소문자로 강제되어 호출부가 넘긴 원래 표기(예: X-Custom)가 사라지기 때문"
  - "defaultAuthApiDeps.apiBaseUrl을 getter로 선언해 EXPO_PUBLIC_API_BASE_URL 미설정 검사를 '최초 사용 시점'으로 미룸 — 모듈 로드 시점에 검사하면 이 객체를 import만 해도 에러가 난다"

patterns-established:
  - "인증 클라이언트 모듈(src/auth/)은 네이티브 SDK(@react-native-seoul/kakao-login)를 참조하지 않아 Jest node 환경에서 전부 테스트 가능 — UI/SDK 초기화는 10-07이 별도로 소유"

requirements-completed: [REQ-auth-session-token]

# Metrics
duration: 15min
completed: 2026-09-03
---

# Phase 10 Plan 06: 토큰 저장/선제 갱신/Bearer 헤더 부착 인증 클라이언트 Summary

**expo-secure-store 기반 토큰 저장소 + D-04 선제 갱신(만료 60초 전, in-flight 중복 제거) + authorizedFetch를 갖춘 순수 로직 인증 클라이언트 모듈을 TDD(RED→GREEN)로 완성 — 22개 신규 테스트 전부 통과, 기존 631개 테스트 무회귀.**

## Performance

- **Duration:** 약 15분
- **Started:** 2026-09-03T18:35:00+09:00 (worktree base 정렬 후)
- **Completed:** 2026-09-03T18:47:34+09:00
- **Tasks:** 3 (Task 1: 설치+계약+더블 / Task 2: 테스트 작성 RED / Task 3: 구현 GREEN)
- **Files modified:** 8 (신규 6개 + package.json/package-lock.json 수정 2개)

## Accomplishments

- REQ-auth-session-token의 클라이언트측 세 요구(안전하게 저장 / 만료 시 갱신 / 이후 요청에 재사용)가 전부 자동 테스트로 증명됨
- D-04(선제 갱신, reactive 401 재시도가 아님)가 `getValidAccessToken`의 만료-60초-여유창 체크와 Test 13~15로 코드/테스트 양쪽에 고정됨
- A8(리프레시 시 refresh 토큰 회전 없음)이 `refreshTokens`의 `json.refreshToken ?? current.refreshToken`과 Test 16으로 고정됨 — 응답의 null이 세션을 지우지 않음
- 동시 다발 요청이 리프레시 네트워크 호출을 1회로만 발생시키는 in-flight 중복 제거가 Test 19(3개 동시 호출)로 증명됨
- 토큰이 평문 저장소(AsyncStorage 등)나 콘솔 로그에 남을 경로가 grep 기반 acceptance criteria로 원천 차단됨(`console.` 실코드 0회, `expo-secure-store` 런타임 import는 `deps.ts` 단일 소유)
- 10-07과 Phase 12가 `authorizedFetch` 하나만 쓰면 인증된 요청을 보낼 수 있는 상태가 됨

## Task Commits

1. **Task 1: expo-secure-store 설치 + 계약(config/deps) + 인메모리 더블** - `f0e2fd2` (feat)
2. **Task 2: tokenStore/authApi 계약 테스트 작성(RED)** - `80172b9` (test)
3. **Task 3: tokenStore/authApi 구현(GREEN)** - `9cd288f` (feat)

**Plan metadata:** 이 SUMMARY 커밋에서 함께 처리(별도 docs 커밋 없음 — 병렬 worktree 실행이라 STATE.md/ROADMAP.md는 오케스트레이터가 소유)

_TDD 플랜(type: tdd) — RED(`80172b9`) → GREEN(`9cd288f`) 게이트 순서 정확히 준수됨. REFACTOR 커밋은 별도로 필요하지 않았음(GREEN 구현이 곧바로 깔끔했음)._

## Files Created/Modified

- `src/auth/config.ts` (64줄) - AuthTokens/SecureStoreDeps/AuthApiDeps 타입, TOKEN_STORAGE_KEY, PROACTIVE_REFRESH_WINDOW_MS(D-04 근거 주석), AuthError(kind: network/rejected/no-session)
- `src/auth/deps.ts` (35줄) - `expo-secure-store` 런타임 import 단일 소유, keychainAccessible(WHEN_UNLOCKED) 검토 흔적 주석
- `src/auth/tokenStore.ts` (50줄) - 단일 키 JSON 저장/로드/삭제, 손상 JSON·필드 누락 시 throw 없이 null
- `src/auth/authApi.ts` (172줄) - postJson 공통 헬퍼, exchangeKakaoToken, refreshTokens(내부), getValidAccessToken(in-flight 중복 제거), authorizedFetch, defaultAuthApiDeps(apiBaseUrl getter)
- `src/auth/testing/fakeSecureStore.ts` (45줄) - 인메모리 SecureStore 더블
- `src/auth/tokenStore.test.ts` (93줄) / `src/auth/authApi.test.ts` (321줄) / `src/auth/testing/fakeSecureStore.test.ts` (60줄) - 22+6=28개 계약 테스트
- `package.json` / `package-lock.json` - `expo-secure-store` 의존성 추가

## Decisions Made

- `expo install expo-secure-store`가 `app.json`의 `expo.plugins`에 자동으로 `"expo-secure-store"`를 추가했으나, 플랜이 명시적으로 금지한 항목(config plugin 불필요 + app.json은 10-07 소유)이라 즉시 되돌림. `git diff app.json`이 깨끗함을 확인.
- 헤더 병합 시 전역 `Headers` 클래스로 정규화하지 않고 평범한 객체 스프레드를 채택 — Node의 `Headers.forEach`는 헤더 이름을 소문자로 정규화해 반복하므로, 이를 그대로 썼다면 Test 22(`X-Custom` 대소문자 보존)가 실패했을 것.
- `defaultAuthApiDeps.apiBaseUrl`을 일반 필드가 아니라 getter로 선언 — 플랜의 "EXPO_PUBLIC_API_BASE_URL 미설정을 조용히 상대 경로 요청으로 흘려보내지 않는다"는 요구를 "모듈 로드 시점에 던지면 import만으로도 터진다"는 제약과 동시에 만족시키는 유일한 방법.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `expo install`이 app.json에 자동 추가한 불필요한 config plugin 항목 되돌림**
- **Found during:** Task 1
- **Issue:** `npx expo install expo-secure-store` 실행 후 `app.json`의 `expo.plugins` 배열 끝에 `"expo-secure-store"`가 자동으로 추가되어 있었다. 플랜은 "app.json의 expo.plugins에는 추가하지 않는다 — expo-secure-store는 config plugin이 필요 없고, app.json은 10-07이 소유한다(파일 충돌 방지)"를 명시적으로 요구한다.
- **Fix:** `app.json`에서 추가된 `"expo-secure-store"` 줄을 제거해 원본과 동일하게 복원.
- **Files modified:** `app.json` (편집 후 되돌려 최종 diff 없음)
- **Verification:** `git diff app.json`이 빈 결과를 반환함을 확인, `grep -c 'expo-secure-store' app.json` = 0 (Task 1 acceptance criteria 통과)
- **Committed in:** 별도 커밋 없음 — `app.json`은 수정 후 원상 복구되어 최종적으로 diff가 없으므로 스테이징/커밋 대상에서 자연히 제외됨

**2. [Rule 1 - Bug] Test 19(동시성) 타이밍 버그 수정**
- **Found during:** Task 3 (GREEN 구현 후 검증)
- **Issue:** Task 2에서 작성한 Test 19가 `resolveNextDeferred(...)`를 `p1/p2/p3` 생성 직후 동기적으로 호출했다. RED 단계(스텁이 즉시 `throw`)에서는 이 타이밍 문제가 드러나지 않았으나, GREEN 구현(실제 `loadTokens`의 await 체인을 통과해야 fetch가 호출됨)에서는 아직 아무 호출도 fake fetch에 도달하지 않은 상태라 `deferredResolvers`가 비어 있어 "resolve할 대기 중인 deferred 응답이 없다" 에러로 실패했다.
- **Fix:** `p1/p2/p3` 생성 후 `resolveNextDeferred` 호출 전에 `await new Promise((resolve) => setImmediate(resolve));`를 추가해 마이크로태스크 큐가 완전히 비워질 때까지 기다리게 함. `jest.useFakeTimers`/`jest.spyOn`을 쓰지 않는다는 acceptance criteria(Task 2)를 그대로 유지(실제 이벤트 루프 순서에만 의존, 가짜 타이머 아님).
- **Files modified:** `src/auth/authApi.test.ts`
- **Verification:** `npm test -- src/auth/` 35/35 통과(Test 19 포함), `grep -c 'jest.useFakeTimers\|jest.spyOn' src/auth/authApi.test.ts` = 0 유지 확인
- **Committed in:** `9cd288f` (Task 3 커밋에 함께 포함 — 테스트 파일의 타이밍 수정이라 구현 커밋과 분리하지 않음)

---

**Total deviations:** 2 auto-fixed (둘 다 Rule 1 — 버그/설정 오류 즉시 수정)
**Impact on plan:** 스코프 확장 없음. 둘 다 계획대로 동작하게 만들기 위한 최소 수정.

## Issues Encountered

None — 계획된 작업 범위 내에서 위 두 가지 자동 수정 외에 추가 문제는 없었음.

## User Setup Required

None - 창업자가 10-01에서 이미 `expo-secure-store` 패키지 정통성을 승인했고, 이번 플랜에서 그 승인을 근거로 설치를 완료함. 추가 조치 불필요.

## RED/GREEN 로그 인용

**RED (Task 2, 커밋 `80172b9`):**
```
FAIL iOS src/auth/tokenStore.test.ts
FAIL iOS src/auth/authApi.test.ts
PASS iOS src/auth/envContract.test.ts
PASS iOS src/auth/testing/fakeSecureStore.test.ts

Test Suites: 2 failed, 2 passed, 4 total
Tests:       22 failed, 13 passed, 35 total
```
22개 실패 전부 `Error: not implemented` 또는 그로 인한 단언 불일치(`toMatchObject` 기대값 vs `[Error: not implemented]`)였으며, import 해석 오류는 없었음.

**GREEN (Task 3, 커밋 `9cd288f`):**
```
PASS iOS src/auth/testing/fakeSecureStore.test.ts
PASS iOS src/auth/tokenStore.test.ts
PASS iOS src/auth/envContract.test.ts
PASS iOS src/auth/authApi.test.ts

Test Suites: 4 passed, 4 total
Tests:       35 passed, 35 total
```

**전체 스위트 무회귀 확인:**
```
Test Suites: 42 passed, 42 total
Tests:       659 passed, 659 total
```
(10-01 완료 시점 기준 631개 + 이번 플랜 신규 28개 = 659개, 정확히 일치)

`npx tsc --noEmit` — 두 단계 모두 성공(에러 0).

## 후속 인계 사항 (threat_model 잔여 항목)

- **T-10-29 (반응형 401 재시도 부재):** 이 모듈은 D-04(선제 갱신)만 구현했다. 저장된 만료 시각이 실제와 어긋나 서버가 여전히 401을 반환하는 잔여 경로가 있을 수 있으며, 그 경우 사용자가 할 수 있는 것은 재로그인뿐이다(현재는 재시도 UI가 이 경로를 자동 처리하지 않음). 반응형 401 재시도는 Phase 12(실제 도메인 API 호출이 생기는 시점)에서 검토 필요 — `authApi.ts` 파일 상단 주석에도 동일하게 명시함.
- **T-10-32 (평문 HTTP, accept 처리):** 로컬 개발 `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080`, 실기기 검증(10-07)에서는 LAN 평문 HTTP를 쓰게 되어 이 구간에서 토큰이 평문으로 흐른다. 공개 배포 시 HTTPS 강제가 선행조건 — 이번 phase(미배포 개발 검증 단계)는 이 리스크를 수용하고 넘어감(플랜의 threat_model 표에서 이미 `accept`로 명시된 디스포지션을 그대로 따름, 이 플랜에서 추가 조치 없음).

## 검증 방식 안내 (CLAUDE.md 실기기 확인 규약)

이 플랜은 UI가 없는 순수 로직 모듈이라 시뮬레이터/실기기 확인이 원천적으로 필요하지 않다 — 모든 검증이 Jest(node 환경) 자동 테스트로 완결됨. `checkpoint:human-verify` 게이트도 이 플랜에는 없음(모든 태스크가 `type="auto"`). 10-07(카카오 SDK 초기화 + 화면)에서 이 모듈을 실제로 소비할 때 시뮬레이터/실기기 검증이 필요해질 것.

## Next Phase Readiness

- 10-07이 `src/auth/authApi.ts`의 `exchangeKakaoToken`/`authorizedFetch`/`defaultAuthApiDeps`를 그대로 가져다 쓸 수 있음 — 카카오 SDK 초기화와 화면 배선만 남음
- Phase 12(클라이언트-서버 동기화)가 도메인 API 호출 시 `authorizedFetch` 하나만 쓰면 인증 헤더가 자동 부착됨
- 반응형 401 재시도(T-10-29)는 Phase 12 계획 시 재검토 필요 항목으로 인계
- `10-05-SUMMARY.md`가 아직 생성되지 않은 상태(병렬 wave 2의 다른 worktree 소관)라, 이 플랜은 `10-06-PLAN.md`의 `<interfaces>` 블록에 이미 인라인된 HTTP 계약(요청/응답 필드명)만을 근거로 구현했음 — 10-05가 실제로 다른 필드명을 확정했다면 `authApi.ts`의 `KakaoLoginResponse`/`RefreshResponse` 타입과 요청 본문 필드를 재확인할 것

## Self-Check: PASSED

- 파일 존재 확인: `src/auth/config.ts`, `src/auth/deps.ts`, `src/auth/tokenStore.ts`, `src/auth/authApi.ts`, `src/auth/testing/fakeSecureStore.ts`, `src/auth/testing/fakeSecureStore.test.ts`, `src/auth/tokenStore.test.ts`, `src/auth/authApi.test.ts` 전부 FOUND
- 커밋 존재 확인: `f0e2fd2`(Task 1), `80172b9`(Task 2 RED), `9cd288f`(Task 3 GREEN) 전부 `git log --oneline --all`에서 FOUND
- `npm test -- src/auth/` 재실행 — 35/35 통과 재확인
- `npm test` 전체 재실행 — 659/659 통과 재확인
- `npx tsc --noEmit` 재실행 — 에러 0 재확인

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*
