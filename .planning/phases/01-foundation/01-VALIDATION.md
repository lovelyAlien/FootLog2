---
phase: 1
slug: foundation
status: mapped
nyquist_compliant: true
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
| 01-01-T1 | 01-01 | 1 | REQ-foundation-setup | T-1-05, T-1-06 | `.gitignore`가 `.env*`/`ios/`/`android/` 제외, `tsconfig.strict: true` | typecheck | `npx tsc --noEmit` | ✅ (생성됨) | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | REQ-foundation-setup | T-1-SC | 감사 표에 없는 테마/UI 라이브러리 설치 차단(grep 게이트) | unit/config | `npx tsc --noEmit && node -e "<deps assert>"` | ✅ (생성됨) | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | REQ-design-tokens, REQ-sqlite-migrations | — | (테스트 인프라 자체 — Wave 0 해소) | smoke | `npm test` | ✅ `src/test-infra.smoke.test.ts` | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | REQ-design-tokens | T-1-07 | semantic 컬러/bounce 이징/미승인 토큰 추가 회귀 차단 | unit | `npm test -- src/theme/tokens.test.ts && npx tsc --noEmit` | ✅ `src/theme/tokens.test.ts` | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | REQ-design-tokens | T-1-02 | 런타임 CDN fetch 경로 부재(`https?://`/`fetch(` grep 0건) | unit | `npm test && npx tsc --noEmit` | ✅ `src/theme/fonts.test.ts` | ⬜ pending |
| 01-03-T1 | 01-03 | 2 | REQ-sqlite-migrations | T-1-01 | 파라미터 바인딩(`?`) 사용 + SQL 보간 부재를 테스트로 고정 | unit/integration (RED) | `npm test -- src/db/migrations.test.ts` (실패 확인) | ✅ `src/db/migrations.test.ts` | ⬜ pending |
| 01-03-T2 | 01-03 | 2 | REQ-sqlite-migrations | T-1-01, T-1-03, T-1-04 | `${` 보간 정확히 1건(PRAGMA), `DROP TABLE` 0건, idempotency 보장 | unit/integration | `npm test && npx tsc --noEmit` | ✅ `src/db/migrations.test.ts` | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | REQ-sqlite-migrations | T-1-03 | `migrateDbIfNeeded`가 `onInit` 외 경로로 호출되지 않음 | typecheck + unit | `npx tsc --noEmit && npm test` | ✅ (01-04-T2가 가드 생성) | ⬜ pending |
| 01-04-T2 | 01-04 | 3 | REQ-design-tokens | T-1-07, T-1-02 | `src/theme/tokens.ts` 외 hex 리터럴 0건, 진행률 수치 0건, accent 오남용 0건 | unit | `npm test && npx tsc --noEmit` | ✅ `app/__tests__/foundation-wiring.test.ts` | ⬜ pending |
| 01-05-T1 | 01-05 | 4 | REQ-foundation-setup | T-1-05, T-1-09 | 자격증명 파일 gitignore, `distribution: internal` | config assert | `node -e "<eas.json/app.json assert>"` | ✅ (생성됨) | ⬜ pending |
| 01-05-T2 | 01-05 | 4 | REQ-foundation-setup | T-1-10 | Apple 자격증명은 EAS/Apple 인증 흐름에 위임(Claude가 취급하지 않음) | manual (human-action) | 해당 없음 — 2FA는 자동화 불가 | N/A | ⬜ pending |
| 01-05-T3 | 01-05 | 4 | REQ-foundation-setup, REQ-design-tokens, REQ-sqlite-migrations | T-1-09 | 실기기에서 3개 요구사항 육안 검증(8항목 체크리스트) | manual (human-verify) | 해당 없음 — 물리적 기기 설치는 자동화 불가 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task ID는 `{phase}-{plan}-T{n}` 형식이며 2026-08-26 plan 생성 시 배정됨. 연속 3개 이상 자동 검증 없는 태스크 없음(01-05-T2/T3만 checkpoint이며 Nyquist 예외).*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — `preset: 'jest-expo/ios'`(해석 실패 시 `jest-expo`) + SDK 57 피어 의존성 오버라이드 → **01-01-T3**
- [ ] Framework install: `jest-expo` / `jest` / `@testing-library/react-native` → **01-01-T3**
- [ ] `NODE_OPTIONS=--experimental-sqlite` 를 `npm test` 스크립트에 전달 → **01-01-T3**
- [ ] `src/theme/tokens.test.ts` — DESIGN.md 값 대조 테스트(13+ 단언) → **01-02-T1**
- [ ] `src/db/testing/nodeSqliteAdapter.ts` — 모킹 전략 확정: Node 내장 `node:sqlite` `DatabaseSync`를 `MigratableDb`로 감싼 실엔진 어댑터(신규 npm 패키지 0개) → **01-03-T1**
- [ ] `src/db/migrations.test.ts` — idempotency / 데이터 보존 / `PRAGMA user_version` 갱신 / 미래 컬럼 추가 가능성 검증(8 테스트) → **01-03-T1**
- [ ] `app/__tests__/foundation-wiring.test.ts` — `onInit` 전용 호출 + 토큰 하드코딩 금지 가드 → **01-04-T2**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EAS Dev Client 빌드가 창업자 iPhone에 설치·실행됨 | REQ-foundation-setup | 물리적 기기 설치 확인은 자동화 불가 | `eas build --profile development --platform ios` 실행 → 생성된 빌드를 실기기에 설치 → 앱 아이콘 탭해 정상 실행 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoint 태스크 01-05-T2/T3 제외)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (01-01-T3 / 01-03-T1 이 전부 해소)
- [x] No watch-mode flags (`npm test` 스크립트에 `--watch` 금지, 01-01-T3 acceptance criteria가 게이트)
- [x] Feedback latency < 10s (전 테스트가 node 환경 정적/인메모리 — RN 렌더 테스트 없음)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-mapped 2026-08-26 — 실행 중 각 태스크 완료 시 Status 열을 갱신할 것
