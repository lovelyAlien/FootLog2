---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo 57.0.4 + jest 30.4.2 (신규 설치 필요 — 현재 저장소에 테스트 인프라 전무) |
| **Config file** | none — Wave 0에서 `jest.config.js`(`preset: 'jest-expo'`) 생성 |
| **Quick run command** | `npx jest src/db/migrations.test.ts` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds (테스트 3개 미만인 소규모 phase) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest <해당 test 파일>`
- **After every plan wave:** Run `npx jest`(전체 스위트)
- **Before `/gsd:verify-work`:** Full suite must be green + 창업자 실물 iPhone 설치 확인(human-verify)
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner assigns) | TBD | 0 | REQ-foundation-setup | — | N/A (물리적 기기 설치는 자동화 불가) | manual | 해당 없음 | N/A | ⬜ pending |
| TBD (planner assigns) | TBD | TBD | REQ-design-tokens | — | `src/theme/tokens.ts`가 DESIGN.md의 모든 값을 정확히 export | unit | `npx jest src/theme/tokens.test.ts -x` | ❌ W0 | ⬜ pending |
| TBD (planner assigns) | TBD | TBD | REQ-sqlite-migrations | T-1-01 | `migrateDbIfNeeded`가 빈 DB에서 테이블 생성 + 재실행 시 데이터 보존 + `PRAGMA user_version` 정확히 갱신 (문자열 보간 없이 파라미터 바인딩 사용) | unit/integration | `npx jest src/db/migrations.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task ID는 이 파일 작성 시점(research 직후)에는 아직 planner가 배정하지 않아 TBD — plan 생성 후 채워짐.*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — `preset: 'jest-expo'` 설정 + SDK 57 피어 의존성 오버라이드(`"overrides": { "@react-native/jest-preset": "0.86.0" }`)
- [ ] `src/theme/tokens.test.ts` — DESIGN.md 값과의 스냅샷/값 비교 테스트
- [ ] `src/db/migrations.test.ts` — in-memory 또는 임시 SQLite DB로 마이그레이션 함수의 idempotency와 데이터 보존을 검증(Node 환경에서 `expo-sqlite`가 직접 동작하지 않으므로 `jest-expo`의 Node 플랫폼 프리셋 또는 모킹 전략 필요)
- [ ] Framework install: `npx expo install jest-expo jest @testing-library/react-native`(현재 미설치)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EAS Dev Client 빌드가 창업자 iPhone에 설치·실행됨 | REQ-foundation-setup | 물리적 기기 설치 확인은 자동화 불가 | `eas build --profile development --platform ios` 실행 → 생성된 빌드를 실기기에 설치 → 앱 아이콘 탭해 정상 실행 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
