---
phase: 02-notification-infrastructure
plan: 08
subsystem: infra
tags: [expo-notifications, eas-build, ios, provisioning-profile, manual-verification]

# Dependency graph
requires:
  - phase: 02-notification-infrastructure
    provides: 02-07이 배선한 앱 부팅/화면 트리(_layout.tsx AppState 리스너, index.tsx priming 게이트/배너)
provides:
  - "expo-notifications 네이티브 모듈을 포함한 새 EAS development 빌드 (FINISHED)"
  - "app.json에 expo-notifications config plugin 등록 (Push Notifications capability + aps-environment entitlement)"
  - "실기기 검증 부분 결과: priming/거부 배너/설정 딥링크 경로는 창업자 확인 완료, 실제 정각 알림 수신과 자가진단 재생성 로그는 시간 제약으로 미검증"
affects: [phase-03, phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "expo-notifications 같은 로컬+원격 알림 겸용 네이티브 모듈은 로컬 전용으로만 써도 config plugin 등록이 필수 — 미등록 시 EAS 빌드가 provisioning profile capability 불일치로 실패한다"

key-files:
  created:
    - .planning/phases/02-notification-infrastructure/02-08-SUMMARY.md
  modified:
    - app.json (plugins 배열에 "expo-notifications" 추가)

key-decisions:
  - "app.json에 expo-notifications config plugin을 뒤늦게 등록함 — Plan 02-01은 app.json 무변경을 의도했으나 EAS 빌드 실패로 필요성이 확인돼 02-08에서 추가"
  - "6/7단계(정각 알림 실제 수신, 자가진단 재생성 로그)는 창업자의 시간 제약으로 이번 세션에서 미검증 처리하고 TODOS.md에 후속 확인 항목으로 남김 — 검증 없이 완료로 표기하지 않음"

patterns-established: []

requirements-completed: []  # REQ-notification-scheduling, REQ-notification-denied-flow는 실기기 6/7단계 미검증으로 REQUIREMENTS.md Pending 유지. REQ-permission-copy는 02-02에서 이미 Complete.

# Metrics
duration: 약 1시간 (EAS 빌드 대기 포함, 대화형 자격증명 동기화 별도)
completed: 2026-08-27
---

# Phase 2 Plan 08: EAS Dev Client 빌드 + 실기기 부분 검증 Summary

**expo-notifications 네이티브 모듈 포함한 새 iOS development 빌드를 발급하고, 창업자 iPhone에서 priming/거부 배너/설정 딥링크 경로를 확인했다 — 정각 알림 실제 수신과 자가진단 재생성 로그는 시간 제약으로 미검증 상태로 남겼다.**

## Performance

- **Duration:** 약 1시간 (오케스트레이터 진행 기준. EAS 클라우드 빌드 대기 2회 포함)
- **Completed:** 2026-08-27
- **Tasks:** 2/2 진행 (Task 1 완료, Task 2 부분 완료)
- **Files modified:** 1 (`app.json`)

## Accomplishments
- `expo-notifications`(네이티브 모듈) 포함한 새 iOS development 빌드를 EAS에서 발급 (`status: FINISHED`, build id `784ac802-0e09-4caa-9913-69e85240d5b0`)
- 빌드 실패 원인(Push Notifications capability + `aps-environment` entitlement 누락)을 근본 원인까지 특정하고 `app.json`에 `expo-notifications` config plugin을 등록해 해결
- 창업자 iPhone에 설치 후 priming 화면, 권한 거부 배너, 설정 딥링크 왕복 경로를 육안 확인 완료
- 최초 콜드스타트 시 자가진단이 `[notifications] self-heal: recreated=["checkin-hourly","daily_reflection"] cancelled=[]` 로그를 정상적으로 남기는 것을 Metro 콘솔에서 실측 확인

## Task Commits

1. **Task 1: 전체 스위트 확인 + EAS development 빌드 생성** — 빌드 자체는 산출물(코드 커밋 아님). 빌드 실패 원인 수정은 `1cfc6e6` (fix)
2. **Task 2: 창업자 iPhone 실기기 검증** — 코드 변경 없음, 이 SUMMARY.md가 유일한 산출물

**Plan metadata:** (이 커밋)

## Files Created/Modified
- `app.json` — `plugins` 배열에 `"expo-notifications"` 추가 (Task 1 진행 중 발견한 빌드 실패를 해결하기 위한 수정, 옵션 없이 기본값 사용 — `mode: 'development'`가 eas.json의 development 프로필과 일치)
- `.planning/phases/02-notification-infrastructure/02-08-SUMMARY.md` — 이 문서

## Decisions Made
- **app.json 수정 여부를 사용자에게 확인 후 진행**: Plan 02-01이 의도적으로 피했던 app.json 변경이지만, 실제 EAS 빌드가 이 항목 없이는 통과할 수 없음을 확인(2회 연속 동일 에러)한 뒤 사용자 승인을 받아 최소 변경(옵션 없는 plugin 등록 한 줄)으로 해결
- **비대화형 빌드 자격증명 문제는 추측으로 우회하지 않음**: 두 번째 빌드도 같은 provisioning profile 에러로 실패했을 때, 이는 Apple Developer Portal 쪽 capability 동기화가 필요한 문제(대화형 인증 필수)로 판단해 사용자에게 `npx eas build --profile development --platform ios`(대화형) 직접 실행을 요청 — 사용자가 실행해 Apple ID 로그인 후 capability 동기화, 재빌드까지 성공
- **6/7단계 미검증을 완료로 위장하지 않음**: 사용자가 시간 제약으로 정각 알림 수신 대기와 자가진단 재생성 로그 재현을 못 했다고 밝혔을 때, REQUIREMENTS.md의 REQ-notification-scheduling/REQ-notification-denied-flow를 Complete로 바꾸지 않고 Pending 유지 + TODOS.md에 후속 확인 항목 기록을 선택

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] app.json에 expo-notifications config plugin 누락 — EAS 빌드 실패**
- **Found during:** Task 1 (EAS development 빌드 생성)
- **Issue:** `npx eas build --profile development --platform ios --non-interactive` 실행 시 Xcode 빌드가 "Provisioning profile doesn't include the Push Notifications capability / aps-environment entitlement"로 실패. 원인은 Plan 02-01이 `expo-notifications` 설치 시 app.json을 의도적으로 건드리지 않았던 것 — config plugin이 없으면 managed prebuild가 entitlement를 생성하지 않는다.
- **Fix:** `app.json`의 `plugins` 배열에 `"expo-notifications"`(옵션 없음, 기본값 `mode: 'development'` 사용) 추가. 사용자에게 이 변경과 재빌드 여부를 확인받은 뒤 진행.
- **Files modified:** `app.json`
- **Verification:** `npm test`(13 suites/126 tests green) + `npx tsc --noEmit`(exit 0) 재확인 후 커밋, 이후 대화형 재빌드로 provisioning profile capability 동기화까지 완료 확인
- **Committed in:** `1cfc6e6`

