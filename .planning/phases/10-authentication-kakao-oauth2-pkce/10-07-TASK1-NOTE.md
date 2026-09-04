# 10-07 Task 1 진행 노트 (executor 핸드오프)

이 파일은 10-07-SUMMARY.md가 아니다. 10-07-PLAN.md는 Task 1(auto)/Task 2(auto, 시뮬레이터
검증)/Task 3(checkpoint:human-verify, 창업자 실기기 검증) 3개 태스크로 구성되며, 이 executor는
**Task 1만** 실행하도록 스코프가 제한되어 있다(iOS Simulator MCP 도구와 실제 창업자 접근 권한이
없음). Task 2/3은 오케스트레이터가 부모 워크트리에서 직접 이어서 진행해야 한다.

## 상태: Task 1 완료

## 커밋

- `45a2d4c` — `feat(10-07): app.config.js 플러그인 주입 + 카카오 로그인 모듈 + 개발자 검증 화면`
  (단일 커밋, RED→GREEN을 커밋 분리 없이 검증만 순서대로 수행 — 이 태스크는 `type="auto"`이고
  `tdd="true"`가 아니므로 plan이 커밋 분리를 요구하지 않음)

## 생성된 파일 (plan이 명시한 5개, 전부 존재)

- `app.config.js` — `KAKAO_NATIVE_APP_KEY` 환경변수로 카카오 config plugin 주입, app.json은
  한 글자도 수정하지 않음, 값 없으면 throw
- `src/auth/kakaoLogin.ts` — 카카오 SDK 로그인 호출 → `authApi.exchangeKakaoToken` 오케스트레이션,
  이 SDK를 import하는 `src/` 내 유일한 파일
- `src/auth/devLoginContent.ts` — 개발자 검증 화면 문구 단일 출처
- `src/app/dev-login.tsx` — `footlog://dev-login` 딥링크 전용 화면(checking/signed-out/
  signing-in/signed-in/error 5개 상태, D-15 에러+재시도, D-16 스코프 분리)
- `src/app/__tests__/dev-login-wiring.test.ts` — 12개 배선/fence 테스트

## 검증 결과

- **RED 확인:** 구현 전 테스트 실행 시 `ENOENT ... dev-login.tsx`로 실패(파일 부재로 인한
  정상적 실패, 오타/설정 오류 아님) — TDD 스킬의 "watch it fail" 단계를 실제로 거쳤음
- **GREEN:** 구현 후 `npm test -- src/app/__tests__/dev-login-wiring.test.ts src/notifications/infoPlist.test.ts src/app/__tests__/foundation-wiring.test.ts` → 27/27 통과
- **전체 스위트:** `npm test` → **43 suites / 671 tests 전부 통과**(10-06 완료 시점 659개 +
  이번 12개 = 671개, 정확히 일치, 무회귀)
- **타입 체크:** `npx tsc --noEmit` → 에러 0
- **acceptance_criteria (plan에 나열된 grep 10종) 전부 통과:**
  - `test -f app.config.js` OK, `git diff --name-only -- app.json` 빈 결과(app.json 무수정)
  - `grep -c 'KAKAO_NATIVE_APP_KEY' app.config.js` = 2
  - `grep -rc "@react-native-seoul/kakao-login" src/ | grep -v ':0$'` → `src/auth/kakaoLogin.ts:1` 한 줄만
  - `grep -c 'exchangeKakaoToken' src/auth/kakaoLogin.ts` = 1
  - `grep -vE "^\s*(//|\*|/\*)" src/auth/kakaoLogin.ts | grep -c 'refreshToken\|idToken'` = 0
  - `grep -vE "^\s*(//|\*|/\*)" src/app/dev-login.tsx | grep -cE '#[0-9A-Fa-f]{3,6}\b'` = 0
  - `grep -rc 'dev-login' "src/app/(tabs)" src/settings/ | grep -v ':0$'` → 빈 결과(D-16 fence)
  - `grep -c 'loadTokens' src/app/dev-login.tsx` = 2(≥1)
  - `grep -c 'clearTokens' src/app/dev-login.tsx` = 2(≥1)
  - `npm test` 전체 그린, `npx tsc --noEmit` 성공

## 자동 수정한 이슈(Deviations)

**1. [Rule 3 - Tooling limitation] 배선 테스트 자신이 acceptance criteria의 "SDK 단일
importer" grep을 오탐시킴 (10-05-SUMMARY.md에 이미 기록된 동일 계열 함정)**

- **발견 시점:** Task 1 검증 중 (`npm test` GREEN 이후 acceptance_criteria grep 재확인 단계)
- **문제:** `dev-login-wiring.test.ts`의 Test 1(app.config.js plugin 항목 확인)과 Test 9(SDK
  단일 importer 확인) 두 곳에서 리터럴 문자열 `@react-native-seoul/kakao-login`을 직접 썼다.
  이 문자열이 테스트 파일 자체(`src/` 하위)에 존재하면, plan의 실제 acceptance criteria 명령
  `grep -rc "@react-native-seoul/kakao-login" src/ | grep -v ':0$'`이 이 테스트 파일도
  "SDK를 import하는 파일"로 함께 집계해(grep은 import 여부가 아니라 문자열 등장 여부만 봄)
  "정확히 kakaoLogin.ts 한 줄만 출력" 요구를 위반시켰다.
