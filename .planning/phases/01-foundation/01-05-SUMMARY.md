---
phase: 01-foundation
plan: 05
subsystem: infra
tags: [eas, expo-dev-client, expo-updates, ios]

requires:
  - phase: 01-foundation (Plan 01-04)
    provides: 루트 레이아웃 배선(폰트 게이팅 + SQLite onInit 마이그레이션) + 부팅 확인 화면
provides:
  - EAS 프로젝트 연결(@jaeseungchoun/footlog, projectId ddae6f8e-f890-459e-bfcb-cc3f47478260)
  - eas.json development 빌드 프로필(developmentClient, internal distribution)
  - 실기기(창업자 iPhone)에 설치·실행되는 EAS Dev Client 빌드
  - Phase 1의 세 요구사항(REQ-foundation-setup/REQ-design-tokens/REQ-sqlite-migrations)이
    시뮬레이터가 아닌 실기기에서 동작함을 육안으로 검증한 결과
affects: [phase-2-notification-infrastructure]

tech-stack:
  added: [expo-updates]
  patterns:
    - "EAS 프로젝트는 eas project:init --account jaeseungchoun --non-interactive 로 비대화형 연결"
    - "development 채널 사용 시 expo-updates가 EAS CLI에 의해 자동 요구·설정됨(runtimeVersion, updates.url)"

key-files:
  created: [eas.json]
  modified: [app.json, .gitignore, package.json, package-lock.json]

key-decisions:
  - "eas build:configure의 계정 선택 프롬프트가 non-interactive 환경에서 멈춰, eas project:init --account jaeseungchoun --non-interactive로 대체 실행"
  - "expo-updates 자동 설치 과정에서 app.json에 추가된 빈 android 블록은 iOS 전용 LOCKED 결정(Plan 01-01)에 맞춰 제거"

patterns-established:
  - "EAS 자격증명은 credentialsSource: remote로 EAS 서버에 위임 — 로컬에 인증서/프로파일 파일을 두지 않음"

requirements-completed: [REQ-foundation-setup]

duration: ~40min (사람 대기 시간 포함 — 2FA 로그인 및 EAS 클라우드 빌드 대기)
completed: 2026-08-26
---

# Phase 1 Plan 05: EAS Dev Client 빌드 및 실기기 검증 Summary

**EAS Dev Client iOS 개발 빌드를 창업자 iPhone에 설치해 Foundation phase 3개 요구사항(스캐폴드/디자인 토큰/SQLite 마이그레이션)이 실기기에서 동작함을 육안으로 확인**

## Performance

- **Duration:** ~40분 (Apple 2FA 로그인 + EAS 클라우드 빌드 대기 포함)
- **Tasks:** 3 (auto 1건 + checkpoint 2건)
- **Files modified:** 5 (eas.json 신규, app.json/.gitignore/package.json/package-lock.json 수정)

## Accomplishments
- `eas.json` development 프로필 작성 및 `@jaeseungchoun/footlog` EAS 프로젝트 연결
- Apple Developer 계정 인증(2FA) + iOS 개발 빌드 완료(창업자 본인이 checkpoint:human-action에서 직접 수행)
- 창업자 iPhone에 Dev Client 설치, Metro 개발 서버 연결, 8개 항목 육안 검증 전부 통과(checkpoint:human-verify에서 창업자 본인이 직접 확인 — "approved")

## Task Commits

1. **Task 1: eas.json 구성 + EAS 프로젝트 연결** - `8a029e5` (feat)
2. **(Task 1 부수 조치) expo-updates 설치/구성** - `3caf2cb` (feat) — EAS CLI가 development 채널 사용을 위해 자동 요구
3. **Task 2: Apple 2FA 로그인 + iOS 개발 빌드** - checkpoint:human-action, 창업자 본인이 터미널에서 직접 실행(커밋 없음, EAS 클라우드 산출물)
4. **Task 3: 실기기 육안 검증(8항목)** - checkpoint:human-verify, 창업자 본인이 확인 — 전부 통과