**2. [Rule 3 - Blocking] 비대화형 EAS 빌드가 provisioning profile capability를 자동 동기화하지 못함**
- **Found during:** Task 1 (재빌드 시도, plugin 수정 반영 후)
- **Issue:** app.json 수정 후 `--non-interactive`로 재빌드해도 동일한 provisioning profile 에러로 다시 실패. 원인은 Expo 서버에 저장된 원격 provisioning profile 자체가 Apple Developer Portal에서 Push Notifications capability를 아직 승인받지 못한 상태였고, 이 승인/재발급은 Apple 계정 인증이 필요해 비대화형 모드로는 처리 불가.
- **Fix:** 추측으로 우회하지 않고 사용자에게 대화형 빌드(`npx eas build --profile development --platform ios`, `--non-interactive` 제거) 직접 실행을 요청 — 계획서의 "자격증명 관련 문제는 추측으로 우회하지 않고 그대로 보고" 지침을 따름. 사용자가 실행해 Apple ID 로그인 → `Synced capabilities: Enabled: Push Notifications` → 새 provisioning profile 발급 → 빌드 성공까지 완료.
- **Files modified:** 없음 (Apple/EAS 서버 측 자격증명 상태 변경)
- **Verification:** `npx eas build:list --platform ios --limit 1 --json --non-interactive`로 최신 빌드 `status: FINISHED`, `profile: development`, `platform: IOS`, `gitCommitHash: 1cfc6e6...` 확인
- **Committed in:** N/A (빌드 인프라 상태 변경, 코드 커밋 아님)

