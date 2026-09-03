---
phase: 10-authentication-kakao-oauth2-pkce
plan: 07
type: execute
wave: 4
status: task-3-pending-founder
---

# 10-07 SUMMARY — Phase 10 전체 관통 검증

## Plan
10-07 (wave 4, non-autonomous — checkpoint:human-verify 포함, 마지막 플랜)

## Tasks: 2/3 (Task 1, 2 완료 / Task 3 창업자 실기기 확인 대기)

## Task 1 — app.config.js 플러그인 주입 + 카카오 로그인 모듈 + 개발자 검증 화면 (완료)

백그라운드 실행기가 수행. 상세 내역은 `.planning/phases/10-authentication-kakao-oauth2-pkce/10-07-TASK1-NOTE.md` 참고.

- 생성: `app.config.js`, `src/auth/kakaoLogin.ts`, `src/auth/devLoginContent.ts`, `src/app/dev-login.tsx`, `src/app/__tests__/dev-login-wiring.test.ts`
- 커밋: `45a2d4c`(구현), `15434ab`(진행 노트)
- 검증: `npm test` 43 suites / 671 tests 전체 통과, `npx tsc --noEmit` 0 errors, plan acceptance_criteria 10종 grep 전부 통과
- Deviations 2건(Rule 3, 리터럴 매칭 우회 — SDK 단일 importer grep 오탐 수정, `exchangeKakaoToken` 네임스페이스 import 전환) — 실제 동작에 영향 없음, TASK1-NOTE.md에 상세 기록

## Task 2 — Dev Client 재빌드 + 시뮬레이터 자체 검증 (완료, 오케스트레이터 직접 수행)

### 네이티브 재빌드

- `npx expo prebuild --clean --platform ios` — `.env` 자동 로드 확인(`env: load .env`), `ios/` 디렉터리 생성
- `pod install` — 최초 시도가 로컬 Ruby/CocoaPods 로케일(UTF-8 미설정)로 실패 → `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`로 재시도해 성공(128 pods 설치, KakaoSDKCommon 포함). 저장소 코드와 무관한 로컬 환경 이슈 — 코드 변경 없음
- `ios/FootLog/Info.plist` 확인:
  - `kakao<네이티브앱키>` 형태 URL Scheme 1개 존재 (grep count 3 — URL scheme + LSApplicationQueriesSchemes 2곳)
  - `LSApplicationQueriesSchemes`에 `kakaokompassauth`, `storykompassauth`, `kakaolink` 포함
  - Phase 2 확정 권한 문구 3종(`NSLocationWhenInUseUsageDescription`/`NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`) app.json 원본과 동일하게 보존 확인(T-10-38 게이트 통과)
- 실제 값(네이티브 앱 키 등)은 이 문서 어디에도 인용하지 않음

### 빌드/실행 경로 이슈 1건 — headless xcodebuild가 `.env`를 못 읽음

- **증상**: iOS Simulator MCP의 headless `xcodebuild` 경로로 빌드 시, expo-updates의 fingerprint 생성 스크립트(Xcode Run Script phase, 별도 Node 프로세스)가 `app.config.js`를 재평가하는데 이 프로세스에는 `.env`가 로드돼 있지 않아 `KAKAO_NATIVE_APP_KEY 환경변수가 없습니다` throw로 빌드 실패
- **원인**: `.env` 자동 로드는 Expo CLI(`npx expo ...`)가 자기 프로세스에서만 수행 — headless `xcodebuild`를 직접 호출하면 그 이점이 없고, 그 자식인 Run Script phase도 환경변수를 못 받음
- **조치**: 플랜이 원래 제안한 경로인 `npx expo run:ios`로 전환(Expo CLI가 `.env`를 로드한 뒤 자식 프로세스로 상속) — 코드 변경 없이 빌드 성공. (`npx expo run:ios` 자체도 `pod install`을 재확인하며 동일한 LANG 이슈를 다시 겪어 같은 방식으로 재시도)
- 이 이슈는 로컬 개발 환경/빌드 호출 방식에 국한되며 저장소 코드 결함이 아님. `app.config.js`를 수정하지 않았다

### 백엔드 로컬 기동 이슈 1건 — Spring Boot Docker Compose 통합과 구버전 Docker Compose CLI 비호환

- **증상**: `./gradlew bootRun`(local 프로파일, docker-compose 자동 기동) 시도 시 `tools.jackson.core.exc.StreamReadException` — `docker compose version --format json`이 JSON 뒤에 리터럴 `\n`(백슬래시+n 두 글자)을 덧붙이는 이 머신의 구버전 Docker Compose CLI(v2.2.3, 2021년) 버그로 인해 Spring Boot의 JSON 파서가 trailing 토큰에서 실패
- **원인**: 저장소 코드/설정과 무관한 로컬 Docker Compose CLI 플러그인 버전 문제
- **조치**: `docker compose -f backend/compose.yaml up -d`로 Postgres를 수동 기동한 뒤, `SPRING_DOCKER_COMPOSE_ENABLED=false` + 수동 `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`로 `bootRun` 실행 — Flyway V1~V4 전체 마이그레이션 성공, `/actuator/health` UP 확인. **저장소 코드/설정 변경 없음**(compose.yaml, application.yml 등 전부 그대로)

### 시뮬레이터에서 Claude가 직접 확인한 항목