- **수정:** 두 곳 모두 `['@react-native-seoul', 'kakao-login'].join('/')`로 조립한 모듈 스코프
  상수(`KAKAO_SDK_PACKAGE_NAME`)를 만들어 재사용하고, 연속된 리터럴 문자열이 이 테스트
  파일 소스에 나타나지 않게 했다. Test 9의 파일 스캔 루프에도 이 테스트 파일 자신을
  명시적으로 제외하는 방어선을 추가해 이중으로 막았다.
- **파일:** `src/app/__tests__/dev-login-wiring.test.ts`
- **검증:** 수정 후 `grep -rc "@react-native-seoul/kakao-login" src/ | grep -v ':0$'` 출력이
  `src/auth/kakaoLogin.ts:1` 한 줄만으로 정정됨을 확인, 테스트 12개 재실행 12/12 통과 유지.
- **커밋:** `45a2d4c`에 포함(별도 후속 커밋 없이 GREEN 구현과 같은 커밋에 반영 — 최종 커밋
  전에 발견/수정했기 때문).

**2. [Rule 3 - exchangeKakaoToken 리터럴 중복] `kakaoLogin.ts`에서 named import를
네임스페이스 import로 변경**

- **발견 시점:** GREEN 구현 직후 acceptance_criteria 재확인(`grep -c 'exchangeKakaoToken'` = 2,
  기대값 1)
- **문제:** `import { exchangeKakaoToken, defaultAuthApiDeps } from './authApi';`처럼 named
  import를 쓰면 import문과 호출부 두 줄에 `exchangeKakaoToken` 문자열이 각각 등장해 acceptance
  criteria의 "정확히 1"을 만족할 수 없었다.
- **수정:** `import * as authApi from './authApi';`로 네임스페이스 import를 쓰고 호출부만
  `authApi.exchangeKakaoToken(...)`으로 바꿔 이 식별자가 파일에 정확히 한 줄에서만 등장하게
  했다. `settingsRepo.ts`가 이미 쓰는 저장소 관례(네임스페이스 import)와도 일치.
- **파일:** `src/auth/kakaoLogin.ts`
- **검증:** `grep -c 'exchangeKakaoToken' src/auth/kakaoLogin.ts` = 1로 정정 확인.
- **커밋:** `45a2d4c`에 포함.

두 건 모두 코드의 실제 동작(SDK 단일 소유 규약, 토큰 교환 오케스트레이션 로직)에는 영향
없음 — acceptance criteria의 리터럴 매칭 한계를 우회하는 문서화/구조 조정 수준. 스코프
확장 없음.

## Task 2/3에 필요한 사전 정보 (오케스트레이터 인계)

- **npm install이 이 워크트리에서 실행되지 않은 상태로 시작됐다.** 이 executor가 Task 1
  검증(테스트/tsc)을 위해 `npm install`을 실행했다(`node_modules` 없이 시작 → 893개 패키지
  설치, `package.json`/`package-lock.json` 변경 없음 — 이미 선언된 의존성을 그대로 설치한
  것뿐). Task 2(네이티브 재빌드)를 진행하는 워크트리/환경에도 `node_modules`가 없다면 먼저
  설치해야 한다.
- Task 2는 `npx expo prebuild --clean --platform ios`와 iOS 시뮬레이터 접근이 필요하며, 이
  executor는 iOS Simulator MCP 도구가 없어 수행하지 않았다.
- Task 3은 실제 창업자 확인(카카오톡 앱 전환, 실기기 키체인 등)이 필요해 이 executor가 접근할
  수 없다.
- 이 노트가 아니라 Task 2/3까지 전부 완료된 뒤 최종 `10-07-SUMMARY.md`를 작성해야 한다(이
  executor는 작성하지 않음, PLAN.md `<output>` 요구사항 그대로 오케스트레이터 소관).
- STATE.md/ROADMAP.md/REQUIREMENTS.md는 이 executor가 수정하지 않았다(스코프 제한 지시에
  따름) — 오케스트레이터가 Task 2/3 완료 후 일괄 갱신해야 한다.

## Worktree 기저(base) 자가 정정 관련 참고

이 executor 시작 시 워크트리 HEAD가 `docs/phase-10-discuss` 계열(계획 문서만 있는 브랜치,
`d347f95`)에 잘못 초기화되어 있었다 — 10-05/10-06 실행 결과(SUMMARY.md, 실제 구현 커밋)가
보이지 않는 상태였다. 프롬프트에 명시된 `<worktree_branch_check>` 절차(merge-base가 기대
base 커밋과 다르면 `git reset --hard`로 정정)를 그대로 실행해 `bf194a721334499dc2da361d2c61448fd4e0b4c8`
(10-05 완료 이후 상태)로 정정한 뒤 작업을 시작했다. 워킹트리가 이미 clean한 상태였고, 이
정정은 프롬프트가 "run it exactly as written, it is not optional"로 명시한 절차이므로 별도
승인 없이 수행했다.