---

**Total deviations:** 2 auto-fixed (둘 다 Rule 3 — blocking, 빌드를 계속 진행하려면 필수)
**Impact on plan:** 둘 다 계획이 예상하지 못한 EAS/Apple 자격증명 인프라 문제였고, 코드 로직이나 요구사항 범위에는 영향 없음. app.json 변경은 최소(plugin 이름 한 줄)였고 사용자 승인을 받아 진행함.

## Issues Encountered

**정각 알림 실제 수신(6단계) 및 자가진단 재생성 로그(7단계) 검증을 창업자가 시간 제약으로 완료하지 못함.**
- 2~5단계(priming 화면, 거부 경로, 설정 딥링크 왕복)는 실기기에서 확인됨 — 최초 콜드스타트 시 자가진단이 정상적으로 `recreated=["checkin-hourly","daily_reflection"]` 로그를 남기는 것도 Metro 콘솔에서 실측됨(설치 직후 예약이 하나도 없던 상태에서의 정상 초기 등록).
- 6단계(정각 알림 수신, 최대 1시간 대기 필요)와 7단계(설정에서 알림 껐다 켠 뒤 재생성 로그)는 세션 내에서 검증하지 못함.
- **7단계 관련 코드 분석 결과 공유:** `registry.ts`의 `runForegroundNotificationCheck`는 권한이 없으면 자가진단 자체를 건너뛰고(early return), 권한이 다시 켜져도 `selfHeal()`이 실제로 빠진 트리거를 발견했을 때만 로그를 남긴다. iOS가 알림 권한을 끈다고 해서 이미 예약된 로컬 알림이 자동으로 취소되는 게 아니므로, 단순히 설정에서 껐다 켜는 것만으로는 "재생성" 로그가 안 뜰 수 있다는 점을 사용자에게 미리 안내함 — 이는 버그가 아니라 "조용히 재생성" 설계(D-07)의 예상된 동작.
- **해결하지 않음** — 정각까지 대기해야 하는 6단계와, 앱 재설치가 필요할 수 있는 7단계 재현은 실시간 세션 진행과 맞지 않아 다음 트라이얼 기간 동안 직접 관찰하도록 TODOS.md에 남김.

## User Setup Required

None - 외부 서비스 설정 불필요. (EAS 자격증명 동기화는 이미 완료됨 — 위 Deviation 2 참고)

## Next Phase Readiness

- **완료된 것:** expo-notifications 네이티브 모듈이 포함된 development 빌드가 창업자 기기에 설치되어 있고, priming/거부 배너/설정 딥링크 경로가 실기기에서 동작 확인됨. Phase 3/4가 `expo-location`/`expo-image-picker` config plugin을 추가할 때, 이번에 배운 "config plugin 미등록 → EAS 빌드 실패" 패턴을 미리 참고할 수 있음(02-RESEARCH.md Pitfall 5와 함께).
- **남은 것 (TODOS.md에 기록):** 1~2주 트라이얼 동안 정각 알림이 실제로 반복 수신되는지, 그리고 알림을 껐다 켰을 때(또는 재설치 시) 자가진단 재생성 로그가 기대대로 남는지 직접 관찰 필요. Phase 3/4 진입 전에 반드시 막아야 하는 blocker는 아니지만, REQUIREMENTS.md의 REQ-notification-scheduling / REQ-notification-denied-flow는 이 확인이 끝나기 전까지 Pending으로 유지.
- **D-03 권한 문구 톤 피드백:** 창업자가 이번 세션에서 별도 이슈를 제기하지 않음 — 초안 상태 유지.

---
*Phase: 02-notification-infrastructure*
*Completed: 2026-08-27*