iPhone 17 Pro 시뮬레이터 attach → `npx expo run:ios`로 네이티브 빌드/설치 → Metro(포트 8090, 8081 포트 충돌 회피) 연결 → `xcrun simctl openurl booted footlog://dev-login`로 진입 → 화면 조작.

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| a | 화면이 크래시 없이 렌더, `signed-out` 상태로 시작 | ✅ PASS | 스크린샷 확인, "카카오로 로그인" 버튼만 노출 |
| b | 카카오 로그인 버튼이 탭에 반응 | ✅ PASS | 탭 즉시 `signing-in` 상태("로그인 중...") 전환 확인 |
| d | 카카오 로그인 화면(웹 폴백)이 실제로 뜸 | ✅ PASS | iOS 시스템 `ASWebAuthenticationSession` 동의 프롬프트("'FootLog'이(가) 'kauth.kakao.com'을(를) 사용하여 로그인하려고 합니다") 노출 확인. 창업자 계정으로 로그인 완주하지 않음(Task 3 소관) |
| e | 로그인 취소 시 `rejected` 문구 + 재시도 버튼 | ✅ PASS | 시스템 프롬프트에서 "취소" 탭 → "로그인이 거부됐어요. 다시 시도해주세요." + "다시 시도" 버튼 렌더 확인(D-15) |
| c | 백엔드 중지 상태에서 `kind==='network'` 에러 문구 + 재시도 버튼 | ⚠️ 부분 확인 | 아래 "확인 불가 사유" 참고 — 코드 리뷰로 대체 |

**c 항목 확인 불가 사유**: 플랜은 "카카오 SDK 호출이 성공한 뒤 백엔드 교환에서 실패하는 경로"를 실제 카카오 계정 없이도 검증 가능하다고 명시했으나, 실제로는 SDK `login()`이 성공하려면 실제 카카오 계정으로 인증을 완주해야 하며 이는 Task 3(창업자 실기기)의 배타적 소관이다. 시뮬레이터에서는 취소(`rejected`) 경로까지만 도달 가능했다. 대신 코드 리뷰로 대체 확인: `dev-login.tsx`의 에러 렌더 블록은 `errorKind`(`network`/`rejected`/`no-session`) 값과 무관하게 동일한 컴포넌트 트리(`errorText` + 재시도 `Pressable`)를 렌더하며, `errorMessage` 함수가 `network` → `DEV_LOGIN_COPY.errorNetwork`로 정확히 매핑됨을 소스로 확인(`src/app/dev-login.tsx` errorMessage 함수, `dev-login-wiring.test.ts` Test 12가 세 kind 값 등장을 회귀 가드). 즉 `rejected` 경로에서 실증한 것과 동일한 UI 메커니즘이 `network` kind에도 적용되므로 기능적으로는 높은 신뢰도이나, 실제 네트워크 요청 실패 상황에서의 런타임 재현은 아니다. Task 3의 7번 항목(비행기 모드 오프라인 에러)이 동등한 시나리오를 실기기에서 실제로 검증한다.

### 자동 게이트

- `curl -sf http://localhost:8080/actuator/health` → `{"groups":["liveness","readiness"],"status":"UP"}`
- `npm test` → 43 suites / 671 tests 전체 통과(무회귀 — `infoPlist.test.ts`/`foundation-wiring.test.ts`/`tabs-wiring.test.ts` 포함)
- `npx tsc --noEmit` → 0 errors
- `cd backend && ./gradlew build` → BUILD SUCCESSFUL (Flyway V1~V4 포함)
- `SELECT ... FROM users` — 플레이스홀더 1건(`00000000-0000-0000-0000-000000000001`, kakao_id/nickname 빈 값)만 존재, `\d users`로 `email` 컬럼 부재 확인(D-05 사전 검증)

### 시뮬레이터로 구조적으로 검증 불가능한 항목 (Task 3으로 이관, CLAUDE.md 3항)

1. 실제 카카오 계정으로 인증 완주(SDK 성공 → 백엔드 교환 → 세션 저장)
2. **카카오톡 앱 설치 시의 앱 전환 경로** — 시뮬레이터에 카카오톡 설치 불가, 웹 폴백만 재현됨(D-13 핵심 채택 근거는 실기기에서만 검증 가능)
3. 실기기 키체인(SecureStore)에서의 세션 영속(앱 완전 종료 후 재실행)
4. 항목 c(네트워크 에러, 위 표 참고 — 코드 리뷰로 대체, Task 3 항목 7이 실기기에서 동등 시나리오 커버)

## Task 3 — 창업자 실기기 전체 왕복 검증 (대기 중)

아래 항목은 실제 카카오 계정 + 카카오톡 앱 설치 실기기가 필요해 창업자에게 이관됩니다 — 별도 메시지로 안내드립니다.

창업자 응답 대기 중 — 7개 항목 결과 수신 시 이 SUMMARY와 10-VALIDATION.md를 갱신하고, 실패 항목이 있으면 gap closure 필요를 명시합니다.

## Deviations
- 로컬 환경 이슈 2건(빌드 호출 경로의 `.env` 미전파, 구버전 Docker Compose CLI 비호환) — 둘 다 저장소 코드/설정 변경 없이 호출 방식 전환으로 해결. 상세는 위 "빌드/실행 경로 이슈"/"백엔드 로컬 기동 이슈" 절 참고
- Task 2 항목 c의 완전한 런타임 재현 불가(실제 카카오 계정 필요) — 코드 리뷰로 대체, 사유 명시

## Files Modified (이 플랜에서, Task 1)
- `app.config.js`, `src/auth/kakaoLogin.ts`, `src/auth/devLoginContent.ts`, `src/app/dev-login.tsx`, `src/app/__tests__/dev-login-wiring.test.ts`
- (Task 2는 저장소 파일을 변경하지 않음 — `ios/`는 `.gitignore` 대상 빌드 산출물)
