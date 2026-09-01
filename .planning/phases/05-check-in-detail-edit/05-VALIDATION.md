---
phase: 5
slug: check-in-detail-edit
status: planned
nyquist_compliant: true
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
| 05-01 Task 2 | 05-01 | 1 | REQ-checkin-detail-base | — | 라우트 폴더 이동 후 기존 wiring 가드 5개 파일이 새 경로로 여전히 문다 | wiring(정적 분석) | `npm test` | ✅ 기존 5개 파일(경로 상수 갱신) | ⬜ pending |
| 05-01 Task 3 | 05-01 | 1 | REQ-checkin-detail-base | — | nested Stack 구조(`headerShown`, 탭바 유지)가 회귀 가드로 고정 | wiring(정적 분석) | `jest src/app/__tests__/tabs-wiring.test.ts` | ✅ 기존(단언 추가) | ⬜ pending |
| 05-02 Task 1 | 05-02 | 1 | REQ-checkin-detail-base, REQ-checkin-swipe-delete | T-05-14 | `getCheckinById`/`deleteCheckin` 정상 동작 | unit(SQLite) | `jest src/checkin/checkinRepo.test.ts` | ✅ 기존 파일(케이스 신규 = Wave 0) | ⬜ pending |
| 05-02 Task 2 | 05-02 | 1 | REQ-checkin-detail-layout | — | `formatLocalMonthDay` 로컬 날짜 포맷(헤더 타이틀) | unit(node) | `jest src/checkin/localDate.test.ts` | ✅ 기존 파일(케이스 신규 = Wave 0) | ⬜ pending |
| 05-02 Task 3 | 05-02 | 1 | REQ-checkin-swipe-delete | T-05-14 | `deleteFile` 포트가 `expo-file-system`을 deps 경계 밖으로 새지 않는다 | unit + 타입체크 | `jest src/checkin/ && npx tsc --noEmit` | ✅ 기존 | ⬜ pending |
| 05-03 Task 3 | 05-03 | 2 | REQ-checkin-detail-layout | — | 고정 레이아웃 순서 + 지도 5중 잠금 + 색상 규율(`accent` 0회 / `pin` 0회 / `pinSoft` 1회) | wiring(정적 분석) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ Wave 0(파일 신규 생성) | ⬜ pending |
| 05-04 Task 2 | 05-04 | 3 | REQ-maps-deeplink, REQ-checkin-detail-flush | T-05-08 | `Linking.openURL` 전 flush 선행 + lat/lng 숫자만 보간 + `AppState` `'active'` 가드 | wiring(정적 분석) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-04 Task 3 | 05-04 | 3 | REQ-checkin-detail-base | Repudiation | `beforeRemove` 3버튼 미저장 경고 + 5요소 레이아웃 순서 | wiring(정적 분석) | 동일 파일 | ❌ Wave 0 | ⬜ pending |
| 05-05 Task 1 | 05-05 | 3 | REQ-checkin-swipe-delete | T-05-13 | 4초 지연 삭제 / undo / **`dispose()` 즉시 커밋**(취소 아님) | unit(node, fake timers) | `jest src/today/pendingDelete.test.ts` | ❌ Wave 0(파일 신규 생성) | ⬜ pending |
| 05-05 Task 2 | 05-05 | 3 | REQ-checkin-swipe-delete | T-05-17 | 어포던스 색상 계약 — `colors.pin` 정확히 1회 / `colors.accent` 0회(Test 6 **무수정** 통과) / `pinSoft` 0회, `activeOffsetX`·`failOffsetY` 존재 | wiring(정적 분석) | `jest src/today/__tests__/todayUi.test.ts` | ✅ 기존(Test 1 반전 + 색상 가드 추가) | ⬜ pending |
| 05-05 Task 3 | 05-05 | 3 | REQ-checkin-swipe-delete | T-05-13, T-05-15 | `dispose()` 배선(`clearTimeout` 미등장) + DB DELETE→파일 삭제 순서 + `pathname: '/[id]'` | wiring(정적 분석) | `jest src/app/__tests__/checkin-wiring.test.ts` | ✅ 기존(단언 추가) | ⬜ pending |
| 05-06 Task 1 | 05-06 | 4 | REQ-checkin-detail-base | Pitfall 5 | 사진 교체 시 DB 갱신 성공 **후에만** 구 파일 삭제 | wiring(정적 분석, 인덱스 비교) | `jest src/app/__tests__/checkin-detail-wiring.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-06 Task 2 | 05-06 | 4 | REQ-checkin-detail-base | — | 사진 삭제 배지가 `colors.textMuted`이고 `colors.pin`/`colors.accent`를 쓰지 않는다(D-04 무게 구분) | wiring(정적 분석) | 동일 파일 | ❌ Wave 0 | ⬜ pending |
| 05-07 Task 1 | 05-07 | 5 | (전체 5개) | (전체) | 전체 게이트 + 시뮬레이터 인터랙션/시각 항목 (A)~(H) 직접 검증 | full suite + 시뮬레이터 | `npm test && npx tsc --noEmit` | ✅ | ⬜ pending |
| 05-07 Task 2 | 05-07 | 5 | REQ-checkin-swipe-delete, REQ-checkin-detail-layout | — | 실기기 제스처 감각 + Pin(`#B85C38`)/pinSoft 색 인지 | `checkpoint:human-verify`(자동화 불가) | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Nyquist: 자동 검증이 없는 태스크는 `05-07 Task 2`(`checkpoint:human-verify`) 하나뿐이며, 연속 3개 이상 자동 검증 공백 구간은 없다.*

