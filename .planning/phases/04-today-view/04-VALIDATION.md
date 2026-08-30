---
phase: 4
slug: today-view
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo ~57.0.4 |
| **Config file** | 별도 config 없음 — `package.json`의 `test` 스크립트(`NODE_OPTIONS=--experimental-sqlite jest`)로 구동 |
| **Quick run command** | `NODE_OPTIONS=--experimental-sqlite npx jest <해당 파일>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** 해당 태스크가 건드린 테스트 파일 개별 실행
- **After every plan wave:** `npm test`(전체 스위트)
- **Before `/gsd:verify-work`:** 전체 스위트 green + Manual-Only 항목(실기기 확인) 수동 확인 필요
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*`/gsd:plan-phase 4` planner가 PLAN.md 7개를 작성한 뒤 채움(2026-08-30).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01 T1 | 04-01 | 1 | REQ-today-view | T-4-02, T-4-03 | `MigratableDb`/Node 어댑터가 다중 row 조회를 지원하되 마이그레이션 러너는 불변, 바인드 파라미터 정규화를 재사용 | unit | `NODE_OPTIONS=--experimental-sqlite npx jest src/db/testing/nodeSqliteAdapter.test.ts src/db/migrations.test.ts` | ✅ (기존 파일 확장) | ⬜ pending |
| 04-01 T2 | 04-01 | 1 | REQ-today-view | T-4-01 | `getTodayCheckins`이 `local_date_key`로 필터링하고 `timestamp_utc` 오름차순 정렬, SQL 문자열 보간 없음 | unit | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/checkinRepo.test.ts -t getTodayCheckins` | ✅ (기존 파일 확장) | ⬜ pending |
| 04-01 T3 | 04-01 | 1 | REQ-trajectory-line | — | 체크인 0/1건이면 폴리라인 좌표 없음, 2건 이상이면 입력 순서 그대로 매핑(재정렬 없음) | unit | `NODE_OPTIONS=--experimental-sqlite npx jest src/today/trajectory.test.ts` | ❌ 신규 파일 | ⬜ pending |
| 04-02 T1 | 04-02 | 1 | REQ-photo-resize | T-4-SC | 긴 변 기준 리사이즈 타깃이 가로/세로/정사각형/작은 이미지 전부에서 올바르게 계산됨 + 새 네이티브 패키지가 격리 가드 감시 대상에 편입 | unit | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/photoResize.test.ts src/checkin/__tests__/nativeDeps.test.ts` | ❌ 신규 + 기존 확장 | ⬜ pending |
| 04-02 T2 | 04-02 | 1 | REQ-photo-resize | T-4-04, T-4-05, T-4-06 | 복사 단계가 리사이즈 결과 uri를 받고 목적지 파일명은 UUID 기반, 리사이즈 실패 시 예외 미전파 + copy 미호출 | unit | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/photos.test.ts src/checkin/checkinFlow.test.ts` | ✅ (기존 파일 확장) | ⬜ pending |
| 04-03 T1 | 04-03 | 1 | REQ-today-view | T-4-09 | 탭바 색상이 전부 토큰으로 오버라이드(iOS 시스템 블루 없음), 아이콘/햄버거 없음 | static | `npx tsc --noEmit` → 04-03 T3에서 계약 단언 | ❌ 신규 파일 | ⬜ pending |
| 04-03 T2 | 04-03 | 1 | REQ-today-view, REQ-onboarding-empty-state | T-4-07, T-4-08 | 라우트 이동 후에도 Phase 3 배선 회귀 가드 전부 통과 + `<Redirect>`//`/priming` 유지 | static/unit | `npm test && npx tsc --noEmit` | ✅ (기존 3개 테스트 경로 갱신) | ⬜ pending |
| 04-03 T3 | 04-03 | 1 | REQ-today-view | T-4-09 | 탭 셸 UI 계약(색상/아이콘 없음/문구 단일 출처/스코프 경계) | static | `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__/tabs-wiring.test.ts` | ❌ 신규 파일 | ⬜ pending |
| 04-04 T1 | 04-04 | 2 | REQ-today-view | T-4-SC | `[ASSUMED]` 패키지 설치 전 사람 확인 게이트(자동 승인 불가) | manual gate | — | manual | ⬜ pending |
| 04-04 T2 | 04-04 | 2 | REQ-today-view | T-4-10, T-4-12 | `formatLocalTime`이 Intl 기반 24시간제 HH:mm 반환 + 리스트 행이 비인터랙티브·장소명 없음 | unit/static | `NODE_OPTIONS=--experimental-sqlite npx jest src/checkin/localDate.test.ts src/today/__tests__/todayUi.test.ts` | ❌ 신규 + 기존 확장 | ⬜ pending |
| 04-04 T3 | 04-04 | 2 | REQ-today-view | T-4-11 | 시트가 `BottomSheetFlatList` 사용 + 중첩 `GestureHandlerRootView` 없음 + 220ms 토큰 사용 | static | `NODE_OPTIONS=--experimental-sqlite npx jest src/today/__tests__/todayUi.test.ts` | ❌ 신규 파일 | ⬜ pending |
| 04-05 T1 | 04-05 | 3 | REQ-today-view, REQ-trajectory-line | T-4-13, T-4-14, T-4-15, T-4-16 | 조회 호출 지점 1곳(D-11), 저장 핀 `accentSoft`, 궤적선 실선 2px·라벨 없음, accent 예산 불변 | static/unit | `npm test && npx tsc --noEmit` | ❌ (04-05 T2가 생성) | ⬜ pending |
| 04-05 T2 | 04-05 | 3 | REQ-today-view, REQ-trajectory-line | T-4-13, T-4-16 | 단일 쿼리/핀 색상/궤적선 스타일/스코프 경계 계약 | static | `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__/today-wiring.test.ts` | ❌ 신규 파일 | ⬜ pending |
| 04-06 T1 | 04-06 | 4 | REQ-today-view | — | 04-UI-SPEC.md와 Phase 3 실제 동작의 불일치(분기 B 재센터 버튼)를 창업자 결정으로 해소 | manual gate | — | manual | ⬜ pending |
| 04-06 T2 | 04-06 | 4 | REQ-today-view | T-4-17, T-4-18, T-4-19, T-4-20 | 시트가 `showActionCard`와 배타적으로 **언마운트**되고, 버튼 오프셋이 `animatedPosition` 연속값을 추적 | static/unit | `npm test && npx tsc --noEmit` | ✅ (04-05 T2 파일 확장) | ⬜ pending |
| 04-06 T3 | 04-06 | 4 | REQ-today-view | T-4-17~T-4-20 | D-04 언마운트 / D-05 연속 추적 / D-09 탭바 불간섭 계약 | static | `NODE_OPTIONS=--experimental-sqlite npx jest src/app/__tests__/today-wiring.test.ts` | ✅ (기존 파일 확장) | ⬜ pending |
| 04-07 T1 | 04-07 | 5 | 전체 4개 REQ | T-4-21, T-4-22, T-4-23 | 시뮬레이터에서 부팅/탭바/시트/핀/궤적선/사진 첨부 13개 항목 — **Claude가 직접 확인**(CLAUDE.md 규약) | manual (simulator, Claude 수행) | `npm test && npx tsc --noEmit` (사전 점검) | manual | ⬜ pending |
| 04-07 T2 | 04-07 | 5 | REQ-photo-resize | T-4-21 | 새 네이티브 모듈이 링크된 EAS Dev Client 빌드 성공 | build | `node -e "..."` (deps 버전 게이트) + `eas build --profile development --platform ios` | manual | ⬜ pending |
| 04-07 T3 | 04-07 | 5 | 전체 4개 REQ | T-4-03, T-4-23 | 시뮬레이터로 재현 불가능한 4개 항목(제스처 감각/실조도 시인성/리사이징 체감 속도/탭 전환) | manual-only — 실기기 필요 | — | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Nyquist 준수 확인

