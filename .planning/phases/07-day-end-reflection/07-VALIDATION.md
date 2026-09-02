---
phase: 07
slug: day-end-reflection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-02
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo/ios preset, Jest 29.7.0 [VERIFIED: package.json] |
| **Config file** | `jest.config.js` |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest src/reflection` |
| **Full suite command** | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |
| **Estimated runtime** | ~30 seconds |

이 저장소는 두 가지 테스트 스타일을 병행한다: (1) **repo/순수로직 단위 테스트** — 실제 `node:sqlite` 엔진(`createTestDb`) 또는 순수 함수(`@jest-environment node`)로 검증(`checkinRepo.test.ts`, `pendingDelete.ts`류), (2) **"wiring" 정적 소스 분석 테스트** — `fs.readFileSync` + `stripComments` + 정규식으로 화면 소스가 특정 함수를 참조하는지/특정 문구가 등장하지 않는지 검증(`settings-wiring.test.ts`, `checkin-detail-wiring.test.ts`). 계획 단계는 이 두 기존 스타일을 따르는 것을 기본값으로 삼는다.

---

## Sampling Rate

- **After every task commit:** Run 해당 태스크가 건드린 파일의 테스트만 (`npx jest <path>`)
- **After every plan wave:** Run `npm test` (전체 스위트)
- **Before `/gsd:verify-work`:** Full suite must be green + `checkpoint:human-verify`(시뮬레이터로 Claude가 먼저 확인 후, 실기기 알림 자연 발화만 사용자에게 위임) 통과
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | REQ-reflection-base | V5 | `?` 파라미터 바인딩만 사용 | unit(node:sqlite) | `npx jest src/reflection/reflectionRepo.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-base | — | 모달 라우트 `presentation:'modal'` 등록, 정적 지도 재사용 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-autosave | — | 5초 후 `onSave` 호출, `flush()` 즉시 호출, 재입력 시 타이머 리셋 | unit(jest fake timers) | `npx jest src/reflection/autosaveController.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-autosave | — | AppState 리스너가 `flush()` 호출 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-save-failure-ui | — | 저장 실패 시 `runWithSingleRetry` 참조, 실패 문구 상수 일치 | wiring | `npx jest src/app/__tests__/reflection-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-copy-fix | — | `TODAY_COPY`에 체크인 개수 보간 문구 없음, "오늘의 흔적" 문구 정확 | wiring(기존 확장) | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ (확장 필요) | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-notification | V5 | `daily_reflection_hour` 컬럼 존재/기본값 21/`resolveNotificationSettings` 반영 | unit(node:sqlite)+wiring | `npx jest src/db/migrations.test.ts src/settings/settingsRepo.test.ts` | ✅ (확장 필요) | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-notification | — | 설정 화면 4번째 행/액션시트 상수 | wiring(기존 확장) | `npx jest src/app/__tests__/settings-wiring.test.ts` | ✅ (확장 필요) | ⬜ pending |
| TBD | TBD | TBD | REQ-reflection-today-entry | — | "오늘 돌아보기" 헤더 행이 0건이어도 렌더됨 | wiring | `npx jest src/app/__tests__/today-wiring.test.ts` | ✅ (확장 필요) | ⬜ pending |
| TBD | TBD | TBD | REQ-past-reflection-edit | — | `PastDateScreen.tsx`가 회고 프롬프트/저장 함수 참조 | wiring(기존 확장) | `npx jest src/app/__tests__/calendar-wiring.test.ts` | ✅ (확장 필요) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task ID/Plan/Wave columns are TBD until gsd-planner assigns concrete plan IDs — planner MUST fill these in when generating PLAN.md.*

---

## Wave 0 Requirements

- [ ] `src/reflection/reflectionRepo.test.ts` — REQ-reflection-base 커버 (신규 디렉토리/프레임워크 설정 불필요, 기존 jest 설정이 `src/**/*.test.ts` 매칭)
- [ ] `src/reflection/autosaveController.test.ts` — REQ-reflection-autosave 커버 (jest fake timers, Jest 29 표준 기능이라 추가 설정 불필요)
- [ ] `src/app/__tests__/reflection-wiring.test.ts` — 신규 wiring 테스트 파일 (기존 `settings-wiring.test.ts` 패턴 복제)
- [ ] `src/db/migrations.test.ts`에 `daily_reflection_hour` 컬럼 테스트 추가 (기존 파일 확장)
- [ ] `src/settings/settingsRepo.test.ts`에 `dailyReflectionHour` 읽기/쓰기 테스트 추가 (기존 파일 확장)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 매일 고정 시각 알림의 실제 발화(잠금화면 노출, 탭 시 딥링크 동작) | REQ-reflection-notification | OS 알림 스케줄러의 실기기 타이밍/잠금화면 렌더링은 시뮬레이터로 원천 재현 불가 | 실기기에서 알림 시각 도래 대기 → 알림 확인 → 탭 → `/reflection` 모달 열림 확인 |
| 앱 백그라운드 전환 시 자동저장 플러시 | REQ-reflection-autosave | 시뮬레이터로 AppState 전환 자체는 재현 가능하므로 Claude가 시뮬레이터에서 먼저 확인 — 이 항목은 자동화 커버리지 보완용 수동 확인만 남김 | 회고 입력 → 홈 버튼으로 백그라운드 전환 → 재진입 → 입력값 유지 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
