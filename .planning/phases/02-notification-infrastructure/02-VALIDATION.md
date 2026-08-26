---
phase: 2
slug: notification-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo 57.0.4 (`jest-expo/ios` preset) — Phase 1에서 이미 설치됨 |
| **Config file** | `jest.config.js` (프로젝트 루트) |
| **Quick run command** | `npm test -- src/notifications` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/notifications`
- **After every plan wave:** Run `npm test` (전체 스위트)
- **Before `/gsd:verify-work`:** 전체 스위트 green + 실기기(EAS Dev Client)에서 알림 발화·거부 배너·자가진단 콘솔 로그 수동 확인
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | REQ-notification-scheduling | — | `scheduleNotifications('hourly')`가 `checkin-hourly` identifier 1개를 minute-only CALENDAR 트리거로 등록 | unit | `npm test -- src/notifications/scheduling.test.ts -t hourly` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | `scheduleNotifications('every3h')`가 `checkin-3h-0..7` 8개 identifier를 등록 | unit | `npm test -- src/notifications/scheduling.test.ts -t every3h` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | `scheduleNotifications('off')`가 기존 checkin 트리거를 전부 취소 | unit | `npm test -- src/notifications/scheduling.test.ts -t off` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | 빈도 변경 시 이전 빈도의 identifier가 고아로 남지 않고 정리됨 | unit | `npm test -- src/notifications/scheduling.test.ts -t orphan` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | 자가진단이 누락된 identifier만 재생성하고 존재하는 것은 건드리지 않음 | unit | `npm test -- src/notifications/registry.test.ts -t selfHeal` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | "꺼짐" 상태(빈도=끔/회고 토글=off)인 트리거는 자가진단이 재생성하지 않음 | unit | `npm test -- src/notifications/registry.test.ts -t disabledSkip` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-scheduling | — | 3시간 간격 8개 중 일부만 사라진 부분 실패를 자가진단이 감지 | unit | `npm test -- src/notifications/registry.test.ts -t partialFailure` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-permission-copy | — | `app.json`의 `ios.infoPlist`에 4개 권한(위치/카메라/사진/알림) 확정 문구 키가 존재 | smoke | `npm test -- src/notifications/infoPlist.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-denied-flow | — | 알림 권한 미승인 시 `showBanner`가 true, 승인 시 false | unit | `npm test -- src/notifications/permissions.test.ts -t bannerVisibility` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-notification-denied-flow | — | `AppState`가 `active`로 전환될 때 권한 상태를 재조회 | unit | `npm test -- src/notifications/permissions.test.ts -t appStateRecheck` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task ID/Plan/Wave는 플래너가 PLAN.md 생성 시 배정 — 지금은 REQUIREMENTS 기준 초안.*

---

## Wave 0 Requirements

- [ ] `src/notifications/__mocks__/expo-notifications.ts` — jest-expo 기본 프리셋에 `expo-notifications` 자동 mock이 없으므로 수동 모킹 필요 (`scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `getAllScheduledNotificationsAsync`, `getPermissionsAsync`, `requestPermissionsAsync`)
- [ ] `src/notifications/scheduling.test.ts`, `registry.test.ts`, `permissions.test.ts`, `infoPlist.test.ts` — 전부 신규 파일
- [ ] `AppState` 모킹 헬퍼 필요 시 `jest.spyOn(AppState, 'addEventListener')` 패턴으로 대체

*(그린필드 알림 인프라 phase이므로 전부 신규 상태가 예상됨)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 실기기에서 반복 알림이 예정대로 발화 | REQ-notification-scheduling | iOS 백그라운드 스케줄러 실동작은 시뮬레이터/유닛 테스트로 재현 불가 | EAS Dev Client 설치 후 hourly/every3h 설정하고 실제 알림 수신 확인 |
| 4개 OS 권한 다이얼로그 문구가 확정 카피와 일치 | REQ-permission-copy | iOS 네이티브 다이얼로그는 자동화 테스트 대상 밖 | 실기기에서 각 권한 최초 요청 시 다이얼로그 스크린샷 대조 |
| 권한 거부 후 설정 딥링크로 이동해 승인 → 앱 복귀 시 배너 사라짐 | REQ-notification-denied-flow | OS 설정 앱 전환은 자동화 불가 | 실기기에서 알림 거부 → 배너의 설정 링크 탭 → 승인 → 앱 복귀 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
