---
phase: 5
slug: check-in-detail-edit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-31
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.7.0 + jest-expo/ios preset `[VERIFIED: package.json, jest.config.js]` |
| **Config file** | `jest.config.js` (testMatch: `src/**/*.test.{ts,tsx}`) |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/checkinRepo.test.ts` |
| **Full suite command** | `npm test` (= `NODE_OPTIONS=--experimental-sqlite jest`) |
| **Estimated runtime** | ~30 seconds |

이 저장소는 두 가지 테스트 스타일을 병행한다(둘 다 확립된 관례, 새로 발명하지 않음):
1. **Repo/순수함수 테스트** — `@jest-environment node` + 실제 SQLite 엔진(`createTestDb` + `migrateDbIfNeeded`), 예: `checkinRepo.test.ts`.
2. **화면 "배선(wiring)" 테스트** — RN 렌더 없이 `fs.readFileSync` + `stripComments`로 소스 문자열을 정적 분석(정규식 단언), 예: `checkin-wiring.test.ts`.

---

## Sampling Rate

- **After every task commit:** Run `jest <해당 태스크가 건드린 파일>` (targeted, not full suite)
- **After every plan wave:** Run `npm test` (full suite) — 특히 Pitfall 1의 라우트 이동에 영향받는 wiring 테스트 파일 5개가 전부 그린인지 확인
- **Before `/gsd:verify-work`:** Full suite must be green + `tsc --noEmit`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | REQ-checkin-detail-base | V5 | `getCheckinById`/`deleteCheckin` 정상 동작 | unit(SQLite) | `jest src/checkin/checkinRepo.test.ts` | ❌ W0(함수 신규 추가) | ⬜ pending |
| TBD | TBD | TBD | REQ-checkin-detail-layout | — | 레이아웃 순서(시간→지도→딥링크→사진→메모) 고정 | wiring(정적 분석) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ W0(신규) | ⬜ pending |
| TBD | TBD | TBD | REQ-checkin-detail-flush | Repudiation | `AppState` background 전환 시 flush 호출 | wiring(정적 분석, index.tsx 패턴 재사용) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-maps-deeplink | Tampering(URL 보간) | `Linking.openURL` 호출 전 flush 선행, lat/lng는 숫자만 보간 | wiring(정적 분석) | 동일 파일 | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-checkin-swipe-delete | 가용성(고아 파일) | 지연 삭제(4s) + undo + `deleteCheckin` 최종 실행 | unit(순수 로직 분리 가능하면) + wiring | `jest src/today/*.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task ID/Plan/Wave 열은 gsd-planner가 실제 PLAN.md 작성 시 채운다.*

---

## Wave 0 Requirements

- [ ] `src/checkin/checkinRepo.test.ts`에 `getCheckinById`/`deleteCheckin` 테스트 케이스 추가
- [ ] `src/checkin/localDate.test.ts`에 `formatLocalMonthDay` 테스트 케이스 추가
- [ ] `src/app/__tests__/checkin-detail-wiring.test.ts` 신규 생성(상세화면 레이아웃 순서/beforeRemove/AppState 배선 정적 분석)
- [ ] 기존 5개 wiring 테스트 파일의 경로 상수 갱신(RESEARCH.md Pitfall 1 — 라우트가 `(tabs)/index.tsx` → `(tabs)/index/{_layout,index,[id]}.tsx` 폴더 구조로 이동함에 따른 회귀 가드 경로 수정)
- [ ] `src/today/__tests__/todayUi.test.ts` 또는 신규 파일에 스와이프 삭제 지연-커밋 로직 테스트(순수 로직으로 뽑을 수 있다면 유닛, 아니면 wiring)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `BottomSheetFlatList` 안 가로 스와이프 제스처와 바텀시트 세로 팬 제스처의 경합 여부 | REQ-checkin-swipe-delete | RESEARCH.md MEDIUM confidence 항목 — GitHub 이슈로만 확인, 이 저장소에서 실측 검증 안 됨. `activeOffsetX`/`failOffsetY` 튜닝 후 시뮬레이터/실기기에서 스와이프 삭제와 바텀시트 스크롤이 서로 간섭하지 않는지 직접 확인 필요 | 시뮬레이터에서 오늘 뷰 바텀시트를 세로로 스크롤한 뒤, 리스트 행을 가로로 스와이프해 삭제 어포던스가 의도대로만 반응하는지 확인 |
| 정적 지도 미리보기의 실제 시각적 결과(마커 위치/회전, `pinSoft` 색상 렌더링) | REQ-checkin-detail-layout | 스크린샷 비교가 아닌 시각적 판단이 필요한 항목 | 시뮬레이터에서 체크인 상세화면 진입 후 지도 미리보기 스크린샷으로 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