## Files Created/Modified
- `eas.json` - development 빌드 프로필(`developmentClient: true`, `distribution: "internal"`, `resourceClass: "m-medium"`)
- `app.json` - `extra.eas.projectId` 연결, `runtimeVersion`/`updates.url`(expo-updates), `infoPlist.ITSAppUsesNonExemptEncryption: false`
- `.gitignore` - `credentials.json`, `*.ipa`, `.easignore` 추가(자격증명 파일 커밋 차단)
- `package.json`/`package-lock.json` - `expo-updates` 의존성 추가

## Decisions Made
- `eas build:configure`의 대화형 계정 선택 프롬프트가 non-interactive 환경(Bash 도구)에서 stdin 없이 멈춰, 동등한 비대화형 커맨드 `eas project:init --account jaeseungchoun --non-interactive`로 전환해 실행. 결과는 동일(프로젝트 생성/연결 + `app.json` projectId 반영).
- `expo-updates` 자동 설치 시 `app.json`에 생긴 빈 `"android": {}` 블록은 Plan 01-01의 LOCKED 결정("iOS 전용, android 블록 없음")과 충돌해 제거. `expo-updates`의 실제 동작(runtimeVersion/updates.url)에는 영향 없음(둘 다 플랫폼 공통 필드).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] eas build:configure 계정 선택 프롬프트가 non-interactive 환경에서 멈춤**
- **Found during:** Task 1 (EAS 프로젝트 연결)
- **Issue:** `npx eas-cli@latest build:configure --platform ios`가 "Which account should own this project?" 프롬프트에서 멈춤(stdin 미제공)
- **Fix:** `npx eas-cli@latest project:init --account jaeseungchoun --non-interactive`로 대체 실행 — 동일한 최종 상태(프로젝트 생성/연결) 달성
- **Files modified:** app.json (`extra.eas.projectId`, `owner`)
- **Verification:** `node -e` 로 projectId UUID 형식 및 bundleId/slug 무드리프트 확인, `eas config --platform ios --profile development`가 스키마 오류 없이 출력
- **Committed in:** `8a029e5`

**2. [Rule 1 - Bug] expo-updates 자동 설치가 iOS 전용 원칙에 반하는 빈 android 블록을 추가**
- **Found during:** Task 2 실행 중 (사용자가 직접 `eas build` 실행, expo-updates 설치 프롬프트에 yes 응답)
- **Issue:** `app.json`에 `"android": {}`가 생성되어 Plan 01-01의 acceptance criteria("android 블록이 있으면 제거")를 위반
- **Fix:** 빈 android 블록 제거, `npx tsc --noEmit` + `npm test`(35/35 green) 재확인
- **Files modified:** app.json
- **Verification:** `node -e "if(a.android)throw new Error(...)"` 통과
- **Committed in:** `3caf2cb`

---

**Total deviations:** 2 auto-fixed (2 bug-fix, 둘 다 Rule 1)
**Impact on plan:** 둘 다 실행 환경/도구 버전 차이에서 온 기계적 이슈이며 계획의 의도(EAS 프로젝트 연결, iOS 전용 유지)는 그대로 달성. 스코프 확장 없음.

## Issues Encountered
- 세션 도중 macOS 파일/폴더 권한(TCC)이 일시적으로 꼬여 git 명령이 전부 실패하는 사건이 있었음(Documents 폴더 접근 거부) — Claude 앱 재시작으로 해결, 이 plan의 작업 내용과는 무관.

## User Setup Required
None - `user_setup`(Apple Developer/EAS 계정)은 이미 창업자가 보유한 계정으로 이 plan의 checkpoint 안에서 완료됨. 추가 설정 불필요.

## Next Phase Readiness
- **Phase 1(Foundation) 완료.** REQ-foundation-setup/REQ-design-tokens/REQ-sqlite-migrations 3개 요구사항 전부 실기기 검증까지 통과.
- Phase 2(Notification Infrastructure)는 이 Dev Client 빌드 위에서 계속 개발 가능 — 매 phase마다 새 EAS 빌드가 필요한 것은 아니며, Metro JS 번들만 갱신하면 됨(네이티브 모듈 추가 시에만 재빌드 필요).
- 블로커 없음.

---
*Phase: 01-foundation*
*Completed: 2026-08-26*