- 모든 코드 생산 task가 `<automated>` 명령을 갖는다(체크포인트 3개 제외 — 각각 `<human-check>` 보유).
- 자동 검증 없는 task가 3개 연속으로 이어지지 않는다(체크포인트는 04-04 T1 / 04-06 T1 / 04-07 T3로 분산).
- watch 모드 플래그 없음. 최대 피드백 지연 ~30초(전체 스위트).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| 바텀시트 CLOSED/DRAGGING/OPEN 3단 스냅 실제 제스처 동작 | REQ-today-view | react-native-maps + gorhom/bottom-sheet 제스처 상호작용은 시뮬레이터에서 신뢰도가 낮음(RESEARCH.md 명시) | 실기기에서 시트를 드래그해 3단계가 자연스럽게 스냅되는지, 지도 팬과 충돌 없는지 확인 |
| 체크인 진행 중 탭바 전환(D-09) 실제 동작 | REQ-today-view | 탭 전환 + 드래프트 유지/소실 경계는 실기기 네비게이션 스택에서 확인 필요 | 확인 핀이 뜬 상태에서 캘린더 탭으로 전환 → 다시 오늘 탭으로 복귀 시 드래프트 상태 확인 |
| 저장된 체크인 핀(accentSoft) vs 확인 핀(accent) 색상 구분 실제 조도에서의 시인성 | REQ-today-view | 색상 대비는 실제 화면/조도에서 확인이 정확 | 실기기에서 오늘 체크인 2건 이상 저장 후 지도에서 두 핀 색상이 시각적으로 구분되는지 확인 |
| 사진 리사이징 진행 시 체감 속도 | REQ-photo-resize | 리사이징 성능은 실기기 CPU/메모리에 의존 | 실기기에서 고해상도 사진 첨부 시 UI가 멈추지 않고 반응하는지 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner 확정(2026-08-30) — PLAN.md 7개 작성 완료, Task ID/Plan/Wave 매핑 채움. gsd-plan-checker 검증 대기.
