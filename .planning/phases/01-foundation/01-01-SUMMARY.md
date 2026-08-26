---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [expo, expo-router, expo-sqlite, expo-dev-client, expo-font, expo-splash-screen, jest-expo, jest, typescript, babel]

# Dependency graph
requires: []
provides:
  - "저장소 루트의 부팅 가능한 Expo SDK 57 스캐폴드(package.json/app.json/tsconfig.json + src/app 최소 골격)"
  - "iOS 전용/세로모드/light/com.jaeseungchoun.footlog로 확정된 app.json"
  - "expo-dev-client, expo-sqlite, expo-font, expo-splash-screen, @expo-google-fonts/newsreader 5개 런타임 의존성"
  - "동작하는 jest-expo 테스트 러너(npm test) + node:sqlite 플래그 전달 경로"
affects: [01-02, 01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: [expo@57.0.16, expo-router@57.0.16, expo-dev-client@57.0.15, expo-sqlite@57.0.1, expo-font@57.0.1, expo-splash-screen@57.0.8, "@expo-google-fonts/newsreader@0.4.1", jest@29.7.0, jest-expo@57.0.4, "@testing-library/react-native@14.x", babel-preset-expo]
  patterns:
    - "라우트는 app/ 이 아니라 src/app/ 에 위치(현재 create-expo-app default 템플릿 기본 구조, tsconfig @/* -> ./src/*)"
    - "테스트 파일 최상단 @jest-environment node docblock으로 Node 전용 환경 오버라이드(Plan 01-03의 node:sqlite 테스트가 이 패턴을 따름)"

key-files:
  created:
    - package.json
    - app.json
    - tsconfig.json
    - .gitignore
    - babel.config.js
    - jest.config.js
    - src/app/_layout.tsx
    - src/app/index.tsx
    - src/test-infra.smoke.test.ts
  modified: []

key-decisions:
  - "create-expo-app 최신 템플릿이 라우트를 app/이 아닌 src/app/에 생성 — RESEARCH.md/PLAN.md가 가정한 app/ 최상위 경로 대신 실제 템플릿 출력(src/app/)을 그대로 채택"
  - "jest@^30.4.2 대신 jest@29.7.0으로 다운그레이드 — jest-expo 57.0.4가 실제로 검증된 조합은 Jest 29 계열이며, Jest 30과 조합 시 expo/src/winter의 지연 전역 getter가 테스트 사이 구간에서 접근되어 런타임 에러가 재현됨"
  - "tsconfig.json에 compilerOptions.types: [\"jest\", \"node\"] 명시 — 이 프로젝트 의존성 그래프에서 @types/jest 자동 인식이 되지 않아 tsc가 테스트 파일의 describe/it/expect를 인식하지 못하는 문제 해결"

requirements-completed: [REQ-foundation-setup]

# Metrics
duration: 13min
completed: 2026-08-26
---

# Phase 1 Plan 1: Expo 스캐폴드 + 런타임 의존성 + jest-expo 테스트 인프라 Summary

**create-expo-app SDK 57 default 템플릿을 프루닝해 최소 골격만 남기고, expo-dev-client/expo-sqlite/expo-font/expo-splash-screen/@expo-google-fonts/newsreader 5종을 설치했으며, jest-expo(jest 29.7.0으로 다운그레이드) 테스트 러너를 처음으로 동작시킨 Foundation phase의 첫 플랜.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-26T09:06:00Z (create-expo-app 실행 시각 기준)
- **Completed:** 2026-08-26T09:17:55Z
- **Tasks:** 3
- **Files modified:** 33 (신규 스캐폴드 30개 + package.json/package-lock.json/tsconfig.json 갱신 3개, `.planning`/`TODOS.md`/`docs/` 제외)

## Accomplishments
- Expo SDK 57 프로젝트를 저장소 루트에 스캐폴드하고 템플릿 데모 탭/컴포넌트를 전부 프루닝, `src/app/_layout.tsx`(Stack 하나) + `src/app/index.tsx`(플레이스홀더) 최소 골격만 유지
- `expo-dev-client`, `expo-sqlite`, `expo-font`, `expo-splash-screen`, `@expo-google-fonts/newsreader` 5개 런타임 의존성을 SDK 57 호환 버전으로 설치, `app.json`을 iOS 전용/세로모드/light/`com.jaeseungchoun.footlog`로 확정
- jest-expo 기반 테스트 러너를 처음으로 green 상태로 만들고(`npm test`), `NODE_OPTIONS=--experimental-sqlite`를 통해 이후 Plan 01-03의 `node:sqlite` 마이그레이션 테스트가 사용할 플래그 전달 경로를 확보

## Task Commits

1. **Task 1: Expo SDK 57 프로젝트 스캐폴드 + 데모 코드 프루닝** - `021e3cb` (feat)
2. **Task 2: 런타임 의존성 5종 설치 + app.json 확정** - `aef20f4` (feat)
3. **Task 3: jest-expo 테스트 인프라 구축** - `3634924` (feat)

**Plan metadata:** (본 커밋에서 처리 예정)

## Files Created/Modified
- `package.json` - Expo SDK 57 의존성, 런타임 5종, jest-expo 테스트 스택, `npm test` 스크립트, `@react-native/jest-preset` override
- `app.json` - `slug: footlog`, `userInterfaceStyle: light`, `platforms: ["ios"]`, `ios.bundleIdentifier`/`supportsTablet`, android 블록 제거
- `tsconfig.json` - `strict: true`(템플릿 기본값 확인), `compilerOptions.types: ["jest", "node"]` 추가
- `babel.config.js` - `babel-preset-expo`(jest가 `@react-native/jest-preset`의 Flow 소스를 파싱하기 위해 필수)
- `jest.config.js` - `preset: 'jest-expo/ios'`, testMatch(`src/`, `app/`), `clearMocks: true`
- `src/app/_layout.tsx`, `src/app/index.tsx` - 템플릿 `reset-project` 스크립트가 생성한 최소 골격(이후 01-04에서 SQLiteProvider/useFonts로 교체됨)
- `src/test-infra.smoke.test.ts` - 산술 단언 + `node:sqlite` 로드 가능 여부 확인 스모크 테스트
- `.gitignore` - `.env*`, `*.log` 패턴 보강

## Decisions Made
- 라우트 디렉터리를 `app/`이 아닌 템플릿의 실제 출력인 `src/app/`으로 채택(RESEARCH.md/PLAN.md 작성 시점 이후 template이 구조를 바꿈 — Decisions 섹션 참고)
- Jest를 30.4.2에서 29.7.0으로 다운그레이드(아래 Deviations 참고)
- `@types/jest`를 jest 런타임 라인(29.x)에 맞춰 `^29.5.14`로 고정 설치(최신 30.0.0 대신)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 템플릿 구조 변경(app/ → src/app/) 반영**
- **Found during:** Task 1
- **Issue:** PLAN.md/RESEARCH.md는 `npx create-expo-app --template default`가 최상위 `app/` 디렉터리를 생성한다고 가정했으나, 실행 시점(2026-08-26)의 실제 템플릿은 `src/app/`을 표준 라우트 위치로 사용하고 `tsconfig.json`의 `@/*` 별칭도 `./src/*`를 가리킴. `npm run reset-project`도 `src/app/index.tsx`, `src/app/_layout.tsx`만 생성.
- **Fix:** 계획 문서의 경로 가정 대신 템플릿의 실제 출력을 그대로 채택 — acceptance criteria의 `ls app/` 확인도 `ls src/app/` 기준으로 대체 검증(`_layout.tsx`/`index.tsx` 존재, `(tabs)` 부재, `components`/`hooks`/`constants`/`app-example` 최상위 디렉터리 부재는 계획 그대로 충족).
- **Files modified:** `src/app/_layout.tsx`, `src/app/index.tsx` (신규)
- **Verification:** `npx tsc --noEmit` 통과, `ls src/app/`에 데모 탭 없음 확인
- **Committed in:** `021e3cb`

**2. [Rule 3 - Blocking] jest@30.4.2 → jest@29.7.0 다운그레이드**
- **Found during:** Task 3
- **Issue:** PLAN.md 지시대로 `jest@^30.4.2`를 설치하고 `jest.config.js`(`preset: 'jest-expo/ios'`)로 `npm test`를 실행하면 매번 `ReferenceError: You are trying to \`require\` a file outside of the scope of the test code.`가 `expo/src/winter/installGlobal.ts`의 지연 전역 getter(`fetch`, `__ExpoImportMetaRegistry` 등)에서 발생하며 테스트 스위트 자체가 기동하지 않음. 원인 조사 결과 `jest-expo@57.0.4`의 실제 `package.json` 의존성(`@jest/globals`, `babel-jest`, `jest-environment-jsdom`, `jest-snapshot`)은 여전히 `^29.2.1` 계열에 고정되어 있어, 루트에 Jest 30을 설치하면 Jest 29/30 런타임이 혼재되고 `expo`의 지연 getter가 Jest 30의 "테스트 사이(betweenTests)" 상태 검사에 걸림.
- **Fix:** `jest`를 `29.7.0`(jest-expo가 실제로 기대하는 버전)으로 다운그레이드. `jest-mock` override는 이 조합에서는 불필요해 제거, `@react-native/jest-preset` override(Pitfall 2 대응)는 유지.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm test` green(2 passed), `npx expo install --check` 버전 불일치 없음
- **Committed in:** `3634924`

**3. [Rule 3 - Blocking] babel.config.js 부재로 인한 Jest 트랜스폼 SyntaxError 해결**
- **Found during:** Task 3
- **Issue:** 저장소 루트에 `babel.config.js`가 없어 `@react-native/jest-preset/jest/setup.js`(Flow 타입 주석이 있는 `.js` 파일)가 babel-jest에 의해 파싱되지 못하고 `SyntaxError: Unexpected token, expected ","`로 실패.
- **Fix:** `babel.config.js`(`presets: ['babel-preset-expo']`) 추가 — Expo 공식 문서가 명시하는 표준 구성.
- **Files modified:** `babel.config.js`(신규)
- **Verification:** `npm test` 통과
- **Committed in:** `3634924`

**4. [Rule 2 - Missing Critical] `@types/jest` 설치 + tsconfig `types` 명시**
- **Found during:** Task 3 (plan-level verification `npx tsc --noEmit`)
- **Issue:** `@types/jest`가 devDependency에 없어 `src/test-infra.smoke.test.ts`의 `describe`/`it`/`expect`가 타입 에러(TS2593/TS2304)를 일으켜, must_haves의 "npx tsc --noEmit가 타입 에러 없이 통과" 조건을 위반.
- **Fix:** `@types/jest@^29.5.14`(설치된 jest 29.7.0 라인에 맞춤) 설치 + `tsconfig.json`의 `compilerOptions.types`에 `["jest", "node"]` 명시(이 프로젝트 의존성 그래프에서 `@types/jest` 자동 인식이 되지 않는 문제 우회).
- **Files modified:** `package.json`, `package-lock.json`, `tsconfig.json`
- **Verification:** `npx tsc --noEmit` exit 0
- **Committed in:** `3634924`

---

**Total deviations:** 4 auto-fixed (Rule 3 × 3, Rule 2 × 1)
**Impact on plan:** 전부 "계획대로 설치했을 때 아예 동작하지 않던" 것을 고치는 수정 — 스코프 확장 없음. 실제 산출물(패키지 5종, app.json 확정값, jest-expo 러너)은 계획이 요구한 그대로 완성됨. 유일한 구조적 이탈은 라우트 경로(`app/` → `src/app/`)이며 이는 템플릿 자체의 변경을 그대로 반영한 것.

## Issues Encountered
없음 — 위 Deviations 섹션에서 모두 다룸(원인 조사 후 즉시 자동 수정, 사용자 판단이 필요한 아키텍처 변경 없음).

## User Setup Required
없음 — 외부 서비스 설정 불필요(EAS 빌드/실기기 설치는 Plan 01-05에서 human-verify로 처리 예정).

## Next Phase Readiness
- Plan 01-02(디자인 토큰)와 01-03(SQLite 마이그레이션)이 이 플랜의 산출물(스캐폴드, jest 러너, `node:sqlite` 플래그) 위에서 바로 `<automated>` 테스트를 작성할 수 있음.
- Plan 01-04(루트 레이아웃 배선)는 현재의 `src/app/_layout.tsx` 플레이스홀더를 SQLiteProvider/useFonts로 교체해야 함 — RESEARCH.md Pattern 2의 코드 예시가 `../src/db/migrations` 상대 경로를 쓰는데, 실제 위치가 `src/app/_layout.tsx`이므로 import 경로는 `../db/migrations`(한 단계만 위)가 되어야 함 — 01-04 실행 시 유의할 것.
- 블로킹 요소 없음.

## Self-Check: PASSED

- FOUND: package.json, app.json, tsconfig.json, .gitignore, babel.config.js, jest.config.js, src/app/_layout.tsx, src/app/index.tsx, src/test-infra.smoke.test.ts
- FOUND commits: 021e3cb, aef20f4, 3634924

---
*Phase: 01-foundation*
*Completed: 2026-08-26*