---

## Wave 0 Requirements

각 항목이 실제로 어느 plan/task에 배선됐는지 명시한다(계획 완료 시점 갱신).

- [ ] **05-02 Task 1** — `src/checkin/checkinRepo.test.ts`에 `getCheckinById`/`deleteCheckin` 테스트 케이스 추가
- [ ] **05-02 Task 2** — `src/checkin/localDate.test.ts`에 `formatLocalMonthDay` 테스트 케이스 추가
- [ ] **05-03 Task 3** — `src/app/__tests__/checkin-detail-wiring.test.ts` 신규 생성(상세화면 레이아웃 순서/지도 잠금/색상 규율 정적 분석). `beforeRemove`·`AppState` 단언은 **05-04 Task 3**이 이어서 확장
- [ ] **05-01 Task 2** — 기존 5개 wiring 테스트 파일의 경로 상수 6곳 갱신(RESEARCH.md Pitfall 1 — 라우트가 `(tabs)/index.tsx` → `(tabs)/index/{_layout,index,[id]}.tsx` 폴더 구조로 이동함에 따른 회귀 가드 경로 수정)
- [ ] **05-05 Task 1** — `src/today/pendingDelete.test.ts` 신규 생성(지연 삭제 4초 타이머/undo/dispose 즉시 커밋 = 순수 로직 유닛 테스트). 어포던스 색상/제스처 옵션 계약은 **05-05 Task 2**가 기존 `src/today/__tests__/todayUi.test.ts`에 추가

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `BottomSheetFlatList` 안 가로 스와이프 제스처와 바텀시트 세로 팬 제스처의 경합 여부 | REQ-checkin-swipe-delete | RESEARCH.md MEDIUM confidence 항목 — GitHub 이슈로만 확인, 이 저장소에서 실측 검증 안 됨. `activeOffsetX`/`failOffsetY` 튜닝 후 시뮬레이터/실기기에서 스와이프 삭제와 바텀시트 스크롤이 서로 간섭하지 않는지 직접 확인 필요 | 시뮬레이터에서 오늘 뷰 바텀시트를 세로로 스크롤한 뒤, 리스트 행을 가로로 스와이프해 삭제 어포던스가 의도대로만 반응하는지 확인 |
| 정적 지도 미리보기의 실제 시각적 결과(마커 위치/회전, `pinSoft` 색상 렌더링) | REQ-checkin-detail-layout | 스크린샷 비교가 아닌 시각적 판단이 필요한 항목 | 시뮬레이터에서 체크인 상세화면 진입 후 지도 미리보기 스크린샷으로 확인 |
| 스와이프 삭제 어포던스의 Pin 테라코타(`#B85C38`)가 실제 화면 밝기에서 "삭제"로 읽히면서 경고/위험(빨강)으로는 읽히지 않는지, 그리고 상세화면 `pinSoft` 마커와 톤이 뭉개지지 않는지 | REQ-checkin-swipe-delete | 실제 조도/화면에서의 색 인지는 시뮬레이터로 원천 재현 불가(CLAUDE.md §실기기 확인 정책) — 2026-09-01 accent→Pin 전환으로 새로 생긴 인접 관계라 확인 필요 | 실기기에서 오늘 뷰 행을 스와이프해 어포던스를 띄운 뒤, 같은 체크인의 상세화면 지도 마커와 번갈아 보며 "진한 쪽 = 삭제 / 옅은 쪽 = 저장된 핀" 구분이 서는지 확인(05-07 Task 2 항목 2·3) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (예외: `05-07 Task 2` = `checkpoint:human-verify`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (위 Wave 0 목록이 plan/task ID로 배선됨)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (2026-09-01 — `/gsd:plan-phase 5` 계획 + 색상 리비전 반영 완료)
