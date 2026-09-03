---
phase: 10-authentication-kakao-oauth2-pkce
plan: 01
subsystem: auth
tags: [kakao-oauth, env-contract, package-legitimacy, expo, jwt]

# Dependency graph
requires: []
provides:
  - "카카오 개발자 콘솔 앱 등록 완료(iOS 번들 ID `com.jaeseungchoun.footlog`, 카카오 로그인 활성화, 이메일 동의항목 미설정)"
  - "로컬 `.env`(git-ignored)에 KAKAO_NATIVE_APP_KEY / JWT_SECRET / EXPO_PUBLIC_API_BASE_URL 유효값 확보"
  - "expo-secure-store 패키지 정통성 창업자 승인(설치는 10-06 소관, 이번엔 게이트만)"
affects: [10-02, 10-03, 10-04, 10-05, 10-06, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "정적 파싱 회귀 가드(fs.readFileSync + 문자열/정규식 단언, src/notifications/infoPlist.test.ts와 동일 관용구)를 .env.example/.gitignore 계약에도 적용"

key-files:
  created:
    - .env.example
    - src/auth/envContract.test.ts
  modified:
    - .gitignore
    - .planning/phases/10-authentication-kakao-oauth2-pkce/10-VALIDATION.md

key-decisions:
  - "카카오 콘솔에서 REST API 키/client_secret은 발급하지 않음 — D-14 AMENDMENT로 백엔드가 카카오 토큰 교환을 하지 않으므로 네이티브 앱 키만 필요"
  - "expo-secure-store는 이번 플랜에서 설치하지 않음 — Task 2는 승인 게이트일 뿐, 설치는 10-06 소관"

patterns-established:
  - "환경변수 실제 시크릿 커밋 방지: .gitignore의 `.env*` + `!.env.example` 부정 패턴 조합, .env.example은 값이 항상 빈 문자열(공개 기본값 EXPO_PUBLIC_API_BASE_URL만 예외)"

requirements-completed: [REQ-auth-kakao-oauth]

duration: TBD
completed: 2026-09-03
---

# Phase 10 Plan 01: 카카오 개발자 콘솔 등록 + 패키지 정통성 게이트 + 환경변수 계약 Summary

**카카오 개발자 콘솔에 FootLog 앱을 등록(네이티브 앱 키만 발급)하고, expo-secure-store 패키지 정통성을 창업자가 승인했으며, 저장소 전역이 참조할 `.env.example` 환경변수 이름 계약과 실제 시크릿 커밋을 막는 7종 회귀 가드(`src/auth/envContract.test.ts`)를 만들었다.**

## Performance

- **Tasks:** 3 (Task 1: 카카오 콘솔 등록[human-action] / Task 2: 패키지 정통성 승인[human-verify] / Task 3: 환경변수 계약 + 회귀 가드[auto])
- **Files modified:** 4 (`.env.example` 신규, `.gitignore` 수정, `src/auth/envContract.test.ts` 신규, `10-VALIDATION.md` 수정)

## Accomplishments

- Phase 10 전체의 유일한 하드 블로커(10-RESEARCH.md `## Environment Availability` "Fallback: 없음")였던 카카오 개발자 콘솔 앱 등록이 해소됨
- `expo-secure-store`가 감사 표에 없는 `[ASSUMED]` npm 패키지였으나 창업자가 npm 레지스트리 + Expo 공식 문서를 직접 확인해 승인 — 10-06이 이 승인을 전제로 설치를 진행할 수 있게 됨
- 이후 모든 Phase 10 플랜(10-03/10-06/10-07)이 참조할 환경변수 이름이 `.env.example` 단일 파일에 고정됨
- 실제 시크릿이 `.env.example`에 커밋되는 경로를 자동 테스트(7개 단언, 전부 통과)로 영구히 차단

## Task Commits

1. **Task 1: 카카오 개발자 콘솔 앱 등록(창업자 완료 확인)** - `cde99a2` (docs)
2. **Task 2: expo-secure-store 패키지 정통성 승인 기록** - `69bf94f` (docs)
3. **Task 3: .env.example 환경변수 계약 + 시크릿 커밋 회귀 가드** - `PENDING` (feat)

**Plan metadata:** `PENDING` (docs: complete plan)

## Files Created/Modified

- `.env.example` - Phase 10이 요구하는 6개 환경변수 이름 계약(값은 전부 빈 문자열, `EXPO_PUBLIC_API_BASE_URL`만 로컬 기본값 예외)
- `.gitignore` - `!.env.example` 부정 패턴 추가(`.env*` 무시 규칙에서 example만 예외 처리)
- `src/auth/envContract.test.ts` - `.env.example`/`.gitignore`를 정적으로 읽어 실제 시크릿 유입을 막는 7개 단언
- `.planning/phases/10-authentication-kakao-oauth2-pkce/10-VALIDATION.md` - Manual-Only Verifications 첫 행을 완료 상태로 갱신, AMENDMENT 반영 문구 정정

## Task 1 — 카카오 개발자 콘솔 앱 등록 (완료, 창업자 직접 수행)

창업자가 developers.kakao.com에 카카오 계정으로 로그인해 다음을 완료했다:

- 앱 이름 `FootLog` 등록
- iOS 플랫폼 등록 — 번들 ID `com.jaeseungchoun.footlog` (`app.json`의 `expo.ios.bundleIdentifier`와 정확히 일치)
- 카카오 로그인 활성화 설정 ON
- 동의항목: 닉네임(동의) / 프로필 사진(선택 동의) 설정, **카카오계정(이메일)은 설정하지 않음** — D-05(이메일 미저장)/D-07(미동의자도 로그인 허용)에 따라 이 앱은 이메일을 애초에 요청하지 않는다
- REST API 키 / client_secret은 발급하지 않음 — D-14 AMENDMENT로 백엔드가 카카오 `POST /oauth/token` 교환을 하지 않으므로 불필요

저장소 루트의 로컬 `.env`(git-ignored, 커밋 대상 아님)에 3개 환경변수가 유효한 형태로 존재함을 자동 검증했다(**값 자체는 아래에도, 어떤 문서에도 인용하지 않음** — 존재 여부와 길이만 확인):

```
test -f .env                                          → 성공
grep -cE '^KAKAO_NATIVE_APP_KEY=.+$' .env              → 1
grep -E '^JWT_SECRET=' .env | cut -d= -f2- | wc -c     → 45 (≥33 요구치 충족)
grep -cE '^EXPO_PUBLIC_API_BASE_URL=.+$' .env          → 1
git check-ignore -q .env                               → 성공(정상적으로 무시됨)
```

`JWT_SECRET`이 32바이트 이상이므로 10-03의 `NimbusJwtEncoder`/`NimbusJwtDecoder` 기동 실패(10-RESEARCH.md Pitfall 2) 위험이 없다.

10-VALIDATION.md의 Manual-Only Verifications 첫 행을 완료 상태로 갱신하고, AMENDMENT로 불필요해진 REST API 키/client_secret 언급을 실제 수행 내용(네이티브 앱 키만 발급)에 맞게 정정했다.

## Task 2 — expo-secure-store 패키지 정통성 확인 (완료, 창업자 승인)

10-06(클라이언트 토큰 저장)이 새로 설치해야 하는 `expo-secure-store`는 10-RESEARCH.md `## Package Legitimacy Audit` 감사 표에 없는 `[ASSUMED]` 패키지였다. 창업자가 아래 두 곳을 직접 확인하고 승인("승인")했다:

- https://www.npmjs.com/package/expo-secure-store — Repository가 `github.com/expo/expo`(Expo 공식 모노레포)를 가리키고, 주간 다운로드 수·최근 배포일이 1st-party Expo 모듈 수준임을 확인
- https://docs.expo.dev/versions/latest/sdk/securestore/ — Expo 공식 문서에 SDK 모듈로 등재되어 있음을 확인

10-RESEARCH.md `## Package Legitimacy Audit` 표와 동일한 형식으로 기록:

| Package | Registry | Verification Method | Source Repo | Disposition |
|---------|----------|---------------------|--------------|-------------|
| `expo-secure-store` | npm | 창업자가 npm 레지스트리(Repository/Weekly Downloads/최근 배포일) + Expo 공식 SDK 문서를 직접 확인 | `github.com/expo/expo` | Approved `[VERIFIED: 창업자 수동 확인 2026-09-03]` |

**설치는 이번 플랜에서 하지 않았다** — `grep -c 'expo-secure-store' package.json` = 0. 이 태스크는 승인 게이트이며, 실제 설치는 10-06 Task 1의 작업이다.

## Task 3 — .env.example 환경변수 계약 + 시크릿 커밋 회귀 가드 (완료)

`.env.example`을 저장소 루트에 생성했다. 모든 값은 등호 뒤가 비어 있고(`EXPO_PUBLIC_API_BASE_URL`만 로컬 개발 기본값 `http://localhost:8080`으로 예외), 파일 상단에 이 파일이 값이 아니라 *이름*의 계약이라는 한글 주석을 뒀다. 6개 키(`KAKAO_NATIVE_APP_KEY`, `EXPO_PUBLIC_API_BASE_URL`, `JWT_SECRET`, `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`) 각각에 출처/용도 주석을 붙였다. D-14 AMENDMENT로 백엔드가 쓰지 않는 `client_secret`/REST API 키는 포함하지 않았다.

`.gitignore`의 `# local env files` 섹션 `.env*` 바로 다음 줄에 `!.env.example`을 추가해 부정 패턴 예외를 걸었다(기존 `.env*` 줄은 그대로 유지).

`src/auth/envContract.test.ts`를 `src/notifications/infoPlist.test.ts`와 동일한 관용구(`@jest-environment node` + `fs.readFileSync` 정적 파싱, `require`/`dotenv` 런타임 로더 미사용)로 작성해 7개 단언 전부 통과를 확인했다:

```
PASS iOS src/auth/envContract.test.ts
  ✓ Test 1: 6개 필수 키를 모두 정의한다
  ✓ Test 2: KAKAO_NATIVE_APP_KEY 값이 빈 문자열이다
  ✓ Test 3: JWT_SECRET 값이 빈 문자열이다
  ✓ Test 4: DATABASE_PASSWORD 값이 빈 문자열이다
  ✓ Test 5: 32자 이상의 hex/base64 시크릿 형태 문자열이 등장하지 않는다
  ✓ Test 6: .gitignore가 .env*와 !.env.example을 모두 포함한다
  ✓ Test 7: EXPO_PUBLIC_ 접두사를 가진 키는 EXPO_PUBLIC_API_BASE_URL 하나뿐이다
Tests: 7 passed, 7 total
```

Acceptance criteria 전항 통과 확인:

```
test -f .env.example                                          → 성공
git check-ignore -q .env.example; echo $?                      → 1 (무시되지 않음, 커밋 대상)
grep -c '^!\.env\.example$' .gitignore                         → 1
grep -c '^KAKAO_NATIVE_APP_KEY=$' .env.example                 → 1
grep -c '^JWT_SECRET=$' .env.example                            → 1
grep -c '^DATABASE_PASSWORD=$' .env.example                     → 1
grep -c 'client.secret\|CLIENT_SECRET\|REST_API_KEY' .env.example → 0
grep -cE '^EXPO_PUBLIC_' .env.example                           → 1
```

## Decisions Made

- 카카오 콘솔에서 REST API 키/client_secret은 발급하지 않음 — D-14 AMENDMENT로 백엔드가 카카오 토큰 교환을 하지 않으므로 네이티브 앱 키만 필요(불필요한 시크릿 발급을 원천적으로 피함)
- `expo-secure-store` 설치는 이번 플랜 범위 밖 — 정통성 승인 게이트와 실제 설치(10-06)를 명확히 분리해 GSD 패키지 정통성 규정(`[ASSUMED]` 패키지는 설치 전 사람 확인 필수)을 지켰다

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - 카카오 개발자 콘솔 앱 등록과 `.env` 값 채우기는 창업자가 이미 완료했다(Task 1). 추가 조치 불필요.

## Next Phase Readiness

- 10-02(V4 마이그레이션)/10-03(JWT 발급·검증 인프라, 이미 실행됨)/10-04/10-06/10-07이 참조할 환경변수 이름 계약(`.env.example`)이 고정됨
- `expo-secure-store` 설치 승인이 완료되어 10-06이 차단 없이 진행 가능
- 카카오 개발자 콘솔의 네이티브 앱 키가 로컬 `.env`에 존재하므로 10-07(클라이언트 SDK 초기화)이 값 발급을 기다릴 필요 없음

---
*Phase: 10-authentication-kakao-oauth2-pkce*
*Completed: 2026-09-03*
