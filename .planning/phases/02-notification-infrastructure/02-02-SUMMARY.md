---
phase: 02-notification-infrastructure
plan: 02
subsystem: infra
tags: [expo, app.json, ios-permissions, jest, tdd, i18n]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Expo 프로젝트 스캐폴드(app.json), foundation-wiring.test.ts 정적 소스 단언 패턴
provides:
  - "app.json expo.ios.infoPlist에 위치/카메라/사진 라이브러리 3종 한국어 권한 문구"
  - "src/notifications/infoPlist.test.ts 문구 회귀 가드 + Phase 3/4 plugin 덮어쓰기 감지 게이트"
  - "TODOS.md에 Phase 3/4 config plugin 이관 인계 항목"
affects: [notification-infrastructure, location-permission, camera-permission, photo-library-permission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fs.readFileSync + JSON.parse로 app.json을 정적으로 읽어 require 모듈 캐시 영향 없이 설정값 단언 (foundation-wiring.test.ts와 동일 패턴)"
    - "미래 phase의 config plugin이 정적 문자열을 조용히 덮어쓰는 회귀를 JSON.stringify(plugins) 패턴 매칭으로 감지하는 게이트 테스트"

key-files:
  created: [src/notifications/infoPlist.test.ts]
  modified: [app.json, TODOS.md]

key-decisions:
  - "D-03 iOS 권한 문구 3종(위치/카메라/사진 라이브러리)을 app.json ios.infoPlist에 직접 하드코딩 - Phase 2 시점엔 expo-location/expo-image-picker가 미설치라 config plugin 옵션 자체가 존재하지 않음(02-RESEARCH.md Pattern 3)"
  - "알림 권한은 Info.plist 키가 없어 이 plan에서 제외(D-05) - priming 화면 문구로 이미 충족"

requirements-completed: [REQ-permission-copy]

# Metrics
duration: 5min
completed: 2026-08-27
---

# Phase 02 Plan 02: iOS 권한 프롬프트 문구 Summary

**app.json ios.infoPlist에 위치/카메라/사진 라이브러리 한국어 권한 문구 3종을 하드코딩하고, 6개 회귀 테스트로 문구 소실과 Phase 3/4 config plugin 덮어쓰기를 자동 감지하는 게이트를 구축**

## Performance

- **Duration:** 5분
- **Started:** 2026-08-27T03:23:25+09:00
- **Completed:** 2026-08-27T03:28:12+09:00
- **Tasks:** 2
- **Files modified:** 3 (app.json, src/notifications/infoPlist.test.ts, TODOS.md)

## Accomplishments
- `app.json`의 `expo.ios.infoPlist`에 `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` 3개 키를 D-03 원문 그대로 추가, 기존 `ITSAppUsesNonExemptEncryption: false`는 그대로 유지
- `src/notifications/infoPlist.test.ts`에 6개 테스트 작성 — 문구 3종 정확 일치, ASCII 미포함(D-04 한국어 단일 언어), `ITSAppUsesNonExemptEncryption` 회귀 가드, Phase 3/4 config plugin 옵션(`locationWhenInUsePermission` 등) 부재 게이트
- app.json을 일부러 훼손해 6개 테스트가 각각 올바른 이유로 실패함을 확인한 뒤 원복(RED 검증) — 테스트가 실제로 무언가를 검증한다는 것을 증명
- `TODOS.md`에 Phase 3/4(expo-location/expo-image-picker 설치 시) config plugin 옵션으로 문구를 이관해야 한다는 인계 항목 기록, D-03 문구가 아직 창업자 최종 확인 대기(초안)임을 명시

## Task Commits

Each task was committed atomically:

1. **Task 1: app.json ios.infoPlist에 권한 문구 3종 추가** - `e038b87` (feat)
2. **Task 2: 권한 문구 회귀 가드 테스트 + Phase 3/4 인계 항목 기록** - `0296f97` (test)

_Note: Task 2는 tdd="true"였으나 Task 1에서 이미 구현(app.json)이 끝난 상태였으므로, 계획이 지시한 대로 "테스트 작성 → 일부러 훼손해 실패 확인 → 원복" 방식으로 RED를 검증했다. 프로덕션 코드 변경이 없는 순수 테스트 커밋이라 test(...) 단일 커밋으로 처리._

## Files Created/Modified
- `app.json` - `expo.ios.infoPlist`에 위치/카메라/사진 라이브러리 한국어 usage description 3개 추가
- `src/notifications/infoPlist.test.ts` - 문구 회귀 가드 + Pitfall 5(plugin 덮어쓰기) 감지 게이트 6개 테스트
- `TODOS.md` - Phase 3/4 config plugin 이관 인계 항목 1개 추가

## Decisions Made
- 새 `ios` 블록이나 `plugins` 항목을 만들지 않고 기존 `expo.ios.infoPlist` 객체 안에 3키만 append — 계획 지시 그대로 준수
- 알림 권한용 Info.plist 키는 추가하지 않음(존재하지 않는 키) — D-05에 따라 priming 화면 문구로 충족 처리, 별도 작업 없음

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- REQ-permission-copy의 4개 문구 중 3개(위치/카메라/사진 라이브러리)가 자동 테스트로 고정됨. 나머지 1개(알림)는 D-05에 따라 이미 완료로 간주.
- Phase 3(`expo-location`)/Phase 4(`expo-image-picker`) 계획 시 `src/notifications/infoPlist.test.ts` Test 6이 config plugin 옵션 이관을 강제하는 게이트로 작동 — TODOS.md 인계 항목 참고.
- D-03 문구 3종은 창업자 최종 확인 대기 중인 초안 상태로 남아있음(코드/테스트 블로커 아님, PROJECT.md/CONTEXT.md 추적).

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: app.json
- FOUND: src/notifications/infoPlist.test.ts
- FOUND: TODOS.md
- FOUND: .planning/phases/02-notification-infrastructure/02-02-SUMMARY.md
- FOUND commit: e038b87
- FOUND commit: 0296f97
